const userService = require("../services/userService");
const pool = require("../config/db.config");

const getVisibleProvidersBaseQueryForAutoPage = (currentUserId) => {
  const query = `
    SELECT DISTINCT
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
        ) AS "currentUserLiked"
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

const getAllVisibleAutoProviders = async (req, res) => {
    const clerkUserId = req.query.user_id;
    const userEmail = req.query.email;

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({
            success: false,
            message: "User ID and email are required to fetch auto service providers."
        });
    }

    try {
        // Convert Clerk ID to internal user ID
        const internalUserId = await userService.getOrCreateUser({
            id: clerkUserId,
            emailAddresses: [{ emailAddress: userEmail }],
            firstName: req.query.firstName || "",
            lastName: req.query.lastName || "",
            phoneNumbers: req.query.phoneNumber ? [{ phoneNumber: req.query.phoneNumber }] : []
        });

        const { query: baseQuery, queryParams } = getVisibleProvidersBaseQueryForAutoPage(internalUserId);
        const categoryName = 'Auto Services';
        const finalQuery = `
            SELECT * FROM (${baseQuery}) AS VisibleProvidersCTE
            WHERE VisibleProvidersCTE.category_name = $${queryParams.length + 1}
            ORDER BY VisibleProvidersCTE.business_name;
        `;
        const finalParams = [...queryParams, categoryName];

        const result = await pool.query(finalQuery, finalParams);

        res.json({
            success: true,
            providers: result.rows
        });
    } catch (err) {
        console.error('Database error fetching auto providers:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching auto providers',
            error: err.message
        });
    }
};

const getVisibleAutoProviderById = async (req, res) => {
    const { id: providerId } = req.params;
    const clerkUserId = req.query.user_id;
    const userEmail = req.query.email;

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({
            success: false,
            message: "User ID and email are required to fetch auto provider details."
        });
    }

    try {
        const internalUserId = await userService.getOrCreateUser({
            id: clerkUserId,
            emailAddresses: [{ emailAddress: userEmail }],
            firstName: req.query.firstName || "",
            lastName: req.query.lastName || "",
            phoneNumbers: req.query.phoneNumber ? [{ phoneNumber: req.query.phoneNumber }] : []
        });

        const { query: baseQuery, queryParams } = getVisibleProvidersBaseQueryForAutoPage(internalUserId);
        const categoryName = 'Auto Services';
        const paramIndexForId = queryParams.length + 1;
        const paramIndexForCategory = queryParams.length + 2;

        const finalQuery = `
            SELECT * FROM (${baseQuery}) AS VisibleProvidersCTE
            WHERE VisibleProvidersCTE.id = $${paramIndexForId} 
            AND VisibleProvidersCTE.category_name = $${paramIndexForCategory};
        `;
        const finalParams = [...queryParams, providerId, categoryName];

        const result = await pool.query(finalQuery, finalParams);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Auto provider not found or not accessible to this user."
            });
        }

        res.json({
            success: true,
            provider: result.rows[0]
        });
    } catch (err) {
        console.error('Database error fetching specific auto provider:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching auto provider',
            error: err.message
        });
    }
};

module.exports = {
    getAllVisibleAutoProviders,
    getVisibleAutoProviderById
};
