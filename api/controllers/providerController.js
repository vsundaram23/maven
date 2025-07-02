// pseudo working 5/20 [parts of liking are working]
const pool = require("../config/db.config");
const userService = require("../services/userService");

/* Helper function to format a term/phrase for to_tsquery
 Converts "word1 word2" to "word1 & word2"
*/
const prepareTermForTsqueryFormatting = (term) => {
    if (!term) return "";
    return term
        .split(/\s+/) // Split by any whitespace
        .filter((part) => part.length > 0) // Remove empty parts
        .join(" & "); // Join with FTS AND operator
};

const getInternalUserIdByEmail = async (userEmail, clerkUserIdFallback, additionalParams = {}) => {
    if (!userEmail && !clerkUserIdFallback) return null;

    let internalId = null;
    if (userEmail) {
        try {
            const userRes = await pool.query("SELECT id FROM users WHERE email = $1", [userEmail]);
            if (userRes.rows.length > 0) {
                internalId = userRes.rows[0].id;
            }
        } catch (error) {
            console.error("Error fetching internal user ID by email:", error);
            throw error; 
        }
    }

    if (!internalId && clerkUserIdFallback) {
        try {
            const createParams = { 
                id: clerkUserIdFallback, 
                ...(userEmail && { emailAddresses: [{ emailAddress: userEmail }] }),
                ...additionalParams
            };
            internalId = await userService.getOrCreateUser(createParams);
        } catch (error) {
            console.error("Error in getOrCreateUser during fallback:", error);
            throw error;
        }
    }
    return internalId;
};

const getVisibleProvidersBaseQuery = (currentInternalUserId) => {
    // This CTE efficiently finds all unique provider IDs visible to the user.
    // This is the reusable part.
    const CteString = `
        WITH "VisibleProviderIDs" AS (
            -- Providers recommended by the user
            SELECT id FROM public.service_providers WHERE recommended_by = $1
            
            UNION -- UNION automatically handles removing duplicate provider IDs
            
            -- Public providers
            SELECT id FROM public.service_providers WHERE visibility = 'public'
            
            UNION
            
            -- Providers visible to connections
            SELECT sp.id
            FROM public.service_providers sp
            JOIN public.user_connections con ON 
                (sp.recommended_by = con.user_id AND con.connected_user_id = $1) OR 
                (sp.recommended_by = con.connected_user_id AND con.user_id = $1)
            WHERE sp.visibility = 'connections' AND con.status = 'accepted'
            
            UNION
            
            -- Providers visible to communities
            SELECT sp.id
            FROM public.service_providers sp
            JOIN public.community_shares cs ON sp.id = cs.service_provider_id
            JOIN public.community_memberships cm ON cs.community_id = cm.community_id
            WHERE sp.visibility = 'communities' 
              AND cm.user_id = $1
              AND cm.status = 'approved'
        )
    `;
    const queryParams = [currentInternalUserId];
    return { CteString, queryParams };
};

const getNewestVisibleProviders = async (req, res) => {
    const clerkUserId = req.query.user_id;
    const userEmail = req.query.email;
    const limit = parseInt(req.query.limit, 10) || 5;
    const sortBy = req.query.sortBy || 'date_of_recommendation';
    const sortOrder = req.query.sortOrder || 'desc';

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({ success: false, message: "User ID and email are required." });
    }

    try {
        const internalUserId = await getInternalUserIdByEmail(userEmail, clerkUserId, {
            firstName: req.query.firstName || "",
            lastName: req.query.lastName || "",
            phoneNumbers: req.query.phoneNumber ? [{ phoneNumber: req.query.phoneNumber }] : [],
        });
        if (!internalUserId) {
            return res.status(404).json({ success: false, message: "User not found or could not be resolved." });
        }

        // 1. Get the reusable CTE string and its parameters.
        const { CteString, queryParams: baseQueryParams } = getVisibleProvidersBaseQuery(internalUserId);

        // 2. Build the final query by prepending the CTE to the main SELECT.
        const finalQuery = `
            ${CteString}
            SELECT
                sp.id, sp.business_name, sp.description, sp.email, sp.phone_number,
                sp.tags, sp.website, sp.city, sp.state, sp.zip_code, sp.service_scope,
                sp.price_range, sp.date_of_recommendation, sp.num_likes, sp.provider_message,
                sp.business_contact, sp.recommender_message, sp.visibility, sp.images,
                sp.service_id AS recommended_service_id, s.display_name AS recommended_service_name,
                sc.name as category, sp.recommended_by AS recommender_user_id,
                rec_user.username as recommender_username, rec_user.name AS recommender_name,
                rec_user.phone_number AS recommender_phone, sp.average_rating,
                sp.total_reviews, sp.search_vector,
                BOOL_OR(rl.user_id IS NOT NULL) AS "currentUserLiked",
                COALESCE(
                    ARRAY_AGG(DISTINCT review_users.name) FILTER (WHERE review_users.name IS NOT NULL), 
                    '{}'
                ) AS users_who_reviewed
            FROM "VisibleProviderIDs" vp
            JOIN public.service_providers sp ON vp.id = sp.id
            LEFT JOIN public.services s ON sp.service_id = s.service_id
            LEFT JOIN public.service_categories sc ON s.category_id = sc.service_id
            LEFT JOIN public.users rec_user ON sp.recommended_by = rec_user.id
            LEFT JOIN public.recommendation_likes rl ON sp.id = rl.recommendation_id AND rl.user_id = $1
            LEFT JOIN public.reviews rev ON sp.id = rev.provider_id
            LEFT JOIN public.users review_users ON rev.user_id = review_users.id
            WHERE 
                sp.date_of_recommendation IS NOT NULL
                AND sp.recommended_by != $1
            GROUP BY 
                sp.id, s.service_id, sc.service_id, rec_user.id
            ORDER BY 
                sp.${sortBy} ${sortOrder.toUpperCase()}
            LIMIT $2;
        `;

        // 3. Combine the parameters for the final execution.
        const finalParams = [...baseQueryParams, limit];
        
        const result = await pool.query(finalQuery, finalParams);
        res.json({ success: true, providers: result.rows });
    } catch (err) {
        console.error("Database error in getNewestVisibleProviders:", err);
        res.status(500).json({ success: false, message: "Error fetching newest visible providers", error: err.message });
    }
};

const getNewRecommendationsCount = async (req, res) => {
    const { user_id: clerkUserId, email: userEmail } = req.query;

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({ 
            success: false, 
            message: "User ID and email are required." 
        });
    }

    try {
        const internalUserId = await getInternalUserIdByEmail(userEmail, clerkUserId);
        if (!internalUserId) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const userQuery = await pool.query(
            'SELECT last_sign_in_at FROM users WHERE id = $1', 
            [internalUserId]
        );

        if (userQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User data not found in users table." });
        }
        
        const lastSignInAt = userQuery.rows[0].last_sign_in_at;

        if (!lastSignInAt) {
            return res.json({ success: true, newRecommendationCount: 0 });
        }

        // 1. Get the reusable CTE string for what providers are visible.
        const { CteString, queryParams: baseQueryParams } = getVisibleProvidersBaseQuery(internalUserId);

        // 2. Construct the final COUNT query.
        // It prepends the CTE and joins it to the service_providers table
        // to filter by the recommendation date.
        const finalQuery = `
            ${CteString}
            SELECT COUNT(*) AS new_recommendation_count
            FROM "VisibleProviderIDs" vp
            JOIN public.service_providers sp ON vp.id = sp.id
            WHERE sp.date_of_recommendation > $2;
        `;
        
        // 3. The parameters are the user ID for the CTE ($1) and the timestamp for the WHERE clause ($2).
        const finalQueryParams = [...baseQueryParams, lastSignInAt];

        const result = await pool.query(finalQuery, finalQueryParams);

        const newCount = parseInt(result.rows[0].new_recommendation_count, 10) || 0;

        res.json({ success: true, newRecommendationCount: newCount });

    } catch (err) {
        console.error("Database error in getNewRecommendationsCount:", err);
        res.status(500).json({ 
            success: false, 
            message: "An error occurred while fetching the new recommendation count.", 
            error: err.message 
        });
    }
};

