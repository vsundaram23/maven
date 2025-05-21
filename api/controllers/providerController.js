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
        sp.search_vector,
        EXISTS (
            SELECT 1
            FROM public.recommendation_likes rl
            WHERE rl.recommendation_id = sp.id AND rl.user_id = $1
        ) AS "currentUserLiked"
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
    const queryParams = [currentInternalUserId];
    return { query, queryParams };
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

        const { query: baseQuery, queryParams } = getVisibleProvidersBaseQuery(internalUserId);
        const finalQuery = `SELECT * FROM (${baseQuery}) AS VisibleProvidersCTE ORDER BY VisibleProvidersCTE.business_name;`;
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
        const { query: baseQuery, queryParams } = getVisibleProvidersBaseQuery(internalUserId);
        const countQuery = `SELECT COUNT(*) FROM (${baseQuery}) AS visible_providers_subquery`;
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
        const { query: baseVisibilityQuery, queryParams: baseVisibilityParams } = getVisibleProvidersBaseQuery(internalUserId);
        const providerIdParamIndex = baseVisibilityParams.length + 1;
        const finalQuery = `SELECT * FROM (${baseVisibilityQuery}) AS VisibleProvidersCTE WHERE VisibleProvidersCTE.id = $${providerIdParamIndex};`;
        const result = await pool.query(finalQuery, [...baseVisibilityParams, recommendationId]);

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
        const authenticatedInternalUserId = await getInternalUserIdByEmail(userEmailForAuth, clerkUserIdForAuth, {
             firstName: req.query.firstName || "",
             lastName: req.query.lastName || "",
             phoneNumbers: req.query.phoneNumber ? [{ phoneNumber: req.query.phoneNumber }] : [],
        });
        if (!authenticatedInternalUserId) {
            return res.status(404).json({ success: false, message: "Authenticated user not found or could not be resolved." });
        }

        const targetUserRes = await pool.query("SELECT id FROM users WHERE email = $1", [targetUserEmailForLookup]);
        if (targetUserRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Target user not found by email." });
        }
        const targetInternalUserId = targetUserRes.rows[0].id;

        const { query: baseQuery, queryParams: baseParams } = getVisibleProvidersBaseQuery(authenticatedInternalUserId);
        const targetUserIdParamIndex = baseParams.length + 1;
        const finalQuery = `
            SELECT * FROM (${baseQuery}) AS VisibleProvidersCTE
            WHERE VisibleProvidersCTE.recommender_user_id = $${targetUserIdParamIndex}
            ORDER BY VisibleProvidersCTE.date_of_recommendation DESC;
        `;
        const result = await pool.query(finalQuery, [...baseParams, targetInternalUserId]);
        res.json({ success: true, recommendations: result.rows });
    } catch (error) {
        console.error("Database error in getRecommendationsByTargetUser:", error);
        res.status(500).json({ success: false, message: "Failed to fetch user recommendations", error: error.message });
    }
};

