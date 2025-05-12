const express = require('express');
const router = express.Router();
const pool = require('../config/db.config');

// Get all appliance providers
router.get('/', async (req, res) => {
  console.log('=== START GET ALL APPLIANCE PROVIDERS ===');
  console.log('Request received:', {
    path: req.path,
    method: req.method,
    headers: req.headers
  });

  try {
    console.log('Constructing SQL query...');
    const query = `
      SELECT 
        sp.id,
        sp.recommended_by        AS recommended_by,
        sp.business_name,
        sp.description,
        sp.email,
        sp.phone_number,
        sp.num_likes,
        sp.date_of_recommendation,
        sp.tags,
        s.name as service_type,
        u.name as recommended_by_name,
        u.email          AS recommender_email,
        u.phone_number   AS recommender_phone
      FROM service_providers sp
      JOIN services s ON sp.service_id = s.service_id
      JOIN service_categories sc ON s.category_id = sc.service_id
      JOIN users u ON sp.recommended_by = u.id
      WHERE s.name = 'Appliance Services'
    `;
    
    console.log('Executing query:', query);
    const result = await pool.query(query);
    console.log('Query executed successfully');
    console.log('Number of rows returned:', result.rows.length);
    
    res.setHeader('Content-Type', 'application/json');
    res.json(result.rows);
    console.log('Returned fields from SQL:', result.rows[0]);
    
  } catch (error) {
    console.error('=== ERROR IN GET ALL APPLIANCE PROVIDERS ===');
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    res.status(500).json({ 
      error: 'Failed to fetch appliance providers',
      details: error.message 
    });
  }
});

// Get appliance provider by ID
router.get('/:id', async (req, res) => {
  console.log('=== START GET APPLIANCE PROVIDER BY ID ===');
  console.log('Provider ID requested:', req.params.id);
  
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        sp.*,
        sp.recommended_by        AS recommended_by,
        sp.tags,
        s.name as service_type,
        u.name as recommended_by_name,
        u.email          AS recommender_email,
        u.phone_number   AS recommender_phone,
        ROUND(AVG(r.rating), 2) as average_rating,
        COUNT(r.id) as total_reviews
      FROM service_providers sp
      JOIN services s ON sp.service_id = s.service_id
      JOIN users u ON sp.recommended_by = u.id
      LEFT JOIN reviews r ON sp.id = r.provider_id
      WHERE s.name = 'Appliance Services' AND sp.id = $1
      GROUP BY sp.id, sp.recommended_by, s.name, u.name
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appliance provider not found' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('=== ERROR IN GET APPLIANCE PROVIDER BY ID ===');
    console.error('Error details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch appliance provider',
      details: error.message 
    });
  }
});

module.exports = router;

//

// working 4/9

// const express = require('express');
// const router = express.Router();
// const pool = require('../config/db.config');

// // Get all appliance providers
// router.get('/', async (req, res) => {
//   console.log('=== START GET ALL APPLIANCE PROVIDERS ===');
//   console.log('Request received:', {
//     path: req.path,
//     method: req.method,
//     headers: req.headers
//   });

//   try {
//     console.log('Constructing SQL query...');
//     const query = `
//       SELECT 
//         sp.id,
//         sp.business_name,
//         sp.description,
//         sp.email,
//         sp.phone_number,
//         sp.num_likes,
//         s.name as service_type,
//         u.name as recommended_by_name
//       FROM service_providers sp
//       JOIN services s ON sp.service_id = s.service_id
//       JOIN service_categories sc ON s.category_id = sc.service_id
//       JOIN users u ON sp.recommended_by = u.id
//       WHERE s.name = 'Appliance Services'
//     `;
    
//     console.log('Executing query:', query);
//     const result = await pool.query(query);
//     console.log('Query executed successfully');
//     console.log('Number of rows returned:', result.rows.length);
    
//     res.setHeader('Content-Type', 'application/json');
//     res.json(result.rows);
    
//   } catch (error) {
//     console.error('=== ERROR IN GET ALL APPLIANCE PROVIDERS ===');
//     console.error('Error details:', {
//       message: error.message,
//       stack: error.stack,
//       code: error.code
//     });
    
//     res.status(500).json({ 
//       error: 'Failed to fetch appliance providers',
//       details: error.message 
//     });
//   }
// });

// // Get appliance provider by ID
// router.get('/:id', async (req, res) => {
//   console.log('=== START GET APPLIANCE PROVIDER BY ID ===');
//   console.log('Provider ID requested:', req.params.id);
  
//   try {
//     const { id } = req.params;
//     const query = `
//       SELECT 
//         sp.id,
//         sp.business_name,
//         sp.description,
//         sp.email,
//         sp.phone_number,
//         sp.num_likes,
//         s.name as service_type,
//         u.name as recommended_by_name
//       FROM service_providers sp
//       JOIN services s ON sp.service_id = s.service_id
//       JOIN service_categories sc ON s.category_id = sc.service_id
//       JOIN users u ON sp.recommended_by = u.id
//       WHERE s.name = 'Appliance Services' AND sp.id = $1
//     `;
    
//     const result = await pool.query(query, [id]);
    
//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: 'Appliance provider not found' });
//     }
    
//     res.json(result.rows[0]);
    
//   } catch (error) {
//     console.error('=== ERROR IN GET APPLIANCE PROVIDER BY ID ===');
//     console.error('Error details:', error);
//     res.status(500).json({ 
//       error: 'Failed to fetch appliance provider',
//       details: error.message 
//     });
//   }
// });

// module.exports = router;