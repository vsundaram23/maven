const pool = require('../config/db.config');

const getVisibleProvidersBaseQueryForOutdoorPage = (currentUserId) => {
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
        sp.recommender_message,
        sp.visibility,
        sc.name AS category_name,
        s.name AS service_type,
        sp.recommended_by AS recommender_user_id,
        rec_user.name AS recommender_name,
        rec_user.phone_number AS recommender_phone,
        rec_user.email AS recommender_email
    FROM
        public.service_providers sp
    LEFT JOIN
        public.services s ON sp.service_id = s.service_id
    LEFT JOIN
        public.service_categories sc ON s.category_id = sc.service_id
    LEFT JOIN
        public.users rec_user ON sp.recommended_by = rec_user.id
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
        (
            sp.recommended_by = $1
            OR
            sp.visibility = 'public'
            OR
            (sp.visibility = 'connections' AND con_direct.user_id IS NOT NULL)
            OR
            (cs.community_id IS NOT NULL AND cm_user_x.user_id IS NOT NULL)
        )
  `;
  const queryParams = [currentUserId];
  return { query, queryParams };
};

const getAllVisibleOutdoorProviders = async (req, res) => {
  const currentUserId = req.query.user_id;

  if (!currentUserId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required to fetch outdoor service providers.'
    });
  }

  try {
    const { query: baseQuery, queryParams } = getVisibleProvidersBaseQueryForOutdoorPage(currentUserId);
    const serviceName = 'Outdoor Services';
    const finalQuery = `
      SELECT * FROM (${baseQuery}) AS VisibleProvidersCTE
      WHERE VisibleProvidersCTE.service_type = $${queryParams.length + 1}
      ORDER BY VisibleProvidersCTE.business_name;
    `;
    const finalParams = [...queryParams, serviceName];

    const result = await pool.query(finalQuery, finalParams);

    res.json({
      success: true,
      providers: result.rows
    });
  } catch (err) {
    console.error('Database error fetching outdoor providers:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching outdoor providers',
      error: err.message
    });
  }
};

const getVisibleOutdoorProviderById = async (req, res) => {
  const { id: providerId } = req.params;
  const currentUserId = req.query.user_id;

  if (!currentUserId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required to fetch outdoor provider details.'
    });
  }
  if (!providerId) {
    return res.status(400).json({
        success: false,
        message: 'Provider ID is required.'
    });
  }

  try {
    const { query: baseQuery, queryParams } = getVisibleProvidersBaseQueryForOutdoorPage(currentUserId);
    const serviceName = 'Outdoor Services';
    const paramIndexForId = queryParams.length + 1;
    const paramIndexForService = queryParams.length + 2;

    const finalQuery = `
      SELECT * FROM (${baseQuery}) AS VisibleProvidersCTE
      WHERE VisibleProvidersCTE.id = $${paramIndexForId} AND VisibleProvidersCTE.service_type = $${paramIndexForService};
    `;
    const finalParams = [...queryParams, providerId, serviceName];

    const result = await pool.query(finalQuery, finalParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Outdoor provider not found or not accessible to this user.'
      });
    }
    res.json({
      success: true,
      provider: result.rows[0]
    });
  } catch (err) {
    console.error('Database error fetching specific outdoor provider:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching outdoor provider',
      error: err.message
    });
  }
};

module.exports = {
  getAllVisibleOutdoorProviders,
  getVisibleOutdoorProviderById
};

// const pool = require('../config/db.config');

// const getAllOutdoorProviders = async (req, res) => {
//     try {
//         const result = await pool.query(`
//             SELECT 
//                 sp.id,
//                 sp.business_name,
//                 sp.description,
//                 sp.email,
//                 sp.phone_number,
//                 sp.date_of_recommendation,
//                 sp.tags,
//                 s.name as service_type,
//                 u.name as recommended_by_name
//             FROM service_providers sp
//             JOIN services s ON sp.service_id = s.service_id
//             JOIN service_categories sc ON s.category_id = sc.service_id
//             JOIN users u ON sp.recommended_by = u.id
//             WHERE s.name = 'Outdoor Services'
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
//             message: 'Error fetching outdoor service providers',
//             error: err.message
//         });
//     }
// };

// const getOutdoorProviderById = async (req, res) => {
//     const { id } = req.params;
    
//     try {
//         const result = await pool.query(`
//             SELECT 
//                 sp.*,
//                 sp.date_of_recommendation,
//                 sp.tags,
//                 s.name as service_type,
//                 ROUND(AVG(r.rating), 2) as average_rating,
//                 COUNT(r.id) as total_reviews
//             FROM service_providers sp
//             JOIN services s ON sp.service_id = s.service_id
//             LEFT JOIN reviews r ON sp.id = r.provider_id
//             WHERE sp.id = $1 AND s.name = 'Outdoor Services'
//             GROUP BY sp.id, s.name
//         `, [id]);

//         if (result.rows.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Outdoor service provider not found'
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
//             message: 'Error fetching outdoor service provider'
//         });
//     }
// };

// module.exports = {
//     getAllOutdoorProviders,
//     getOutdoorProviderById
// };
