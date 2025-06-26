const userService = require("../services/userService");
const pool = require("../config/db.config");

const getVisibleProvidersBaseQueryForOutdoorPage = (currentUserId) => {
    const query = `
    SELECT
        sp.id,
        sp.business_name,
        sp.description,
        sp.email,
        sp.phone_number,
        sp.tags,
        sp.website,
        sp.city,
        sp.state,
        sp.zip_code,
        sp.service_scope,
        sp.price_range,
        sp.date_of_recommendation,
        sp.num_likes,
        sp.provider_message,
        sp.recommender_message,
        sp.visibility,
        sp.average_rating,
        sp.total_reviews,
        sc.name AS category_name,
        s.name AS service_type,
        sp.recommended_by AS recommender_user_id,
        rec_user.username as recommender_username,
        rec_user.name AS recommender_name,
        rec_user.phone_number AS recommender_phone,
        rec_user.email AS recommender_email,
        EXISTS (
            SELECT 1
            FROM public.recommendation_likes rl
            WHERE rl.recommendation_id = sp.id AND rl.user_id = $1
        ) AS "currentUserLiked",
        COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'id', reviewer_user.id,
                    'name', reviewer_user.name,
                    'email', reviewer_user.email
                )
            )
            FROM unnest(sp.users_who_reviewed) AS reviewer_id
            LEFT JOIN users reviewer_user ON reviewer_user.id = reviewer_id
            WHERE reviewer_user.id IS NOT NULL),
            '[]'::json
        ) AS users_who_reviewed
    FROM
        public.service_providers sp
    LEFT JOIN
        public.services s ON sp.service_id = s.service_id
    LEFT JOIN
        public.service_categories sc ON s.category_id = sc.service_id
    LEFT JOIN
        public.users rec_user ON sp.recommended_by = rec_user.id
    LEFT JOIN
        public.user_connections con_direct ON
            ((sp.recommended_by = con_direct.user_id AND con_direct.connected_user_id = $1) OR
             (sp.recommended_by = con_direct.connected_user_id AND con_direct.user_id = $1)) AND con_direct.status = 'accepted'
    LEFT JOIN
        public.community_shares cs ON sp.id = cs.service_provider_id
    LEFT JOIN
        public.community_memberships cm_user_x ON
            cs.community_id = cm_user_x.community_id AND
            cm_user_x.user_id = $1 AND
            cm_user_x.status = 'approved'
    WHERE
        (
            sp.recommended_by = $1
            OR
            sp.visibility = 'public'
            OR
            (sp.visibility = 'connections' AND con_direct.user_id IS NOT NULL)
            OR
            (sp.visibility = 'communities' AND cm_user_x.user_id IS NOT NULL)
        )
  `;
    const queryParams = [currentUserId];
    return { query, queryParams };
};

const getAllVisibleOutdoorProviders = async (req, res) => {
    const clerkUserId = req.query.user_id;
    const userEmail = req.query.email;

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({
            success: false,
            message:
                "User ID and email are required to fetch outdoor service providers.",
        });
    }

    try {
        // Convert Clerk ID to internal user ID with required email
        const internalUserId = await userService.getOrCreateUser({
            id: clerkUserId,
            emailAddresses: [{ emailAddress: userEmail }],
            firstName: req.query.firstName || "",
            lastName: req.query.lastName || "",
            phoneNumbers: req.query.phoneNumber
                ? [{ phoneNumber: req.query.phoneNumber }]
                : [],
        });

        const { query: baseQuery, queryParams } =
            getVisibleProvidersBaseQueryForOutdoorPage(internalUserId);
        const serviceName = "Outdoor Services";
        const finalQuery = `
            SELECT DISTINCT ON (id) * FROM (${baseQuery}) AS VisibleProvidersCTE
            WHERE VisibleProvidersCTE.service_type = $${queryParams.length + 1}
            ORDER BY id, VisibleProvidersCTE.business_name;
        `;
        const finalParams = [...queryParams, serviceName];

        const result = await pool.query(finalQuery, finalParams);

        res.json({
            success: true,
            providers: result.rows,
        });
    } catch (err) {
        console.error("Database error fetching outdoor providers:", err);
        res.status(500).json({
            success: false,
            message: "Error fetching outdoor providers",
            error: err.message,
        });
    }
};

const getVisibleOutdoorProviderById = async (req, res) => {
    const { id: providerId } = req.params;
    const clerkUserId = req.query.user_id;
    const userEmail = req.query.email;

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({
            success: false,
            message:
                "User ID and email are required to fetch outdoor provider details.",
        });
    }

    try {
        const internalUserId = await userService.getOrCreateUser({
            id: clerkUserId,
            emailAddresses: [{ emailAddress: userEmail }],
            firstName: req.query.firstName || "",
            lastName: req.query.lastName || "",
            phoneNumbers: req.query.phoneNumber
                ? [{ phoneNumber: req.query.phoneNumber }]
                : [],
        });

        const { query: baseQuery, queryParams } =
            getVisibleProvidersBaseQueryForOutdoorPage(internalUserId);
        const serviceName = "Outdoor Services";
        const paramIndexForId = queryParams.length + 1;
        const paramIndexForService = queryParams.length + 2;

        const finalQuery = `
            SELECT DISTINCT ON (id) * FROM (${baseQuery}) AS VisibleProvidersCTE
            WHERE VisibleProvidersCTE.id = $${paramIndexForId} AND VisibleProvidersCTE.service_type = $${paramIndexForService}
            ORDER BY id;
        `;
        const finalParams = [...queryParams, providerId, serviceName];

        const result = await pool.query(finalQuery, finalParams);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Outdoor provider not found or not accessible to this user.",
            });
        }

        res.json({
            success: true,
            provider: result.rows[0],
        });
    } catch (err) {
        console.error(
            "Database error fetching specific outdoor provider:",
            err
        );
        res.status(500).json({
            success: false,
            message: "Error fetching outdoor provider",
            error: err.message,
        });
    }
};

module.exports = {
    getAllVisibleOutdoorProviders,
    getVisibleOutdoorProviderById,
};
