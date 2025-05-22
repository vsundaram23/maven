const pool = require("../config/db.config");
const { v4: uuidv4 } = require("uuid");

const PENDING_SERVICE_PK_ID = "e2c2b91a-c577-448b-8bd1-3e0c17b20e46";
const PENDING_CATEGORY_PK_ID = "93859f52-830f-4b72-92fc-9316db28fb7e";

const toNull = (v) =>
    v === undefined || v === "" || (Array.isArray(v) && v.length === 0)
        ? null
        : v;

const createRecommendation = async (req, res) => {
    const {
        business_name,
        description,
        category,
        subcategory,
        user_email,
        email,
        phone_number,
        tags,
        rating,
        website,
        provider_contact_name,
        publish_scope,
        trust_circle_ids,
        recommender_message,
        notes,
        date_of_recommendation,
        price_range,
        service_scope,
        city,
        state,
        zip_code,
        provider_message,
        price_paid,
    } = req.body;

    if (!user_email || !business_name || !recommender_message || !rating) {
        return res
            .status(400)
            .json({
                success: false,
                message:
                    "Missing required fields (user_email, business_name, recommender_message, rating, and intended category/subcategory names).",
            });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const userResult = await client.query(
            "SELECT id FROM users WHERE email = $1",
            [user_email]
        );
        if (userResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res
                .status(404)
                .json({
                    success: false,
                    message: "Recommending user not found.",
                });
        }
        const recommenderUserId = userResult.rows[0].id;

        let visibility_status = "private";
        if (publish_scope === "Public") {
            visibility_status = "public";
        } else if (
            publish_scope === "Full Trust Circle" ||
            publish_scope === "Specific Trust Circles"
        ) {
            visibility_status = "connections";
        }

        const newProviderId = uuidv4();
        const actualDateOfRecommendation = date_of_recommendation
            ? new Date(date_of_recommendation)
            : new Date();

        const providerInsertQuery = `
      INSERT INTO service_providers (
        id, business_name, description, category_id, service_id, recommended_by, date_of_recommendation,
        email, phone_number, website, tags, city, state, zip_code, service_scope, price_range,
        business_contact, provider_message, recommender_message, visibility, num_likes, notes, price_paid,
        submitted_category_name, submitted_service_name, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 0, $21, $22, $23, $24, $25, $26
      ) RETURNING id;
    `;

        const providerValues = [
            newProviderId,
            business_name,
            toNull(description),
            PENDING_CATEGORY_PK_ID,
            PENDING_SERVICE_PK_ID,
            recommenderUserId,
            actualDateOfRecommendation,
            toNull(email),
            toNull(phone_number),
            toNull(website),
            tags || [],
            toNull(city),
            toNull(state),
            toNull(zip_code),
            toNull(service_scope),
            toNull(price_range),
            toNull(provider_contact_name),
            toNull(provider_message),
            recommender_message,
            visibility_status,
            toNull(notes),
            price_paid != null ? parseFloat(price_paid) : null,
            category,
            subcategory,
            actualDateOfRecommendation,
            actualDateOfRecommendation,
        ];

        await client.query(providerInsertQuery, providerValues);

        const reviewInsertQuery = `
      INSERT INTO reviews (id, provider_id, user_id, rating, content, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP);
    `;
        await client.query(reviewInsertQuery, [
            uuidv4(),
            newProviderId,
            recommenderUserId,
            rating,
            recommender_message,
        ]);

        if (
            publish_scope === "Specific Trust Circles" &&
            trust_circle_ids &&
            trust_circle_ids.length > 0
        ) {
            for (const communityId of trust_circle_ids) {
                await client.query(
                    "INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, shared_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
                    [uuidv4(), newProviderId, communityId, recommenderUserId]
                );
            }
        } else if (
            publish_scope === "Full Trust Circle" ||
            publish_scope === "Public"
        ) {
            const userCommunitiesResult = await client.query(
                "SELECT community_id FROM community_memberships WHERE user_id = $1 AND status = $2",
                [recommenderUserId, "approved"]
            );
            if (userCommunitiesResult.rows.length > 0) {
                for (const row of userCommunitiesResult.rows) {
                    await client.query(
                        "INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, shared_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
                        [
                            uuidv4(),
                            newProviderId,
                            row.community_id,
                            recommenderUserId,
                        ]
                    );
                }
            }
        }

        await client.query("COMMIT");
        res.status(201).json({
            success: true,
            message: "Recommendation submitted for review successfully!",
            providerId: newProviderId,
        });
    } catch (err) {
        if (client) await client.query("ROLLBACK");
        res.status(500).json({
            success: false,
            error: "Server error creating recommendation",
            detail: err.message,
        });
    } finally {
        if (client) client.release();
    }
};

const addReviewToProvider = async (req, res) => {
    const {
        provider_id,
        email: reviewerEmail,
        rating,
        content,
        tags,
    } = req.body;

    if (!provider_id || !reviewerEmail || !rating) {
        return res
            .status(400)
            .json({
                success: false,
                message:
                    "Missing required fields for review (provider_id, email, rating).",
            });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const userResult = await client.query(
            "SELECT id FROM users WHERE email = $1",
            [reviewerEmail]
        );
        if (userResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res
                .status(404)
                .json({ success: false, message: "Reviewing user not found." });
        }
        const reviewerUserId = userResult.rows[0].id;

        const reviewInsertQuery = `
      INSERT INTO reviews (id, provider_id, user_id, rating, content, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING *;
    `;
        const reviewResult = await client.query(reviewInsertQuery, [
            uuidv4(),
            provider_id,
            reviewerUserId,
            rating,
            content || "",
        ]);
        const newReview = reviewResult.rows[0];

        if (tags && tags.length > 0) {
            const updateTagsQuery = `
        UPDATE service_providers
        SET tags = (
          SELECT array_agg(DISTINCT unnest_val)
          FROM (
            SELECT unnest(COALESCE(tags, ARRAY[]::TEXT[])) AS unnest_val FROM service_providers WHERE id = $1
            UNION
            SELECT unnest($2::TEXT[])
          ) AS combined_tags
        )
        WHERE id = $1;
      `;
            await client.query(updateTagsQuery, [provider_id, tags]);
        }

        await client.query("COMMIT");
        res.status(201).json({
            success: true,
            message: "Review added successfully!",
            review: newReview,
        });
    } catch (error) {
        if (client) await client.query("ROLLBACK");
        res.status(500).json({
            success: false,
            message: error.message || "Failed to add review.",
        });
    } finally {
        if (client) client.release();
    }
};

const getAllRecommendations = async (req, res) => {
    try {
        const query = `
      SELECT sp.*, actual_sc.name AS category_name, actual_s.name AS service_type, u.email AS recommender_email
      FROM service_providers sp
      LEFT JOIN services actual_s ON sp.service_id = actual_s.service_id
      LEFT JOIN service_categories actual_sc ON actual_s.category_id = actual_sc.service_id
      LEFT JOIN users u ON sp.recommended_by = u.id
      WHERE sp.service_id != $1
      ORDER BY sp.created_at DESC;
    `;
        const { rows } = await pool.query(query, [PENDING_SERVICE_PK_ID]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({
            error: "Server error fetching recommendations",
            detail: err.message,
        });
    }
};

const getRecommendationById = async (req, res) => {
    try {
        const query = `
      SELECT sp.*, actual_sc.name AS category_name, actual_s.name AS service_type, u.email AS recommender_email
      FROM service_providers sp
      LEFT JOIN services actual_s ON sp.service_id = actual_s.service_id
      LEFT JOIN service_categories actual_sc ON actual_s.category_id = actual_sc.service_id
      LEFT JOIN users u ON sp.recommended_by = u.id
      WHERE sp.id = $1;
    `;
        const { rows } = await pool.query(query, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "Recommendation not found" });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({
            error: "Server error fetching recommendation",
            detail: err.message,
        });
    }
};

