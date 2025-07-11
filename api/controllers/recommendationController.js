const pool = require("../config/db.config");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 5,
        fieldSize: 30 * 1024 * 1024, // 30MB for images and other fields
    },
}).array("images", 5);

const uploadListProviders = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per image
        files: 50, // up to 5 images per 10 recs
        fieldSize: 30 * 1024 * 1024,
    },
}).any();

const uploadListCover = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max for cover image
        files: 1,
        fieldSize: 30 * 1024 * 1024,
    },
}).single("coverImage");

// Add this near the top with other multer config
const editUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 5,
        fieldSize: 30 * 1024 * 1024,
    },
}).array("images", 5);

const PENDING_SERVICE_PK_ID = "e2c2b91a-c577-448b-8bd1-3e0c17b20e46";
const PENDING_CATEGORY_PK_ID = "93859f52-830f-4b72-92fc-9316db28fb7e";

const toNull = (v) =>
    v === undefined || v === "" || (Array.isArray(v) && v.length === 0)
        ? null
        : v;

const createRecommendation = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: "Error uploading images",
                detail: err.message,
            });
        }

        let jsonData;
        try {
            jsonData = JSON.parse(req.body.data);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Invalid request data format",
                detail: error.message,
            });
        }

        const {
            business_name,
            recommender_message,
            rating,
            user_email,
            provider_contact_name,
            category,
            subcategory,
            website,
            phone_number,
            tags,
            publish_scope,
            trust_circle_ids,
            email,
            street_address,
            google_place_id,
            city,
            state,
            zip_code,
        } = jsonData;

        // Validation
        if (!business_name?.trim() || !recommender_message?.trim() || !rating) {
            return res.status(400).json({
                success: false,
                message:
                    "Missing required fields: Service Provider Name, Your Experience, and Rating are required.",
            });
        }

        // Process images
        const processedImages = (req.files || []).map((file) => ({
            id: uuidv4(),
            data: file.buffer,
            contentType: file.mimetype,
            size: file.size,
            createdAt: new Date().toISOString(),
        }));

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
                return res.status(404).json({
                    success: false,
                    message: "Recommending user not found.",
                });
            }
            const recommenderUserId = userResult.rows[0].id;

            let visibility_status = "private";
            if (publish_scope === "Public") {
                visibility_status = "public";
            } else if (publish_scope === "Full Trust Circle") {
                visibility_status = "connections";
            } else if (publish_scope === "Specific Trust Circles") {
                visibility_status = "communities";
            }

            const newProviderId = uuidv4();
            const actualDateOfRecommendation = new Date();

            const providerInsertQuery = `
      INSERT INTO service_providers (
        id, business_name, description, category_id, service_id, recommended_by, date_of_recommendation,
        email, phone_number, website, tags, city, state, zip_code, street_address, service_scope, price_range,
        business_contact, provider_message, recommender_message, visibility, num_likes, notes, price_paid,
        created_at, updated_at, images, initial_rating, google_place_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 0, $22, $23, $24, $25, $26, $27, $28
      ) RETURNING id;
    `;

            const providerValues = [
                newProviderId,
                business_name,
                null,
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
                toNull(street_address),
                null,
                null,
                toNull(provider_contact_name),
                null,
                recommender_message,
                visibility_status,
                null,
                null,
                actualDateOfRecommendation,
                actualDateOfRecommendation,
                JSON.stringify(processedImages),
                rating,
                toNull(google_place_id),
            ];

            await client.query(providerInsertQuery, providerValues);

            // After inserting into reviews:
            const reviewInsertQuery = `
  INSERT INTO reviews (id, provider_id, user_id, rating, content, created_at)
  VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
  RETURNING id;
`;
            const reviewResult = await client.query(reviewInsertQuery, [
                uuidv4(),
                newProviderId,
                recommenderUserId,
                rating,
                recommender_message,
            ]);
            const newReviewId = reviewResult.rows[0].id;

            if (
                publish_scope === "Specific Trust Circles" &&
                trust_circle_ids &&
                trust_circle_ids.length > 0
            ) {
                for (const communityId of trust_circle_ids) {
                    await client.query(
                        "INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, shared_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
                        [
                            uuidv4(),
                            newProviderId,
                            communityId,
                            recommenderUserId,
                        ]
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
                reviewId: newReviewId, // <-- add this
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
    });
};

