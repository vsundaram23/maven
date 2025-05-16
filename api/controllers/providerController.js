const pool = require('../config/db.config');

const getVisibleProvidersBaseQuery = (currentUserId) => {
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
        sp.search_vector
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
  const queryParams = [currentUserId];
  return { query, queryParams };
};

const getAllVisibleProviders = async (req, res) => {
  const currentUserId = req.query.user_id;
  if (!currentUserId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required to fetch visible providers.'
    });
  }
  try {
    const { query: baseQuery, queryParams } = getVisibleProvidersBaseQuery(currentUserId);
    const finalQuery = `
      SELECT * FROM (${baseQuery}) AS VisibleProvidersCTE
      ORDER BY VisibleProvidersCTE.business_name;
    `;
    const result = await pool.query(finalQuery, queryParams);
    res.json({
      success: true,
      providers: result.rows
    });
  } catch (err) {
    console.error('Database error in getAllVisibleProviders:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching visible providers'
    });
  }
};

const getProviderCount = async (req, res) => {
  const currentUserId = req.query.user_id;
  if (!currentUserId) {
    return res.status(400).json({
        success: false,
        message: 'User ID is required to fetch provider count.'
    });
  }
  try {
    const { query: baseQuery, queryParams } = getVisibleProvidersBaseQuery(currentUserId);
    const countQuery = `SELECT COUNT(*) FROM (${baseQuery}) AS visible_providers_subquery`;
    const result = await pool.query(countQuery, queryParams);
    const count = parseInt(result.rows[0].count, 10);
    res.json({ count });
  } catch (error) {
    console.error('Error getting visible provider count:', error.message);
    res.status(500).json({ error: 'Internal server error getting provider count' });
  }
};

const getProviderById = async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.query.user_id;
  if (!currentUserId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required to fetch provider details.'
    });
  }
  try {
    const { query: baseVisibilityQuery, queryParams: baseVisibilityParams } = getVisibleProvidersBaseQuery(currentUserId);
    const providerIdParamIndex = baseVisibilityParams.length + 1;
    const finalQuery = `
      SELECT * FROM (
        ${baseVisibilityQuery}
      ) AS VisibleProvidersCTE
      WHERE VisibleProvidersCTE.id = $${providerIdParamIndex};
    `;
    const result = await pool.query(finalQuery, [...baseVisibilityParams, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Provider not found or not accessible' });
    }
    res.json({ success: true, provider: result.rows[0] });
  } catch (err) {
    console.error('Database error in getProviderById:', err);
    res.status(500).json({ success: false, message: 'Error fetching provider' });
  }
};

const getRecommendationsByTargetUser = async (req, res) => {
  const targetUserEmail = req.query.email;
  const currentUserId = req.query.current_user_id;

  if (!targetUserEmail || !currentUserId) {
    return res.status(400).json({
      success: false,
      message: 'Target email and current user ID are required.'
    });
  }
  try {
    const targetUserRes = await pool.query('SELECT id FROM users WHERE email = $1', [targetUserEmail]);
    if (targetUserRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Target user not found.' });
    }
    const targetUserId = targetUserRes.rows[0].id;

    const { query: baseQuery, queryParams: baseParams } = getVisibleProvidersBaseQuery(currentUserId);
    const targetUserIdParamIndex = baseParams.length + 1;

    const finalQuery = `
      SELECT * FROM (
        ${baseQuery}
      ) AS VisibleProvidersCTE
      WHERE VisibleProvidersCTE.recommender_user_id = $${targetUserIdParamIndex}
      ORDER BY VisibleProvidersCTE.date_of_recommendation DESC;
    `;
    const result = await pool.query(finalQuery, [...baseParams, targetUserId]);
    res.json({success: true, recommendations: result.rows});
  } catch (error) {
    console.error('Database error in getRecommendationsByTargetUser:', error.message);
    res.status(500).json({ success: false, message: `Failed to fetch user recommendations: ${error.message}` });
  }
};

