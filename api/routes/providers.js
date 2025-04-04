const express = require('express');
const router = express.Router();
const { validate: isUuid } = require('uuid'); // ✅ UUID validator

const {
  getAllProviders,
  getProviderById,
  getRecommendationsByUser,
  searchProviders
} = require('../controllers/providerController');

// GET /api/providers
router.get('/', getAllProviders);

// GET /api/providers/search?q=term
router.get('/search', searchProviders);

// ✅ GET /api/providers/:id (only if it's a valid UUID)
router.get('/:id', (req, res, next) => {
  const { id } = req.params;

  if (!isUuid(id)) {
    return res.status(400).json({ error: 'Invalid provider ID format' });
  }

  next();
}, getProviderById);

// POST /api/providers/user-recommendations
router.post('/user-recommendations', async (req, res) => {
  const { email } = req.body;

  try {
    const recommendations = await getRecommendationsByUser(email);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;



// // router.get('/', (req, res) => {
// //   res.json({ providers: [] });
// // });

// // router.get('/:id', (req, res) => {
// //   res.json({ provider: null });
// // });

// // module.exports = router;

// const express = require('express');
// const router = express.Router();
// const pool = require('../config/db.config');
// const { getRecommendationsByUser } = require('../controllers/providerController');

// // Get all providers
// router.get('/', async (req, res) => {
//   console.log('=== START GET ALL PROVIDERS ===');
//   console.log('Request received:', {
//     path: req.path,
//     method: req.method,
//     headers: req.headers
//   });

//   try {
//     console.log('Constructing SQL query...');
//     const query = `
//       SELECT 
//         sp.business_name,
//         sp.description,
//         sp.email,
//         sp.phone_number,
//         sp.num_likes,
//         sp.date_of_recommendation,
//         s.name as service_type,
//         u.name as recommended_by_name
//       FROM service_providers sp
//       JOIN services s ON sp.service_id = s.service_id
//       JOIN service_categories sc ON s.category_id = sc.service_id
//       JOIN users u ON sp.recommended_by = u.id
//       WHERE sc.name = 'Financial Services'
//     `;
    
//     console.log('Executing query:', query);
//     const result = await pool.query(query);
//     console.log('Query executed successfully');
//     console.log('Number of rows returned:', result.rows.length);
//     console.log('First row of data:', result.rows[0]);
    
//     console.log('Setting response headers...');
//     res.setHeader('Content-Type', 'application/json');
    
//     console.log('Sending response...');
//     res.json(result.rows);
//     console.log('Response sent successfully');
    
//   } catch (error) {
//     console.error('=== ERROR IN GET ALL PROVIDERS ===');
//     console.error('Error details:', {
//       message: error.message,
//       stack: error.stack,
//       code: error.code
//     });
    
//     if (error.code === '42P01') {
//       console.error('Table does not exist');
//     } else if (error.code === '28P01') {
//       console.error('Database authentication failed');
//     }
    
//     res.status(500).json({ 
//       error: 'Failed to fetch providers',
//       details: error.message 
//     });
//   }
//   console.log('=== END GET ALL PROVIDERS ===');
// });

// router.get('/search', async (req, res) => {
//   console.log('=== START PROVIDER SEARCH ===');
//   const searchQuery = req.query.q?.toLowerCase();

//   try {
//     if (!searchQuery) {
//       return res.json({ providers: [] });
//     }

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
//       WHERE 
//         LOWER(sp.business_name) LIKE $1 
//         OR LOWER(s.name) LIKE $1
//         OR LOWER(sp.description) LIKE $1
//     `;

//     const searchPattern = `%${searchQuery}%`;
//     const result = await pool.query(query, [searchPattern]);

//     // Format the response to match frontend expectations
//     const formattedProviders = result.rows.map(provider => ({
//       id: provider.id,
//       name: provider.business_name,
//       services: [provider.service_type],
//       description: provider.description,
//       email: provider.email,
//       phone: provider.phone_number,
//       likes: provider.num_likes,
//       recommendedBy: provider.recommended_by_name,
//       date_of_recommendation: provider.date_of_recommendation
//     }));

//     res.json({ providers: formattedProviders });

//   } catch (error) {
//     console.error('Search Error:', error);
//     res.status(500).json({
//       error: 'Failed to search providers',
//       details: error.message
//     });
//   }
//   console.log('=== END PROVIDER SEARCH ===');
// });

// // Get provider by ID
// router.get('/:id', async (req, res) => {
//   console.log('=== START GET PROVIDER BY ID ===');
//   console.log('Provider ID requested:', req.params.id);
  
//   try {
//     const { id } = req.params;
//     console.log('Constructing query for ID:', id);
    
//     const query = `
//       SELECT 
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
//       WHERE sc.name = 'Financial Services' AND sp.id = $1
//     `;
    
//     console.log('Executing query for ID:', id);
//     const result = await pool.query(query, [id]);
//     console.log('Query result rows:', result.rows.length);
    
//     if (result.rows.length === 0) {
//       console.log('No provider found for ID:', id);
//       return res.status(404).json({ error: 'Provider not found' });
//     }
    
//     console.log('Provider found:', result.rows[0]);
//     res.setHeader('Content-Type', 'application/json');
//     res.json(result.rows[0]);
    
//   } catch (error) {
//     console.error('=== ERROR IN GET PROVIDER BY ID ===');
//     console.error('Error details:', {
//       message: error.message,
//       stack: error.stack,
//       code: error.code
//     });
    
//     res.status(500).json({ 
//       error: 'Failed to fetch provider',
//       details: error.message 
//     });
//   }
//   console.log('=== END GET PROVIDER BY ID ===');
// });

// router.post('/user-recommendations', async (req, res) => {
//   const { email } = req.body;
  
//   try {
//     const recommendations = await getRecommendationsByUser(email);
//     res.json(recommendations);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// module.exports = router;