const updateRecommendation = async (req, res) => {
    const serviceProviderId = req.params.id;
    const clerkIdFromQuery = req.query.user_id;
    const userEmailFromQuery = req.query.email;

    const {
        business_name,
        phone_number,
        tags,
        rating,
        website,
        provider_contact_name,
        publish_scope,
        trust_circle_ids,
        recommender_message,
    } = req.body;

    if (!clerkIdFromQuery || !userEmailFromQuery) {
        return res
            .status(401)
            .json({
                success: false,
                message: "User authentication details (ID and email) required.",
            });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const userLookupResult = await client.query(
            "SELECT id FROM users WHERE email = $1 OR clerk_id = $2",
            [userEmailFromQuery, clerkIdFromQuery]
        );
        if (userLookupResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Authenticated user profile not found in the local system.",
                });
        }
        const editorUserUuid = userLookupResult.rows[0].id;

        const providerCheck = await client.query(
            "SELECT id FROM service_providers WHERE id = $1",
            [serviceProviderId]
        );
        if (providerCheck.rows.length === 0) {
            await client.query("ROLLBACK");
            return res
                .status(404)
                .json({ success: false, message: "Recommendation not found." });
        }

        let visibility_status_to_update;
        if (typeof publish_scope === "string") {
            if (publish_scope === "Public")
                visibility_status_to_update = "public";
            else if (
                publish_scope === "Full Trust Circle" ||
                publish_scope === "Specific Trust Circles"
            )
                visibility_status_to_update = "connections";
            else visibility_status_to_update = undefined;
        } else {
            visibility_status_to_update = undefined;
        }

        const serviceProviderUpdateQuery = `
      UPDATE service_providers SET
        business_name = COALESCE($1, business_name), phone_number = COALESCE($2, phone_number),
        tags = COALESCE($3, tags), website = COALESCE($4, website),
        business_contact = COALESCE($5, business_contact), recommender_message = COALESCE($6, recommender_message),
        visibility = COALESCE($7, visibility), updated_at = NOW()
      WHERE id = $8 RETURNING *;
    `;
        const spValues = [
            toNull(business_name),
            toNull(phone_number),
            tags,
            toNull(website),
            toNull(provider_contact_name),
            toNull(recommender_message),
            visibility_status_to_update,
            serviceProviderId,
        ];
        const { rows: spRows } = await client.query(
            serviceProviderUpdateQuery,
            spValues
        );
        const updatedServiceProvider = spRows[0];

        let updatedReview;
        if (
            rating !== undefined ||
            (recommender_message !== undefined && recommender_message !== null)
        ) {
            const reviewUpdateQuery = `
            UPDATE reviews SET rating = COALESCE($1, rating), content = COALESCE($2, content), updated_at = NOW()
            WHERE provider_id = $3 AND user_id = $4 RETURNING *;
        `;
            const { rows: reviewRows } = await client.query(reviewUpdateQuery, [
                rating,
                recommender_message,
                serviceProviderId,
                editorUserUuid,
            ]);
            if (reviewRows.length > 0) updatedReview = reviewRows[0];
        }

        if (!updatedReview) {
            const reviewFetch = await client.query(
                "SELECT * FROM reviews WHERE provider_id = $1 AND user_id = $2",
                [serviceProviderId, editorUserUuid]
            );
            if (reviewFetch.rows.length > 0)
                updatedReview = reviewFetch.rows[0];
            else {
                await client.query("ROLLBACK");
                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            "Associated review by the current editor not found for this recommendation.",
                    });
            }
        }

        if (typeof publish_scope === "string") {
            await client.query(
                "DELETE FROM community_shares WHERE service_provider_id = $1",
                [serviceProviderId]
            );
            if (
                publish_scope === "Specific Trust Circles" &&
                trust_circle_ids &&
                trust_circle_ids.length > 0
            ) {
                for (const communityId of trust_circle_ids) {
                    await client.query(
                        "INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, shared_at) VALUES ($1, $2, $3, $4, NOW())",
                        [
                            uuidv4(),
                            serviceProviderId,
                            communityId,
                            editorUserUuid,
                        ]
                    );
                }
            } else if (
                publish_scope === "Full Trust Circle" ||
                publish_scope === "Public"
            ) {
                const userCommunitiesResult = await client.query(
                    "SELECT community_id FROM community_memberships WHERE user_id = $1 AND status = $2",
                    [editorUserUuid, "approved"]
                );
                if (userCommunitiesResult.rows.length > 0) {
                    for (const row of userCommunitiesResult.rows) {
                        await client.query(
                            "INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, shared_at) VALUES ($1, $2, $3, $4, NOW())",
                            [
                                uuidv4(),
                                serviceProviderId,
                                row.community_id,
                                editorUserUuid,
                            ]
                        );
                    }
                }
            }
        }

        await client.query("COMMIT");
        res.json({ success: true, updatedServiceProvider, updatedReview });
    } catch (err) {
        if (client) await client.query("ROLLBACK");
        res.status(500).json({
            success: false,
            error: "Server error updating recommendation",
            detail: err.message,
        });
    } finally {
        if (client) client.release();
    }
};

const getVisibleRecommendationsForUser = async (req, res) => {
    const { user_id: clerkUserId, email: userEmail } = req.query;

    if (!clerkUserId || !userEmail) {
        return res
            .status(400)
            .json({
                success: false,
                message: "User ID (Clerk) and email are required.",
            });
    }

    let client;
    try {
        client = await pool.connect();
        const userResult = await client.query(
            "SELECT id FROM users WHERE clerk_id = $1 OR email = $2",
            [clerkUserId, userEmail]
        );
        if (userResult.rows.length === 0) {
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }
        const internalUserId = userResult.rows[0].id;

        const query = `
            SELECT
                sp.id, sp.business_name, sp.description, sp.email, sp.phone_number, sp.website,
                sp.tags, sp.city, sp.state, sp.zip_code, sp.service_scope, sp.price_range,
                sp.business_contact, sp.provider_message, sp.recommender_message,
                sp.visibility, sp.notes, sp.price_paid,
                sp.date_of_recommendation, sp.created_at,
                sp.submitted_category_name, sp.submitted_service_name,
                cat.name AS category_name,
                ser.name AS service_type,
                rec_user.id AS recommender_user_id,
                rec_user.clerk_id AS recommender_clerk_id,
                COALESCE(rec_user.name, rec_user.email) AS recommender_name,
                rec_user.email AS recommender_email,
                rec_user.profile_image_url AS recommender_profile_image_url,
                rec_user.phone_number AS recommender_phone,
                COALESCE(sp.num_likes, 0) AS num_likes,
                EXISTS (SELECT 1 FROM user_likes ul WHERE ul.provider_id = sp.id AND ul.user_id = $1) AS "currentUserLiked"
            FROM service_providers sp
            JOIN users rec_user ON sp.recommended_by = rec_user.id
            LEFT JOIN services ser ON sp.service_id = ser.service_id AND ser.service_id != $2
            LEFT JOIN service_categories cat ON ser.category_id = cat.service_id AND cat.service_id != $3
            WHERE
                sp.service_id != $2 AND
                (
                    sp.visibility = 'public' OR
                    sp.recommended_by = $1 OR
                    (
                        sp.visibility = 'connections' AND EXISTS (
                            SELECT 1 FROM community_shares cs
                            JOIN community_memberships cm ON cs.community_id = cm.community_id
                            WHERE cs.service_provider_id = sp.id AND cm.user_id = $1 AND cm.status = 'approved'
                        )
                    )
                )
            ORDER BY sp.created_at DESC;
        `;
        const { rows } = await client.query(query, [
            internalUserId,
            PENDING_SERVICE_PK_ID,
            PENDING_CATEGORY_PK_ID,
        ]);
        res.json({ success: true, providers: rows });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: "Server error fetching visible recommendations",
            detail: err.message,
        });
    } finally {
        if (client) client.release();
    }
};

const searchProviders = async (req, res) => {
    const { q, user_id: clerkUserId, email: userEmail } = req.query;

    if (!clerkUserId || !userEmail) {
        return res
            .status(400)
            .json({
                success: false,
                message: "User ID (Clerk) and email are required for search.",
            });
    }
    if (!q) {
        return res
            .status(400)
            .json({ success: false, message: "Search query 'q' is required." });
    }

    let client;
    try {
        client = await pool.connect();
        const userResult = await client.query(
            "SELECT id FROM users WHERE clerk_id = $1 OR email = $2",
            [clerkUserId, userEmail]
        );
        if (userResult.rows.length === 0) {
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }
        const internalUserId = userResult.rows[0].id;
        const searchTerm = `%${q.toLowerCase()}%`;

        const searchQuery = `
            SELECT
                sp.id, sp.business_name, sp.description, sp.email, sp.phone_number, sp.website,
                sp.tags, sp.city, sp.state, sp.zip_code, sp.service_scope, sp.price_range,
                sp.business_contact, sp.provider_message, sp.recommender_message,
                sp.visibility, sp.notes, sp.price_paid,
                sp.date_of_recommendation, sp.created_at,
                sp.submitted_category_name, sp.submitted_service_name,
                cat.name AS category_name,
                ser.name AS service_type,
                rec_user.id AS recommender_user_id,
                rec_user.clerk_id AS recommender_clerk_id,
                COALESCE(rec_user.name, rec_user.email) AS recommender_name,
                rec_user.email AS recommender_email,
                rec_user.profile_image_url AS recommender_profile_image_url,
                rec_user.phone_number AS recommender_phone,
                COALESCE(sp.num_likes, 0) AS num_likes,
                EXISTS (SELECT 1 FROM user_likes ul WHERE ul.provider_id = sp.id AND ul.user_id = $1) AS "currentUserLiked"
            FROM service_providers sp
            JOIN users rec_user ON sp.recommended_by = rec_user.id
            LEFT JOIN services ser ON sp.service_id = ser.service_id AND ser.service_id != $3
            LEFT JOIN service_categories cat ON ser.category_id = cat.service_id AND cat.service_id != $4
            WHERE
                sp.service_id != $3 AND
                (
                    LOWER(sp.business_name) LIKE $2 OR
                    LOWER(sp.description) LIKE $2 OR
                    LOWER(sp.recommender_message) LIKE $2 OR
                    LOWER(cat.name) LIKE $2 OR
                    LOWER(ser.name) LIKE $2 OR
                    EXISTS (SELECT 1 FROM unnest(sp.tags) AS tag WHERE LOWER(tag) LIKE $2) OR
                    LOWER(sp.submitted_category_name) LIKE $2 OR
                    LOWER(sp.submitted_service_name) LIKE $2 OR
                    LOWER(rec_user.name) LIKE $2 OR
                    LOWER(rec_user.email) LIKE $2
                ) AND
                (
                    sp.visibility = 'public' OR
                    sp.recommended_by = $1 OR
                    (
                        sp.visibility = 'connections' AND EXISTS (
                            SELECT 1 FROM community_shares cs
                            JOIN community_memberships cm ON cs.community_id = cm.community_id
                            WHERE cs.service_provider_id = sp.id AND cm.user_id = $1 AND cm.status = 'approved'
                        )
                    )
                )
            ORDER BY sp.created_at DESC;
        `;
        const { rows } = await client.query(searchQuery, [
            internalUserId,
            searchTerm,
            PENDING_SERVICE_PK_ID,
            PENDING_CATEGORY_PK_ID,
        ]);
        res.json({ success: true, providers: rows });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: "Server error during search.",
            detail: err.message,
        });
    } finally {
        if (client) client.release();
    }
};