const searchVisibleProviders = async (req, res) => {
  const { q } = req.query;
  const currentUserId = req.query.user_id;
  const searchQuery = q?.toLowerCase().trim();

  if (!currentUserId) {
    return res.status(400).json({ success: false, message: 'User ID is required for search.' });
  }
  if (!searchQuery) {
    return res.json({ success: true, providers: [] });
  }
  try {
    const { query: baseVisibilityQuery, queryParams: baseVisibilityParams } = getVisibleProvidersBaseQuery(currentUserId);
    const ftsParamIndex = baseVisibilityParams.length + 1;

    let ftsQuery = `
      SELECT *, ts_rank(search_vector, plainto_tsquery('english', $${ftsParamIndex})) as rank
      FROM (
        ${baseVisibilityQuery}
      ) AS VisibleProvidersCTE
      WHERE VisibleProvidersCTE.search_vector @@ plainto_tsquery('english', $${ftsParamIndex})
      ORDER BY rank DESC
      LIMIT 10;
    `;
    let result = await pool.query(ftsQuery, [...baseVisibilityParams, searchQuery]);

    if (result.rows.length === 0) {
      const ilikeParamIndex = baseVisibilityParams.length + 1;
      const ilikeSearchQuery = `%${searchQuery}%`;
      const fallbackQuery = `
        SELECT *
        FROM (
          ${baseVisibilityQuery}
        ) AS VisibleProvidersCTE
        WHERE
          LOWER(COALESCE(VisibleProvidersCTE.business_name, '')) LIKE $${ilikeParamIndex}
          OR LOWER(COALESCE(VisibleProvidersCTE.category, '')) LIKE $${ilikeParamIndex}
          OR LOWER(COALESCE(VisibleProvidersCTE.description, '')) LIKE $${ilikeParamIndex}
          OR EXISTS (SELECT 1 FROM unnest(VisibleProvidersCTE.tags) AS tag WHERE LOWER(tag) LIKE $${ilikeParamIndex})
        LIMIT 10;
      `;
      result = await pool.query(fallbackQuery, [...baseVisibilityParams, ilikeSearchQuery]);
    }
    res.json({ success: true, providers: result.rows });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: 'Failed to search providers' });
  }
};

module.exports = {
  getAllVisibleProviders,
  getProviderById,
  getRecommendationsByTargetUser,
  searchVisibleProviders,
  getProviderCount
};

// const pool = require('../config/db.config');

// const getAllProviders = async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT 
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
//         c.name as category,
//         ROUND(AVG(r.rating), 2) as average_rating,
//         COUNT(r.id) as total_reviews
//       FROM service_providers sp
//       LEFT JOIN categories c ON sp.category_id = c.id
//       LEFT JOIN reviews r ON sp.id = r.provider_id
//       GROUP BY sp.id, sp.business_name, sp.description, sp.email, sp.phone_number, c.name
//     `);

//     res.json({
//       success: true,
//       providers: result.rows
//     });
//   } catch (err) {
//     console.error('Database error:', err);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching providers'
//     });
//   }
// };

// const getProviderCount = async (req, res) => {
//   try {
//     const result = await pool.query('SELECT COUNT(*) FROM service_providers');
//     const count = parseInt(result.rows[0].count, 10);

//     res.json({ count });
//   } catch (error) {
//     console.error('Error getting provider count:', error.message);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };

// const getProviderById = async (req, res) => {
//   const { id } = req.params;

//   try {
//     const result = await pool.query(`
//       SELECT 
//         sp.id,
//         sp.business_name,
//         sp.business_contact,
//         sp.description,
//         sp.provider_message,
//         sp.recommender_message,
//         sp.email,
//         sp.phone_number,
//         sp.tags,
//         sp.website,
//         sp.service_scope,
//         sp.city,
//         sp.state,
//         sp.zip_code,
//         sp.price_range,
//         sp.date_of_recommendation,
//         sp.num_likes,
//         c.name AS category,
//         ROUND(AVG(r.rating), 2) AS average_rating,
//         COUNT(r.id) AS total_reviews,
//         u.name AS recommended_by_name,
//         u.phone_number AS recommended_by_phone,
//         u.id AS recommended_by
//       FROM service_providers sp
//       LEFT JOIN categories c ON sp.category_id = c.id
//       LEFT JOIN reviews r ON sp.id = r.provider_id
//       LEFT JOIN users u ON sp.recommended_by = u.id
//       WHERE sp.id = $1
//       GROUP BY 
//         sp.id,
//         sp.business_name,
//         sp.business_contact,
//         sp.description,
//         sp.provider_message,
//         sp.recommender_message,
//         sp.email,
//         sp.phone_number,
//         sp.tags,
//         sp.website,
//         sp.service_scope,
//         sp.city,
//         sp.state,
//         sp.zip_code,
//         sp.price_range,
//         sp.date_of_recommendation,
//         sp.num_likes,
//         c.name,
//         u.name,
//         u.phone_number,
//         u.id
//     `, [id]);