const getAllVisibleProviders = async (req, res) => {
    const clerkUserId = req.query.user_id;
    const userEmail = req.query.email;

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({ success: false, message: "User ID and email are required." });
    }

    try {
        const internalUserId = await getInternalUserIdByEmail(userEmail, clerkUserId, {
            firstName: req.query.firstName || "",
            lastName: req.query.lastName || "",
            phoneNumbers: req.query.phoneNumber ? [{ phoneNumber: req.query.phoneNumber }] : [],
        });
        if (!internalUserId) {
            return res.status(404).json({ success: false, message: "User not found or could not be resolved." });
        }

        // 1. Get the reusable CTE string for what providers are visible.
        const { CteString, queryParams } = getVisibleProvidersBaseQuery(internalUserId);

        // 2. Build the final query by prepending the CTE to the main SELECT.
        const finalQuery = `
            ${CteString}
            SELECT
                sp.id, sp.business_name, sp.description, sp.email, sp.phone_number,
                sp.tags, sp.website, sp.city, sp.state, sp.zip_code, sp.service_scope,
                sp.price_range, sp.date_of_recommendation, sp.num_likes, sp.provider_message,
                sp.business_contact, sp.recommender_message, sp.visibility, sp.images,
                sp.service_id AS recommended_service_id, s.display_name AS recommended_service_name,
                sc.name as category, sp.recommended_by AS recommender_user_id,
                rec_user.username as recommender_username, rec_user.name AS recommender_name,
                rec_user.phone_number AS recommender_phone, sp.average_rating,
                sp.total_reviews, sp.search_vector,
                BOOL_OR(rl.user_id IS NOT NULL) AS "currentUserLiked",
                COALESCE(
                    ARRAY_AGG(DISTINCT review_users.name) FILTER (WHERE review_users.name IS NOT NULL),
                    '{}'
                ) AS users_who_reviewed
            FROM "VisibleProviderIDs" vp
            JOIN public.service_providers sp ON vp.id = sp.id
            LEFT JOIN public.services s ON sp.service_id = s.service_id
            LEFT JOIN public.service_categories sc ON s.category_id = sc.service_id
            LEFT JOIN public.users rec_user ON sp.recommended_by = rec_user.id
            LEFT JOIN public.recommendation_likes rl ON sp.id = rl.recommendation_id AND rl.user_id = $1
            LEFT JOIN public.reviews rev ON sp.id = rev.provider_id
            LEFT JOIN public.users review_users ON rev.user_id = review_users.id
            GROUP BY
                sp.id, s.service_id, sc.service_id, rec_user.id
            ORDER BY
                sp.business_name;
        `;
        
        const result = await pool.query(finalQuery, queryParams);
        res.json({ success: true, providers: result.rows });
    } catch (err) {
        console.error("Database error in getAllVisibleProviders:", err);
        res.status(500).json({ success: false, message: "Error fetching visible providers", error: err.message });
    }
};


const getProviderCount = async (req, res) => {
    const clerkUserId = req.query.user_id;
    const userEmail = req.query.email;

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({ success: false, message: "User ID and email are required." });
    }

    try {
        const internalUserId = await getInternalUserIdByEmail(userEmail, clerkUserId, {
            firstName: req.query.firstName || "",
            lastName: req.query.lastName || "",
            phoneNumbers: req.query.phoneNumber ? [{ phoneNumber: req.query.phoneNumber }] : [],
        });
        if (!internalUserId) {
            return res.status(404).json({ success: false, message: "User not found or could not be resolved." });
        }

        // 1. Get the reusable CTE string for what providers are visible.
        const { CteString, queryParams } = getVisibleProvidersBaseQuery(internalUserId);

        // 2. Build the final, efficient COUNT query.
        // This is highly performant as it only counts the IDs from the CTE.
        const countQuery = `
            ${CteString}
            SELECT COUNT(*) FROM "VisibleProviderIDs";
        `;

        const result = await pool.query(countQuery, queryParams);
        res.json({ count: parseInt(result.rows[0].count, 10) });
    } catch (error) {
        console.error("Error getting visible provider count:", error.message);
        res.status(500).json({ error: "Internal server error getting provider count" });
    }
};

const getProviderById = async (req, res) => {
    const { id: recommendationId } = req.params;
    const clerkUserId = req.query.user_id;
    const userEmail = req.query.email;

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({ success: false, message: "User ID and email are required." });
    }

    try {
        const internalUserId = await getInternalUserIdByEmail(userEmail, clerkUserId, {
            firstName: req.query.firstName || "",
            lastName: req.query.lastName || "",
            phoneNumbers: req.query.phoneNumber ? [{ phoneNumber: req.query.phoneNumber }] : [],
        });

        if (!internalUserId) {
            return res.status(404).json({ success: false, message: "User not found or could not be resolved." });
        }

        // 1. Get the reusable CTE string for what providers are visible.
        const { CteString, queryParams: baseQueryParams } = getVisibleProvidersBaseQuery(internalUserId);

        // 2. Build the final query. It finds all visible providers, then filters
        // that set to get only the requested ID.
        const finalQuery = `
            ${CteString}
            SELECT
                sp.id, sp.business_name, sp.description, sp.email, sp.phone_number,
                sp.tags, sp.website, sp.city, sp.state, sp.zip_code, sp.service_scope,
                sp.price_range, sp.date_of_recommendation, sp.num_likes, sp.provider_message,
                sp.business_contact, sp.recommender_message, sp.visibility, sp.images,
                sp.service_id AS recommended_service_id, s.display_name AS recommended_service_name,
                sc.name as category, sp.recommended_by AS recommender_user_id,
                rec_user.username as recommender_username, rec_user.name AS recommender_name,
                rec_user.phone_number AS recommender_phone, sp.average_rating,
                sp.total_reviews, sp.search_vector,
                BOOL_OR(rl.user_id IS NOT NULL) AS "currentUserLiked",
                COALESCE(
                    ARRAY_AGG(DISTINCT review_users.name) FILTER (WHERE review_users.name IS NOT NULL),
                    '{}'
                ) AS users_who_reviewed
            FROM "VisibleProviderIDs" vp
            JOIN public.service_providers sp ON vp.id = sp.id
            LEFT JOIN public.services s ON sp.service_id = s.service_id
            LEFT JOIN public.service_categories sc ON s.category_id = sc.service_id
            LEFT JOIN public.users rec_user ON sp.recommended_by = rec_user.id
            LEFT JOIN public.recommendation_likes rl ON sp.id = rl.recommendation_id AND rl.user_id = $1
            LEFT JOIN public.reviews rev ON sp.id = rev.provider_id
            LEFT JOIN public.users review_users ON rev.user_id = review_users.id
            WHERE sp.id = $2 -- Filter to the specific provider ID
            GROUP BY
                sp.id, s.service_id, sc.service_id, rec_user.id;
        `;
        
        // 3. Combine the parameters for the final execution.
        const finalParams = [...baseQueryParams, recommendationId];
        const result = await pool.query(finalQuery, finalParams);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Provider not found or not accessible" });
        }
        res.json({ success: true, provider: result.rows[0] });
    } catch (err) {
        console.error("Database error in getProviderById:", err);
        res.status(500).json({ success: false, message: "Error fetching provider", error: err.message });
    }
};