const likeProvider = async (req, res) => {
    const { providerId } = req.params;
    const { userId: clerkUserId, userEmail } = req.body;

    if (!clerkUserId || !userEmail) {
        return res
            .status(400)
            .json({ success: false, message: "User identifier required." });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const userResult = await client.query(
            "SELECT id FROM users WHERE clerk_id = $1 OR email = $2",
            [clerkUserId, userEmail]
        );
        if (userResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }
        const internalUserId = userResult.rows[0].id;

        const likeCheck = await client.query(
            "SELECT id FROM user_likes WHERE provider_id = $1 AND user_id = $2",
            [providerId, internalUserId]
        );
        let currentUserLiked;

        if (likeCheck.rows.length > 0) {
            await client.query(
                "DELETE FROM user_likes WHERE provider_id = $1 AND user_id = $2",
                [providerId, internalUserId]
            );
            currentUserLiked = false;
        } else {
            await client.query(
                "INSERT INTO user_likes (id, provider_id, user_id, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)",
                [uuidv4(), providerId, internalUserId]
            );
            currentUserLiked = true;
        }

        const likesCountResult = await client.query(
            "SELECT COUNT(*) AS count FROM user_likes WHERE provider_id = $1",
            [providerId]
        );
        const num_likes = parseInt(likesCountResult.rows[0].count, 10);
        await client.query(
            "UPDATE service_providers SET num_likes = $1, updated_at = NOW() WHERE id = $2",
            [num_likes, providerId]
        );

        await client.query("COMMIT");
        res.json({
            success: true,
            message: "Like status updated.",
            num_likes,
            currentUserLiked,
        });
    } catch (err) {
        if (client) await client.query("ROLLBACK");
        res.status(500).json({
            success: false,
            error: "Server error updating like status.",
            detail: err.message,
        });
    } finally {
        if (client) client.release();
    }
};

const getReviewStats = async (req, res) => {
    const { providerId } = req.params;
    let client;
    try {
        client = await pool.connect();
        const stats = await client.query(
            `SELECT AVG(rating) as average_rating, COUNT(id) as total_reviews FROM reviews WHERE provider_id = $1`,
            [providerId]
        );
        if (stats.rows.length > 0 && stats.rows[0].total_reviews > 0) {
            res.json({
                average_rating: parseFloat(stats.rows[0].average_rating) || 0,
                total_reviews: parseInt(stats.rows[0].total_reviews, 10) || 0,
            });
        } else {
            res.json({ average_rating: 0, total_reviews: 0 });
        }
    } catch (err) {
        res.status(500).json({
            error: "Failed to fetch review stats",
            detail: err.message,
        });
    } finally {
        if (client) client.release();
    }
};

const getReviewsForProvider = async (req, res) => {
    const { providerId } = req.params;
    let client;
    try {
        client = await pool.connect();
        const reviews = await client.query(
            `SELECT r.id, r.rating, r.content, r.created_at, u.name as user_name, u.email as user_email, u.profile_image_url
             FROM reviews r
             JOIN users u ON r.user_id = u.id
             WHERE r.provider_id = $1 ORDER BY r.created_at DESC`,
            [providerId]
        );
        res.json(reviews.rows);
    } catch (err) {
        res.status(500).json({
            error: "Failed to fetch reviews",
            detail: err.message,
        });
    } finally {
        if (client) client.release();
    }
};

const deleteRecommendation = async (req, res) => {
    const recommendationId = req.params.id;
    const clerkIdFromQuery = req.query.user_id;
    const userEmailFromQuery = req.query.email;

    if (!clerkIdFromQuery || !userEmailFromQuery) {
        return res.status(401).json({
            success: false,
            message: "User authentication details (ID and email) required.",
        });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query("BEGIN");

        // Verify user exists and get internal user ID
        const userResult = await client.query(
            "SELECT id FROM users WHERE clerk_id = $1 OR email = $2",
            [clerkIdFromQuery, userEmailFromQuery]
        );

        if (userResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }
        const userId = userResult.rows[0].id;

        // Get recommendation details and verify ownership
        const recommendation = await client.query(
            "SELECT * FROM service_providers WHERE id = $1",
            [recommendationId]
        );

        if (recommendation.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                success: false,
                message: "Recommendation not found.",
            });
        }

        if (recommendation.rows[0].recommended_by !== userId) {
            await client.query("ROLLBACK");
            return res.status(403).json({
                success: false,
                message:
                    "Only the original recommender can delete this recommendation.",
            });
        }

        // Delete associated data in correct order
        await client.query(
            "DELETE FROM community_shares WHERE service_provider_id = $1",
            [recommendationId]
        );

        await client.query("DELETE FROM reviews WHERE provider_id = $1", [
            recommendationId,
        ]);

        // Store service_id before deleting the provider
        const serviceId = recommendation.rows[0].service_id;

        // Delete the service provider first
        const deletedRecommendation = await client.query(
            "DELETE FROM service_providers WHERE id = $1 RETURNING *",
            [recommendationId]
        );

        // Check if this was the only recommendation using this service
        const remainingRecommendations = await client.query(
            "SELECT COUNT(*) FROM service_providers WHERE service_id = $1",
            [serviceId]
        );

        if (
            parseInt(remainingRecommendations.rows[0].count) === 0 &&
            serviceId !== PENDING_SERVICE_PK_ID
        ) {
            // Only delete the service if it's not the pending service and no other providers reference it
            await client.query("DELETE FROM services WHERE service_id = $1", [
                serviceId,
            ]);
        }

        await client.query("COMMIT");
        res.json({
            success: true,
            message: "Recommendation and associated data deleted successfully",
            deletedRecommendation: deletedRecommendation.rows[0],
        });
    } catch (err) {
        if (client) await client.query("ROLLBACK");
        res.status(500).json({
            success: false,
            error: "Server error deleting recommendation",
            detail: err.message,
        });
    } finally {
        if (client) client.release();
    }
};

module.exports = {
    createRecommendation,
    addReviewToProvider,
    getAllRecommendations,
    getRecommendationById,
    updateRecommendation,
    getVisibleRecommendationsForUser,
    searchProviders,
    likeProvider,
    getReviewStats,
    getReviewsForProvider,
    deleteRecommendation,
};


// const pool = require('../config/db.config');
// const { v4: uuidv4 } = require('uuid');

// const PENDING_SERVICE_PK_ID = 'e2c2b91a-c577-448b-8bd1-3e0c17b20e46'; 
// const PENDING_CATEGORY_PK_ID = '93859f52-830f-4b72-92fc-9316db28fb7e'; 

// const toNull = v => (v === undefined || v === '' || (Array.isArray(v) && v.length === 0) ? null : v);

// const createRecommendation = async (req, res) => {
//   const {
//     business_name, description, category, subcategory, user_email, email, phone_number,
//     tags, rating, website, provider_contact_name, publish_scope, trust_circle_ids,
//     recommender_message, notes, date_of_recommendation, price_range, service_scope,
//     city, state, zip_code, provider_message, price_paid
//   } = req.body;

//   if (!user_email || !business_name || !recommender_message || !rating) {
//     return res.status(400).json({ success: false, message: 'Missing required fields (user_email, business_name, recommender_message, rating, and intended category/subcategory names).' });
//   }

//   let client;
//   try {
//     client = await pool.connect();
//     await client.query('BEGIN');

//     const userResult = await client.query('SELECT id FROM users WHERE email = $1', [user_email]);
//     if (userResult.rows.length === 0) {
//       await client.query('ROLLBACK');
//       return res.status(404).json({ success: false, message: "Recommending user not found." });
//     }
//     const recommenderUserId = userResult.rows[0].id;

//     let visibility_status = 'private';
//     if (publish_scope === 'Public') {
//         visibility_status = 'public';
//     } else if (publish_scope === 'Full Trust Circle' || publish_scope === 'Specific Trust Circles') {
//         visibility_status = 'connections';
//     }

//     const newProviderId = uuidv4();
//     const actualDateOfRecommendation = date_of_recommendation ? new Date(date_of_recommendation) : new Date();