// const createRecommendationWithUuid = async (req, res) => {
//     upload(req, res, async (err) => {
//         if (err) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Error uploading images",
//                 detail: err.message,
//             });
//         }

//         let jsonData;
//         try {
//             jsonData = JSON.parse(req.body.data);
//         } catch (error) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid request data format",
//                 detail: error.message,
//             });
//         }

//         const {
//             business_name,
//             recommender_message,
//             rating,
//             initial_rating, // Support both rating and initial_rating for CSV compatibility
//             recommended_by, // UUID passed directly
//             provider_contact_name,
//             category_id, // New field from CSV
//             service_id, // New field from CSV
//             website,
//             phone_number,
//             tags,
//             publish_scope,
//             visibility, // New field from CSV
//             trust_circle_ids,
//             email,
//             street_address,
//             google_place_id,
//             city,
//             state,
//             zip_code,
//             service_scope, // New field from CSV
//             num_likes, // New field from CSV
//             date_of_recommendation, // New field from CSV
//             total_reviews, // New field from CSV
//         } = jsonData;

//         // Use initial_rating if provided, otherwise fall back to rating
//         const finalRating = initial_rating || rating;

//         // Validation
//         if (
//             !business_name?.trim() ||
//             !recommender_message?.trim() ||
//             !finalRating
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message:
//                     "Missing required fields: Business Name, Experience Description, and Rating are required.",
//             });
//         }

//         // Additional validation for CSV fields
//         if (!recommended_by?.trim()) {
//             return res.status(400).json({
//                 success: false,
//                 message:
//                     "Missing required field: Recommended By (UUID) is required.",
//             });
//         }

//         // Process images
//         const processedImages = (req.files || []).map((file) => ({
//             id: uuidv4(),
//             data: file.buffer,
//             contentType: file.mimetype,
//             size: file.size,
//             createdAt: new Date().toISOString(),
//         }));

//         let client;
//         try {
//             client = await pool.connect();
//             await client.query("BEGIN");

//             // Use the UUID directly, check if user exists
//             const userResult = await client.query(
//                 "SELECT id FROM users WHERE id = $1",
//                 [recommended_by]
//             );
//             if (userResult.rows.length === 0) {
//                 await client.query("ROLLBACK");
//                 return res.status(404).json({
//                     success: false,
//                     message: "Recommending user not found.",
//                 });
//             }
//             const recommenderUserId = userResult.rows[0].id;

//             // Validate category_id if provided
//             if (category_id && category_id !== PENDING_CATEGORY_PK_ID) {
//                 const categoryResult = await client.query(
//                     "SELECT service_id FROM service_categories WHERE service_id = $1",
//                     [category_id]
//                 );
//                 if (categoryResult.rows.length === 0) {
//                     await client.query("ROLLBACK");
//                     return res.status(404).json({
//                         success: false,
//                         message: "Category not found.",
//                     });
//                 }
//             }

//             // Validate service_id if provided
//             if (service_id && service_id !== PENDING_SERVICE_PK_ID) {
//                 const serviceResult = await client.query(
//                     "SELECT service_id FROM services WHERE service_id = $1",
//                     [service_id]
//                 );
//                 if (serviceResult.rows.length === 0) {
//                     await client.query("ROLLBACK");
//                     return res.status(404).json({
//                         success: false,
//                         message: "Service not found.",
//                     });
//                 }
//             }

//             // Determine visibility status - prioritize CSV visibility field
//             let visibility_status = "connections"; // default
//             if (visibility) {
//                 // Direct mapping from CSV
//                 visibility_status = visibility;
//             } else if (publish_scope) {
//                 // Fallback to publish_scope for backward compatibility
//                 if (publish_scope === "Public") {
//                     visibility_status = "public";
//                 } else if (publish_scope === "Full Trust Circle") {
//                     visibility_status = "connections";
//                 } else if (publish_scope === "Specific Trust Circles") {
//                     visibility_status = "communities";
//                 }
//             }

//             const newProviderId = uuidv4();
//             const actualDateOfRecommendation = date_of_recommendation
//                 ? new Date(date_of_recommendation)
//                 : new Date();