const getRecommendationsByTargetUser = async (req, res) => {
    const targetUserEmailForLookup = req.query.target_email; 
    const clerkUserIdForAuth = req.query.user_id;
    const userEmailForAuth = req.query.email;

    if (!targetUserEmailForLookup || !clerkUserIdForAuth || !userEmailForAuth) {
        return res.status(400).json({ success: false, message: "Target email, authenticated user ID, and authenticated user email are required." });
    }

    try {
        // Resolve the internal ID for the currently logged-in user
        const authenticatedInternalUserId = await getInternalUserIdByEmail(userEmailForAuth, clerkUserIdForAuth, {
             firstName: req.query.firstName || "",
             lastName: req.query.lastName || "",
             phoneNumbers: req.query.phoneNumber ? [{ phoneNumber: req.query.phoneNumber }] : [],
        });
        if (!authenticatedInternalUserId) {
            return res.status(404).json({ success: false, message: "Authenticated user not found or could not be resolved." });
        }

        // Resolve the internal ID for the user whose recommendations we want to see
        const targetUserRes = await pool.query("SELECT id FROM users WHERE email = $1", [targetUserEmailForLookup]);
        if (targetUserRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Target user not found by email." });
        }
        const targetInternalUserId = targetUserRes.rows[0].id;

        // 1. Get the reusable CTE string based on the *authenticated* user's visibility.
        const { CteString, queryParams: baseParams } = getVisibleProvidersBaseQuery(authenticatedInternalUserId);
        
        // 2. Build the final query.
        const finalQuery = `
            ${CteString}
            SELECT
                sp.id, sp.business_name, sp.description, sp.email, sp.phone_number,
                sp.tags, sp.website, sp.city, sp.state, sp.zip_code, sp.service_scope,
                sp.price_range, sp.date_of_recommendation, sp.num_likes, sp.provider_message,
                sp.business_contact, sp.recommender_message, sp.visibility, sp.images,
                sp.service_id AS recommended_service_id, s.display_name AS recommended_service_name,
                sc.name as category, sp.recommended_by AS recommender_user_id,
                rec_user.username as recommender_username, rec_user.name AS recommender_name,
                rec_user.phone_number AS recommender_phone, sp.average_rating,
                sp.total_reviews, sp.search_vector,
                BOOL_OR(rl.user_id IS NOT NULL) AS "currentUserLiked",
                COALESCE(
                    ARRAY_AGG(DISTINCT review_users.name) FILTER (WHERE review_users.name IS NOT NULL),
                    '{}'
                ) AS users_who_reviewed
            FROM "VisibleProviderIDs" vp
            JOIN public.service_providers sp ON vp.id = sp.id
            LEFT JOIN public.services s ON sp.service_id = s.service_id
            LEFT JOIN public.service_categories sc ON s.category_id = sc.service_id
            LEFT JOIN public.users rec_user ON sp.recommended_by = rec_user.id
            LEFT JOIN public.recommendation_likes rl ON sp.id = rl.recommendation_id AND rl.user_id = $1
            LEFT JOIN public.reviews rev ON sp.id = rev.provider_id
            LEFT JOIN public.users review_users ON rev.user_id = review_users.id
            -- Filter the visible providers to only those recommended by the target user.
            WHERE sp.recommended_by = $2
            GROUP BY
                sp.id, s.service_id, sc.service_id, rec_user.id
            ORDER BY
                sp.date_of_recommendation DESC;
        `;

        // 3. The parameters are the authenticated user's ID ($1) and the target user's ID ($2).
        const finalParams = [...baseParams, targetInternalUserId];
        const result = await pool.query(finalQuery, finalParams);

        res.json({ success: true, recommendations: result.rows });
    } catch (error) {
        console.error("Database error in getRecommendationsByTargetUser:", error);
        res.status(500).json({ success: false, message: "Failed to fetch user recommendations", error: error.message });
    }
};

const executeFtsQuery = async (CteString, baseParams, ftsInputString, userState = null) => {
    if (!ftsInputString || ftsInputString.trim().length === 0) {
        return [];
    }

    let localityCondition = '';
    const queryParams = [...baseParams, ftsInputString];
    
    const ftsMatchCondition = `sp.search_vector @@ to_tsquery('english', $${baseParams.length + 1})`;

    if (userState) {
        const stateParamIndex = baseParams.length + 2;
        localityCondition = `AND (sp.service_scope = 'remote' OR (sp.service_scope = 'local' AND sp.state = $${stateParamIndex}))`;
        queryParams.push(userState);
    }

    const ftsQuery = `
        ${CteString}
        SELECT 
            sp.*,
            s.display_name AS recommended_service_name,
            sc.name as category,
            ts_rank_cd(sp.search_vector, to_tsquery('english', $${baseParams.length + 1})) as rank
        FROM "VisibleProviderIDs" vp
        JOIN public.service_providers sp ON vp.id = sp.id
        LEFT JOIN public.services s ON sp.service_id = s.service_id
        LEFT JOIN public.service_categories sc ON s.category_id = sc.service_id
        WHERE ${ftsMatchCondition}
        ${localityCondition}
        ORDER BY rank DESC
        LIMIT 10;
    `;

    const result = await pool.query(ftsQuery, queryParams);
    return result.rows;
};