//     const providerInsertQuery = `
//       INSERT INTO service_providers (
//         id, business_name, description, category_id, service_id, recommended_by, date_of_recommendation,
//         email, phone_number, website, tags, city, state, zip_code, service_scope, price_range,
//         business_contact, provider_message, recommender_message, visibility, num_likes, notes, price_paid,
//         submitted_category_name, submitted_service_name, created_at, updated_at
//       ) VALUES (
//         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 0, $21, $22, $23, $24, $25, $26
//       ) RETURNING id;
//     `;

//     const providerValues = [
//       newProviderId, business_name, toNull(description), PENDING_CATEGORY_PK_ID, PENDING_SERVICE_PK_ID,
//       recommenderUserId, actualDateOfRecommendation, toNull(email), toNull(phone_number), toNull(website),
//       tags || [], toNull(city), toNull(state), toNull(zip_code), toNull(service_scope), toNull(price_range),
//       toNull(provider_contact_name), toNull(provider_message), recommender_message, visibility_status,
//       toNull(notes), price_paid != null ? parseFloat(price_paid) : null, category, subcategory,
//       actualDateOfRecommendation, actualDateOfRecommendation
//     ];

//     await client.query(providerInsertQuery, providerValues);

//     const reviewInsertQuery = `
//       INSERT INTO reviews (id, provider_id, user_id, rating, content, created_at)
//       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP);
//     `;
//     await client.query(reviewInsertQuery, [uuidv4(), newProviderId, recommenderUserId, rating, recommender_message]);

//     if (publish_scope === 'Specific Trust Circles' && trust_circle_ids && trust_circle_ids.length > 0) {
//         for (const communityId of trust_circle_ids) {
//             await client.query(
//                 'INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, shared_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
//                 [uuidv4(), newProviderId, communityId, recommenderUserId]
//             );
//         }
//     } else if (publish_scope === 'Full Trust Circle') {
//         const userCommunitiesResult = await client.query(
//             'SELECT community_id FROM community_memberships WHERE user_id = $1 AND status = $2',
//             [recommenderUserId, 'approved']
//         );
//         if (userCommunitiesResult.rows.length > 0) {
//             for (const row of userCommunitiesResult.rows) {
//                 await client.query(
//                     'INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, shared_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
//                     [uuidv4(), newProviderId, row.community_id, recommenderUserId]
//                 );
//             }
//         }
//     }

//     await client.query('COMMIT');
//     res.status(201).json({ success: true, message: "Recommendation submitted for review successfully!", providerId: newProviderId });

//   } catch (err) {
//     if (client) await client.query('ROLLBACK');
//     res.status(500).json({ success: false, error:  'Server error creating recommendation', detail: err.message });
//   } finally {
//     if (client) client.release();
//   }
// };

// // old version where specific trust circles doesn't work
// // const createRecommendation = async (req, res) => {
// //   const {
// //     business_name, description, category, subcategory, user_email, email, phone_number,
// //     tags, rating, website, provider_contact_name, publish_scope, trust_circle_ids,
// //     recommender_message, notes, date_of_recommendation, price_range, service_scope,
// //     city, state, zip_code, provider_message, price_paid 
// //   } = req.body;

// //   if (!user_email || !business_name || !recommender_message || !rating) {
// //     return res.status(400).json({ success: false, message: 'Missing required fields (user_email, business_name, recommender_message, rating, and intended category/subcategory names).' });
// //   }

// //   let client;
// //   try {
// //     client = await pool.connect();
// //     await client.query('BEGIN');

// //     const userResult = await client.query('SELECT id FROM users WHERE email = $1', [user_email]);
// //     if (userResult.rows.length === 0) {
// //       await client.query('ROLLBACK');
// //       return res.status(404).json({ success: false, message: "Recommending user not found." });
// //     }
// //     const recommenderUserId = userResult.rows[0].id;

// //     let visibility_status = 'private';
// //     if (publish_scope === 'Public') {
// //         visibility_status = 'public';
// //     } else if (publish_scope === 'Full Trust Circle' || publish_scope === 'Specific Trust Circles') {
// //         visibility_status = 'connections'; 
// //     }
    
// //     const newProviderId = uuidv4();
// //     const actualDateOfRecommendation = date_of_recommendation ? new Date(date_of_recommendation) : new Date();

// //     const providerInsertQuery = `
// //       INSERT INTO service_providers (
// //         id, business_name, description, category_id, service_id, recommended_by, date_of_recommendation,
// //         email, phone_number, website, tags, city, state, zip_code, service_scope, price_range,
// //         business_contact, provider_message, recommender_message, visibility, num_likes, notes, price_paid,
// //         submitted_category_name, submitted_service_name, created_at, updated_at
// //       ) VALUES (
// //         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 0, $21, $22, $23, $24, $25, $26
// //       ) RETURNING id;
// //     `;
    
// //     const providerValues = [
// //       newProviderId, business_name, toNull(description), PENDING_CATEGORY_PK_ID, PENDING_SERVICE_PK_ID,
// //       recommenderUserId, actualDateOfRecommendation, toNull(email), toNull(phone_number), toNull(website),
// //       tags || [], toNull(city), toNull(state), toNull(zip_code), toNull(service_scope), toNull(price_range),
// //       toNull(provider_contact_name), toNull(provider_message), recommender_message, visibility_status,
// //       toNull(notes), price_paid != null ? parseFloat(price_paid) : null, category, subcategory,
// //       actualDateOfRecommendation, actualDateOfRecommendation
// //     ];

// //     await client.query(providerInsertQuery, providerValues);

// //     const reviewInsertQuery = `
// //       INSERT INTO reviews (id, provider_id, user_id, rating, content, created_at)
// //       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP);
// //     `;
// //     await client.query(reviewInsertQuery, [uuidv4(), newProviderId, recommenderUserId, rating, recommender_message]);
    
// //     if (publish_scope === 'Specific Trust Circles' && trust_circle_ids && trust_circle_ids.length > 0) {
// //         for (const communityId of trust_circle_ids) {
// //             await client.query(
// //                 'INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, shared_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
// //                 [uuidv4(), newProviderId, communityId, recommenderUserId]
// //             );
// //         }
// //     }

// //     await client.query('COMMIT');
// //     res.status(201).json({ success: true, message: "Recommendation submitted for review successfully!", providerId: newProviderId });

// //   } catch (err) {
// //     if (client) await client.query('ROLLBACK');
// //     res.status(500).json({ success: false, error:  'Server error creating recommendation', detail: err.message });
// //   } finally {
// //     if (client) client.release();
// //   }
// // };

// const addReviewToProvider = async (req, res) => {
//   const { provider_id, email: reviewerEmail, rating, content, tags } = req.body;

//   if (!provider_id || !reviewerEmail || !rating ) {
//     return res.status(400).json({ success: false, message: "Missing required fields for review (provider_id, email, rating)." });
//   }

//   let client;
//   try {
//     client = await pool.connect();
//     await client.query('BEGIN');

//     const userResult = await client.query('SELECT id FROM users WHERE email = $1', [reviewerEmail]);
//     if (userResult.rows.length === 0) {
//       await client.query('ROLLBACK');
//       return res.status(404).json({ success: false, message: "Reviewing user not found." });
//     }
//     const reviewerUserId = userResult.rows[0].id;

//     const reviewInsertQuery = `
//       INSERT INTO reviews (id, provider_id, user_id, rating, content, created_at)
//       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING *;
//     `;
//     const reviewResult = await client.query(reviewInsertQuery, [uuidv4(), provider_id, reviewerUserId, rating, content || '']);
//     const newReview = reviewResult.rows[0];

//     if (tags && tags.length > 0) {
//       const updateTagsQuery = `
//         UPDATE service_providers
//         SET tags = (
//           SELECT array_agg(DISTINCT unnest_val)
//           FROM (
//             SELECT unnest(COALESCE(tags, ARRAY[]::TEXT[])) AS unnest_val FROM service_providers WHERE id = $1
//             UNION
//             SELECT unnest($2::TEXT[])
//           ) AS combined_tags
//         )
//         WHERE id = $1;
//       `;
//       await client.query(updateTagsQuery, [provider_id, tags]);
//     }

//     await client.query('COMMIT');
//     res.status(201).json({ success: true, message: "Review added successfully!", review: newReview });

//   } catch (error) {
//     if (client) await client.query('ROLLBACK');
//     res.status(500).json({ success: false, message: error.message || "Failed to add review." });
//   } finally {
//     if (client) client.release();
//   }
// };

// const getAllRecommendations = async (req, res) => {
//   try {
//     const query = `
//       SELECT sp.*, actual_sc.name AS category_name, actual_s.name AS service_type, u.email AS recommender_email
//       FROM service_providers sp
//       LEFT JOIN services actual_s ON sp.service_id = actual_s.service_id
//       LEFT JOIN service_categories actual_sc ON actual_s.category_id = actual_sc.service_id 
//       LEFT JOIN users u ON sp.recommended_by = u.id
//       WHERE sp.service_id != $1 
//       ORDER BY sp.created_at DESC;
//     `;
//     const { rows } = await pool.query(query, [PENDING_SERVICE_PK_ID]);
//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ error: 'Server error fetching recommendations' });
//   }
// };

