// controllers/autoProviderController.js
const pool = require('../config/db.config');

const getAllAutoProviders = async (req, res) => {
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
        s.name        AS service_type,
        u.name        AS recommended_by_name
      FROM service_providers sp
      JOIN services s 
        ON sp.service_id = s.service_id
      JOIN service_categories sc 
        ON s.category_id = sc.service_id
      JOIN users u 
        ON sp.recommended_by = u.id
      WHERE sc.name = 'Auto Services'
    `);

    res.json({
      success: true,
      providers: result.rows
    });
  } catch (err) {
    console.error('Error fetching auto providers:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching auto providers',
      error: err.message
    });
  }
};

const getAutoProviderById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        sp.*,
        sp.date_of_recommendation,
        s.name                AS service_type,
        ROUND(AVG(r.rating), 2) AS average_rating,
        COUNT(r.id)            AS total_reviews
      FROM service_providers sp
      JOIN services s 
        ON sp.service_id = s.service_id
      JOIN service_categories sc 
        ON s.category_id = sc.service_id
      LEFT JOIN reviews r 
        ON sp.id = r.provider_id
      WHERE sp.id = $1
        AND sc.name = 'Auto Services'
      GROUP BY sp.id, s.name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Auto provider not found'
      });
    }

    res.json({
      success: true,
      provider: result.rows[0]
    });
  } catch (err) {
    console.error('Error fetching auto provider:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching auto provider',
      error: err.message
    });
  }
};

module.exports = {
  getAllAutoProviders,
  getAutoProviderById
};
