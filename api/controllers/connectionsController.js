const pool = require('../config/db.config');

const getConnectionsByEmail = async (email) => {
  try {
    console.log('Attempting to fetch connections for email:', email);
    
    const result = await pool.query(`
      WITH user_id AS (
        SELECT id 
        FROM users 
        WHERE email = $1
      )
      SELECT 
        u.name,
        u.email,
        uc.connected_at
      FROM user_id main
      JOIN user_connections uc ON main.id = uc.user_id
      JOIN users u ON uc.connected_user_id = u.id
      ORDER BY uc.connected_at DESC
    `, [email]);
    
    console.log('Full query result:', result);
    console.log('Query rows:', result.rows);
    console.log('Number of connections found:', result.rows.length);
    
    return result.rows;
  } catch (error) {
    console.error('Database error details:', error.message);
    console.error('Full error object:', error);
    throw new Error('Database error fetching connections');
  }
};

module.exports = { getConnectionsByEmail };