//     if (result.rows.length === 0) {
//       return res.status(404).json({ success: false, message: 'Provider not found' });
//     }

//     res.json({ success: true, provider: result.rows[0] });
//   } catch (err) {
//     console.error('Database error:', err);
//     res.status(500).json({ success: false, message: 'Error fetching provider' });
//   }
// };




// const getRecommendationsByUser = async (email) => {
//   try {
//     const query = `
//       SELECT 
//         sp.business_name,
//         sp.description,
//         sp.phone_number,
//         s.name as service_type,
//         u.name as recommended_by_name
//       FROM service_providers sp
//       JOIN services s ON sp.service_id = s.service_id
//       JOIN service_categories sc ON s.category_id = sc.service_id
//       JOIN users u ON sp.recommended_by = u.id
//       WHERE u.email = $1
//       ORDER BY sp.created_at DESC
//     `;
//     const result = await pool.query(query, [email]);
//     return result.rows;
//   } catch (error) {
//     console.error('Database error:', error.message);
//     throw new Error(`Failed to fetch user recommendations: ${error.message}`);
//   }
// };

// const searchProviders = async (req, res) => {
//   const { q } = req.query;
//   const searchQuery = q?.toLowerCase();
//   console.log('[ROUTE] /api/providers/search hit');

//   if (!searchQuery) return res.json({ providers: [] });

//   try {
//     const result = await pool.query(
//       `SELECT 
//           sp.id,
//           sp.business_name,
//           sp.description,
//           sp.email,
//           sp.phone_number,
//           sp.num_likes,
//           sp.date_of_recommendation,
//           s.name as service_type,
//           u.name as recommended_by_name,
//           ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
//         FROM service_providers sp
//         JOIN services s ON sp.service_id = s.service_id
//         JOIN service_categories sc ON s.category_id = sc.service_id
//         JOIN users u ON sp.recommended_by = u.id
//         WHERE sp.search_vector @@ plainto_tsquery('english', $1)
//         ORDER BY rank DESC
//         LIMIT 10`,
//       [searchQuery]
//     );

//     if (result.rows.length === 0) {
//       // Fallback to ILIKE if no FTS matches
//       const fallback = await pool.query(
//         `SELECT 
//             sp.id,
//             sp.business_name,
//             sp.description,
//             sp.email,
//             sp.phone_number,
//             sp.num_likes,
//             sp.date_of_recommendation,
//             s.name as service_type,
//             u.name as recommended_by_name
//           FROM service_providers sp
//           JOIN services s ON sp.service_id = s.service_id
//           JOIN service_categories sc ON s.category_id = sc.service_id
//           JOIN users u ON sp.recommended_by = u.id
//           WHERE 
//             LOWER(COALESCE(sp.business_name, '')) LIKE $1 
//             OR LOWER(COALESCE(s.name, '')) LIKE $1
//             OR LOWER(COALESCE(sp.description, '')) LIKE $1
//             OR LOWER(COALESCE(sp.notes, '')) LIKE $1
//           LIMIT 10`,
//         [`%${searchQuery}%`]
//       );

//       return res.json({ providers: fallback.rows });
//     }

//     res.json({ providers: result.rows });
//   } catch (error) {
//     console.error('Search error:', error);
//     res.status(500).json({ error: 'Failed to search providers' });
//   }
// };

// module.exports = {
//   getAllProviders,
//   getProviderById,
//   getRecommendationsByUser,
//   searchProviders,
//   getProviderCount
// };


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