// const getRecommendationById = async (req, res) => {
//   try {
//     const query = `
//       SELECT sp.*, actual_sc.name AS category_name, actual_s.name AS service_type, u.email AS recommender_email
//       FROM service_providers sp
//       LEFT JOIN services actual_s ON sp.service_id = actual_s.service_id
//       LEFT JOIN service_categories actual_sc ON actual_s.category_id = actual_sc.service_id
//       LEFT JOIN users u ON sp.recommended_by = u.id
//       WHERE sp.id = $1;
//     `;
//     const { rows } = await pool.query(query, [req.params.id]);
//     if (rows.length === 0) {
//       return res.status(404).json({ error: 'Recommendation not found' });
//     }
//     res.json(rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: 'Server error fetching recommendation' });
//   }
// };


// const updateRecommendation = async (req, res) => {
//   const serviceProviderId = req.params.id;
//   const clerkIdFromQuery = req.query.user_id;
//   const userEmailFromQuery = req.query.email;

//   const { business_name, phone_number, tags, rating, website, provider_contact_name, publish_scope, trust_circle_ids, recommender_message } = req.body;

//   if (!clerkIdFromQuery || !userEmailFromQuery) {
//     return res.status(401).json({ success: false, message: "User authentication details (ID and email) required." });
//   }

//   let client;
//   try {
//     client = await pool.connect();
//     await client.query('BEGIN');

//     const userLookupResult = await client.query('SELECT id FROM users WHERE email = $1 OR clerk_id = $2', [userEmailFromQuery, clerkIdFromQuery]);
//     if (userLookupResult.rows.length === 0) {
//       await client.query('ROLLBACK');
//       return res.status(404).json({ success: false, message: "Authenticated user profile not found in the local system." });
//     }
//     const editorUserUuid = userLookupResult.rows[0].id;

//     const providerCheck = await client.query('SELECT id FROM service_providers WHERE id = $1', [serviceProviderId]);
//     if (providerCheck.rows.length === 0) {
//       await client.query('ROLLBACK');
//       return res.status(404).json({ success: false, message: 'Recommendation not found.' });
//     }

//     let visibility_status_to_update;
//     if (typeof publish_scope === 'string') {
//         if (publish_scope === 'Public') visibility_status_to_update = 'public';
//         else if (publish_scope === 'Full Trust Circle' || publish_scope === 'Specific Trust Circles') visibility_status_to_update = 'connections';
//         else visibility_status_to_update = undefined;
//     } else {
//         visibility_status_to_update = undefined;
//     }

//     const serviceProviderUpdateQuery = `
//       UPDATE service_providers SET
//         business_name = COALESCE($1, business_name), phone_number = COALESCE($2, phone_number),
//         tags = COALESCE($3, tags), website = COALESCE($4, website),
//         business_contact = COALESCE($5, business_contact), recommender_message = COALESCE($6, recommender_message),
//         visibility = COALESCE($7, visibility), updated_at = NOW()
//       WHERE id = $8 RETURNING *;
//     `;
//     const spValues = [
//       toNull(business_name), toNull(phone_number), tags, toNull(website),
//       toNull(provider_contact_name), toNull(recommender_message), visibility_status_to_update, serviceProviderId
//     ];
//     const { rows: spRows } = await client.query(serviceProviderUpdateQuery, spValues);
//     const updatedServiceProvider = spRows[0];

//     let updatedReview;
//     if (rating !== undefined || (recommender_message !== undefined && recommender_message !== null)) {
//         const reviewUpdateQuery = `
//             UPDATE reviews SET rating = COALESCE($1, rating), content = COALESCE($2, content), updated_at = NOW()
//             WHERE provider_id = $3 AND user_id = $4 RETURNING *;
//         `;
//         const { rows: reviewRows } = await client.query(reviewUpdateQuery, [rating, recommender_message, serviceProviderId, editorUserUuid]);
//         if (reviewRows.length > 0) updatedReview = reviewRows[0];
//     }

//     if (!updatedReview) {
//         const reviewFetch = await client.query('SELECT * FROM reviews WHERE provider_id = $1 AND user_id = $2', [serviceProviderId, editorUserUuid]);
//         if (reviewFetch.rows.length > 0) updatedReview = reviewFetch.rows[0];
//         else {
//              await client.query('ROLLBACK');
//              return res.status(404).json({ success: false, message: 'Associated review by the current editor not found for this recommendation.' });
//         }
//     }

//     if (typeof publish_scope === 'string') {
//         await client.query('DELETE FROM community_shares WHERE service_provider_id = $1', [serviceProviderId]);
//         if (publish_scope === 'Specific Trust Circles' && trust_circle_ids && trust_circle_ids.length > 0) {
//             for (const communityId of trust_circle_ids) {
//                 await client.query(
//                     'INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, shared_at) VALUES ($1, $2, $3, $4, NOW())',
//                     [uuidv4(), serviceProviderId, communityId, editorUserUuid]
//                 );
//             }
//         } else if (publish_scope === 'Full Trust Circle') {
//             const userCommunitiesResult = await client.query(
//                 'SELECT community_id FROM community_memberships WHERE user_id = $1 AND status = $2',
//                 [editorUserUuid, 'approved']
//             );
//             if (userCommunitiesResult.rows.length > 0) {
//                 for (const row of userCommunitiesResult.rows) {
//                     await client.query(
//                         'INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, shared_at) VALUES ($1, $2, $3, $4, NOW())',
//                         [uuidv4(), serviceProviderId, row.community_id, editorUserUuid]
//                     );
//                 }
//             }
//         }
//     }

//     await client.query('COMMIT');
//     res.json({ success: true, updatedServiceProvider, updatedReview });

//   } catch (err) {
//     if (client) await client.query('ROLLBACK');
//     res.status(500).json({ success: false, error: 'Server error updating recommendation', detail: err.message });
//   } finally {
//     if (client) client.release();
//   }
// };

// // old version where some stuff worked [5/21 = 3pm]
// // const updateRecommendation = async (req, res) => {
// //   const serviceProviderId = req.params.id;
// //   const clerkIdFromQuery = req.query.user_id;
// //   const userEmailFromQuery = req.query.email;

// //   const { business_name, phone_number, tags, rating, website, provider_contact_name, publish_scope, trust_circle_ids, recommender_message } = req.body;

// //   if (!clerkIdFromQuery || !userEmailFromQuery) {
// //     return res.status(401).json({ success: false, message: "User authentication details (ID and email) required." });
// //   }

// //   let client;
// //   try {
// //     client = await pool.connect();
// //     await client.query('BEGIN');

// //     const userLookupResult = await client.query('SELECT id FROM users WHERE email = $1 OR clerk_id = $2', [userEmailFromQuery, clerkIdFromQuery]);
// //     if (userLookupResult.rows.length === 0) {
// //       await client.query('ROLLBACK');
// //       return res.status(404).json({ success: false, message: "Authenticated user profile not found in the local system." });
// //     }
// //     const editorUserUuid = userLookupResult.rows[0].id;

// //     const providerCheck = await client.query('SELECT id FROM service_providers WHERE id = $1', [serviceProviderId]);
// //     if (providerCheck.rows.length === 0) {
// //       await client.query('ROLLBACK');
// //       return res.status(404).json({ success: false, message: 'Recommendation not found.' });
// //     }

// //     let visibility_status_to_update;
// //     if (typeof publish_scope === 'string') {
// //         if (publish_scope === 'Public') visibility_status_to_update = 'public';
// //         else if (publish_scope === 'Full Trust Circle' || publish_scope === 'Specific Trust Circles') visibility_status_to_update = 'connections';
// //         else visibility_status_to_update = undefined;
// //     } else {
// //         visibility_status_to_update = undefined;
// //     }

// //     const serviceProviderUpdateQuery = `
// //       UPDATE service_providers SET
// //         business_name = COALESCE($1, business_name), phone_number = COALESCE($2, phone_number),
// //         tags = COALESCE($3, tags), website = COALESCE($4, website),
// //         business_contact = COALESCE($5, business_contact), recommender_message = COALESCE($6, recommender_message),
// //         visibility = COALESCE($7, visibility), updated_at = NOW()
// //       WHERE id = $8 RETURNING *;
// //     `;
// //     const spValues = [
// //       toNull(business_name), toNull(phone_number), tags, toNull(website),
// //       toNull(provider_contact_name), toNull(recommender_message), visibility_status_to_update, serviceProviderId
// //     ];
// //     const { rows: spRows } = await client.query(serviceProviderUpdateQuery, spValues);
// //     const updatedServiceProvider = spRows[0];

// //     let updatedReview;
// //     if (rating !== undefined || (recommender_message !== undefined && recommender_message !== null)) {
// //         const reviewUpdateQuery = `
// //             UPDATE reviews SET rating = COALESCE($1, rating), content = COALESCE($2, content), updated_at = NOW()
// //             WHERE provider_id = $3 AND user_id = $4 RETURNING *;
// //         `;
// //         const { rows: reviewRows } = await client.query(reviewUpdateQuery, [rating, recommender_message, serviceProviderId, editorUserUuid]);
// //         if (reviewRows.length > 0) updatedReview = reviewRows[0];
// //     }

