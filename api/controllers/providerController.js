const pool = require("../config/db.config");
const userService = require("../services/userService");

const getVisibleProvidersBaseQuery = (currentUserId) => {
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
        sp.business_contact,
        sp.recommender_message,
        sp.visibility,
        sc.name AS category,
        sp.recommended_by AS recommender_user_id,
        rec_user.name AS recommender_name,
        rec_user.phone_number AS recommender_phone,
        ROUND(AVG(r.rating) OVER (PARTITION BY sp.id), 2) AS average_rating,
        COUNT(r.id) OVER (PARTITION BY sp.id) AS total_reviews,
        sp.search_vector
    FROM
        public.service_providers sp
    LEFT JOIN
        public.service_categories sc ON sp.category_id = sc.service_id
    LEFT JOIN
        public.users rec_user ON sp.recommended_by = rec_user.id
    LEFT JOIN
        public.reviews r ON sp.id = r.provider_id
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
        sp.recommended_by = $1
        OR
        sp.visibility = 'public'
        OR
        (sp.visibility = 'connections' AND con_direct.user_id IS NOT NULL)
        OR
        (cs.community_id IS NOT NULL AND cm_user_x.user_id IS NOT NULL)
  `;
    const queryParams = [currentUserId];
    return { query, queryParams };
};

const getAllVisibleProviders = async (req, res) => {
    const clerkUserId = req.query.user_id;
    const userEmail = req.query.email;

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({
            success: false,
            message:
                "User ID and email are required to fetch visible providers.",
        });
    }

    try {
        // Convert Clerk ID to internal user ID
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
            getVisibleProvidersBaseQuery(internalUserId);
        const finalQuery = `
            SELECT * FROM (${baseQuery}) AS VisibleProvidersCTE
            ORDER BY VisibleProvidersCTE.business_name;
        `;
        const result = await pool.query(finalQuery, queryParams);
        res.json({
            success: true,
            providers: result.rows,
        });
    } catch (err) {
        console.error("Database error in getAllVisibleProviders:", err);
        res.status(500).json({
            success: false,
            message: "Error fetching visible providers",
            error: err.message,
        });
    }
};

const getProviderCount = async (req, res) => {
    const clerkUserId = req.query.user_id;
    const userEmail = req.query.email;

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({
            success: false,
            message: "User ID and email are required to fetch provider count.",
        });
    }

    try {
        // Convert Clerk ID to internal user ID
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
            getVisibleProvidersBaseQuery(internalUserId);
        const countQuery = `SELECT COUNT(*) FROM (${baseQuery}) AS visible_providers_subquery`;
        const result = await pool.query(countQuery, queryParams);
        const count = parseInt(result.rows[0].count, 10);
        res.json({ count });
    } catch (error) {
        console.error("Error getting visible provider count:", error.message);
        res.status(500).json({
            error: "Internal server error getting provider count",
        });
    }
};

const getProviderById = async (req, res) => {
    const { id } = req.params;
    const clerkUserId = req.query.user_id;
    const userEmail = req.query.email;

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({
            success: false,
            message:
                "User ID and email are required to fetch provider details.",
        });
    }

    try {
        // Convert Clerk ID to internal user ID
        const internalUserId = await userService.getOrCreateUser({
            id: clerkUserId,
            emailAddresses: [{ emailAddress: userEmail }],
            firstName: req.query.firstName || "",
            lastName: req.query.lastName || "",
            phoneNumbers: req.query.phoneNumber
                ? [{ phoneNumber: req.query.phoneNumber }]
                : [],
        });

        const {
            query: baseVisibilityQuery,
            queryParams: baseVisibilityParams,
        } = getVisibleProvidersBaseQuery(internalUserId);

        const providerIdParamIndex = baseVisibilityParams.length + 1;
        const finalQuery = `
            SELECT * FROM (${baseVisibilityQuery}) AS VisibleProvidersCTE
            WHERE VisibleProvidersCTE.id = $${providerIdParamIndex};
        `;

        const result = await pool.query(finalQuery, [
            ...baseVisibilityParams,
            id,
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Provider not found or not accessible",
            });
        }

        res.json({ success: true, provider: result.rows[0] });
    } catch (err) {
        console.error("Database error in getProviderById:", err);
        res.status(500).json({
            success: false,
            message: "Error fetching provider",
            error: err.message,
        });
    }
};

const getRecommendationsByTargetUser = async (req, res) => {
    const targetUserEmail = req.query.target_email;
    const clerkUserId = req.query.user_id;
    const userEmail = req.query.email;

    if (!targetUserEmail || !clerkUserId || !userEmail) {
        return res.status(400).json({
            success: false,
            message: "Target email, user ID, and email are required.",
        });
    }

    try {
        // Convert Clerk ID to internal user ID
        const internalUserId = await userService.getOrCreateUser({
            id: clerkUserId,
            emailAddresses: [{ emailAddress: userEmail }],
            firstName: req.query.firstName || "",
            lastName: req.query.lastName || "",
            phoneNumbers: req.query.phoneNumber
                ? [{ phoneNumber: req.query.phoneNumber }]
                : [],
        });

        const targetUserRes = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [targetUserEmail]
        );

        if (targetUserRes.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Target user not found.",
            });
        }

        const targetUserId = targetUserRes.rows[0].id;
        const { query: baseQuery, queryParams: baseParams } =
            getVisibleProvidersBaseQuery(internalUserId);

        const targetUserIdParamIndex = baseParams.length + 1;
        const finalQuery = `
            SELECT * FROM (${baseQuery}) AS VisibleProvidersCTE
            WHERE VisibleProvidersCTE.recommender_user_id = $${targetUserIdParamIndex}
            ORDER BY VisibleProvidersCTE.date_of_recommendation DESC;
        `;

        const result = await pool.query(finalQuery, [
            ...baseParams,
            targetUserId,
        ]);
        res.json({ success: true, recommendations: result.rows });
    } catch (error) {
        console.error(
            "Database error in getRecommendationsByTargetUser:",
            error
        );
        res.status(500).json({
            success: false,
            message: "Failed to fetch user recommendations",
            error: error.message,
        });
    }
};

const searchVisibleProviders = async (req, res) => {
    const { q } = req.query;
    const clerkUserId = req.query.user_id;
    const userEmail = req.query.email;
    const searchQuery = q?.toLowerCase().trim();

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({
            success: false,
            message: "User ID and email are required to perform search.",
        });
    }

    if (!searchQuery) {
        return res.json({ success: true, providers: [] });
    }

    try {
        // Convert Clerk ID to internal user ID
        const internalUserId = await userService.getOrCreateUser({
            id: clerkUserId,
            emailAddresses: [{ emailAddress: userEmail }],
            firstName: req.query.firstName || "",
            lastName: req.query.lastName || "",
            phoneNumbers: req.query.phoneNumber
                ? [{ phoneNumber: req.query.phoneNumber }]
                : [],
        });

        const {
            query: baseVisibilityQuery,
            queryParams: baseVisibilityParams,
        } = getVisibleProvidersBaseQuery(internalUserId);

        const ftsParamIndex = baseVisibilityParams.length + 1;

        let ftsQuery = `
            SELECT *, ts_rank(search_vector, plainto_tsquery('english', $${ftsParamIndex})) as rank
            FROM (${baseVisibilityQuery}) AS VisibleProvidersCTE
            WHERE VisibleProvidersCTE.search_vector @@ plainto_tsquery('english', $${ftsParamIndex})
            ORDER BY rank DESC
            LIMIT 10;
        `;

        let result = await pool.query(ftsQuery, [
            ...baseVisibilityParams,
            searchQuery,
        ]);

        if (result.rows.length === 0) {
            const ilikeParamIndex = baseVisibilityParams.length + 1;
            const ilikeSearchQuery = `%${searchQuery}%`;
            const fallbackQuery = `
                SELECT *
                FROM (${baseVisibilityQuery}) AS VisibleProvidersCTE
                WHERE
                    LOWER(COALESCE(VisibleProvidersCTE.business_name, '')) LIKE $${ilikeParamIndex}
                    OR LOWER(COALESCE(VisibleProvidersCTE.category, '')) LIKE $${ilikeParamIndex}
                    OR LOWER(COALESCE(VisibleProvidersCTE.description, '')) LIKE $${ilikeParamIndex}
                    OR EXISTS (
                        SELECT 1 FROM unnest(VisibleProvidersCTE.tags) AS tag 
                        WHERE LOWER(tag) LIKE $${ilikeParamIndex}
                    )
                LIMIT 10;
            `;
            result = await pool.query(fallbackQuery, [
                ...baseVisibilityParams,
                ilikeSearchQuery,
            ]);
        }

        res.json({
            success: true,
            providers: result.rows,
        });
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to search providers",
            message: error.message,
        });
    }
};

module.exports = {
    getAllVisibleProviders,
    getProviderById,
    getRecommendationsByTargetUser,
    searchVisibleProviders,
    getProviderCount,
};