const searchVisibleProviders = async (req, res) => {
    const { q } = req.query;
    const clerkUserId = req.query.user_id;
    const userEmail = req.query.email;
    const userState = req.query.state;
    const searchQuery = q?.toLowerCase().trim();

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({ success: false, message: "User ID and email are required to perform search." });
    }
    if (!searchQuery) {
        return res.json({ success: true, providers: [] });
    }

    try {
        const internalUserId = await getInternalUserIdByEmail(userEmail, clerkUserId, {
            firstName: req.query.firstName || "",
            lastName: req.query.lastName || "",
            phoneNumbers: req.query.phoneNumber ? [{ phoneNumber: req.query.phoneNumber }] : [],
        });
        if (!internalUserId) {
            return res.status(404).json({ success: false, message: "User not found or could not be resolved for search." });
        }

        const { CteString, queryParams: baseVisibilityParams } = getVisibleProvidersBaseQuery(internalUserId);

        const searchTokens = searchQuery.split(/\s+/).filter(token => token.length > 0);
        let results = [];

        // Stage 1: Exact matches
        if (searchTokens.length > 1) { 
            const phraseTsQuery = searchTokens.join(' <-> ');
            results = await executeFtsQuery(CteString, baseVisibilityParams, phraseTsQuery, userState);
        }

        // Stage 2: All terms search (AND)
        if (results.length === 0 && searchTokens.length > 0) {
            const allTermsTsQuery = searchTokens.join(' & ');
            results = await executeFtsQuery(CteString, baseVisibilityParams, allTermsTsQuery, userState);
        }

        // Stage 3: Any term search (OR) with synonyms
        if (results.length === 0 && searchTokens.length > 0) {
            const queryParts = [];
            for (const token of searchTokens) {
                const tokenAndSynonyms = [token];
                const synonymRes = await pool.query(
                    "SELECT synonyms FROM custom_synonyms WHERE term = $1",
                    [token]
                );
                if (synonymRes.rows.length > 0 && synonymRes.rows[0].synonyms) {
                    const fetchedSynonyms = synonymRes.rows[0].synonyms.split(',').map(s => s.trim()).filter(s => s.length > 0);
                    tokenAndSynonyms.push(...fetchedSynonyms);
                }
                queryParts.push(`(${tokenAndSynonyms.join(' | ')})`);
            }
            const anyTermWithSynonymsTsQuery = queryParts.join(' | ');
            results = await executeFtsQuery(CteString, baseVisibilityParams, anyTermWithSynonymsTsQuery, userState);
        }

        // Stage 4: Fallback to ILIKE
        if (results.length === 0) {
            const ilikeSearchQuery = `%${searchQuery}%`;
            let localityCondition = '';
            let fallbackParams = [...baseVisibilityParams, ilikeSearchQuery];
            
            if (userState) {
                const stateParamIndex = baseVisibilityParams.length + 2;
                localityCondition = `AND (sp.service_scope = 'remote' OR (sp.service_scope = 'local' AND sp.state = $${stateParamIndex}))`;
                fallbackParams.push(userState);
            }
            
            const fallbackQuery = `
                ${CteString}
                SELECT sp.*, s.display_name AS recommended_service_name, sc.name as category, 0 as rank
                FROM "VisibleProviderIDs" vp
                JOIN public.service_providers sp ON vp.id = sp.id
                LEFT JOIN public.services s ON sp.service_id = s.service_id
                LEFT JOIN public.service_categories sc ON s.category_id = sc.service_id
                WHERE
                    (LOWER(COALESCE(sp.business_name, '')) LIKE $2
                    OR LOWER(COALESCE(sc.name, '')) LIKE $2
                    OR LOWER(COALESCE(sp.description, '')) LIKE $2
                    OR EXISTS (
                        SELECT 1 FROM unnest(sp.tags) AS tag
                        WHERE LOWER(tag) LIKE $2
                    ))
                    ${localityCondition}
                LIMIT 10;
            `;
            const fallbackResult = await pool.query(fallbackQuery, fallbackParams);
            results = fallbackResult.rows;
        }

        res.json({ success: true, providers: results });
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ success: false, error: "Failed to search providers", message: error.message });
    }
};

const likeRecommendation = async (req, res) => {
    const { id: providerId } = req.params; // Assuming :id in the route is providerId
    const { userId: clerkUserId, userEmail } = req.body;

    if (!clerkUserId || !userEmail) {
        return res.status(401).json({ success: false, message: "User ID and Email are required." });
    }
    if (!providerId) {
        return res.status(400).json({ success: false, message: "Provider ID is required." });
    }

    let internalUserId;
    try {
        internalUserId = await getInternalUserIdByEmail(userEmail, clerkUserId);
        if (!internalUserId) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
    } catch (userError) {
        console.error("Error resolving internal user ID for like action:", userError);
        return res.status(500).json({ success: false, message: "Error processing user information.", error: userError.message });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const likeCheckRes = await client.query(
            `SELECT id FROM public.recommendation_likes WHERE user_id = $1 AND recommendation_id = $2`,
            [internalUserId, providerId]
        );

        let currentUserLiked;
        let newNumLikes;
        let message;

        if (likeCheckRes.rows.length > 0) {
            // User has already liked, so unlike
            await client.query(
                `DELETE FROM public.recommendation_likes WHERE user_id = $1 AND recommendation_id = $2`,
                [internalUserId, providerId]
            );
            const updateResult = await client.query(
                `UPDATE public.service_providers
                 SET num_likes = GREATEST(0, num_likes - 1)
                 WHERE id = $1
                 RETURNING num_likes`,
                [providerId]
            );
            if (updateResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, message: "Provider not found for unliking." });
            }
            newNumLikes = updateResult.rows[0].num_likes;
            currentUserLiked = false;
            message = "Recommendation unliked successfully.";

        } else {
            // User has not liked, so like
            await client.query(
                `INSERT INTO public.recommendation_likes (user_id, recommendation_id) VALUES ($1, $2)`,
                [internalUserId, providerId]
            );
            const updateResult = await client.query(
                `UPDATE public.service_providers
                 SET num_likes = num_likes + 1
                 WHERE id = $1
                 RETURNING num_likes`,
                [providerId]
            );
            if (updateResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, message: "Provider not found for liking." });
            }
            newNumLikes = updateResult.rows[0].num_likes;
            currentUserLiked = true;
            message = "Recommendation liked successfully.";
        }

        await client.query('COMMIT');
        res.json({
            success: true,
            message: message,
            num_likes: newNumLikes,
            currentUserLiked: currentUserLiked
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error in likeRecommendation (toggle) transaction:", error);
        res.status(500).json({ success: false, message: "Failed to process like/unlike for recommendation.", error: error.message });
    } finally {
        client.release();
    }
};