//             const providerInsertQuery = `
//                 INSERT INTO service_providers (
//                     id, business_name, description, category_id, service_id, recommended_by, date_of_recommendation,
//                     email, phone_number, website, tags, city, state, zip_code, street_address, service_scope, price_range,
//                     business_contact, provider_message, recommender_message, visibility, num_likes, notes, price_paid,
//                     created_at, updated_at, images, initial_rating, google_place_id, total_reviews
//                 ) VALUES (
//                     $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
//                 ) RETURNING id;
//             `;

//             const providerValues = [
//                 newProviderId,
//                 business_name,
//                 null, // description
//                 toNull(category_id) || PENDING_CATEGORY_PK_ID,
//                 toNull(service_id) || PENDING_SERVICE_PK_ID,
//                 recommenderUserId,
//                 actualDateOfRecommendation,
//                 toNull(email),
//                 toNull(phone_number),
//                 toNull(website),
//                 tags || [],
//                 toNull(city),
//                 toNull(state),
//                 toNull(zip_code),
//                 toNull(street_address),
//                 toNull(service_scope),
//                 null, // price_range
//                 toNull(provider_contact_name),
//                 null, // provider_message
//                 recommender_message,
//                 visibility_status,
//                 num_likes || 1,
//                 null, // notes
//                 null, // price_paid
//                 new Date(), // created_at (current timestamp)
//                 new Date(), // updated_at
//                 JSON.stringify(processedImages),
//                 finalRating,
//                 toNull(google_place_id),
//                 total_reviews || 0,
//             ];

//             await client.query(providerInsertQuery, providerValues);

//             // Insert review
//             const reviewInsertQuery = `
//                 INSERT INTO reviews (id, provider_id, user_id, rating, content, created_at)
//                 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
//                 RETURNING id;
//             `;
//             const reviewResult = await client.query(reviewInsertQuery, [
//                 uuidv4(),
//                 newProviderId,
//                 recommenderUserId,
//                 finalRating,
//                 recommender_message,
//             ]);
//             const newReviewId = reviewResult.rows[0].id;

//             // Community shares logic (same as original)
//             if (
//                 publish_scope === "Specific Trust Circles" &&
//                 trust_circle_ids &&
//                 trust_circle_ids.length > 0
//             ) {
//                 for (const communityId of trust_circle_ids) {
//                     await client.query(
//                         "INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, shared_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
//                         [
//                             uuidv4(),
//                             newProviderId,
//                             communityId,
//                             recommenderUserId,
//                         ]
//                     );
//                 }
//             } else if (
//                 publish_scope === "Full Trust Circle" ||
//                 publish_scope === "Public"
//             ) {
//                 const userCommunitiesResult = await client.query(
//                     "SELECT community_id FROM community_memberships WHERE user_id = $1 AND status = $2",
//                     [recommenderUserId, "approved"]
//                 );
//                 if (userCommunitiesResult.rows.length > 0) {
//                     for (const row of userCommunitiesResult.rows) {
//                         await client.query(
//                             "INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, shared_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
//                             [
//                                 uuidv4(),
//                                 newProviderId,
//                                 row.community_id,
//                                 recommenderUserId,
//                             ]
//                         );
//                     }
//                 }
//             }

//             await client.query("COMMIT");
//             res.status(201).json({
//                 success: true,
//                 message: "Recommendation submitted for review successfully!",
//                 providerId: newProviderId,
//                 reviewId: newReviewId,
//             });
//         } catch (err) {
//             if (client) await client.query("ROLLBACK");
//             res.status(500).json({
//                 success: false,
//                 error: "Server error creating recommendation",
//                 detail: err.message,
//             });
//         } finally {
//             if (client) client.release();
//         }
//     });
// };

