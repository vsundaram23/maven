const pool = require('../config/db.config');

const getRecommendationsByUserId = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        sp.id,
        sp.business_name,
        sp.description,
        sp.city,
        sp.state,
        sp.zip_code,
        sp.service_scope,
        s.name as service_type,
        c.name as category
      FROM service_providers sp
      JOIN services s ON sp.service_id = s.service_id
      JOIN service_categories c ON s.category_id = c.service_id
      WHERE sp.recommended_by = $1
      ORDER BY sp.created_at DESC
    `, [id]);

    const userResult = await pool.query(`SELECT name FROM users WHERE id = $1`, [id]);

    res.json({
      recommendations: result.rows,
      userName: userResult.rows[0]?.name || 'User'
    });
  } catch (err) {
    console.error('Error fetching user recommendations:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getRecommendationsByUserId
};