const simpleLikeRecommendation = async (req, res) => {
    // Get the provider ID from the URL parameters
    const { id: providerId } = req.params;
    // Get the internal database user ID directly from the request body
    const { userId } = req.body;

    // Simplified validation
    if (!userId) {
        return res.status(401).json({ success: false, message: "User ID is required." });
    }
    if (!providerId) {
        return res.status(400).json({ success: false, message: "Provider ID is required." });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if the user has already liked this recommendation
        const likeCheckRes = await client.query(
            `SELECT id FROM public.recommendation_likes WHERE user_id = $1 AND recommendation_id = $2`,
            [userId, providerId] // Use userId from req.body directly
        );

        let currentUserLiked;
        let newNumLikes;

        if (likeCheckRes.rows.length > 0) {
            // User has liked, so UNLIKE
            await client.query(
                `DELETE FROM public.recommendation_likes WHERE user_id = $1 AND recommendation_id = $2`,
                [userId, providerId]
            );
            const updateResult = await client.query(
                `UPDATE public.service_providers SET num_likes = GREATEST(0, num_likes - 1) WHERE id = $1 RETURNING num_likes`,
                [providerId]
            );
            newNumLikes = updateResult.rows[0].num_likes;
            currentUserLiked = false;
        } else {
            // User has not liked, so LIKE
            await client.query(
                `INSERT INTO public.recommendation_likes (user_id, recommendation_id) VALUES ($1, $2)`,
                [userId, providerId]
            );
            const updateResult = await client.query(
                `UPDATE public.service_providers SET num_likes = num_likes + 1 WHERE id = $1 RETURNING num_likes`,
                [providerId]
            );
            newNumLikes = updateResult.rows[0].num_likes;
            currentUserLiked = true;
        }

        await client.query('COMMIT');
        res.json({
            success: true,
            message: "Like status toggled successfully.",
            num_likes: newNumLikes,
            currentUserLiked: currentUserLiked
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error in simpleLikeRecommendation transaction:", error);
        res.status(500).json({ success: false, message: "Failed to process like/unlike.", error: error.message });
    } finally {
        client.release();
    }
};

const getPublicRecommendations = async (req, res) => {
    // Note: The original query had a hardcoded ORDER BY. This version uses the
    // dynamic parameters for consistency, but you can change it back if needed.
    const limit = parseInt(req.query.limit, 10) || 10;
    const sortBy = req.query.sortBy || 'num_likes'; // Defaulting to likes as in original query
    const sortOrder = req.query.sortOrder || 'desc';

    try {
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
                sp.business_contact,
                sp.recommender_message,
                sp.visibility,
                sp.images,
                s.service_id AS recommended_service_id,
                s.display_name AS recommended_service_name,
                sc.name as category,
                sp.recommended_by AS recommender_user_id,
                rec_user.username as recommender_username,
                rec_user.name AS recommender_name,
                rec_user.phone_number AS recommender_phone,
                sp.average_rating,
                sp.total_reviews,
                -- Replaced correlated subquery with an aggregate after JOINs
                COALESCE(
                    ARRAY_AGG(DISTINCT review_users.name) FILTER (WHERE review_users.name IS NOT NULL),
                    '{}'
                ) AS users_who_reviewed
            FROM
                public.service_providers sp
            LEFT JOIN
                public.services s ON sp.service_id = s.service_id
            LEFT JOIN
                public.service_categories sc ON s.category_id = sc.service_id
            LEFT JOIN
                public.users rec_user ON sp.recommended_by = rec_user.id
            -- Added JOINs to get reviewer data efficiently
            LEFT JOIN
                public.reviews rev ON sp.id = rev.provider_id
            LEFT JOIN
                public.users review_users ON rev.user_id = review_users.id
            WHERE
                sp.visibility = 'public'
                AND sp.date_of_recommendation IS NOT NULL
            -- Added GROUP BY to handle aggregation and ensure distinct providers
            GROUP BY
                sp.id, s.service_id, sc.service_id, rec_user.id
            ORDER BY 
                sp.${sortBy} ${sortOrder.toUpperCase()},
                sp.date_of_recommendation DESC
            LIMIT $1;
        `;

        const result = await pool.query(query, [limit]);
        res.json({ success: true, providers: result.rows });
    } catch (err) {
        console.error("Database error in getPublicRecommendations:", err);
        res.status(500).json({ 
            success: false, 
            message: "Error fetching public recommendations", 
            error: err.message 
        });
    }
};

const getPublicProviderById = async (req, res) => {
    const { id: providerId } = req.params;

    if (!providerId) {
        return res.status(400).json({ success: false, message: "Provider ID is required." });
    }

    try {
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
                sp.business_contact,
                sp.recommender_message,
                sp.visibility,
                sp.images,
                s.service_id AS recommended_service_id,
                s.display_name AS recommended_service_name,
                sc.name as category,
                sp.recommended_by AS recommender_user_id,
                rec_user.username as recommender_username,
                rec_user.name AS recommender_name,
                rec_user.phone_number AS recommender_phone,
                sp.average_rating,
                sp.total_reviews,
                FALSE AS "currentUserLiked", -- Correct for public, unauthenticated views
                -- Replaced correlated subquery with an aggregate after JOINs
                COALESCE(
                    ARRAY_AGG(DISTINCT review_users.name) FILTER (WHERE review_users.name IS NOT NULL),
                    '{}'
                ) AS users_who_reviewed
            FROM
                public.service_providers sp
            LEFT JOIN
                public.services s ON sp.service_id = s.service_id
            LEFT JOIN
                public.service_categories sc ON s.category_id = sc.service_id
            LEFT JOIN
                public.users rec_user ON sp.recommended_by = rec_user.id
            -- Added JOINs to get reviewer data efficiently
            LEFT JOIN
                public.reviews rev ON sp.id = rev.provider_id
            LEFT JOIN
                public.users review_users ON rev.user_id = review_users.id
            WHERE
                sp.id = $1
                AND sp.visibility = 'public'
            -- Added GROUP BY to handle aggregation, making SELECT DISTINCT unnecessary
            GROUP BY
                sp.id, s.service_id, sc.service_id, rec_user.id;
        `;

        const result = await pool.query(query, [providerId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Provider not found or not publicly accessible"
            });
        }

        res.json({ success: true, provider: result.rows[0] });
    } catch (err) {
        console.error("Database error in getPublicProviderById:", err);
        res.status(500).json({
            success: false,
            message: "Error fetching public provider",
            error: err.message
        });
    }
};

module.exports = {
    getAllVisibleProviders,
    getProviderById,
    getRecommendationsByTargetUser,
    searchVisibleProviders,
    getNewRecommendationsCount,
    getProviderCount,
    likeRecommendation,
    simpleLikeRecommendation,
    getNewestVisibleProviders,
    getPublicRecommendations,
    getPublicProviderById
};

// VAULT OF OLD FUNCTIONS - Inefficient, but kept for reference

// const getPublicRecommendations = async (req, res) => {
//     const limit = parseInt(req.query.limit, 10) || 10;
//     const sortBy = req.query.sortBy || 'date_of_recommendation';
//     const sortOrder = req.query.sortOrder || 'desc';

//     try {
//         const query = `
//             SELECT DISTINCT
//                 sp.id,
//                 sp.business_name,
//                 sp.description,
//                 sp.email,
//                 sp.phone_number,
//                 sp.tags,
//                 sp.website,
//                 sp.city,
//                 sp.state,
//                 sp.zip_code,
//                 sp.service_scope,
//                 sp.price_range,
//                 sp.date_of_recommendation,
//                 sp.num_likes,
//                 sp.provider_message,
//                 sp.business_contact,
//                 sp.recommender_message,
//                 sp.visibility,
//                 sp.images,
//                 sp.service_id AS recommended_service_id,
//                 s.display_name AS recommended_service_name,
//                 sc.name as category,
//                 sp.recommended_by AS recommender_user_id,
//                 rec_user.username as recommender_username,
//                 rec_user.name AS recommender_name,
//                 rec_user.phone_number AS recommender_phone,
//                 sp.average_rating,
//                 sp.total_reviews,
//                 COALESCE(
//                     (SELECT ARRAY_AGG(DISTINCT review_users.name)
//                      FROM public.reviews rev_sub
//                      LEFT JOIN public.users review_users ON rev_sub.user_id = review_users.id
//                      WHERE rev_sub.provider_id = sp.id AND review_users.name IS NOT NULL
//                     ), ARRAY[]::text[]
//                 ) AS users_who_reviewed
//             FROM
//                 public.service_providers sp
//             LEFT JOIN
//                 public.services s ON sp.service_id = s.service_id
//             LEFT JOIN
//                 public.service_categories sc ON s.category_id = sc.service_id
//             LEFT JOIN
//                 public.users rec_user ON sp.recommended_by = rec_user.id
//             WHERE
//                 sp.visibility = 'public'
//                 AND sp.date_of_recommendation IS NOT NULL
//             ORDER BY 
//                 sp.num_likes DESC,
//                 sp.date_of_recommendation DESC,
//                 sp.id DESC
//             LIMIT $1;
//         `;

//         const result = await pool.query(query, [limit]);
//         res.json({ success: true, providers: result.rows });
//     } catch (err) {
//         console.error("Database error in getPublicRecommendations:", err);
//         res.status(500).json({ 
//             success: false, 
//             message: "Error fetching public recommendations", 
//             error: err.message 
//         });
//     }
// };

// const getPublicProviderById = async (req, res) => {
//     const { id: providerId } = req.params;

//     if (!providerId) {
//         return res.status(400).json({ success: false, message: "Provider ID is required." });
//     }

//     try {
//         const query = `
//             SELECT DISTINCT
//                 sp.id,
//                 sp.business_name,
//                 sp.description,
//                 sp.email,
//                 sp.phone_number,
//                 sp.tags,
//                 sp.website,
//                 sp.city,
//                 sp.state,
//                 sp.zip_code,
//                 sp.service_scope,
//                 sp.price_range,
//                 sp.date_of_recommendation,
//                 sp.num_likes,
//                 sp.provider_message,
//                 sp.business_contact,
//                 sp.recommender_message,
//                 sp.visibility,
//                 sp.images,
//                 sp.service_id AS recommended_service_id,
//                 s.display_name AS recommended_service_name,
//                 sc.name as category,
//                 sp.recommended_by AS recommender_user_id,
//                 rec_user.username as recommender_username,
//                 rec_user.name AS recommender_name,
//                 rec_user.phone_number AS recommender_phone,
//                 sp.average_rating,
//                 sp.total_reviews,
//                 FALSE AS "currentUserLiked", -- Anonymous users haven't liked anything
//                 COALESCE(
//                     (SELECT ARRAY_AGG(DISTINCT review_users.name)
//                      FROM public.reviews rev_sub
//                      LEFT JOIN public.users review_users ON rev_sub.user_id = review_users.id
//                      WHERE rev_sub.provider_id = sp.id AND review_users.name IS NOT NULL
//                     ), ARRAY[]::text[]
//                 ) AS users_who_reviewed
//             FROM
//                 public.service_providers sp
//             LEFT JOIN
//                 public.services s ON sp.service_id = s.service_id
//             LEFT JOIN
//                 public.service_categories sc ON s.category_id = sc.service_id
//             LEFT JOIN
//                 public.users rec_user ON sp.recommended_by = rec_user.id
//             WHERE
//                 sp.id = $1
//                 AND sp.visibility = 'public'
//         `;

//         const result = await pool.query(query, [providerId]);

//         if (result.rows.length === 0) {
//             return res.status(404).json({ 
//                 success: false, 
//                 message: "Provider not found or not publicly accessible" 
//             });
//         }

//         res.json({ success: true, provider: result.rows[0] });
//     } catch (err) {
//         console.error("Database error in getPublicProviderById:", err);
//         res.status(500).json({ 
//             success: false, 
//             message: "Error fetching public provider", 
//             error: err.message 
//         });
//     }
// };

// const searchVisibleProviders = async (req, res) => {
//     const { q } = req.query;
//     const clerkUserId = req.query.user_id;
//     const userEmail = req.query.email;
//     const userState = req.query.state; // Add state parameter for locality filtering
//     const searchQuery = q?.toLowerCase().trim();

//     if (!clerkUserId || !userEmail) {
//         return res.status(400).json({ success: false, message: "User ID and email are required to perform search." });
//     }
//     if (!searchQuery) {
//         return res.json({ success: true, providers: [] });
//     }

//     try {
//         const internalUserId = await getInternalUserIdByEmail(userEmail, clerkUserId, {
//             firstName: req.query.firstName || "",
//             lastName: req.query.lastName || "",
//             phoneNumbers: req.query.phoneNumber ? [{ phoneNumber: req.query.phoneNumber }] : [],
//         });
//         if (!internalUserId) {
//             return res.status(404).json({ success: false, message: "User not found or could not be resolved for search." });
//         }

//         const { query: baseVisibilityQuery, queryParams: baseVisibilityParams } = getVisibleProvidersBaseQuery(internalUserId);

//         const searchTokens = searchQuery.split(/\s+/).filter(token => token.length > 0);
        
//         let results = [];


//         // Multistage searching with decreasing restrictiveness to get most relevant results first but also expand the search if needed

//         // Stage 1: Exact matches
//         if (searchTokens.length > 1) { 
//             const phraseTsQuery = searchTokens.join('<->');
//             results = await executeFtsQuery(baseVisibilityQuery, baseVisibilityParams, phraseTsQuery, userState);
//         }

//         // Stage 2: All terms search (AND)
//         if (results.length === 0 && searchTokens.length > 0) {
//             const allTermsTsQuery = searchTokens.join(' & ');
//             results = await executeFtsQuery(baseVisibilityQuery, baseVisibilityParams, allTermsTsQuery, userState);
//         }

//         // Stage 3: Any term search (OR) with synonyms
//         if (results.length === 0 && searchTokens.length > 0) {
//             const queryParts = [];
//             for (const token of searchTokens) {
//                 const tokenAndSynonyms = [token];
//                 // Fetch synonyms for each token
//                 const synonymRes = await pool.query(
//                     "SELECT synonyms FROM custom_synonyms WHERE term = $1",
//                     [token]
//                 );
//                 if (synonymRes.rows.length > 0 && synonymRes.rows[0].synonyms) {
//                     const fetchedSynonyms = synonymRes.rows[0].synonyms.split(',').map(s => s.trim()).filter(s => s.length > 0);
//                     tokenAndSynonyms.push(...fetchedSynonyms);
//                 }
//                 // Group the token and its synonyms with OR
//                 queryParts.push(`(${tokenAndSynonyms.join(' | ')})`);
//             }
//             const anyTermWithSynonymsTsQuery = queryParts.join(' | ');
//             results = await executeFtsQuery(baseVisibilityQuery, baseVisibilityParams, anyTermWithSynonymsTsQuery, userState);
//         }

//         // Stage 4: Fallback to ILIKE 
//         if (results.length === 0) {
//             const ilikeSearchQuery = `%${searchQuery}%`;
            
//             // Build locality filter condition for fallback
//             let localityCondition = '';
//             let fallbackParams = [...baseVisibilityParams, ilikeSearchQuery];
            
//             if (userState) {
//                 const stateParamIndex = baseVisibilityParams.length + 2;
//                 localityCondition = `AND (VisibleProvidersCTE.service_scope = 'remote' OR (VisibleProvidersCTE.service_scope = 'local' AND VisibleProvidersCTE.state = $${stateParamIndex}))`;
//                 fallbackParams.push(userState);
//             }
            
//             const fallbackQuery = `
//                 SELECT *, 0 as rank -- Add a dummy rank column for consistent response shape
//                 FROM (${baseVisibilityQuery}) AS VisibleProvidersCTE
//                 WHERE
//                     (LOWER(COALESCE(VisibleProvidersCTE.business_name, '')) LIKE $${baseVisibilityParams.length + 1}
//                     OR LOWER(COALESCE(VisibleProvidersCTE.category, '')) LIKE $${baseVisibilityParams.length + 1}
//                     OR LOWER(COALESCE(VisibleProvidersCTE.description, '')) LIKE $${baseVisibilityParams.length + 1}
//                     OR EXISTS (
//                         SELECT 1 FROM unnest(VisibleProvidersCTE.tags) AS tag
//                         WHERE LOWER(tag) LIKE $${baseVisibilityParams.length + 1}
//                     ))
//                     ${localityCondition}
//                 LIMIT 10;
//             `;
//             const fallbackResult = await pool.query(fallbackQuery, fallbackParams);
//             results = fallbackResult.rows;
//         }

//         res.json({ success: true, providers: results });
//     } catch (error) {
//         console.error("Search error:", error);
//         res.status(500).json({ success: false, error: "Failed to search providers", message: error.message });
//     }
// };

// const executeFtsQuery = async (baseQuery, baseParams, ftsInputString, userState = null) => {
//     if (!ftsInputString || ftsInputString.trim().length === 0) {
//         return [];
//     }
//     const ftsParamIndex = baseParams.length + 1;
    
//     // Build locality filter condition
//     let localityCondition = '';
//     let queryParams = [...baseParams, ftsInputString];
    
//     if (userState) {
//         const stateParamIndex = baseParams.length + 2;
//         localityCondition = `AND (VisibleProvidersCTE.service_scope = 'remote' OR (VisibleProvidersCTE.service_scope = 'local' AND VisibleProvidersCTE.state = $${stateParamIndex}))`;
//         queryParams.push(userState);
//     }
    
//     const ftsQuery = `
//         SELECT *, ts_rank_cd(search_vector, to_tsquery('english', $${ftsParamIndex})) as rank
//         FROM (${baseQuery}) AS VisibleProvidersCTE
//         WHERE VisibleProvidersCTE.search_vector @@ to_tsquery('english', $${ftsParamIndex})
//         ${localityCondition}
//         ORDER BY rank DESC
//         LIMIT 10;
//     `;
//     const result = await pool.query(ftsQuery, queryParams);
//     return result.rows;
// }

// const getRecommendationsByTargetUser = async (req, res) => {
//     const targetUserEmailForLookup = req.query.target_email; 
//     const clerkUserIdForAuth = req.query.user_id;
//     const userEmailForAuth = req.query.email;

//     if (!targetUserEmailForLookup || !clerkUserIdForAuth || !userEmailForAuth) {
//         return res.status(400).json({ success: false, message: "Target email, authenticated user ID, and authenticated user email are required." });
//     }

//     try {
//         const authenticatedInternalUserId = await getInternalUserIdByEmail(userEmailForAuth, clerkUserIdForAuth, {
//              firstName: req.query.firstName || "",
//              lastName: req.query.lastName || "",
//              phoneNumbers: req.query.phoneNumber ? [{ phoneNumber: req.query.phoneNumber }] : [],
//         });
//         if (!authenticatedInternalUserId) {
//             return res.status(404).json({ success: false, message: "Authenticated user not found or could not be resolved." });
//         }

//         const targetUserRes = await pool.query("SELECT id FROM users WHERE email = $1", [targetUserEmailForLookup]);
//         if (targetUserRes.rows.length === 0) {
//             return res.status(404).json({ success: false, message: "Target user not found by email." });
//         }
//         const targetInternalUserId = targetUserRes.rows[0].id;

//         const { query: baseQuery, queryParams: baseParams } = getVisibleProvidersBaseQuery(authenticatedInternalUserId);
//         const targetUserIdParamIndex = baseParams.length + 1;
//         const finalQuery = `
//             SELECT * FROM (${baseQuery}) AS VisibleProvidersCTE
//             WHERE VisibleProvidersCTE.recommender_user_id = $${targetUserIdParamIndex}
//             ORDER BY VisibleProvidersCTE.date_of_recommendation DESC;
//         `;
//         const result = await pool.query(finalQuery, [...baseParams, targetInternalUserId]);
//         res.json({ success: true, recommendations: result.rows });
//     } catch (error) {
//         console.error("Database error in getRecommendationsByTargetUser:", error);
//         res.status(500).json({ success: false, message: "Failed to fetch user recommendations", error: error.message });
//     }
// };
// const getProviderById = async (req, res) => {
//     const { id: recommendationId } = req.params;
//     const clerkUserId = req.query.user_id;
//     const userEmail = req.query.email;

//     if (!clerkUserId || !userEmail) {
//         return res.status(400).json({ success: false, message: "User ID and email are required." });
//     }

//     try {
//         const internalUserId = await getInternalUserIdByEmail(userEmail, clerkUserId, {
//             firstName: req.query.firstName || "",
//             lastName: req.query.lastName || "",
//             phoneNumbers: req.query.phoneNumber ? [{ phoneNumber: req.query.phoneNumber }] : [],
//         });

//         if (!internalUserId) {
//             return res.status(404).json({ success: false, message: "User not found or could not be resolved." });
//         }
//         const { query: baseVisibilityQuery, queryParams: baseVisibilityParams } = getVisibleProvidersBaseQuery(internalUserId);
//         const providerIdParamIndex = baseVisibilityParams.length + 1;
//         const finalQuery = `SELECT * FROM (${baseVisibilityQuery}) AS VisibleProvidersCTE WHERE VisibleProvidersCTE.id = $${providerIdParamIndex};`;
//         const result = await pool.query(finalQuery, [...baseVisibilityParams, recommendationId]);

//         if (result.rows.length === 0) {
//             return res.status(404).json({ success: false, message: "Provider not found or not accessible" });
//         }
//         res.json({ success: true, provider: result.rows[0] });
//     } catch (err) {
//         console.error("Database error in getProviderById:", err);
//         res.status(500).json({ success: false, message: "Error fetching provider", error: err.message });
//     }
// };

// const getProviderCount = async (req, res) => {
//     const clerkUserId = req.query.user_id;
//     const userEmail = req.query.email;

//     if (!clerkUserId || !userEmail) {
//         return res.status(400).json({ success: false, message: "User ID and email are required." });
//     }

//     try {
//         const internalUserId = await getInternalUserIdByEmail(userEmail, clerkUserId, {
//             firstName: req.query.firstName || "",
//             lastName: req.query.lastName || "",
//             phoneNumbers: req.query.phoneNumber ? [{ phoneNumber: req.query.phoneNumber }] : [],
//         });
//         if (!internalUserId) {
//             return res.status(404).json({ success: false, message: "User not found or could not be resolved." });
//         }
//         const { query: baseQuery, queryParams } = getVisibleProvidersBaseQuery(internalUserId);
//         const countQuery = `SELECT COUNT(*) FROM (${baseQuery}) AS visible_providers_subquery`;
//         const result = await pool.query(countQuery, queryParams);
//         res.json({ count: parseInt(result.rows[0].count, 10) });
//     } catch (error) {
//         console.error("Error getting visible provider count:", error.message);
//         res.status(500).json({ error: "Internal server error getting provider count" });
//     }
// };

// const getVisibleProvidersBaseQuery = (currentInternalUserId) => {
//     const query = `
//     SELECT DISTINCT
//         sp.id,
//         sp.business_name,
//         sp.description,
//         sp.email,
//         sp.phone_number,
//         sp.tags,
//         sp.website,
//         sp.city,
//         sp.state,
//         sp.zip_code,
//         sp.service_scope,
//         sp.price_range,
//         sp.date_of_recommendation,
//         sp.num_likes,
//         sp.provider_message,
//         sp.business_contact,
//         sp.recommender_message,
//         sp.visibility,
//         sp.images,
//         sp.service_id AS recommended_service_id,
//         s.display_name AS recommended_service_name,
//         sc.name as category,
//         sp.recommended_by AS recommender_user_id,
//         rec_user.username as recommender_username,
//         rec_user.name AS recommender_name,
//         rec_user.phone_number AS recommender_phone,
//         sp.average_rating,
//         sp.total_reviews,
//         sp.search_vector,
//         EXISTS (
//             SELECT 1
//             FROM public.recommendation_likes rl
//             WHERE rl.recommendation_id = sp.id AND rl.user_id = $1
//         ) AS "currentUserLiked",
//         COALESCE(
//             (SELECT ARRAY_AGG(DISTINCT review_users.name)
//              FROM public.reviews rev_sub
//              LEFT JOIN public.users review_users ON rev_sub.user_id = review_users.id
//              WHERE rev_sub.provider_id = sp.id AND review_users.name IS NOT NULL
//             ), ARRAY[]::text[]
//         ) AS users_who_reviewed
//     FROM
//         public.service_providers sp
//     LEFT JOIN
//         public.services s ON sp.service_id = s.service_id
//     LEFT JOIN
//         public.service_categories sc ON s.category_id = sc.service_id
//     LEFT JOIN
//         public.users rec_user ON sp.recommended_by = rec_user.id
//     LEFT JOIN
//         public.user_connections con_direct ON
//             ((sp.recommended_by = con_direct.user_id AND con_direct.connected_user_id = $1) OR
//              (sp.recommended_by = con_direct.connected_user_id AND con_direct.user_id = $1)) AND con_direct.status = 'accepted'
//     LEFT JOIN
//         public.community_shares cs ON sp.id = cs.service_provider_id
//     LEFT JOIN
//         public.community_memberships cm_user_x ON
//             cs.community_id = cm_user_x.community_id AND
//             cm_user_x.user_id = $1 AND
//             cm_user_x.status = 'approved'
//     WHERE
//         sp.recommended_by = $1
//         OR
//         sp.visibility = 'public'
//         OR
//         (sp.visibility = 'connections' AND con_direct.user_id IS NOT NULL)
//         OR
//         (sp.visibility = 'communities' AND cm_user_x.user_id IS NOT NULL)
//   `;
//     const queryParams = [currentInternalUserId];
//     return { query, queryParams };
// };

// const getNewestVisibleProviders = async (req, res) => {
//     const clerkUserId = req.query.user_id;
//     const userEmail = req.query.email;
//     const limit = parseInt(req.query.limit, 10) || 5;
//     const sortBy = req.query.sortBy || 'date_of_recommendation';
//     const sortOrder = req.query.sortOrder || 'desc';

//     if (!clerkUserId || !userEmail) {
//         return res.status(400).json({ success: false, message: "User ID and email are required." });
//     }

//     try {
//         const internalUserId = await getInternalUserIdByEmail(userEmail, clerkUserId, {
//             firstName: req.query.firstName || "",
//             lastName: req.query.lastName || "",
//             phoneNumbers: req.query.phoneNumber ? [{ phoneNumber: req.query.phoneNumber }] : [],
//         });
//         if (!internalUserId) {
//             return res.status(404).json({ success: false, message: "User not found or could not be resolved." });
//         }

//         const { query: baseQuery, queryParams } = getVisibleProvidersBaseQuery(internalUserId);

//         const finalQuery = `
//             SELECT * FROM (${baseQuery}) AS VisibleProvidersCTE
//             WHERE VisibleProvidersCTE.date_of_recommendation IS NOT NULL
//             AND VisibleProvidersCTE.recommender_user_id != $${queryParams.length + 1}
//             ORDER BY VisibleProvidersCTE.${sortBy} ${sortOrder.toUpperCase()}
//             LIMIT $${queryParams.length + 2};
//         `;

//         console.log("Executing SQL:", finalQuery);
//         console.log("With Params:", [...queryParams, internalUserId, limit]);
//         const result = await pool.query(finalQuery, [...queryParams, internalUserId, limit]);
//         res.json({ success: true, providers: result.rows });
//     } catch (err) {
//         console.error("Database error in getNewestVisibleProviders:", err);
//         res.status(500).json({ success: false, message: "Error fetching newest visible providers", error: err.message });
//     }
// };


// const getNewRecommendationsCount = async (req, res) => {
//     const { user_id: clerkUserId, email: userEmail } = req.query;

//     // 1. Validate input
//     if (!clerkUserId || !userEmail) {
//         return res.status(400).json({ 
//             success: false, 
//             message: "User ID and email are required." 
//         });
//     }

//     try {
//         // 2. Resolve the internal application user ID
//         const internalUserId = await getInternalUserIdByEmail(userEmail, clerkUserId);
//         if (!internalUserId) {
//             return res.status(404).json({ success: false, message: "User not found." });
//         }

//         // 3. Fetch the user's last sign-in timestamp from your 'users' table
//         const userQuery = await pool.query(
//             'SELECT last_sign_in_at FROM users WHERE id = $1', 
//             [internalUserId]
//         );

//         if (userQuery.rows.length === 0) {
//             return res.status(404).json({ success: false, message: "User data not found in users table." });
//         }
        
//         const lastSignInAt = userQuery.rows[0].last_sign_in_at;

//         // If the user has never signed in before, there are no "new" recommendations.
//         // This handles new users gracefully.
//         if (!lastSignInAt) {
//             return res.json({ success: true, newRecommendationCount: 0 });
//         }

//         // 4. Reuse your existing visibility logic to form the base of the query.
//         // This is CRUCIAL for consistency. You're counting from the same pool of
//         // recommendations that the user is allowed to see.
//         const { query: baseQuery, queryParams } = getVisibleProvidersBaseQuery(internalUserId);

//         // 5. Construct the final, efficient COUNT query.
//         // It wraps the visibility logic in a Common Table Expression (CTE) and
//         // filters it by the recommendation date.
//         const finalQuery = `
//             SELECT COUNT(*) AS new_recommendation_count
//             FROM (${baseQuery}) AS VisibleProvidersCTE
//             WHERE VisibleProvidersCTE.date_of_recommendation > $${queryParams.length + 1};
//         `;
        
//         // The parameters are the ones from your base visibility query,
//         // PLUS the lastSignInAt timestamp for the final WHERE clause.
//         const finalQueryParams = [...queryParams, lastSignInAt];

//         // 6. Execute the query
//         const result = await pool.query(finalQuery, finalQueryParams);

//         // Safely parse the count result, which comes back from the DB as a string.
//         const newCount = parseInt(result.rows[0].new_recommendation_count, 10) || 0;

//         // 7. Send the successful response
//         res.json({ success: true, newRecommendationCount: newCount });

//     } catch (err) {
//         console.error("Database error in getNewRecommendationsCount:", err);
//         res.status(500).json({ 
//             success: false, 
//             message: "An error occurred while fetching the new recommendation count.", 
//             error: err.message 
//         });
//     }
// };


// const getAllVisibleProviders = async (req, res) => {
//     const clerkUserId = req.query.user_id;
//     const userEmail = req.query.email;

//     if (!clerkUserId || !userEmail) {
//         return res.status(400).json({ success: false, message: "User ID and email are required." });
//     }

//     try {
//         const internalUserId = await getInternalUserIdByEmail(userEmail, clerkUserId, {
//             firstName: req.query.firstName || "",
//             lastName: req.query.lastName || "",
//             phoneNumbers: req.query.phoneNumber ? [{ phoneNumber: req.query.phoneNumber }] : [],
//         });
//         if (!internalUserId) {
//             return res.status(404).json({ success: false, message: "User not found or could not be resolved." });
//         }

//         const { query: baseQuery, queryParams } = getVisibleProvidersBaseQuery(internalUserId);
//         const finalQuery = `SELECT * FROM (${baseQuery}) AS VisibleProvidersCTE ORDER BY VisibleProvidersCTE.business_name;`;
//         const result = await pool.query(finalQuery, queryParams);
//         res.json({ success: true, providers: result.rows });
//     } catch (err) {
//         console.error("Database error in getAllVisibleProviders:", err);
//         res.status(500).json({ success: false, message: "Error fetching visible providers", error: err.message });
//     }
// };