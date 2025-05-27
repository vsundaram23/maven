const pool = require('../config/db.config');

// Get accepted connections by email
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
        u.phone_number,
        uc.connected_at
      FROM user_id main
      JOIN user_connections uc 
        ON main.id = uc.user_id AND uc.status = 'accepted'
      JOIN users u 
        ON uc.connected_user_id = u.id
      ORDER BY uc.connected_at DESC
    `, [email]);

    console.log('Query rows:', result.rows);
    return result.rows;
  } catch (error) {
    console.error('Error fetching connections:', error.message);
    throw new Error('Database error fetching connections');
  }
};

// Send or accept a connection request (still uses userIds from localStorage)
const sendConnectionRequest = async (fromUserId, toUserId) => {
  try {
    const existing = await pool.query(
      `SELECT * FROM user_connections 
       WHERE user_id = $1 AND connected_user_id = $2`,
      [fromUserId, toUserId]
    );

    if (existing.rows.length > 0) {
      return { message: 'Friend request already sent', status: existing.rows[0].status };
    }

    const reverse = await pool.query(
      `SELECT * FROM user_connections 
       WHERE user_id = $1 AND connected_user_id = $2 AND status = 'pending'`,
      [toUserId, fromUserId]
    );

    if (reverse.rows.length > 0) {
      await pool.query(
        `UPDATE user_connections
         SET status = 'accepted', connected_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND connected_user_id = $2`,
        [toUserId, fromUserId]
      );

      return { message: 'Friend request accepted (mutual)', status: 'accepted' };
    }

    await pool.query(
      `INSERT INTO user_connections (user_id, connected_user_id, status)
       VALUES ($1, $2, 'pending')`,
      [fromUserId, toUserId]
    );

    return { message: 'Friend request sent', status: 'pending' };
  } catch (error) {
    console.error('Error sending connection request:', error.message);
    throw new Error('Database error sending connection request');
  }
};

// 🧠 Now expects email, looks up userId inside
const getTrustCircleUsers = async (email) => {
  try {
    const idResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (idResult.rows.length === 0) {
      throw new Error('User not found for email');
    }

    const userId = idResult.rows[0].id;

    const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COALESCE(
          CASE
            WHEN uc.status = 'accepted' THEN 'connected'
            WHEN uc.status = 'pending' AND uc.user_id = $1 THEN 'pending_outbound'
            WHEN uc.status = 'pending' AND uc.connected_user_id = $1 THEN 'pending_inbound'
          END,
          'not_connected'
        ) AS status
      FROM users u
      LEFT JOIN user_connections uc 
        ON (
          (uc.user_id = $1 AND uc.connected_user_id = u.id)
          OR (uc.connected_user_id = $1 AND uc.user_id = u.id)
        )
      WHERE u.id != $1
      ORDER BY status, u.name;
    `, [userId]);

    return result.rows;
  } catch (error) {
    console.error('Error fetching trust circle users:', error.message);
    throw new Error('Database error fetching trust circle users');
  }
};

module.exports = {
  getConnectionsByEmail,
  sendConnectionRequest,
  getTrustCircleUsers
};



// const pool = require('../config/db.config');

// const getConnectionsByEmail = async (email) => {
//   try {
//     console.log('Attempting to fetch connections for email:', email);
    
//     const result = await pool.query(`
//       WITH user_id AS (
//         SELECT id 
//         FROM users 
//         WHERE email = $1
//       )
//       SELECT 
//         u.name,
//         u.email,
//         uc.connected_at
//       FROM user_id main
//       JOIN user_connections uc ON main.id = uc.user_id
//       JOIN users u ON uc.connected_user_id = u.id
//       ORDER BY uc.connected_at DESC
//     `, [email]);
    
//     console.log('Full query result:', result);
//     console.log('Query rows:', result.rows);
//     console.log('Number of connections found:', result.rows.length);
    
//     return result.rows;
//   } catch (error) {
//     console.error('Database error details:', error.message);
//     console.error('Full error object:', error);
//     throw new Error('Database error fetching connections');
//   }
// };

// module.exports = { getConnectionsByEmail };
