const express = require('express');
const router = express.Router();
// const { validate: isUuid } = require('uuid');

const {
  getAllVisibleRepairProviders,
  getVisibleRepairProviderById
} = require('../controllers/repairProviderController');


router.get('/', getAllVisibleRepairProviders);

router.get('/:id', (req, res, next) => {
  // if (!isUuid(req.params.id)) {
  //   return res.status(400).json({
  //       success: false,
  //       message: 'Invalid provider ID format'
  //   });
  // }
  next();
}, getVisibleRepairProviderById);

module.exports = router;

// const express = require('express');
// const router = express.Router();
// const pool = require('../config/db.config');

// // Get all appliance providers
// router.get('/', async (req, res) => {
//   console.log('=== START GET ALL REPAIR PROVIDERS ===');
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
//         sp.date_of_recommendation,
//         s.name as service_type,
//         u.name as recommended_by_name
//       FROM service_providers sp
//       JOIN services s ON sp.service_id = s.service_id
//       JOIN service_categories sc ON s.category_id = sc.service_id
//       JOIN users u ON sp.recommended_by = u.id
//       WHERE s.name = 'Structural Repairs'
//     `;
    
//     console.log('Executing query:', query);
//     const result = await pool.query(query);
//     console.log('Query executed successfully');
//     console.log('Number of rows returned:', result.rows.length);
    
//     res.setHeader('Content-Type', 'application/json');
//     res.json(result.rows);
    
//   } catch (error) {
//     console.error('=== ERROR IN GET ALL REPAIR PROVIDERS ===');
//     console.error('Error details:', {
//       message: error.message,
//       stack: error.stack,
//       code: error.code
//     });
    
//     res.status(500).json({ 
//       error: 'Failed to fetch REPAIR providers',
//       details: error.message 
//     });
//   }
// });

// // Get appliance provider by ID
// router.get('/:id', async (req, res) => {
//   console.log('=== START GET REPAIR PROVIDER BY ID ===');
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
//       WHERE s.name = 'Structural Repairs' AND sp.id = $1
//     `;
    
//     const result = await pool.query(query, [id]);
    
//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: 'REPAIR provider not found' });
//     }
    
//     res.json(result.rows[0]);
    
//   } catch (error) {
//     console.error('=== ERROR IN GET REPAIR PROVIDER BY ID ===');
//     console.error('Error details:', error);
//     res.status(500).json({ 
//       error: 'Failed to fetch REPAIR provider',
//       details: error.message 
//     });
//   }
// });

// module.exports = router;

