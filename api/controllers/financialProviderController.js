const pool = require('../config/db.config');

const getAllFinancialProviders = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        sp.id,
        sp.business_name,
        sp.description,
        sp.email,
        sp.phone_number,
        sp.num_likes,
        s.name as service_type,
        u.name as recommended_by_name
      FROM service_providers sp
      JOIN services s ON sp.service_id = s.service_id
      JOIN service_categories sc ON s.category_id = sc.service_id
      JOIN users u ON sp.recommended_by = u.id
      WHERE sc.name = 'Financial Services'
    `);

    res.json({
      success: true,
      providers: result.rows
    });
  } catch (err) {
    console.error('Error fetching financial providers:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching financial providers',
      error: err.message
    });
  }
};

const getFinancialProviderById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        sp.*,
        s.name as service_type,
        ROUND(AVG(r.rating), 2) as average_rating,
        COUNT(r.id) as total_reviews
      FROM service_providers sp
      JOIN services s ON sp.service_id = s.service_id
      JOIN service_categories sc ON s.category_id = sc.service_id
      LEFT JOIN reviews r ON sp.id = r.provider_id
      WHERE sp.id = $1 AND sc.name = 'Financial Services'
      GROUP BY sp.id, s.name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Financial provider not found'
      });
    }

    res.json({
      success: true,
      provider: result.rows[0]
    });
  } catch (err) {
    console.error('Error fetching financial provider:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching financial provider',
      error: err.message
    });
  }
};

module.exports = {
  getAllFinancialProviders,
  getFinancialProviderById
};