// //     if (!updatedReview) {
// //         const reviewFetch = await client.query('SELECT * FROM reviews WHERE provider_id = $1 AND user_id = $2', [serviceProviderId, editorUserUuid]);
// //         if (reviewFetch.rows.length > 0) updatedReview = reviewFetch.rows[0];
// //         else {
// //              await client.query('ROLLBACK');
// //              return res.status(404).json({ success: false, message: 'Associated review by the current editor not found for this recommendation.' });
// //         }
// //     }

// //     if (typeof publish_scope === 'string') {
// //         await client.query('DELETE FROM community_shares WHERE service_provider_id = $1', [serviceProviderId]);
// //         if (publish_scope === 'Specific Trust Circles' && trust_circle_ids && trust_circle_ids.length > 0) {
// //             for (const communityId of trust_circle_ids) {
// //                 await client.query(
// //                     'INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, shared_at) VALUES ($1, $2, $3, $4, NOW())',
// //                     [uuidv4(), serviceProviderId, communityId, editorUserUuid]
// //                 );
// //             }
// //         }
// //     }

// //     await client.query('COMMIT');
// //     res.json({ success: true, updatedServiceProvider, updatedReview });

// //   } catch (err) {
// //     if (client) await client.query('ROLLBACK');
// //     res.status(500).json({ success: false, error: 'Server error updating recommendation', detail: err.message });
// //   } finally {
// //     if (client) client.release();
// //   }
// // };

// const getVisibleRecommendationsForUser = async (req, res) => {
//     const { user_id: clerkUserId, email: userEmail } = req.query;

//     if (!clerkUserId || !userEmail) {
//         return res.status(400).json({ success: false, message: "User ID (Clerk) and email are required." });
//     }

//     let client;
//     try {
//         client = await pool.connect();
//         const userResult = await client.query('SELECT id FROM users WHERE clerk_id = $1 OR email = $2', [clerkUserId, userEmail]);
//         if (userResult.rows.length === 0) {
//             return res.status(404).json({ success: false, message: "User not found." });
//         }
//         const internalUserId = userResult.rows[0].id;

//         const query = `
//             SELECT
//                 sp.id, sp.business_name, sp.description, sp.email, sp.phone_number, sp.website,
//                 sp.tags, sp.city, sp.state, sp.zip_code, sp.service_scope, sp.price_range,
//                 sp.business_contact, sp.provider_message, sp.recommender_message,
//                 sp.visibility, sp.notes, sp.price_paid,
//                 sp.date_of_recommendation, sp.created_at,
//                 sp.submitted_category_name, sp.submitted_service_name,
//                 cat.name AS category_name, 
//                 ser.name AS service_type,
//                 rec_user.id AS recommender_user_id,
//                 rec_user.clerk_id AS recommender_clerk_id,
//                 COALESCE(rec_user.name, rec_user.email) AS recommender_name,
//                 rec_user.email AS recommender_email,
//                 rec_user.profile_image_url AS recommender_profile_image_url,
//                 rec_user.phone_number AS recommender_phone,
//                 COALESCE(sp.num_likes, 0) AS num_likes,
//                 EXISTS (SELECT 1 FROM user_likes ul WHERE ul.provider_id = sp.id AND ul.user_id = $1) AS "currentUserLiked"
//             FROM service_providers sp
//             JOIN users rec_user ON sp.recommended_by = rec_user.id
//             LEFT JOIN services ser ON sp.service_id = ser.service_id AND ser.service_id != $2
//             LEFT JOIN service_categories cat ON ser.category_id = cat.service_id AND cat.service_id != $3
//             WHERE
//                 sp.service_id != $2 AND
//                 (
//                     sp.visibility = 'public' OR
//                     sp.recommended_by = $1 OR
//                     (
//                         sp.visibility = 'connections' AND EXISTS (
//                             SELECT 1 FROM community_shares cs
//                             JOIN community_memberships cm ON cs.community_id = cm.community_id
//                             WHERE cs.service_provider_id = sp.id AND cm.user_id = $1 AND cm.status = 'approved'
//                         )
//                     )
//                 )
//             ORDER BY sp.created_at DESC;
//         `;
//         const { rows } = await client.query(query, [internalUserId, PENDING_SERVICE_PK_ID, PENDING_CATEGORY_PK_ID]);
//         res.json({ success: true, providers: rows });

//     } catch (err) {
//         res.status(500).json({ success: false, error: 'Server error fetching visible recommendations', detail: err.message });
//     } finally {
//         if (client) client.release();
//     }
// };

// const searchProviders = async (req, res) => {
//     const { q, user_id: clerkUserId, email: userEmail } = req.query;

//     if (!clerkUserId || !userEmail) {
//         return res.status(400).json({ success: false, message: "User ID (Clerk) and email are required for search." });
//     }
//      if (!q) {
//         return res.status(400).json({ success: false, message: "Search query 'q' is required." });
//     }

//     let client;
//     try {
//         client = await pool.connect();
//         const userResult = await client.query('SELECT id FROM users WHERE clerk_id = $1 OR email = $2', [clerkUserId, userEmail]);
//         if (userResult.rows.length === 0) {
//             return res.status(404).json({ success: false, message: "User not found." });
//         }
//         const internalUserId = userResult.rows[0].id;
//         const searchTerm = `%${q.toLowerCase()}%`;

//         const searchQuery = `
//             SELECT
//                 sp.id, sp.business_name, sp.description, sp.email, sp.phone_number, sp.website,
//                 sp.tags, sp.city, sp.state, sp.zip_code, sp.service_scope, sp.price_range,
//                 sp.business_contact, sp.provider_message, sp.recommender_message,
//                 sp.visibility, sp.notes, sp.price_paid,
//                 sp.date_of_recommendation, sp.created_at,
//                 sp.submitted_category_name, sp.submitted_service_name,
//                 cat.name AS category_name, 
//                 ser.name AS service_type,
//                 rec_user.id AS recommender_user_id,
//                 rec_user.clerk_id AS recommender_clerk_id,
//                 COALESCE(rec_user.name, rec_user.email) AS recommender_name,
//                 rec_user.email AS recommender_email,
//                 rec_user.profile_image_url AS recommender_profile_image_url,
//                 rec_user.phone_number AS recommender_phone,
//                 COALESCE(sp.num_likes, 0) AS num_likes,
//                 EXISTS (SELECT 1 FROM user_likes ul WHERE ul.provider_id = sp.id AND ul.user_id = $1) AS "currentUserLiked"
//             FROM service_providers sp
//             JOIN users rec_user ON sp.recommended_by = rec_user.id
//             LEFT JOIN services ser ON sp.service_id = ser.service_id AND ser.service_id != $3
//             LEFT JOIN service_categories cat ON ser.category_id = cat.service_id AND cat.service_id != $4
//             WHERE
//                 sp.service_id != $3 AND
//                 (
//                     LOWER(sp.business_name) LIKE $2 OR
//                     LOWER(sp.description) LIKE $2 OR
//                     LOWER(sp.recommender_message) LIKE $2 OR
//                     LOWER(cat.name) LIKE $2 OR
//                     LOWER(ser.name) LIKE $2 OR
//                     EXISTS (SELECT 1 FROM unnest(sp.tags) AS tag WHERE LOWER(tag) LIKE $2) OR
//                     LOWER(sp.submitted_category_name) LIKE $2 OR
//                     LOWER(sp.submitted_service_name) LIKE $2 OR
//                     LOWER(rec_user.name) LIKE $2 OR
//                     LOWER(rec_user.email) LIKE $2
//                 ) AND
//                 (
//                     sp.visibility = 'public' OR
//                     sp.recommended_by = $1 OR
//                     (
//                         sp.visibility = 'connections' AND EXISTS (
//                             SELECT 1 FROM community_shares cs
//                             JOIN community_members cm ON cs.community_id = cm.community_id
//                             WHERE cs.service_provider_id = sp.id AND cm.user_id = $1 AND cm.status = 'approved'
//                         )
//                     )
//                 )
//             ORDER BY sp.created_at DESC;
//         `;
//         const { rows } = await client.query(searchQuery, [internalUserId, searchTerm, PENDING_SERVICE_PK_ID, PENDING_CATEGORY_PK_ID]);
//         res.json({ success: true, providers: rows });

//     } catch (err) {
//         res.status(500).json({ success: false, error: 'Server error during search.', detail: err.message });
//     } finally {
//         if (client) client.release();
//     }
// };

// const likeProvider = async (req, res) => {
//     const { providerId } = req.params;
//     const { userId: clerkUserId, userEmail } = req.body;

//     if (!clerkUserId || !userEmail) {
//         return res.status(400).json({ success: false, message: "User identifier required." });
//     }

//     let client;
//     try {
//         client = await pool.connect();
//         await client.query('BEGIN');

//         const userResult = await client.query('SELECT id FROM users WHERE clerk_id = $1 OR email = $2', [clerkUserId, userEmail]);
//         if (userResult.rows.length === 0) {
//             await client.query('ROLLBACK');
//             return res.status(404).json({ success: false, message: "User not found." });
//         }
//         const internalUserId = userResult.rows[0].id;

//         const likeCheck = await client.query('SELECT id FROM user_likes WHERE provider_id = $1 AND user_id = $2', [providerId, internalUserId]);
//         let currentUserLiked;

