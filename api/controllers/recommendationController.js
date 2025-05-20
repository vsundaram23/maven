const pool = require('../config/db.config');
const { v4: uuidv4 } = require('uuid');

const PENDING_SERVICE_PK_ID = 'e2c2b91a-c577-448b-8bd1-3e0c17b20e46'; 
const PENDING_CATEGORY_PK_ID = '93859f52-830f-4b72-92fc-9316db28fb7e'; 

const toNull = v => (v === undefined || v === '' || (Array.isArray(v) && v.length === 0) ? null : v);

const createRecommendation = async (req, res) => {
  const {
    business_name,
    description, 
    category,    
    subcategory, 
    user_email,
    email,       
    phone_number,
    tags, // These tags will now go directly into service_providers.tags
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
    price_paid 
  } = req.body;

  if (!user_email || !business_name || !recommender_message || !rating) {
    return res
      .status(400)
      .json({ success: false, message: 'Missing required fields (user_email, business_name, recommender_message, rating, and intended category/subcategory names).' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const userResult = await client.query('SELECT id FROM users WHERE email = $1', [user_email]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: "Recommending user not found." });
    }
    const recommenderUserId = userResult.rows[0].id;

    let visibility_status = 'private';
    if (publish_scope === 'Public') {
        visibility_status = 'public';
    } else if (publish_scope === 'Full Trust Circle') {
        visibility_status = 'connections';
    } else if (publish_scope === 'Specific Trust Circles') {
        visibility_status = 'connections'; 
    }
    
    const newProviderId = uuidv4();
    const actualDateOfRecommendation = date_of_recommendation ? new Date(date_of_recommendation) : new Date();

    const providerInsertQuery = `
      INSERT INTO service_providers (
        id, business_name, description,
        category_id, service_id, 
        recommended_by, date_of_recommendation,
        email, phone_number, website, tags, 
        city, state, zip_code, service_scope, price_range,
        business_contact, provider_message, recommender_message,
        visibility, num_likes, notes, price_paid,
        submitted_category_name, submitted_service_name,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
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
      tags || [],  // Tags from the form payload directly into service_providers.tags
      toNull(city),                  
      toNull(state),                 
      toNull(zip_code),              
      toNull(service_scope),         
      toNull(price_range),           
      toNull(provider_contact_name), 
      toNull(provider_message),      
      recommender_message,           
      visibility_status,             
      0,                             
      toNull(notes),                 
      price_paid != null ? parseFloat(price_paid) : null, 
      category,                      
      subcategory,                   
      actualDateOfRecommendation,          
      actualDateOfRecommendation           
    ];

    await client.query(providerInsertQuery, providerValues);

    // Insert the review WITHOUT tags, as tags are now on the provider
    const reviewInsertQuery = `
      INSERT INTO reviews (id, provider_id, user_id, rating, content, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP);
    `;
    await client.query(reviewInsertQuery, [uuidv4(), newProviderId, recommenderUserId, rating, recommender_message]);
    
    if (publish_scope === 'Specific Trust Circles' && trust_circle_ids && trust_circle_ids.length > 0) {
        for (const communityId of trust_circle_ids) {
            await client.query(
                'INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
                [uuidv4(), newProviderId, communityId, recommenderUserId]
            );
        }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: "Recommendation submitted for review successfully!", providerId: newProviderId });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('🛑 createRecommendation error:', err);
    res.status(500).json({
      success: false,
      error:  'Server error creating recommendation',
      detail: err.message
    });
  } finally {
    if (client) client.release();
  }
};

// --- For subsequent reviews from ReviewModal on service pages ---
// This function would handle POST /api/reviews
const addReviewToProvider = async (req, res) => {
  const { 
    provider_id, 
    // email, // user_email from localStorage is used by ShareRecommendation, here it might be user_id
    user_id, // Assuming you send user_id of reviewer
    rating, 
    content, 
    tags 
  } = req.body;

  if (!provider_id || !user_id || !rating || !content) {
    return res.status(400).json({ success: false, message: "Missing required fields for review." });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // 1. Insert the review (without tags in this table)
    const reviewInsertQuery = `
      INSERT INTO reviews (id, provider_id, user_id, rating, content, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING *;
    `;
    const reviewResult = await client.query(reviewInsertQuery, [uuidv4(), provider_id, user_id, rating, content]);
    const newReview = reviewResult.rows[0];

    // 2. Update service_providers.tags by merging new tags
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

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: "Review added successfully!", review: newReview });

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error("Error adding review:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to add review." });
  } finally {
    if (client) client.release();
  }
};


const getAllRecommendations = async (req, res) => {
  try {
    const query = `
      SELECT
        sp.*,
        actual_sc.name AS category_name, 
        actual_s.name  AS service_type,  
        u.email AS recommender_email
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
    console.error('🛑 getAllRecommendations error:', err);
    res.status(500).json({ error: 'Server error fetching recommendations' });
  }
};

const getRecommendationById = async (req, res) => {
  try {
    const query = `
      SELECT
        sp.*,
        actual_sc.name AS category_name, 
        actual_s.name  AS service_type, 
        u.email AS recommender_email
      FROM service_providers sp
      LEFT JOIN services actual_s ON sp.service_id = actual_s.service_id
      LEFT JOIN service_categories actual_sc ON actual_s.category_id = actual_sc.service_id
      LEFT JOIN users u ON sp.recommended_by = u.id
      WHERE sp.id = $1;
    `;
    const { rows } = await pool.query(query, [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('🛑 getRecommendationById error:', err);
    res.status(500).json({ error: 'Server error fetching recommendation' });
  }
};

const updateRecommendation = async (req, res) => {
  const serviceProviderId = req.params.id;
  const clerkIdFromQuery = req.query.user_id; // This is the Clerk string ID, e.g., "user_..."
  const userEmailFromQuery = req.query.email; // Email of the user making the request

  const {
    business_name,
    phone_number,
    tags,
    rating,
    website,
    provider_contact_name,
    publish_scope,
    trust_circle_ids,
    recommender_message
  } = req.body;

  if (!clerkIdFromQuery || !userEmailFromQuery) {
    return res.status(401).json({ success: false, message: "User authentication details (ID and email) required." });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Step 1: Look up the internal UUID for the user making the edit.
    // We'll use userEmailFromQuery as it's consistent with createRecommendation's user lookup.
    // Ensure your 'users' table has an 'email' column and an 'id' (UUID) column.
    const userLookupResult = await client.query('SELECT id FROM users WHERE email = $1', [userEmailFromQuery]);

    if (userLookupResult.rows.length === 0) {
      await client.query('ROLLBACK');
      // It's possible the user is authenticated with Clerk but doesn't have a corresponding entry in your local 'users' table.
      // Or, the email passed doesn't match any user.
      return res.status(404).json({ success: false, message: "Authenticated user profile not found in the local system." });
    }
    const editorUserUuid = userLookupResult.rows[0].id; // This is the internal UUID of the editor

    // Step 2: Check if the recommendation (service_provider) exists
    const providerCheck = await client.query('SELECT id FROM service_providers WHERE id = $1', [serviceProviderId]);
    if (providerCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Recommendation not found.' });
    }

    let visibility_status_to_update;
    if (typeof publish_scope === 'string') {
        if (publish_scope === 'Public') visibility_status_to_update = 'public';
        else if (publish_scope === 'Full Trust Circle' || publish_scope === 'Specific Trust Circles') visibility_status_to_update = 'connections';
        else visibility_status_to_update = undefined;
    } else {
        visibility_status_to_update = undefined;
    }

    const serviceProviderUpdateQuery = `
      UPDATE service_providers
      SET
        business_name        = COALESCE($1, business_name),
        phone_number         = COALESCE($2, phone_number),
        tags                 = COALESCE($3, tags),
        website              = COALESCE($4, website),
        business_contact     = COALESCE($5, business_contact),
        recommender_message  = COALESCE($6, recommender_message),
        visibility           = COALESCE($7, visibility),
        updated_at           = NOW()
      WHERE id = $8
      RETURNING *;
    `;
    const spValues = [
      toNull(business_name), toNull(phone_number), tags, toNull(website),
      toNull(provider_contact_name), toNull(recommender_message),
      visibility_status_to_update, serviceProviderId
    ];
    const { rows: spRows } = await client.query(serviceProviderUpdateQuery, spValues);
    const updatedServiceProvider = spRows[0];

    let updatedReview;
    // Step 3: Use editorUserUuid (the UUID) when updating/fetching reviews
    if (rating !== undefined || (recommender_message !== undefined && recommender_message !== null)) {
        const reviewUpdateQuery = `
            UPDATE reviews SET rating = COALESCE($1, rating), content = COALESCE($2, content), updated_at = NOW()
            WHERE provider_id = $3 AND user_id = $4 RETURNING *;
        `;
        // Use editorUserUuid as $4 for reviews.user_id
        const { rows: reviewRows } = await client.query(reviewUpdateQuery, [rating, recommender_message, serviceProviderId, editorUserUuid]);
        if (reviewRows.length > 0) updatedReview = reviewRows[0];
    }

    if (!updatedReview) {
        // Use editorUserUuid as $2 for reviews.user_id
        const reviewFetch = await client.query('SELECT * FROM reviews WHERE provider_id = $1 AND user_id = $2', [serviceProviderId, editorUserUuid]);
        if (reviewFetch.rows.length > 0) updatedReview = reviewFetch.rows[0];
        else {
             await client.query('ROLLBACK');
             return res.status(404).json({ success: false, message: 'Associated review by the current editor not found for this recommendation. An editor must have an existing review for the provider to update it.' });
        }
    }

    // Step 4: Use editorUserUuid (the UUID) for community shares
    if (typeof publish_scope === 'string') {
        await client.query('DELETE FROM community_shares WHERE service_provider_id = $1', [serviceProviderId]);
        if (publish_scope === 'Specific Trust Circles' && trust_circle_ids && trust_circle_ids.length > 0) {
            for (const communityId of trust_circle_ids) {
                await client.query(
                    'INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, created_at) VALUES ($1, $2, $3, $4, NOW())',
                    // Use editorUserUuid as $4 for community_shares.shared_by_user_id
                    [uuidv4(), serviceProviderId, communityId, editorUserUuid]
                );
            }
        }
    }

    await client.query('COMMIT');
    res.json({ success: true, updatedServiceProvider, updatedReview });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('🛑 updateRecommendation error:', err.message, err.stack);
    // Check if the error is the UUID syntax error to give a more specific hint if it persists
    if (err.message && err.message.includes("invalid input syntax for type uuid")) {
        console.error("Hint: A non-UUID value (likely a Clerk ID string) might still be incorrectly used where a database UUID is expected.");
    }
    res.status(500).json({ success: false, error: 'Server error updating recommendation', detail: err.message });
  } finally {
    if (client) client.release();
  }
};

// const updateRecommendation = async (req, res) => {
//   const serviceProviderId = req.params.id;
//   const clerkUserId = req.query.user_id;

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

//   if (!clerkUserId) {
//     return res.status(401).json({ success: false, message: "User authentication required." });
//   }

//   let client;
//   try {
//     client = await pool.connect();
//     await client.query('BEGIN');

//     const providerCheck = await client.query('SELECT recommended_by FROM service_providers WHERE id = $1', [serviceProviderId]);
//     if (providerCheck.rows.length === 0) {
//       await client.query('ROLLBACK');
//       return res.status(404).json({ success: false, message: 'Recommendation not found.' });
//     }
//     const originalRecommenderId = providerCheck.rows[0].recommended_by;
//     if (originalRecommenderId !== clerkUserId) {
//       await client.query('ROLLBACK');
//       return res.status(403).json({ success: false, message: 'You are not authorized to update this recommendation.' });
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
//         website              = COALESCE($4, website),
//         business_contact     = COALESCE($5, business_contact),
//         recommender_message  = COALESCE($6, recommender_message),
//         visibility           = COALESCE($7, visibility),
//         updated_at           = NOW()
//       WHERE id = $8
//       RETURNING *;
//     `;
//     const spValues = [
//       toNull(business_name), toNull(phone_number), tags, toNull(website),
//       toNull(provider_contact_name), toNull(recommender_message),
//       visibility_status_to_update, serviceProviderId
//     ];
//     const { rows: spRows } = await client.query(serviceProviderUpdateQuery, spValues);
//     const updatedServiceProvider = spRows[0];

//     let updatedReview;
//     if (rating !== undefined || (recommender_message !== undefined && recommender_message !== null)) {
//         const reviewUpdateQuery = `
//             UPDATE reviews SET rating = COALESCE($1, rating), content = COALESCE($2, content), updated_at = NOW()
//             WHERE provider_id = $3 AND user_id = $4 RETURNING *;
//         `;
//         const { rows: reviewRows } = await client.query(reviewUpdateQuery, [rating, recommender_message, serviceProviderId, clerkUserId]);
//         if (reviewRows.length > 0) updatedReview = reviewRows[0];
//     }
//     if (!updatedReview) {
//         const reviewFetch = await client.query('SELECT * FROM reviews WHERE provider_id = $1 AND user_id = $2', [serviceProviderId, clerkUserId]);
//         if (reviewFetch.rows.length > 0) updatedReview = reviewFetch.rows[0];
//         else {
//              await client.query('ROLLBACK');
//              return res.status(404).json({ success: false, message: 'Associated review not found for this recommendation.' });
//         }
//     }


//     if (typeof publish_scope === 'string') {
//         await client.query('DELETE FROM community_shares WHERE service_provider_id = $1', [serviceProviderId]);
//         if (publish_scope === 'Specific Trust Circles' && trust_circle_ids && trust_circle_ids.length > 0) {
//             for (const communityId of trust_circle_ids) {
//                 await client.query(
//                     'INSERT INTO community_shares (id, service_provider_id, community_id, shared_by_user_id, created_at) VALUES ($1, $2, $3, $4, NOW())',
//                     [uuidv4(), serviceProviderId, communityId, clerkUserId]
//                 );
//             }
//         }
//     }

//     await client.query('COMMIT');
//     res.json({ success: true, updatedServiceProvider, updatedReview });

//   } catch (err) {
//     if (client) await client.query('ROLLBACK');
//     console.error('🛑 updateRecommendation error:', err.message, err.stack);
//     res.status(500).json({ success: false, error: 'Server error updating recommendation', detail: err.message });
//   } finally {
//     if (client) client.release();
//   }
// };

const deleteRecommendation = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM service_providers WHERE id = $1 RETURNING *;',
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    res.json({ message: 'Recommendation deleted' });
  } catch (err) {
    console.error('🛑 deleteRecommendation error:', err);
    res.status(500).json({ error: 'Server error deleting recommendation' });
  }
};

module.exports = {
  createRecommendation,
  getAllRecommendations,
  getRecommendationById,
  updateRecommendation,
  deleteRecommendation,
  addReviewToProvider 
};

// // controllers/recommendationController.js
// const pool = require('../config/db.config');

// // Helper: turn empty/undefined into null
// const toNull = v => (v === undefined || v === '' ? null : v);

// const createRecommendation = async (req, res) => {
//   const {
//     business_name,
//     description,           // maps to service_providers.description
//     category,              // service_categories.name
//     subcategory,           // services.name
//     user_email,            // recommender’s email
//     email,                 // provider email
//     phone_number,
//     notes,
//     date_of_recommendation,
//     tags,                  // array of strings
//     price_range,
//     service_scope,
//     city,
//     state,
//     zip_code,
//     website,
//     provider_message,
//     business_contact,
//     recommender_message,
//     price_paid
//   } = req.body;

//   // minimal required validation
//   if (!business_name || !category || !subcategory) {
//     return res
//       .status(400)
//       .json({ error: 'business_name, category & subcategory are required' });
//   }

//   const insertSQL = `
//     INSERT INTO service_providers (
//       business_name,
//       description,
//       category_id,
//       created_at,
//       recommended_by,
//       service_id,
//       email,
//       phone_number,
//       notes,
//       date_of_recommendation,
//       tags,
//       price_range,
//       service_scope,
//       city,
//       state,
//       zip_code,
//       website,
//       provider_message,
//       business_contact,
//       recommender_message,
//       price_paid
//     ) VALUES (
//       $1, $2,
//       (SELECT sc.category_id FROM service_categories sc WHERE sc.name = $3),
//       COALESCE($4::timestamp, CURRENT_TIMESTAMP),
//       (SELECT u.id            FROM users u      WHERE u.email = $5),
//       (SELECT s.service_id    FROM services s  WHERE s.name = $6),
//       $7, $8, $9,
//       COALESCE($10::date, CURRENT_DATE),
//       $11,
//       $12, $13, $14, $15, $16,
//       $17, $18, $19, $20, $21
//     )
//     RETURNING *;
//   `;

//   const values = [
//     business_name,                           // $1
//     toNull(description),                     // $2
//     category,                                // $3
//     toNull(date_of_recommendation),          // $4
//     user_email,                              // $5
//     subcategory,                             // $6
//     toNull(email),                           // $7
//     toNull(phone_number),                    // $8
//     toNull(notes),                           // $9
//     toNull(date_of_recommendation),          // $10
//     tags || [],                              // $11
//     toNull(price_range),                     // $12
//     toNull(service_scope),                   // $13
//     toNull(city),                            // $14
//     toNull(state),                           // $15
//     toNull(zip_code),                        // $16
//     toNull(website),                         // $17
//     toNull(provider_message),                // $18
//     toNull(business_contact),                // $19
//     toNull(recommender_message),             // $20
//     price_paid != null ? parseFloat(price_paid) : null // $21
//   ];

//   try {
//     const { rows } = await pool.query(insertSQL, values);
//     if (tags && tags.length && rows.length > 0) {
//         const providerId = rows[0].id;
      
//         await pool.query(
//             `
//             UPDATE service_providers
//             SET tags = (
//               SELECT ARRAY(
//                 SELECT DISTINCT unnest(service_providers.tags || $1::text[])
//               )
//             )
//             WHERE id = $2
//             RETURNING *;
//             `,
//             [tags, providerId]
//         );
//       }
//     res.status(201).json(rows[0]);
//   } catch (err) {
//     console.error('🛑 createRecommendation error:', err);
//     res.status(500).json({
//       error:  'Server error creating recommendation',
//       detail: err.message
//     });
//   }
// };

// const getAllRecommendations = async (req, res) => {
//   try {
//     const query = `
//       SELECT
//         sp.*,
//         sc.name AS category_name,
//         s.name  AS service_name,
//         u.email AS recommender_email
//       FROM service_providers sp
//       JOIN service_categories sc ON sp.category_id = sc.category_id
//       JOIN services s           ON sp.service_id   = s.service_id
//       LEFT JOIN users u         ON sp.recommended_by = u.id
//       ORDER BY sp.created_at DESC;
//     `;
//     const { rows } = await pool.query(query);
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
//         sc.name AS category_name,
//         s.name  AS service_name,
//         u.email AS recommender_email
//       FROM service_providers sp
//       JOIN service_categories sc ON sp.category_id = sc.category_id
//       JOIN services s           ON sp.service_id   = s.service_id
//       LEFT JOIN users u         ON sp.recommended_by = u.id
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
//   const {
//     business_name,
//     description,
//     category,
//     subcategory,
//     email,
//     phone_number,
//     notes,
//     date_of_recommendation,
//     tags,
//     price_range,
//     service_scope,
//     city,
//     state,
//     zip_code,
//     website,
//     provider_message,
//     business_contact,
//     recommender_message,
//     price_paid
//   } = req.body;

//   const updateSQL = `
//     UPDATE service_providers
//     SET
//       business_name        = $1,
//       description           = $2,
//       category_id           = (SELECT sc.category_id FROM service_categories sc WHERE sc.name = $3),
//       service_id            = (SELECT s.service_id     FROM services s          WHERE s.name = $4),
//       email                 = $5,
//       phone_number          = $6,
//       notes                 = $7,
//       date_of_recommendation = $8::date,
//       tags                  = $9,
//       price_range           = $10,
//       service_scope         = $11,
//       city                  = $12,
//       state                 = $13,
//       zip_code              = $14,
//       website               = $15,
//       provider_message      = $16,
//       business_contact      = $17,
//       recommender_message   = $18,
//       price_paid            = $19,
//       updated_at            = CURRENT_TIMESTAMP
//     WHERE id = $20
//     RETURNING *;
//   `;

//   const values = [
//     business_name,
//     toNull(description),
//     category,
//     subcategory,
//     toNull(email),
//     toNull(phone_number),
//     toNull(notes),
//     toNull(date_of_recommendation),
//     tags || [],
//     toNull(price_range),
//     toNull(service_scope),
//     toNull(city),
//     toNull(state),
//     toNull(zip_code),
//     toNull(website),
//     toNull(provider_message),
//     toNull(business_contact),
//     toNull(recommender_message),
//     price_paid != null ? parseFloat(price_paid) : null,
//     req.params.id
//   ];

//   try {
//     const { rows } = await pool.query(updateSQL, values);
//     if (rows.length === 0) {
//       return res.status(404).json({ error: 'Recommendation not found' });
//     }
//     res.json(rows[0]);
//   } catch (err) {
//     console.error('🛑 updateRecommendation error:', err);
//     res.status(500).json({
//       error:  'Server error updating recommendation',
//       detail: err.message
//     });
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
//   deleteRecommendation
// };

// // controllers/recommendationController.js
// const pool = require('../config/db.config');

// const createRecommendation = async (req, res) => {
//     const { 
//         business_name, 
//         email, 
//         phone_number, 
//         category, 
//         subcategory,
//         description,
//         notes 
//     } = req.body;
    
//     try {
//         // Validate required fields
//         if (!business_name || !email || !phone_number || !category || !subcategory) {
//             return res.status(400).json({ error: 'All fields are required' });
//         }

//         // Get user email from request or use anonymous
//         const userEmail = req.body.user_email || 'anonymous@user.com';
        
//         const insertQuery = `
//             INSERT INTO service_providers (
//                 business_name,
//                 description,
//                 category_id,
//                 recommended_by,
//                 service_id,
//                 email,
//                 phone_number,
//                 notes,
//                 created_at
//             ) 
//             VALUES (
//                 $1,
//                 $2,
//                 (SELECT sc.category_id FROM service_categories sc WHERE sc.name = $3),
//                 (SELECT u.id FROM users u WHERE u.email = $4),
//                 (SELECT s.service_id FROM services s WHERE s.name = $5),
//                 $6,
//                 $7,
//                 $8,
//                 CURRENT_TIMESTAMP
//             )
//             RETURNING *
//         `;
        
//         const result = await pool.query(insertQuery, [
//             business_name,
//             description || '',
//             category,
//             userEmail,
//             subcategory,
//             email,
//             phone_number,
//             notes || ''
//         ]);
        
//         res.status(201).json(result.rows[0]);
//     } catch (error) {
//         console.error('Error creating recommendation:', error);
//         res.status(500).json({ error: 'Failed to create recommendation' });
//     }
// };

// const getAllRecommendations = async (req, res) => {
//     try {
//         const query = `
//             SELECT 
//                 sp.*,
//                 sc.name as category_name,
//                 s.name as service_name,
//                 u.email as recommender_email
//             FROM service_providers sp
//             JOIN service_categories sc ON sp.category_id = sc.category_id
//             JOIN services s ON sp.service_id = s.service_id
//             LEFT JOIN users u ON sp.recommended_by = u.id
//             ORDER BY sp.created_at DESC
//         `;
//         const result = await pool.query(query);
//         res.json(result.rows);
//     } catch (error) {
//         console.error('Error fetching recommendations:', error);
//         res.status(500).json({ error: 'Failed to fetch recommendations' });
//     }
// };

// const getRecommendationById = async (req, res) => {
//     try {
//         const query = `
//             SELECT 
//                 sp.*,
//                 sc.name as category_name,
//                 s.name as service_name,
//                 u.email as recommender_email
//             FROM service_providers sp
//             JOIN service_categories sc ON sp.category_id = sc.category_id
//             JOIN services s ON sp.service_id = s.service_id
//             LEFT JOIN users u ON sp.recommended_by = u.id
//             WHERE sp.id = $1
//         `;
//         const result = await pool.query(query, [req.params.id]);
        
//         if (result.rows.length === 0) {
//             return res.status(404).json({ error: 'Recommendation not found' });
//         }
        
//         res.json(result.rows[0]);
//     } catch (error) {
//         console.error('Error fetching recommendation:', error);
//         res.status(500).json({ error: 'Failed to fetch recommendation' });
//     }
// };

// const updateRecommendation = async (req, res) => {
//     const { 
//         business_name, 
//         email, 
//         phone_number, 
//         category, 
//         subcategory,
//         description,
//         notes 
//     } = req.body;
    
//     try {
//         const updateQuery = `
//             UPDATE service_providers 
//             SET business_name = $1,
//                 description = $2,
//                 category_id = (SELECT sc.category_id FROM service_categories sc WHERE sc.name = $3),
//                 service_id = (SELECT s.service_id FROM services s WHERE s.name = $4),
//                 email = $5,
//                 phone_number = $6,
//                 notes = $7,
//                 updated_at = CURRENT_TIMESTAMP
//             WHERE id = $8
//             RETURNING *
//         `;
        
//         const result = await pool.query(updateQuery, [
//             business_name,
//             description || '',
//             category,
//             subcategory,
//             email,
//             phone_number,
//             notes || '',
//             req.params.id
//         ]);
        
//         if (result.rows.length === 0) {
//             return res.status(404).json({ error: 'Recommendation not found' });
//         }
        
//         res.json(result.rows[0]);
//     } catch (error) {
//         console.error('Error updating recommendation:', error);
//         res.status(500).json({ error: 'Failed to update recommendation' });
//     }
// };

// const deleteRecommendation = async (req, res) => {
//     try {
//         const query = 'DELETE FROM service_providers WHERE id = $1 RETURNING *';
//         const result = await pool.query(query, [req.params.id]);
        
//         if (result.rows.length === 0) {
//             return res.status(404).json({ error: 'Recommendation not found' });
//         }
        
//         res.json({ message: 'Recommendation removed successfully' });
//     } catch (error) {
//         console.error('Error deleting recommendation:', error);
//         res.status(500).json({ error: 'Failed to delete recommendation' });
//     }
// };

// module.exports = {
//     createRecommendation,
//     getAllRecommendations,
//     getRecommendationById,
//     updateRecommendation,
//     deleteRecommendation
// };