const createRecommendationWithUuid = async (req, res) => {
    // console.log added: Start of the function call
    // console.log("createRecommendationWithUuid function started.");

    upload(req, res, async (err) => {
        if (err) {
            // console.log added: Error during image upload
            console.error("Error uploading images:", err.message);
            return res.status(400).json({
                success: false,
                message: "Error uploading images",
                detail: err.message,
            });
        }

        let jsonData;
        try {
            jsonData = JSON.parse(req.body.data);
            // console.log added: After JSON parsing
            // console.log("Parsed jsonData:", JSON.stringify(jsonData, null, 2));
        } catch (error) {
            // console.log added: Error during JSON parsing
            console.error("Invalid request data format error:", error.message);
            return res.status(400).json({
                success: false,
                message: "Invalid request data format",
                detail: error.message,
            });
        }

        const {
            business_name,
            recommender_message,
            rating,
            initial_rating, // Support both rating and initial_rating for CSV compatibility
            recommended_by, // UUID passed directly
            provider_contact_name,
            category_id, // New field from CSV
            service_id, // New field from CSV
            website,
            phone_number,
            tags,
            publish_scope,
            visibility, // New field from CSV
            trust_circle_ids,
            email,
            street_address,
            google_place_id,
            city,
            state,
            zip_code,
            service_scope, // New field from CSV
            num_likes, // New field from CSV
            date_of_recommendation, // New field from CSV
            total_reviews, // New field from CSV
        } = jsonData;

        // console.log added: Extracted values from jsonData
        // console.log("Extracted values:", { city, state, zip_code, street_address, email, phone_number, website, google_place_id, service_scope, provider_contact_name, category_id, service_id });


        // Use initial_rating if provided, otherwise fall back to rating
        const finalRating = initial_rating || rating;

        // Validation
        if (
            !business_name?.trim() ||
            !recommender_message?.trim() ||
            !finalRating
        ) {
            // console.log added: Validation error - missing required fields
            console.error("Validation failed: Missing required fields.");
            return res.status(400).json({
                success: false,
                message:
                    "Missing required fields: Business Name, Experience Description, and Rating are required.",
            });
        }

        // Additional validation for CSV fields
        if (!recommended_by?.trim()) {
            // console.log added: Validation error - Recommended By missing
            console.error("Validation failed: Recommended By (UUID) is required.");
            return res.status(400).json({
                success: false,
                message:
                    "Missing required field: Recommended By (UUID) is required.",
            });
        }

        // Process images
        const processedImages = (req.files || []).map((file) => ({
            id: uuidv4(),
            data: file.buffer,
            contentType: file.mimetype,
            size: file.size,
            createdAt: new Date().toISOString(),
        }));
        // console.log added: Processed images info
        // console.log("Processed images count:", processedImages.length);


        let client;
        try {
            client = await pool.connect();
            await client.query("BEGIN");
            // console.log added: Database transaction started
            // console.log("Database transaction BEGIN.");

            // Assuming toNull is defined elsewhere in your code, or define it here if not.
            // Keeping it here for context as it was part of the original discussion.
            const toNull = (v) =>
                v === undefined || v === "" || (Array.isArray(v) && v.length === 0)
                    ? null
                    : v;

            // Use the UUID directly, check if user exists
            const userResult = await client.query(
                "SELECT id FROM users WHERE id = $1",
                [recommended_by]
            );
            if (userResult.rows.length === 0) {
                await client.query("ROLLBACK");
                // console.log added: Recommending user not found
                console.error("Recommending user not found for ID:", recommended_by);
                return res.status(404).json({
                    success: false,
                    message: "Recommending user not found.",
                });
            }
            const recommenderUserId = userResult.rows[0].id;
            // console.log added: Recommender user found
            // console.log("Recommender user ID:", recommenderUserId);


            // Validate category_id if provided
            if (category_id && category_id !== PENDING_CATEGORY_PK_ID) {
                const categoryResult = await client.query(
                    "SELECT service_id FROM service_categories WHERE service_id = $1",
                    [category_id]
                );
                if (categoryResult.rows.length === 0) {
                    await client.query("ROLLBACK");
                    // console.log added: Category not found
                    console.error("Category not found for ID:", category_id);
                    return res.status(404).json({
                        success: false,
                        message: "Category not found.",
                    });
                }
                // console.log added: Category validated
                // console.log("Category ID validated:", category_id);
            }


            // Validate service_id if provided
            if (service_id && service_id !== PENDING_SERVICE_PK_ID) {
                const serviceResult = await client.query(
                    "SELECT service_id FROM services WHERE service_id = $1",
                    [service_id]
                );
                if (serviceResult.rows.length === 0) {
                    await client.query("ROLLBACK");
                    // console.log added: Service not found
                    console.error("Service not found for ID:", service_id);
                    return res.status(404).json({
                        success: false,
                        message: "Service not found.",
                    });
                }
                // console.log added: Service validated
                // console.log("Service ID validated:", service_id);
            }


            // Determine visibility status - prioritize CSV visibility field
            let visibility_status = "connections"; // default
            if (visibility) {
                visibility_status = visibility;
            } else if (publish_scope) {
                if (publish_scope === "Public") {
                    visibility_status = "public";
                } else if (publish_scope === "Full Trust Circle") {
                    visibility_status = "connections";
                } else if (publish_scope === "Specific Trust Circles") {
                    visibility_status = "communities";
                }
            }
            // console.log added: Final visibility status
            // console.log("Final visibility status:", visibility_status);

            const newProviderId = uuidv4();
            const actualDateOfRecommendation = date_of_recommendation
                ? new Date(date_of_recommendation)
                : new Date();
            // console.log added: New provider ID and date of recommendation
            // console.log("New Provider ID:", newProviderId);
            // console.log("Actual Date of Recommendation:", actualDateOfRecommendation.toISOString());


            const providerInsertQuery = `
                INSERT INTO service_providers (
                    id, business_name, description, category_id, service_id, recommended_by, date_of_recommendation,
                    email, phone_number, website, tags, city, state, zip_code, street_address, service_scope, price_range,
                    business_contact, provider_message, recommender_message, visibility, num_likes, notes, price_paid,
                    created_at, updated_at, images, initial_rating, google_place_id, total_reviews
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
                ) RETURNING id;
            `;

            const providerValues = [
                newProviderId,
                business_name,
                null, // description
                toNull(category_id),
                toNull(service_id),
                recommenderUserId,
                actualDateOfRecommendation,
                toNull(email),
                toNull(phone_number),
                toNull(website),
                tags || [],
                city, // Changed: Removed toNull()
                state, // Changed: Removed toNull()
                zip_code, // Changed: Removed toNull()
                street_address, // Changed: Removed toNull()
                toNull(service_scope),
                null, // price_range
                toNull(provider_contact_name),
                null, // provider_message
                recommender_message,
                visibility_status,
                num_likes,
                null, // notes
                null, // price_paid
                new Date(), // created_at (current timestamp)
                new Date(), // updated_at
                JSON.stringify(processedImages),
                finalRating,
                toNull(google_place_id),
                total_reviews || 0,
            ];
            // console.log added: Final providerValues array before query execution
            // console.log("Final providerValues array (trimmed for brevity):");
            // console.log("  city:", providerValues[11]);
            // console.log("  state:", providerValues[12]);
            // console.log("  zip_code:", providerValues[13]);
            // console.log("  street_address:", providerValues[14]);
            // console.log("  category_id (toNull):", providerValues[3]);
            // console.log("  service_id (toNull):", providerValues[4]);
            // console.log("  email (toNull):", providerValues[7]);
            // console.log("  phone_number (toNull):", providerValues[8]);
            // console.log("  website (toNull):", providerValues[9]);
            // console.log("  google_place_id (toNull):", providerValues[28]);
            // console.log("  service_scope (toNull):", providerValues[15]);


            await client.query(providerInsertQuery, providerValues);
            // console.log added: Provider insert query executed
            // console.log("Provider insert query executed successfully.");

            // Insert review
            const reviewInsertQuery = `
                INSERT INTO reviews (id, provider_id, user_id, rating, content, created_at)
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                RETURNING id;
            `;
            const reviewResult = await client.query(reviewInsertQuery, [
                uuidv4(),
                newProviderId,
                recommenderUserId,
                finalRating,
                recommender_message,
            ]);
            const newReviewId = reviewResult.rows[0].id;
            // console.log added: Review insert query executed
            // console.log("Review insert query executed successfully. New Review ID:", newReviewId);


            // Community shares logic (same as original)
            if (
                publish_scope === "Specific Trust Circles" &&
                trust_circle_ids &&
                trust_circle_ids.length > 0
            ) {
                // console.log added: Specific Trust Circles share logic activated
                // console.log("Sharing to specific trust circles:", trust_circle_ids);
                for (const communityId of trust_circle_ids) {
                    await client.query(
                        "INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, shared_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
                        [
                            uuidv4(),
                            newProviderId,
                            communityId,
                            recommenderUserId,
                        ]
                    );
                    // console.log(`  Shared to community: ${communityId}`);
                }
            } else if (
                publish_scope === "Full Trust Circle" ||
                publish_scope === "Public"
            ) {
                // console.log added: Full Trust Circle/Public share logic activated
                // console.log("Sharing to Full Trust Circle or Public communities.");
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
                        // console.log(`  Shared to user's community: ${row.community_id}`);
                    }
                } else {
                    // console.log("  No approved communities found for user to share to.");
                }
            }

            await client.query("COMMIT");
            // console.log added: Database transaction committed
            // console.log("Database transaction COMMIT. Recommendation created successfully.");
            res.status(201).json({
                success: true,
                message: "Recommendation submitted for review successfully!",
                providerId: newProviderId,
                reviewId: newReviewId,
            });
        } catch (err) {
            if (client) {
                await client.query("ROLLBACK");
                // console.log added: Database transaction rolled back due to error
                console.error("Database transaction ROLLBACK.");
            }
            // console.log added: Server error during recommendation creation
            console.error("Server error creating recommendation:", err.message);
            res.status(500).json({
                success: false,
                error: "Server error creating recommendation",
                detail: err.message,
            });
        } finally {
            if (client) {
                client.release();
                // console.log added: Database client released
                // console.log("Database client released.");
            }
            // console.log added: End of function execution
            // console.log("createRecommendationWithUuid function finished.");
        }
    });
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
        return res.status(400).json({
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
    let client;
    editUpload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: "Error uploading images",
                detail: err.message,
            });
        }

        try {
            client = await pool.connect();
            await client.query("BEGIN");

            const serviceProviderId = req.params.id;
            const clerkIdFromQuery = req.query.user_id;
            const userEmailFromQuery = req.query.email;

            let jsonData;
            try {
                jsonData = JSON.parse(req.body.data);
            } catch (error) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    success: false,
                    message: "Invalid request data format",
                    detail: error.message,
                });
            }

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
                existingImages,
            } = jsonData;

            // Determine visibility status
            let visibility_status = "private";
            if (publish_scope === "Public") {
                visibility_status = "public";
            } else if (publish_scope === "Full Trust Circle") {
                visibility_status = "connections";
            } else if (publish_scope === "Specific Trust Circles") {
                visibility_status = "communities";
            }

            // Process new images
            const processedNewImages = (req.files || []).map((file) => ({
                id: uuidv4(),
                data: file.buffer,
                contentType: file.mimetype,
                size: file.size,
                createdAt: new Date().toISOString(),
            }));

            // Combine existing and new images
            const updatedImages = [
                ...(existingImages || []),
                ...processedNewImages,
            ];

            // Update service provider
            const serviceProviderUpdateQuery = `
                UPDATE service_providers SET
                    business_name = COALESCE($1, business_name),
                    phone_number = COALESCE($2, phone_number),
                    tags = COALESCE($3, tags),
                    website = COALESCE($4, website),
                    business_contact = COALESCE($5, business_contact),
                    recommender_message = COALESCE($6, recommender_message),
                    visibility = COALESCE($7, visibility),
                    images = $8,
                    initial_rating = COALESCE($9, initial_rating),
                    updated_at = NOW()
                WHERE id = $10 RETURNING *;
            `;

            const spValues = [
                toNull(business_name),
                toNull(phone_number),
                tags,
                toNull(website),
                toNull(provider_contact_name),
                toNull(recommender_message),
                visibility_status,
                JSON.stringify(updatedImages),
                rating,
                serviceProviderId,
            ];

            const updatedServiceProvider = await client.query(
                serviceProviderUpdateQuery,
                spValues
            );

            // Update the corresponding review if rating is provided
            if (rating !== undefined && rating !== null) {
                const recommenderUserId =
                    updatedServiceProvider.rows[0].recommended_by;

                // Update the review rating to match the updated initial_rating
                await client.query(
                    `UPDATE reviews SET 
                        rating = $1,
                        content = COALESCE($2, content),
                        updated_at = NOW()
                    WHERE provider_id = $3 AND user_id = $4`,
                    [
                        rating,
                        recommender_message,
                        serviceProviderId,
                        recommenderUserId,
                    ]
                );
            }

            // Update trust circle shares if needed
            if (
                publish_scope === "Specific Trust Circles" &&
                Array.isArray(trust_circle_ids)
            ) {
                // First, remove all existing shares
                await client.query(
                    "DELETE FROM community_shares WHERE service_provider_id = $1",
                    [serviceProviderId]
                );

                // Then add new shares
                for (const circleId of trust_circle_ids) {
                    await client.query(
                        "INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, shared_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
                        [
                            uuidv4(),
                            serviceProviderId,
                            circleId,
                            updatedServiceProvider.rows[0].recommended_by,
                        ]
                    );
                }
            }

            await client.query("COMMIT");
            res.json({
                success: true,
                updatedServiceProvider: updatedServiceProvider.rows[0],
            });
        } catch (err) {
            if (client) await client.query("ROLLBACK");
            console.error("Update error:", err); // Add detailed logging
            res.status(500).json({
                success: false,
                error: "Server error updating recommendation",
                detail: err.message,
            });
        } finally {
            if (client) client.release();
        }
    });
};

