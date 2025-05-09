// cleaningProviderController.js
const pool = require('../config/db.config');

const getAllCleaningProviders = async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          sp.id,
          sp.business_name,
          sp.description,
          sp.email,
          sp.phone_number,
          sp.num_likes,
          sp.date_of_recommendation,
          sp.tags,
          s.name AS service_type,
          u.name AS recommended_by_name
        FROM service_providers sp
        JOIN services s ON sp.service_id = s.service_id
        JOIN users u ON sp.recommended_by = u.id
        WHERE s.name = 'Cleaning and Upkeep'
      `);
  
      res.json({
        success: true,
        providers: result.rows
      });
    } catch (err) {
      console.error('Error fetching all cleaning providers:', err.message);
      res.status(500).json({
        success: false,
        message: 'Error fetching cleaning providers',
        error: err.message
      });
    }
  };
  
  // GET: Cleaning provider by ID
  const getCleaningProviderById = async (req, res) => {
    const { id } = req.params;
  
    try {
      const result = await pool.query(`
        SELECT 
          sp.*,
          sp.tags,
          sp.date_of_recommendation,
          s.name AS service_type,
          u.name AS recommended_by_name,
          ROUND(AVG(r.rating), 2) AS average_rating,
          COUNT(r.id) AS total_reviews
        FROM service_providers sp
        JOIN services s ON sp.service_id = s.service_id
        JOIN users u ON sp.recommended_by = u.id
        LEFT JOIN reviews r ON sp.id = r.provider_id
        WHERE sp.id = $1 AND s.name = 'Cleaning and Upkeep'
        GROUP BY sp.id, s.name, u.name
      `, [id]);
  
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Cleaning provider not found'
        });
      }
  
      res.json({
        success: true,
        provider: result.rows[0]
      });
    } catch (err) {
      console.error('Error fetching cleaning provider by ID:', err.message);
      res.status(500).json({
        success: false,
        message: 'Error fetching cleaning provider',
        error: err.message
      });
    }
  };
  
  module.exports = {
    getAllCleaningProviders,
    getCleaningProviderById
  };

// const pool = require('../config/db.config');

// const getAllCleaningProviders = async (req, res) => {
//     try {
//         const result = await pool.query(`
//             SELECT 
//                 sp.id,
//                 sp.business_name,
//                 sp.description,
//                 sp.email,
//                 sp.phone_number,
//                 s.name as service_type,
//                 u.name as recommended_by_name
//             FROM service_providers sp
//             JOIN services s ON sp.service_id = s.service_id
//             JOIN service_categories sc ON s.category_id = sc.service_id
//             JOIN users u ON sp.recommended_by = u.id
//             WHERE s.name = 'Cleaning and Upkeep'
//         `);
        
//         console.log('Query result:', result.rows);
        
//         res.json({
//             success: true,
//             providers: result.rows
//         });
//     } catch (err) {
//         console.error('Database error details:', err.message);
//         console.error('Full error object:', err);
//         res.status(500).json({
//             success: false,
//             message: 'Error fetching cleaning providers',
//             error: err.message
//         });
//     }
// };

// const getCleaningProviderById = async (req, res) => {
//     const { id } = req.params;
    
//     try {
//         const result = await pool.query(`
//             SELECT 
//                 sp.*,
//                 s.name as service_type,
//                 ROUND(AVG(r.rating), 2) as average_rating,
//                 COUNT(r.id) as total_reviews
//             FROM service_providers sp
//             JOIN services s ON sp.service_id = s.service_id
//             LEFT JOIN reviews r ON sp.id = r.provider_id
//             WHERE sp.id = $1 AND s.name = 'Cleaning and Upkeep'
//             GROUP BY sp.id, s.name
//         `, [id]);

//         if (result.rows.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Cleaning provider not found'
//             });
//         }

//         res.json({
//             success: true,
//             provider: result.rows[0]
//         });
//     } catch (err) {
//         console.error('Database error:', err);
//         res.status(500).json({
//             success: false,
//             message: 'Error fetching cleaning provider'
//         });
//     }
// };

// module.exports = {
//     getAllCleaningProviders,
//     getCleaningProviderById
// };
