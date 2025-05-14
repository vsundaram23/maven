const pool = require('../config/db.config');

const getVisibleProvidersBaseQueryForAutoPage = (currentUserId) => {
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

const getAllVisibleAutoProviders = async (req, res) => {
  const currentUserId = req.query.user_id;

  if (!currentUserId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required to fetch auto service providers.'
    });
  }

  try {
    const { query: baseQuery, queryParams } = getVisibleProvidersBaseQueryForAutoPage(currentUserId);
    const categoryName = 'Auto Services';
    const finalQuery = `
      SELECT * FROM (${baseQuery}) AS VisibleProvidersCTE
      WHERE VisibleProvidersCTE.category_name = $${queryParams.length + 1}
      ORDER BY VisibleProvidersCTE.business_name;
    `;
    const finalParams = [...queryParams, categoryName];

    const result = await pool.query(finalQuery, finalParams);

    res.json({
      success: true,
      providers: result.rows
    });
  } catch (err) {
    console.error('Database error fetching auto providers:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching auto providers',
      error: err.message
    });
  }
};

const getVisibleAutoProviderById = async (req, res) => {
  const { id: providerId } = req.params;
  const currentUserId = req.query.user_id;

  if (!currentUserId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required to fetch auto provider details.'
    });
  }
  if (!providerId) {
    return res.status(400).json({
        success: false,
        message: 'Provider ID is required.'
    });
  }

  try {
    const { query: baseQuery, queryParams } = getVisibleProvidersBaseQueryForAutoPage(currentUserId);
    const categoryName = 'Auto Services';
    const paramIndexForId = queryParams.length + 1;
    const paramIndexForCategory = queryParams.length + 2;

    const finalQuery = `
      SELECT * FROM (${baseQuery}) AS VisibleProvidersCTE
      WHERE VisibleProvidersCTE.id = $${paramIndexForId} AND VisibleProvidersCTE.category_name = $${paramIndexForCategory};
    `;
    const finalParams = [...queryParams, providerId, categoryName];

    const result = await pool.query(finalQuery, finalParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Auto provider not found or not accessible to this user.'
      });
    }
    res.json({
      success: true,
      provider: result.rows[0]
    });
  } catch (err) {
    console.error('Database error fetching specific auto provider:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching auto provider',
      error: err.message
    });
  }
};

module.exports = {
  getAllVisibleAutoProviders,
  getVisibleAutoProviderById
};

// // controllers/autoProviderController.js
// const pool = require('../config/db.config');

// const getAllAutoProviders = async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT 
//         sp.id,
//         sp.business_name,
//         sp.description,
//         sp.email,
//         sp.phone_number,
//         sp.num_likes,
//         sp.date_of_recommendation,
//         sp.tags,
//         s.name        AS service_type,
//         u.name        AS recommended_by_name
//       FROM service_providers sp
//       JOIN services s 
//         ON sp.service_id = s.service_id
//       JOIN service_categories sc 
//         ON s.category_id = sc.service_id
//       JOIN users u 
//         ON sp.recommended_by = u.id
//       WHERE sc.name = 'Auto Services'
//     `);

//     res.json({
//       success: true,
//       providers: result.rows
//     });
//   } catch (err) {
//     console.error('Error fetching auto providers:', err.message);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching auto providers',
//       error: err.message
//     });
//   }
// };

// const getAutoProviderById = async (req, res) => {
//   const { id } = req.params;

//   try {
//     const result = await pool.query(`
//       SELECT 
//         sp.*,
//         sp.date_of_recommendation,
//         sp.tags,
//         s.name                AS service_type,
//         ROUND(AVG(r.rating), 2) AS average_rating,
//         COUNT(r.id)            AS total_reviews
//       FROM service_providers sp
//       JOIN services s 
//         ON sp.service_id = s.service_id
//       JOIN service_categories sc 
//         ON s.category_id = sc.service_id
//       LEFT JOIN reviews r 
//         ON sp.id = r.provider_id
//       WHERE sp.id = $1
//         AND sc.name = 'Auto Services'
//       GROUP BY sp.id, s.name
//     `, [id]);

//     if (result.rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Auto provider not found'
//       });
//     }

//     res.json({
//       success: true,
//       provider: result.rows[0]
//     });
//   } catch (err) {
//     console.error('Error fetching auto provider:', err.message);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching auto provider',
//       error: err.message
//     });
//   }
// };

// module.exports = {
//   getAllAutoProviders,
//   getAutoProviderById
// };