const searchVisibleProviders = async (req, res) => {
    const { q } = req.query;
    const clerkUserId = req.query.user_id;
    const userEmail = req.query.email;
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

        const { query: baseVisibilityQuery, queryParams: baseVisibilityParams } = getVisibleProvidersBaseQuery(internalUserId);
        
        let ftsInputString = "";
        const formattedOriginalQuery = prepareTermForTsqueryFormatting(searchQuery);
        
        if (formattedOriginalQuery && formattedOriginalQuery.length > 0) {
            ftsInputString = formattedOriginalQuery; // Default to just the formatted original query

            // Fetch synonyms - assuming 'term' in custom_synonyms is stored in lowercase
            // and matches the case of 'searchQuery' (which is lowercased here)
            const synonymRes = await pool.query(
                "SELECT synonyms FROM custom_synonyms WHERE term = $1",
                [searchQuery] // searchQuery is already lowercased and trimmed
            );

            if (synonymRes.rows.length > 0 && synonymRes.rows[0].synonyms) {
                const fetchedSynonyms = synonymRes.rows[0].synonyms; // e.g., "syn1, syn2 word"
                const parsedSynonyms = fetchedSynonyms.split(',')
                    .map(s => s.trim())
                    .filter(s => s.length > 0);

                if (parsedSynonyms.length > 0) {
                    // Format the original query and all synonyms, then join with OR
                    const allTermsToFormat = [searchQuery, ...parsedSynonyms]; // Use original searchQuery for formatting consistency
                    const allFormattedTerms = allTermsToFormat
                        .map(prepareTermForTsqueryFormatting) // Format each term/synonym
                        .filter(preparedTerm => preparedTerm.length > 0); // Ensure no empty strings

                    if (allFormattedTerms.length > 0) {
                        ftsInputString = allFormattedTerms.join(' | '); // e.g., "original & query | syn1 | syn2 & word"
                    }
                }
            }
        }

        let result = { rows: [] }; // Initialize result

        if (ftsInputString && ftsInputString.trim().length > 0) {
            const ftsParamIndex = baseVisibilityParams.length + 1;
            const ftsQuery = `
                SELECT *, ts_rank_cd(search_vector, to_tsquery('english', $${ftsParamIndex})) as rank
                FROM (${baseVisibilityQuery}) AS VisibleProvidersCTE
                WHERE VisibleProvidersCTE.search_vector @@ to_tsquery('english', $${ftsParamIndex})
                ORDER BY rank DESC
                LIMIT 10;
            `;
            result = await pool.query(ftsQuery, [...baseVisibilityParams, ftsInputString]);
        }

        if (result.rows.length === 0) {
            // Fallback to ILIKE if FTS (with synonyms) yields no results or was skipped
            const ilikeParamIndex = baseVisibilityParams.length + 1;
            // Fallback uses the original (lower-cased, trimmed) search query before any FTS formatting
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
            result = await pool.query(fallbackQuery, [...baseVisibilityParams, ilikeSearchQuery]);
        }
        res.json({ success: true, providers: result.rows });
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

module.exports = {
    getAllVisibleProviders,
    getProviderById,
    getRecommendationsByTargetUser,
    searchVisibleProviders,
    getProviderCount,
    likeRecommendation
};

// working 5/20
// const pool = require("../config/db.config");
// const userService = require("../services/userService");

// const getVisibleProvidersBaseQuery = (currentUserId) => {
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
//         sc.name AS category,
//         sp.recommended_by AS recommender_user_id,
//         rec_user.name AS recommender_name,
//         rec_user.phone_number AS recommender_phone,
//         ROUND(AVG(r.rating) OVER (PARTITION BY sp.id), 2) AS average_rating,
//         COUNT(r.id) OVER (PARTITION BY sp.id) AS total_reviews,
//         sp.search_vector
//     FROM
//         public.service_providers sp
//     LEFT JOIN
//         public.service_categories sc ON sp.category_id = sc.service_id
//     LEFT JOIN
//         public.users rec_user ON sp.recommended_by = rec_user.id
//     LEFT JOIN
//         public.reviews r ON sp.id = r.provider_id
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
//         (cs.community_id IS NOT NULL AND cm_user_x.user_id IS NOT NULL)
//   `;
//     const queryParams = [currentUserId];
//     return { query, queryParams };
// };

// const getAllVisibleProviders = async (req, res) => {
//     const clerkUserId = req.query.user_id;
//     const userEmail = req.query.email;

//     if (!clerkUserId || !userEmail) {
//         return res.status(400).json({
//             success: false,
//             message:
//                 "User ID and email are required to fetch visible providers.",
//         });
//     }

//     try {
//         // Convert Clerk ID to internal user ID
//         const internalUserId = await userService.getOrCreateUser({
//             id: clerkUserId,
//             emailAddresses: [{ emailAddress: userEmail }],
//             firstName: req.query.firstName || "",
//             lastName: req.query.lastName || "",
//             phoneNumbers: req.query.phoneNumber
//                 ? [{ phoneNumber: req.query.phoneNumber }]
//                 : [],
//         });

//         const { query: baseQuery, queryParams } =
//             getVisibleProvidersBaseQuery(internalUserId);
//         const finalQuery = `
//             SELECT * FROM (${baseQuery}) AS VisibleProvidersCTE
//             ORDER BY VisibleProvidersCTE.business_name;
//         `;
//         const result = await pool.query(finalQuery, queryParams);
//         res.json({
//             success: true,
//             providers: result.rows,
//         });
//     } catch (err) {
//         console.error("Database error in getAllVisibleProviders:", err);
//         res.status(500).json({
//             success: false,
//             message: "Error fetching visible providers",
//             error: err.message,
//         });
//     }
// };

// const getProviderCount = async (req, res) => {
//     const clerkUserId = req.query.user_id;
//     const userEmail = req.query.email;

//     if (!clerkUserId || !userEmail) {
//         return res.status(400).json({
//             success: false,
//             message: "User ID and email are required to fetch provider count.",
//         });
//     }

//     try {
//         // Convert Clerk ID to internal user ID
//         const internalUserId = await userService.getOrCreateUser({
//             id: clerkUserId,
//             emailAddresses: [{ emailAddress: userEmail }],
//             firstName: req.query.firstName || "",
//             lastName: req.query.lastName || "",
//             phoneNumbers: req.query.phoneNumber
//                 ? [{ phoneNumber: req.query.phoneNumber }]
//                 : [],
//         });

//         const { query: baseQuery, queryParams } =
//             getVisibleProvidersBaseQuery(internalUserId);
//         const countQuery = `SELECT COUNT(*) FROM (${baseQuery}) AS visible_providers_subquery`;
//         const result = await pool.query(countQuery, queryParams);
//         const count = parseInt(result.rows[0].count, 10);
//         res.json({ count });
//     } catch (error) {
//         console.error("Error getting visible provider count:", error.message);
//         res.status(500).json({
//             error: "Internal server error getting provider count",
//         });
//     }
// };

// const getProviderById = async (req, res) => {
//     const { id } = req.params;
//     const clerkUserId = req.query.user_id;
//     const userEmail = req.query.email;

//     if (!clerkUserId || !userEmail) {
//         return res.status(400).json({
//             success: false,
//             message:
//                 "User ID and email are required to fetch provider details.",
//         });
//     }

//     try {
//         // Convert Clerk ID to internal user ID
//         const internalUserId = await userService.getOrCreateUser({
//             id: clerkUserId,
//             emailAddresses: [{ emailAddress: userEmail }],
//             firstName: req.query.firstName || "",
//             lastName: req.query.lastName || "",
//             phoneNumbers: req.query.phoneNumber
//                 ? [{ phoneNumber: req.query.phoneNumber }]
//                 : [],
//         });

//         const {
//             query: baseVisibilityQuery,
//             queryParams: baseVisibilityParams,
//         } = getVisibleProvidersBaseQuery(internalUserId);

//         const providerIdParamIndex = baseVisibilityParams.length + 1;
//         const finalQuery = `
//             SELECT * FROM (${baseVisibilityQuery}) AS VisibleProvidersCTE
//             WHERE VisibleProvidersCTE.id = $${providerIdParamIndex};
//         `;

//         const result = await pool.query(finalQuery, [
//             ...baseVisibilityParams,
//             id,
//         ]);

//         if (result.rows.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Provider not found or not accessible",
//             });
//         }

//         res.json({ success: true, provider: result.rows[0] });
//     } catch (err) {
//         console.error("Database error in getProviderById:", err);
//         res.status(500).json({
//             success: false,
//             message: "Error fetching provider",
//             error: err.message,
//         });
//     }
// };

// const getRecommendationsByTargetUser = async (req, res) => {
//     const targetUserEmail = req.query.target_email;
//     const clerkUserId = req.query.user_id;
//     const userEmail = req.query.email;

//     if (!targetUserEmail || !clerkUserId || !userEmail) {
//         return res.status(400).json({
//             success: false,
//             message: "Target email, user ID, and email are required.",
//         });
//     }

//     try {
//         // Convert Clerk ID to internal user ID
//         const internalUserId = await userService.getOrCreateUser({
//             id: clerkUserId,
//             emailAddresses: [{ emailAddress: userEmail }],
//             firstName: req.query.firstName || "",
//             lastName: req.query.lastName || "",
//             phoneNumbers: req.query.phoneNumber
//                 ? [{ phoneNumber: req.query.phoneNumber }]
//                 : [],
//         });

//         const targetUserRes = await pool.query(
//             "SELECT id FROM users WHERE email = $1",
//             [targetUserEmail]
//         );

//         if (targetUserRes.rows.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Target user not found.",
//             });
//         }

//         const targetUserId = targetUserRes.rows[0].id;
//         const { query: baseQuery, queryParams: baseParams } =
//             getVisibleProvidersBaseQuery(internalUserId);

//         const targetUserIdParamIndex = baseParams.length + 1;
//         const finalQuery = `
//             SELECT * FROM (${baseQuery}) AS VisibleProvidersCTE
//             WHERE VisibleProvidersCTE.recommender_user_id = $${targetUserIdParamIndex}
//             ORDER BY VisibleProvidersCTE.date_of_recommendation DESC;
//         `;

//         const result = await pool.query(finalQuery, [
//             ...baseParams,
//             targetUserId,
//         ]);
//         res.json({ success: true, recommendations: result.rows });
//     } catch (error) {
//         console.error(
//             "Database error in getRecommendationsByTargetUser:",
//             error
//         );
//         res.status(500).json({
//             success: false,
//             message: "Failed to fetch user recommendations",
//             error: error.message,
//         });
//     }
// };

// const searchVisibleProviders = async (req, res) => {
//     const { q } = req.query;
//     const clerkUserId = req.query.user_id;
//     const userEmail = req.query.email;
//     const searchQuery = q?.toLowerCase().trim();

//     if (!clerkUserId || !userEmail) {
//         return res.status(400).json({
//             success: false,
//             message: "User ID and email are required to perform search.",
//         });
//     }

//     if (!searchQuery) {
//         return res.json({ success: true, providers: [] });
//     }

//     try {
//         // Convert Clerk ID to internal user ID
//         const internalUserId = await userService.getOrCreateUser({
//             id: clerkUserId,
//             emailAddresses: [{ emailAddress: userEmail }],
//             firstName: req.query.firstName || "",
//             lastName: req.query.lastName || "",
//             phoneNumbers: req.query.phoneNumber
//                 ? [{ phoneNumber: req.query.phoneNumber }]
//                 : [],
//         });

//         const {
//             query: baseVisibilityQuery,
//             queryParams: baseVisibilityParams,
//         } = getVisibleProvidersBaseQuery(internalUserId);

//         const ftsParamIndex = baseVisibilityParams.length + 1;

//         let ftsQuery = `
//             SELECT *, ts_rank(search_vector, plainto_tsquery('english', $${ftsParamIndex})) as rank
//             FROM (${baseVisibilityQuery}) AS VisibleProvidersCTE
//             WHERE VisibleProvidersCTE.search_vector @@ plainto_tsquery('english', $${ftsParamIndex})
//             ORDER BY rank DESC
//             LIMIT 10;
//         `;

//         let result = await pool.query(ftsQuery, [
//             ...baseVisibilityParams,
//             searchQuery,
//         ]);

//         if (result.rows.length === 0) {
//             const ilikeParamIndex = baseVisibilityParams.length + 1;
//             const ilikeSearchQuery = `%${searchQuery}%`;
//             const fallbackQuery = `
//                 SELECT *
//                 FROM (${baseVisibilityQuery}) AS VisibleProvidersCTE
//                 WHERE
//                     LOWER(COALESCE(VisibleProvidersCTE.business_name, '')) LIKE $${ilikeParamIndex}
//                     OR LOWER(COALESCE(VisibleProvidersCTE.category, '')) LIKE $${ilikeParamIndex}
//                     OR LOWER(COALESCE(VisibleProvidersCTE.description, '')) LIKE $${ilikeParamIndex}
//                     OR EXISTS (
//                         SELECT 1 FROM unnest(VisibleProvidersCTE.tags) AS tag 
//                         WHERE LOWER(tag) LIKE $${ilikeParamIndex}
//                     )
//                 LIMIT 10;
//             `;
//             result = await pool.query(fallbackQuery, [
//                 ...baseVisibilityParams,
//                 ilikeSearchQuery,
//             ]);
//         }

//         res.json({
//             success: true,
//             providers: result.rows,
//         });
//     } catch (error) {
//         console.error("Search error:", error);
//         res.status(500).json({
//             success: false,
//             error: "Failed to search providers",
//             message: error.message,
//         });
//     }
// };

// module.exports = {
//     getAllVisibleProviders,
//     getProviderById,
//     getRecommendationsByTargetUser,
//     searchVisibleProviders,
//     getProviderCount,
// };
