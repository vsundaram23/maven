const pool = require('../config/db.config');

const getAllProviders = async (req, res) => {
  try {
    const result = await pool.query(`
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
        c.name as category,
        ROUND(AVG(r.rating), 2) as average_rating,
        COUNT(r.id) as total_reviews
      FROM service_providers sp
      LEFT JOIN categories c ON sp.category_id = c.id
      LEFT JOIN reviews r ON sp.id = r.provider_id
      GROUP BY sp.id, sp.business_name, sp.description, sp.email, sp.phone_number, c.name
    `);

    res.json({
      success: true,
      providers: result.rows
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching providers'
    });
  }
};

const getProviderCount = async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM service_providers');
    const count = parseInt(result.rows[0].count, 10);

    res.json({ count });
  } catch (error) {
    console.error('Error getting provider count:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getProviderById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        sp.id,
        sp.business_name,
        sp.description,
        sp.email,
        sp.phone_number,
        sp.tags,
        sp.website,
        sp.service_scope,
        sp.city,
        sp.state,
        sp.zip_code,
        sp.price_range,
        sp.date_of_recommendation,
        sp.num_likes,
        c.name AS category,
        ROUND(AVG(r.rating), 2) AS average_rating,
        COUNT(r.id) AS total_reviews,
        u.name AS recommended_by_name
      FROM service_providers sp
      LEFT JOIN categories c ON sp.category_id = c.id
      LEFT JOIN reviews r ON sp.id = r.provider_id
      LEFT JOIN users u ON sp.recommended_by = u.id
      WHERE sp.id = $1
      GROUP BY 
        sp.id,
        sp.business_name,
        sp.description,
        sp.email,
        sp.phone_number,
        sp.tags,
        sp.website,
        sp.service_scope,
        sp.city,
        sp.state,
        sp.zip_code,
        sp.price_range,
        sp.date_of_recommendation,
        sp.num_likes,
        c.name,
        u.name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    res.json({ success: true, provider: result.rows[0] });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ success: false, message: 'Error fetching provider' });
  }
};



const getRecommendationsByUser = async (email) => {
  try {
    const query = `
      SELECT 
        sp.business_name,
        sp.description,
        sp.phone_number,
        s.name as service_type,
        u.name as recommended_by_name
      FROM service_providers sp
      JOIN services s ON sp.service_id = s.service_id
      JOIN service_categories sc ON s.category_id = sc.service_id
      JOIN users u ON sp.recommended_by = u.id
      WHERE u.email = $1
      ORDER BY sp.created_at DESC
    `;
    const result = await pool.query(query, [email]);
    return result.rows;
  } catch (error) {
    console.error('Database error:', error.message);
    throw new Error(`Failed to fetch user recommendations: ${error.message}`);
  }
};

const searchProviders = async (req, res) => {
  const { q } = req.query;
  const searchQuery = q?.toLowerCase();
  console.log('[ROUTE] /api/providers/search hit');

  if (!searchQuery) return res.json({ providers: [] });

  try {
    const result = await pool.query(
      `SELECT 
          sp.id,
          sp.business_name,
          sp.description,
          sp.email,
          sp.phone_number,
          sp.num_likes,
          sp.date_of_recommendation,
          s.name as service_type,
          u.name as recommended_by_name,
          ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
        FROM service_providers sp
        JOIN services s ON sp.service_id = s.service_id
        JOIN service_categories sc ON s.category_id = sc.service_id
        JOIN users u ON sp.recommended_by = u.id
        WHERE sp.search_vector @@ plainto_tsquery('english', $1)
        ORDER BY rank DESC
        LIMIT 10`,
      [searchQuery]
    );

    if (result.rows.length === 0) {
      // Fallback to ILIKE if no FTS matches
      const fallback = await pool.query(
        `SELECT 
            sp.id,
            sp.business_name,
            sp.description,
            sp.email,
            sp.phone_number,
            sp.num_likes,
            sp.date_of_recommendation,
            s.name as service_type,
            u.name as recommended_by_name
          FROM service_providers sp
          JOIN services s ON sp.service_id = s.service_id
          JOIN service_categories sc ON s.category_id = sc.service_id
          JOIN users u ON sp.recommended_by = u.id
          WHERE 
            LOWER(COALESCE(sp.business_name, '')) LIKE $1 
            OR LOWER(COALESCE(s.name, '')) LIKE $1
            OR LOWER(COALESCE(sp.description, '')) LIKE $1
            OR LOWER(COALESCE(sp.notes, '')) LIKE $1
          LIMIT 10`,
        [`%${searchQuery}%`]
      );

      return res.json({ providers: fallback.rows });
    }

    res.json({ providers: result.rows });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search providers' });
  }
};

module.exports = {
  getAllProviders,
  getProviderById,
  getRecommendationsByUser,
  searchProviders,
  getProviderCount
};


// const pool = require('../config/db.config');

// const getAllProviders = async (req, res) => {
//     try {
//         const result = await pool.query(`
//             SELECT 
//                 sp.id,
//                 sp.business_name,
//                 sp.description,
//                 sp.email,
//                 sp.phone_number,
//                 c.name as category,
//                 ROUND(AVG(r.rating), 2) as average_rating,
//                 COUNT(r.id) as total_reviews
//             FROM service_providers sp
//             LEFT JOIN categories c ON sp.category_id = c.id
//             LEFT JOIN reviews r ON sp.id = r.provider_id
//             GROUP BY sp.id, sp.business_name, sp.description, sp.email, sp.phone_number, c.name
//         `);
        
//         res.json({
//             success: true,
//             providers: result.rows
//         });
//     } catch (err) {
//         console.error('Database error:', err);
//         res.status(500).json({
//             success: false,
//             message: 'Error fetching providers'
//         });
//     }
// };


// const getRecommendationsByUser = async (email) => {
//     try {
//       console.log('Attempting to fetch recommendations for email:', email);
      
//       const query = `
//         SELECT 
//           sp.business_name,
//           sp.description,
//           sp.phone_number,
//           s.name as service_type,
//           u.name as recommended_by_name
//         FROM service_providers sp
//         JOIN services s ON sp.service_id = s.service_id
//         JOIN service_categories sc ON s.category_id = sc.service_id
//         JOIN users u ON sp.recommended_by = u.id
//         WHERE u.email = $1
//         ORDER BY sp.created_at DESC
//       `;
//       console.log('Executing query with email:', email);
//       const result = await pool.query(query, [email]);
//       console.log('Query result:', result.rows);
      
//       return result.rows;
//     } catch (error) {
//       console.error('Database error details:', error.message);
//       console.error('Full error object:', error);
//       throw new Error(`Failed to fetch user recommendations: ${error.message}`);
//     }
//   };
  
  

//   const getProviderById = async (req, res) => {
//     const { id } = req.params;
    
//     try {
//         const result = await pool.query(`
//             SELECT 
//                 sp.*,
//                 c.name as category,
//                 ROUND(AVG(r.rating), 2) as average_rating,
//                 COUNT(r.id) as total_reviews
//             FROM service_providers sp
//             LEFT JOIN categories c ON sp.category_id = c.id
//             LEFT JOIN reviews r ON sp.id = r.provider_id
//             WHERE sp.id = $1
//             GROUP BY sp.id, c.name
//         `, [id]);

//         if (result.rows.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Provider not found'
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
//             message: 'Error fetching provider'
//         });
//     }
// };

// module.exports = {
//     getAllProviders,
//     getRecommendationsByUser,
//     getProviderById
// };