//         if (likeCheck.rows.length > 0) {
//             await client.query('DELETE FROM user_likes WHERE provider_id = $1 AND user_id = $2', [providerId, internalUserId]);
//             currentUserLiked = false;
//         } else {
//             await client.query('INSERT INTO user_likes (id, provider_id, user_id, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)', [uuidv4(), providerId, internalUserId]);
//             currentUserLiked = true;
//         }

//         const likesCountResult = await client.query('SELECT COUNT(*) AS count FROM user_likes WHERE provider_id = $1', [providerId]);
//         const num_likes = parseInt(likesCountResult.rows[0].count, 10);
//         await client.query('UPDATE service_providers SET num_likes = $1, updated_at = NOW() WHERE id = $2', [num_likes, providerId]);

//         await client.query('COMMIT');
//         res.json({ success: true, message: "Like status updated.", num_likes, currentUserLiked });

//     } catch (err) {
//         if (client) await client.query('ROLLBACK');
//         res.status(500).json({ success: false, error: 'Server error updating like status.', detail: err.message });
//     } finally {
//         if (client) client.release();
//     }
// };

// const getReviewStats = async (req, res) => {
//     const { providerId } = req.params;
//     let client;
//     try {
//         client = await pool.connect();
//         const stats = await client.query(
//             `SELECT AVG(rating) as average_rating, COUNT(id) as total_reviews FROM reviews WHERE provider_id = $1`,
//             [providerId]
//         );
//         if (stats.rows.length > 0 && stats.rows[0].total_reviews > 0) {
//             res.json({
//                 average_rating: parseFloat(stats.rows[0].average_rating) || 0,
//                 total_reviews: parseInt(stats.rows[0].total_reviews, 10) || 0,
//             });
//         } else {
//             res.json({ average_rating: 0, total_reviews: 0 });
//         }
//     } catch (err) {
//         res.status(500).json({ error: 'Failed to fetch review stats', detail: err.message });
//     } finally {
//         if (client) client.release();
//     }
// };

// const getReviewsForProvider = async (req, res) => {
//     const { providerId } = req.params;
//     let client;
//     try {
//         client = await pool.connect();
//         const reviews = await client.query(
//             `SELECT r.id, r.rating, r.content, r.created_at, u.name as user_name, u.email as user_email, u.profile_image_url
//              FROM reviews r
//              JOIN users u ON r.user_id = u.id
//              WHERE r.provider_id = $1 ORDER BY r.created_at DESC`,
//             [providerId]
//         );
//         res.json(reviews.rows);
//     } catch (err) {
//         res.status(500).json({ error: 'Failed to fetch reviews', detail: err.message });
//     } finally {
//         if (client) client.release();
//     }
// };

// module.exports = {
//   createRecommendation,
//   addReviewToProvider,
//   getAllRecommendations,
//   getRecommendationById,
//   updateRecommendation,
//   getVisibleRecommendationsForUser,
//   searchProviders,
//   likeProvider,
//   getReviewStats,
//   getReviewsForProvider,
// };


// working 5/21 => pre my rec
// const pool = require('../config/db.config');
// const { v4: uuidv4 } = require('uuid');

// const PENDING_SERVICE_PK_ID = 'e2c2b91a-c577-448b-8bd1-3e0c17b20e46'; 
// const PENDING_CATEGORY_PK_ID = '93859f52-830f-4b72-92fc-9316db28fb7e'; 

// const toNull = v => (v === undefined || v === '' || (Array.isArray(v) && v.length === 0) ? null : v);

// const createRecommendation = async (req, res) => {
//   const {
//     business_name,
//     description, 
//     category,    
//     subcategory, 
//     user_email,
//     email,       
//     phone_number,
//     tags, // These tags will now go directly into service_providers.tags
//     rating,      
//     website,
//     provider_contact_name, 
//     publish_scope,
//     trust_circle_ids,
//     recommender_message,   
//     notes, 
//     date_of_recommendation, 
//     price_range, 
//     service_scope, 
//     city, 
//     state, 
//     zip_code, 
//     provider_message, 
//     price_paid 
//   } = req.body;

//   if (!user_email || !business_name || !recommender_message || !rating) {
//     return res
//       .status(400)
//       .json({ success: false, message: 'Missing required fields (user_email, business_name, recommender_message, rating, and intended category/subcategory names).' });
//   }

//   let client;
//   try {
//     client = await pool.connect();
//     await client.query('BEGIN');

//     const userResult = await client.query('SELECT id FROM users WHERE email = $1', [user_email]);
//     if (userResult.rows.length === 0) {
//       await client.query('ROLLBACK');
//       return res.status(404).json({ success: false, message: "Recommending user not found." });
//     }
//     const recommenderUserId = userResult.rows[0].id;

//     let visibility_status = 'private';
//     if (publish_scope === 'Public') {
//         visibility_status = 'public';
//     } else if (publish_scope === 'Full Trust Circle') {
//         visibility_status = 'connections';
//     } else if (publish_scope === 'Specific Trust Circles') {
//         visibility_status = 'connections'; 
//     }
    
//     const newProviderId = uuidv4();
//     const actualDateOfRecommendation = date_of_recommendation ? new Date(date_of_recommendation) : new Date();

//     const providerInsertQuery = `
//       INSERT INTO service_providers (
//         id, business_name, description,
//         category_id, service_id, 
//         recommended_by, date_of_recommendation,
//         email, phone_number, website, tags, 
//         city, state, zip_code, service_scope, price_range,
//         business_contact, provider_message, recommender_message,
//         visibility, num_likes, notes, price_paid,
//         submitted_category_name, submitted_service_name,
//         created_at, updated_at
//       ) VALUES (
//         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
//       ) RETURNING id;
//     `;
    
//     const providerValues = [
//       newProviderId,                 
//       business_name,                 
//       toNull(description),           
//       PENDING_CATEGORY_PK_ID,      
//       PENDING_SERVICE_PK_ID,       
//       recommenderUserId,             
//       actualDateOfRecommendation,          
//       toNull(email),                 
//       toNull(phone_number),          
//       toNull(website),               
//       tags || [],  // Tags from the form payload directly into service_providers.tags
//       toNull(city),                  
//       toNull(state),                 
//       toNull(zip_code),              
//       toNull(service_scope),         
//       toNull(price_range),           
//       toNull(provider_contact_name), 
//       toNull(provider_message),      
//       recommender_message,           
//       visibility_status,             
//       0,                             
//       toNull(notes),                 
//       price_paid != null ? parseFloat(price_paid) : null, 
//       category,                      
//       subcategory,                   
//       actualDateOfRecommendation,          
//       actualDateOfRecommendation           
//     ];

//     await client.query(providerInsertQuery, providerValues);

//     // Insert the review WITHOUT tags, as tags are now on the provider
//     const reviewInsertQuery = `
//       INSERT INTO reviews (id, provider_id, user_id, rating, content, created_at)
//       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP);
//     `;
//     await client.query(reviewInsertQuery, [uuidv4(), newProviderId, recommenderUserId, rating, recommender_message]);
    
//     if (publish_scope === 'Specific Trust Circles' && trust_circle_ids && trust_circle_ids.length > 0) {
//         for (const communityId of trust_circle_ids) {
//             await client.query(
//                 'INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
//                 [uuidv4(), newProviderId, communityId, recommenderUserId]
//             );
//         }
//     }

//     await client.query('COMMIT');
//     res.status(201).json({ success: true, message: "Recommendation submitted for review successfully!", providerId: newProviderId });

//   } catch (err) {
//     if (client) await client.query('ROLLBACK');
//     console.error('🛑 createRecommendation error:', err);
//     res.status(500).json({
//       success: false,
//       error:  'Server error creating recommendation',
//       detail: err.message
//     });
//   } finally {
//     if (client) client.release();
//   }
// };

// // --- For subsequent reviews from ReviewModal on service pages ---
// // This function would handle POST /api/reviews
// const addReviewToProvider = async (req, res) => {
//   const { 
//     provider_id, 
//     // email, // user_email from localStorage is used by ShareRecommendation, here it might be user_id
//     user_id, // Assuming you send user_id of reviewer
//     rating, 
//     content, 
//     tags 
//   } = req.body;

//   if (!provider_id || !user_id || !rating || !content) {
//     return res.status(400).json({ success: false, message: "Missing required fields for review." });
//   }

//   let client;
//   try {
//     client = await pool.connect();
//     await client.query('BEGIN');

//     // 1. Insert the review (without tags in this table)
//     const reviewInsertQuery = `
//       INSERT INTO reviews (id, provider_id, user_id, rating, content, created_at)
//       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING *;
//     `;
//     const reviewResult = await client.query(reviewInsertQuery, [uuidv4(), provider_id, user_id, rating, content]);
//     const newReview = reviewResult.rows[0];

//     // 2. Update service_providers.tags by merging new tags
//     if (tags && tags.length > 0) {
//       const updateTagsQuery = `
//         UPDATE service_providers
//         SET tags = (
//           SELECT array_agg(DISTINCT unnest_val)
//           FROM (
//             SELECT unnest(COALESCE(tags, ARRAY[]::TEXT[])) AS unnest_val FROM service_providers WHERE id = $1
//             UNION
//             SELECT unnest($2::TEXT[])
//           ) AS combined_tags
//         )
//         WHERE id = $1;
//       `;
//       await client.query(updateTagsQuery, [provider_id, tags]);
//     }

