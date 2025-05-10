// controllers/recommendationController.js
const pool = require('../config/db.config');

// Helper: turn empty/undefined into null
const toNull = v => (v === undefined || v === '' ? null : v);

const createRecommendation = async (req, res) => {
  const {
    business_name,
    description,           // maps to service_providers.description
    category,              // service_categories.name
    subcategory,           // services.name
    user_email,            // recommender’s email
    email,                 // provider email
    phone_number,
    notes,
    date_of_recommendation,
    tags,                  // array of strings
    price_range,
    service_scope,
    city,
    state,
    zip_code,
    website,
    provider_message,
    business_contact,
    recommender_message,
    price_paid
  } = req.body;

  // minimal required validation
  if (!business_name || !category || !subcategory) {
    return res
      .status(400)
      .json({ error: 'business_name, category & subcategory are required' });
  }

  const insertSQL = `
    INSERT INTO service_providers (
      business_name,
      description,
      category_id,
      created_at,
      recommended_by,
      service_id,
      email,
      phone_number,
      notes,
      date_of_recommendation,
      tags,
      price_range,
      service_scope,
      city,
      state,
      zip_code,
      website,
      provider_message,
      business_contact,
      recommender_message,
      price_paid
    ) VALUES (
      $1, $2,
      (SELECT sc.category_id FROM service_categories sc WHERE sc.name = $3),
      COALESCE($4::timestamp, CURRENT_TIMESTAMP),
      (SELECT u.id            FROM users u      WHERE u.email = $5),
      (SELECT s.service_id    FROM services s  WHERE s.name = $6),
      $7, $8, $9,
      COALESCE($10::date, CURRENT_DATE),
      $11,
      $12, $13, $14, $15, $16,
      $17, $18, $19, $20, $21
    )
    RETURNING *;
  `;

  const values = [
    business_name,                           // $1
    toNull(description),                     // $2
    category,                                // $3
    toNull(date_of_recommendation),          // $4
    user_email,                              // $5
    subcategory,                             // $6
    toNull(email),                           // $7
    toNull(phone_number),                    // $8
    toNull(notes),                           // $9
    toNull(date_of_recommendation),          // $10
    tags || [],                              // $11
    toNull(price_range),                     // $12
    toNull(service_scope),                   // $13
    toNull(city),                            // $14
    toNull(state),                           // $15
    toNull(zip_code),                        // $16
    toNull(website),                         // $17
    toNull(provider_message),                // $18
    toNull(business_contact),                // $19
    toNull(recommender_message),             // $20
    price_paid != null ? parseFloat(price_paid) : null // $21
  ];

  try {
    const { rows } = await pool.query(insertSQL, values);
    if (tags && tags.length && rows.length > 0) {
        const providerId = rows[0].id;
      
        await pool.query(
            `
            UPDATE service_providers
            SET tags = (
              SELECT ARRAY(
                SELECT DISTINCT unnest(service_providers.tags || $1::text[])
              )
            )
            WHERE id = $2
            RETURNING *;
            `,
            [tags, providerId]
        );
      }
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('🛑 createRecommendation error:', err);
    res.status(500).json({
      error:  'Server error creating recommendation',
      detail: err.message
    });
  }
};

const getAllRecommendations = async (req, res) => {
  try {
    const query = `
      SELECT
        sp.*,
        sc.name AS category_name,
        s.name  AS service_name,
        u.email AS recommender_email
      FROM service_providers sp
      JOIN service_categories sc ON sp.category_id = sc.category_id
      JOIN services s           ON sp.service_id   = s.service_id
      LEFT JOIN users u         ON sp.recommended_by = u.id
      ORDER BY sp.created_at DESC;
    `;
    const { rows } = await pool.query(query);
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
        sc.name AS category_name,
        s.name  AS service_name,
        u.email AS recommender_email
      FROM service_providers sp
      JOIN service_categories sc ON sp.category_id = sc.category_id
      JOIN services s           ON sp.service_id   = s.service_id
      LEFT JOIN users u         ON sp.recommended_by = u.id
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
  const {
    business_name,
    description,
    category,
    subcategory,
    email,
    phone_number,
    notes,
    date_of_recommendation,
    tags,
    price_range,
    service_scope,
    city,
    state,
    zip_code,
    website,
    provider_message,
    business_contact,
    recommender_message,
    price_paid
  } = req.body;

  const updateSQL = `
    UPDATE service_providers
    SET
      business_name        = $1,
      description           = $2,
      category_id           = (SELECT sc.category_id FROM service_categories sc WHERE sc.name = $3),
      service_id            = (SELECT s.service_id     FROM services s          WHERE s.name = $4),
      email                 = $5,
      phone_number          = $6,
      notes                 = $7,
      date_of_recommendation = $8::date,
      tags                  = $9,
      price_range           = $10,
      service_scope         = $11,
      city                  = $12,
      state                 = $13,
      zip_code              = $14,
      website               = $15,
      provider_message      = $16,
      business_contact      = $17,
      recommender_message   = $18,
      price_paid            = $19,
      updated_at            = CURRENT_TIMESTAMP
    WHERE id = $20
    RETURNING *;
  `;

  const values = [
    business_name,
    toNull(description),
    category,
    subcategory,
    toNull(email),
    toNull(phone_number),
    toNull(notes),
    toNull(date_of_recommendation),
    tags || [],
    toNull(price_range),
    toNull(service_scope),
    toNull(city),
    toNull(state),
    toNull(zip_code),
    toNull(website),
    toNull(provider_message),
    toNull(business_contact),
    toNull(recommender_message),
    price_paid != null ? parseFloat(price_paid) : null,
    req.params.id
  ];

  try {
    const { rows } = await pool.query(updateSQL, values);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('🛑 updateRecommendation error:', err);
    res.status(500).json({
      error:  'Server error updating recommendation',
      detail: err.message
    });
  }
};

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
  deleteRecommendation
};

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