const getVisibleRecommendationsForUser = async (req, res) => {
    const { user_id: clerkUserId, email: userEmail } = req.query;

    if (!clerkUserId || !userEmail) {
        return res.status(400).json({
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
                            SELECT 1 FROM user_connections
                            WHERE status = 'accepted' AND 
                            ((user_id = $1 AND connected_user_id = sp.recommended_by) OR (user_id = sp.recommended_by AND connected_user_id = $1))
                        )
                    ) OR
                    (
                        sp.visibility = 'communities' AND EXISTS (
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
        return res.status(400).json({
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
                cat.name AS category_name,
                ser.name AS service_type,
                rec_user.id AS recommender_user_id,
                rec_user.username as recommender_username,
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
                    LOWER(rec_user.name) LIKE $2 OR
                    LOWER(rec_user.email) LIKE $2
                ) AND
                (
                    sp.visibility = 'public' OR
                    sp.recommended_by = $1 OR
                    (
                        sp.visibility = 'connections' AND EXISTS (
                            SELECT 1 FROM user_connections
                            WHERE status = 'accepted' AND 
                            ((user_id = $1 AND connected_user_id = sp.recommended_by) OR (user_id = sp.recommended_by AND connected_user_id = $1))
                        )
                    ) OR
                    (
                        sp.visibility = 'communities' AND EXISTS (
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

const getLikers = async (req, res) => {
    const { recommendation_id } = req.params;

    if (!recommendation_id) {
        return res.status(400).json({ error: "recommendation_id is required" });
    }

    try {
        const query = `
        SELECT u.id, u.name, u.preferred_name, u.username, (u.profile_image IS NOT NULL) as has_profile_image, rl.created_at
        FROM users u
        JOIN recommendation_likes rl ON u.id = rl.user_id
        WHERE rl.recommendation_id = $1
        ORDER BY rl.created_at DESC;
      `;
        const result = await pool.query(query, [recommendation_id]);

        res.status(200).json({
            success: true,
            likers: result.rows,
        });
    } catch (error) {
        console.error("Error fetching likers:", error);
        res.status(500).json({ error: "Failed to fetch likers" });
    }
};

const getRecommendationsByUser = async (req, res) => {
    const { userId } = req.params;
    try {
        const userResult = await pool.query(
            "SELECT id FROM users WHERE clerk_id = $1 OR email = $1",
            [userId]
        );
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }
        const internalUserId = userResult.rows[0].id;
        const recs = await pool.query(
            `SELECT * FROM service_providers WHERE recommended_by = $1 ORDER BY created_at DESC`,
            [internalUserId]
        );
        res.json({ success: true, recommendations: recs.rows });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch recommendations.",
            detail: err.message,
        });
    }
};

module.exports = {
    createRecommendation,
    createRecommendationWithUuid,
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
    getLikers,
    getRecommendationsByUser,
};