//     await client.query('COMMIT');
//     res.status(201).json({ success: true, message: "Review added successfully!", review: newReview });

//   } catch (error) {
//     if (client) await client.query('ROLLBACK');
//     console.error("Error adding review:", error);
//     res.status(500).json({ success: false, message: error.message || "Failed to add review." });
//   } finally {
//     if (client) client.release();
//   }
// };


// const getAllRecommendations = async (req, res) => {
//   try {
//     const query = `
//       SELECT
//         sp.*,
//         actual_sc.name AS category_name, 
//         actual_s.name  AS service_type,  
//         u.email AS recommender_email
//       FROM service_providers sp
//       LEFT JOIN services actual_s ON sp.service_id = actual_s.service_id
//       LEFT JOIN service_categories actual_sc ON actual_s.category_id = actual_sc.service_id 
//       LEFT JOIN users u ON sp.recommended_by = u.id
//       WHERE sp.service_id != $1 
//       ORDER BY sp.created_at DESC;
//     `;
//     const { rows } = await pool.query(query, [PENDING_SERVICE_PK_ID]);
//     res.json(rows);
//   } catch (err) {
//     console.error('🛑 getAllRecommendations error:', err);
//     res.status(500).json({ error: 'Server error fetching recommendations' });
//   }
// };

// const getRecommendationById = async (req, res) => {
//   try {
//     const query = `
//       SELECT
//         sp.*,
//         actual_sc.name AS category_name, 
//         actual_s.name  AS service_type, 
//         u.email AS recommender_email
//       FROM service_providers sp
//       LEFT JOIN services actual_s ON sp.service_id = actual_s.service_id
//       LEFT JOIN service_categories actual_sc ON actual_s.category_id = actual_sc.service_id
//       LEFT JOIN users u ON sp.recommended_by = u.id
//       WHERE sp.id = $1;
//     `;
//     const { rows } = await pool.query(query, [req.params.id]);
//     if (rows.length === 0) {
//       return res.status(404).json({ error: 'Recommendation not found' });
//     }
//     res.json(rows[0]);
//   } catch (err) {
//     console.error('🛑 getRecommendationById error:', err);
//     res.status(500).json({ error: 'Server error fetching recommendation' });
//   }
// };

// const updateRecommendation = async (req, res) => {
//   const serviceProviderId = req.params.id;
//   const clerkIdFromQuery = req.query.user_id; // This is the Clerk string ID, e.g., "user_..."
//   const userEmailFromQuery = req.query.email; // Email of the user making the request

//   const {
//     business_name,
//     phone_number,
//     tags,
//     rating,
//     website,
//     provider_contact_name,
//     publish_scope,
//     trust_circle_ids,
//     recommender_message
//   } = req.body;

//   if (!clerkIdFromQuery || !userEmailFromQuery) {
//     return res.status(401).json({ success: false, message: "User authentication details (ID and email) required." });
//   }

//   let client;
//   try {
//     client = await pool.connect();
//     await client.query('BEGIN');

//     // Step 1: Look up the internal UUID for the user making the edit.
//     // We'll use userEmailFromQuery as it's consistent with createRecommendation's user lookup.
//     // Ensure your 'users' table has an 'email' column and an 'id' (UUID) column.
//     const userLookupResult = await client.query('SELECT id FROM users WHERE email = $1', [userEmailFromQuery]);

//     if (userLookupResult.rows.length === 0) {
//       await client.query('ROLLBACK');
//       // It's possible the user is authenticated with Clerk but doesn't have a corresponding entry in your local 'users' table.
//       // Or, the email passed doesn't match any user.
//       return res.status(404).json({ success: false, message: "Authenticated user profile not found in the local system." });
//     }
//     const editorUserUuid = userLookupResult.rows[0].id; // This is the internal UUID of the editor

//     // Step 2: Check if the recommendation (service_provider) exists
//     const providerCheck = await client.query('SELECT id FROM service_providers WHERE id = $1', [serviceProviderId]);
//     if (providerCheck.rows.length === 0) {
//       await client.query('ROLLBACK');
//       return res.status(404).json({ success: false, message: 'Recommendation not found.' });
//     }

//     let visibility_status_to_update;
//     if (typeof publish_scope === 'string') {
//         if (publish_scope === 'Public') visibility_status_to_update = 'public';
//         else if (publish_scope === 'Full Trust Circle' || publish_scope === 'Specific Trust Circles') visibility_status_to_update = 'connections';
//         else visibility_status_to_update = undefined;
//     } else {
//         visibility_status_to_update = undefined;
//     }

//     const serviceProviderUpdateQuery = `
//       UPDATE service_providers
//       SET
//         business_name        = COALESCE($1, business_name),
//         phone_number         = COALESCE($2, phone_number),
//         tags                 = COALESCE($3, tags),
//         website              = COALESCE($4, website),          -- Updates the 'website' column
//         business_contact     = COALESCE($5, business_contact), -- Updates the 'business_contact' column
//         recommender_message  = COALESCE($6, recommender_message),
//         visibility           = COALESCE($7, visibility),
//         updated_at           = NOW()
//       WHERE id = $8
//       RETURNING *;
//     `;
//     const spValues = [
//       toNull(business_name),         // $1 for business_name
//       toNull(phone_number),         // $2 for phone_number
//       tags,                         // $3 for tags
//       toNull(website),              // $4 for website (this comes from req.body.website)
//       toNull(provider_contact_name),// $5 for business_contact (this comes from req.body.provider_contact_name)
//       toNull(recommender_message),  // $6 for recommender_message
//       visibility_status_to_update,  // $7 for visibility
//       serviceProviderId             // $8 for id
//     ];
//     const { rows: spRows } = await client.query(serviceProviderUpdateQuery, spValues);
//     const updatedServiceProvider = spRows[0];

//     let updatedReview;
//     // Step 3: Use editorUserUuid (the UUID) when updating/fetching reviews
//     if (rating !== undefined || (recommender_message !== undefined && recommender_message !== null)) {
//         const reviewUpdateQuery = `
//             UPDATE reviews SET rating = COALESCE($1, rating), content = COALESCE($2, content), updated_at = NOW()
//             WHERE provider_id = $3 AND user_id = $4 RETURNING *;
//         `;
//         // Use editorUserUuid as $4 for reviews.user_id
//         const { rows: reviewRows } = await client.query(reviewUpdateQuery, [rating, recommender_message, serviceProviderId, editorUserUuid]);
//         if (reviewRows.length > 0) updatedReview = reviewRows[0];
//     }

//     if (!updatedReview) {
//         // Use editorUserUuid as $2 for reviews.user_id
//         const reviewFetch = await client.query('SELECT * FROM reviews WHERE provider_id = $1 AND user_id = $2', [serviceProviderId, editorUserUuid]);
//         if (reviewFetch.rows.length > 0) updatedReview = reviewFetch.rows[0];
//         else {
//              await client.query('ROLLBACK');
//              return res.status(404).json({ success: false, message: 'Associated review by the current editor not found for this recommendation. An editor must have an existing review for the provider to update it.' });
//         }
//     }

//     // Step 4: Use editorUserUuid (the UUID) for community shares
//     if (typeof publish_scope === 'string') {
//         await client.query('DELETE FROM community_shares WHERE service_provider_id = $1', [serviceProviderId]);
//         if (publish_scope === 'Specific Trust Circles' && trust_circle_ids && trust_circle_ids.length > 0) {
//             for (const communityId of trust_circle_ids) {
//                 await client.query(
//                     'INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, created_at) VALUES ($1, $2, $3, $4, NOW())',
//                     // Use editorUserUuid as $4 for community_shares.shared_by_user_id
//                     [uuidv4(), serviceProviderId, communityId, editorUserUuid]
//                 );
//             }
//         }
//     }

//     await client.query('COMMIT');
//     res.json({ success: true, updatedServiceProvider, updatedReview });

//   } catch (err) {
//     if (client) await client.query('ROLLBACK');
//     console.error('🛑 updateRecommendation error:', err.message, err.stack);
//     // Check if the error is the UUID syntax error to give a more specific hint if it persists
//     if (err.message && err.message.includes("invalid input syntax for type uuid")) {
//         console.error("Hint: A non-UUID value (likely a Clerk ID string) might still be incorrectly used where a database UUID is expected.");
//     }
//     res.status(500).json({ success: false, error: 'Server error updating recommendation', detail: err.message });
//   } finally {
//     if (client) client.release();
//   }
// };

// const deleteRecommendation = async (req, res) => {
//   try {
//     const { rows } = await pool.query(
//       'DELETE FROM service_providers WHERE id = $1 RETURNING *;',
//       [req.params.id]
//     );
//     if (!rows.length) {
//       return res.status(404).json({ error: 'Recommendation not found' });
//     }
//     res.json({ message: 'Recommendation deleted' });
//   } catch (err) {
//     console.error('🛑 deleteRecommendation error:', err);
//     res.status(500).json({ error: 'Server error deleting recommendation' });
//   }
// };

// module.exports = {
//   createRecommendation,
//   getAllRecommendations,
//   getRecommendationById,
//   updateRecommendation,
//   deleteRecommendation,
//   addReviewToProvider 
// };