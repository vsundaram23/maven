const pool = require('../config/db.config');

const API_BASE_URL = "https://api.seanag-recommendations.org:8080";

// Get accepted connections by email
const getConnectionsByEmail = async (email) => {
  try {
    console.log('--- ENTERING getConnectionsByEmail ---');
    console.log('Attempting to fetch connections for email:', email);

    const result = await pool.query(`
      WITH user_id AS (
        SELECT id 
        FROM users 
        WHERE email = $1
      )
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone_number,
        u.username,
        u.user_score,
        u.profile_image,
        uc.connected_at
      FROM user_id main
      JOIN user_connections uc 
        ON main.id = uc.user_id AND uc.status = 'accepted'
      JOIN users u 
        ON uc.connected_user_id = u.id
      ORDER BY u.user_score DESC, uc.connected_at DESC
    `, [email]);

    console.log('Query result in getConnectionsByEmail:', result);
    console.log('Query rows:', result.rows);
    
    // Map the results to include constructed profile image URLs
    const mappedResult = result.rows.map((row) => {
      let imageUrl = null;
      if (row.profile_image) {
        imageUrl = `${API_BASE_URL}/api/users/${row.id}/profile/image`;
      }
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone_number: row.phone_number,
        username: row.username,
        user_score: row.user_score,
        profile_image_url: imageUrl,
        connected_at: row.connected_at,
      };
    });
    console.log('--- EXITING getConnectionsByEmail ---');
    return mappedResult;
  } catch (error) {
    console.error('--- ERROR in getConnectionsByEmail ---');
    console.error('Error fetching connections:', error.message);
    throw new Error('Database error fetching connections');
  }
};

const getConnectionsByUserId = async (userId) => {
  try {
    console.log('--- ENTERING getConnectionsByUserId ---');
    console.log('Attempting to fetch connections for user ID:', userId);

    const result = await pool.query(`
      WITH user_info AS (
        SELECT id
        FROM users
        WHERE id = $1       -- The only change is here
      )
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone_number,
        u.username,
        u.user_score,
        u.profile_image,
        uc.connected_at
      FROM user_info main
      JOIN user_connections uc
        ON main.id = uc.user_id AND uc.status = 'accepted'
      JOIN users u
        ON uc.connected_user_id = u.id
      ORDER BY u.user_score DESC, uc.connected_at DESC
    `, [userId]); // And here

    console.log('Query result in getConnectionsByUserId:', result);
    console.log('Query rows:', result.rows);
    
    // Map the results to include constructed profile image URLs
    const mappedResult = result.rows.map((row) => {
      let imageUrl = null;
      if (row.profile_image) {
        imageUrl = `${API_BASE_URL}/api/users/${row.id}/profile/image`;
      }
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone_number: row.phone_number,
        username: row.username,
        user_score: row.user_score,
        profile_image_url: imageUrl,
        connected_at: row.connected_at,
      };
    });
    console.log('--- EXITING getConnectionsByUserId ---');
    return mappedResult;
  } catch (error) {
    console.error('--- ERROR in getConnectionsByUserId ---');
    console.error('Error fetching connections by ID:', error.message);
    throw new Error('Database error fetching connections by ID');
  }
};

// Send or accept a connection request (still uses userIds from localStorage)
const sendConnectionRequest = async (fromUserId, toUserId) => {
  try {
    // The inbound fromUserId is the clerk_id, so we need to get the internal UUID
    const initiatorResult = await pool.query(
      `SELECT id FROM users WHERE clerk_id = $1`,
      [fromUserId]
    );

    if (initiatorResult.rows.length === 0) {
      console.error(`Initiator with clerk_id ${fromUserId} not found in users table.`);
      throw new Error(`User with clerk_id ${fromUserId} not found.`);
    }
    const fromInternalUserId = initiatorResult.rows[0].id;

    if (fromInternalUserId === toUserId) {
      return { message: 'You cannot follow yourself.', status: 'is_self' };
    }

    const existing = await pool.query(
      `SELECT * FROM user_connections 
       WHERE user_id = $1 AND connected_user_id = $2`,
      [fromInternalUserId, toUserId]
    );

    if (existing.rows.length > 0) {
      return { message: 'You are already following this user.', status: existing.rows[0].status };
    }

    // With a one-way follow model, we automatically accept the connection.
    // No 'pending' status or mutual acceptance logic is needed.
    await pool.query(
      `INSERT INTO user_connections (user_id, connected_user_id, status, connected_at)
       VALUES ($1, $2, 'accepted', CURRENT_TIMESTAMP)`,
      [fromInternalUserId, toUserId]
    );

    return { message: 'Successfully followed user.', status: 'accepted' };
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

// Check connection status between two users
const getConnectionStatus = async (fromUserId, toUserId) => {
  try {
    const initiatorResult = await pool.query(
      `SELECT id FROM users WHERE clerk_id = $1`,
      [fromUserId]
    );

    if (initiatorResult.rows.length === 0) {
      console.warn(`Attempted connection check for a clerk_id not found in the users table: ${fromUserId}`);
      return { status: 'not_connected' };
    }

    const fromInternalUserId = initiatorResult.rows[0].id;
    
    if (fromInternalUserId === toUserId) {
        return { status: 'is_self' };
    }

    // Check for an outbound connection (from the current user to the profile user)
    const outboundConnection = await pool.query(`
      SELECT status 
      FROM user_connections 
      WHERE user_id = $1 AND connected_user_id = $2
    `, [fromInternalUserId, toUserId]);

    if (outboundConnection.rows.length > 0) {
      const { status } = outboundConnection.rows[0];
      switch (status) {
        case 'accepted':
          return { status: 'connected' }; // You are following them.
        case 'pending':
          return { status: 'pending_outbound' }; // Your request to follow is pending.
        default:
          return { status };
      }
    }

    // If no outbound connection, check for an inbound one to see if they requested to follow you.
    const inboundConnection = await pool.query(`
        SELECT status
        FROM user_connections
        WHERE user_id = $1 AND connected_user_id = $2
    `, [toUserId, fromInternalUserId]);

    if (inboundConnection.rows.length > 0) {
        if (inboundConnection.rows[0].status === 'pending') {
            return { status: 'pending_inbound' }; // They have requested to follow you.
        }
    }

    // If no connection in either direction.
    return { status: 'not_connected' };

  } catch (error) {
    console.error('Error checking connection status:', error.message);
    throw new Error('Database error checking connection status');
  }
};

// Unfollow/disconnect from a user
const removeConnection = async (fromUserId, toUserId) => {
  try {
    // The inbound fromUserId is the clerk_id, so we need to get our internal UUID
    const initiatorResult = await pool.query(
      `SELECT id FROM users WHERE clerk_id = $1`,
      [fromUserId]
    );

    // If the user doesn't exist for some reason, we can't proceed.
    if (initiatorResult.rows.length === 0) {
      console.warn(`Attempted to remove connection for a clerk_id not found: ${fromUserId}`);
      // Return a success-like response to avoid front-end errors on non-critical issue.
      return { message: 'User not found, but operation concluded.', status: 'not_connected' };
    }
    const fromInternalUserId = initiatorResult.rows[0].id;

    // In a one-way follow system, we only need to delete the specific follow relationship.
    // The person initiating the removal is `fromUserId`.
    await pool.query(`
      DELETE FROM user_connections 
      WHERE user_id = $1 AND connected_user_id = $2
    `, [fromInternalUserId, toUserId]);

    return { message: 'Connection removed successfully', status: 'not_connected' };
  } catch (error) {
    console.error('Error removing connection:', error.message);
    throw new Error('Database error removing connection');
  }
};

const getFollowing = async (clerkUserId) => {
  try {
    const userResult = await pool.query(
      `SELECT id FROM users WHERE clerk_id = $1`,
      [clerkUserId]
    );

    if (userResult.rows.length === 0) {
      console.warn(`User with clerk_id ${clerkUserId} not found when fetching following list.`);
      return [];
    }
    const internalUserId = userResult.rows[0].id;

    const result = await pool.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone_number,
        u.username,
        u.user_score,
        u.profile_image,
        uc.connected_at
      FROM user_connections uc
      JOIN users u
        ON uc.connected_user_id = u.id
      WHERE uc.user_id = $1 AND uc.status = 'accepted'
      ORDER BY u.user_score DESC, uc.connected_at DESC
    `, [internalUserId]);

    return result.rows.map(mapUserWithImageUrl);
  } catch (error) {
    console.error('Error fetching following list:', error.message);
    throw new Error('Database error fetching following list');
  }
};

const getFollowers = async (clerkUserId) => {
  try {
    let userResult = await pool.query(
      `SELECT id FROM users WHERE clerk_id = $1`,
      [clerkUserId]
    );

    // // If user not found, wait and retry once. This handles potential replication lag or webhook processing delay.
    // if (userResult.rows.length === 0) {
    //   console.warn(`Initial check: User with clerk_id ${clerkUserId} not found. Retrying in 0.5 seconds...`);
    //   await new Promise(resolve => setTimeout(resolve, 500));
    //   userResult = await pool.query(
    //     `SELECT id FROM users WHERE clerk_id = $1`,
    //     [clerkUserId]
    //   );
    // }

    // if (userResult.rows.length === 0) {
    //   console.error(`Final check: User with clerk_id ${clerkUserId} still not found when fetching followers list.`);
    //   return [];
    // }
    const internalUserId = userResult.rows[0].id;

    const result = await pool.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone_number,
        u.username,
        u.user_score,
        u.profile_image,
        uc.connected_at
      FROM user_connections uc
      JOIN users u
        ON uc.user_id = u.id
      WHERE uc.connected_user_id = $1 AND uc.status = 'accepted'
      ORDER BY u.user_score DESC, uc.connected_at DESC
    `, [internalUserId]);

    return result.rows.map(mapUserWithImageUrl);
  } catch (error) {
    console.error('Error fetching followers list:', error.message);
    throw new Error('Database error fetching followers list');
  }
};

const searchUsers = async (clerkUserId, searchTerm) => {
  try {
    const userResult = await pool.query(
      `SELECT id FROM users WHERE clerk_id = $1`,
      [clerkUserId]
    );

    if (userResult.rows.length === 0) {
      // If the user isn't found, they can't be following anyone, so just return a standard search.
      const publicSearchResult = await pool.query(`
        SELECT u.id, u.name, u.email, u.username, u.user_score, u.profile_image
        FROM users u
        WHERE (u.name ILIKE $1 OR u.email ILIKE $1)
        LIMIT 10;
      `, [`%${searchTerm}%`]);
      return publicSearchResult.rows.map(mapUserWithImageUrl);
    }
    
    const internalUserId = userResult.rows[0].id;

    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.username, u.user_score, u.profile_image
      FROM users u
      WHERE 
        (u.name ILIKE $1 OR u.email ILIKE $1)
        AND u.id != $2
      ORDER BY u.user_score DESC NULLS LAST
      LIMIT 10;
    `, [`%${searchTerm}%`, internalUserId]);

    return result.rows.map(mapUserWithImageUrl);
  } catch (error) {
    console.error('Error searching users:', error.message);
    throw new Error('Database error searching users');
  }
};

const getTopRecommendersByState = async (clerkUserId, state) => {
  try {
    const currentUserResult = await pool.query(
      `SELECT id FROM users WHERE clerk_id = $1`,
      [clerkUserId]
    );

    if (currentUserResult.rows.length === 0) {
      console.warn(`User with clerk_id ${clerkUserId} not found when fetching top recommenders.`);
      // Fallback: fetch top recommenders without filtering for 'already following' if user not found.
      const fallbackResult = await pool.query(`
        SELECT
          u.id,
          u.name,
          u.email,
          u.username,
          u.user_score,
          u.profile_image,
          u.location as city,
          u.state
        FROM users u
        WHERE u.state = $1
        ORDER BY u.user_score DESC NULLS LAST, u.created_at DESC
        LIMIT 10;
      `, [state]);
      return fallbackResult.rows.map(mapUserWithImageUrl);
    }
    const currentInternalUserId = currentUserResult.rows[0].id;

    const result = await pool.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.username,
        u.user_score,
        u.profile_image,
        u.location as city,
        u.state
      FROM users u
      WHERE u.state = $1
        AND u.id != $2 -- Don't include self
        AND u.id NOT IN (
          SELECT connected_user_id
          FROM user_connections
          WHERE user_id = $2 AND status = 'accepted'
        )
      ORDER BY u.user_score DESC NULLS LAST, u.created_at DESC
      LIMIT 10;
    `, [state, currentInternalUserId]);

    return result.rows.map(mapUserWithImageUrl);
  } catch (error) {
    console.error('Error fetching top recommenders:', error.message);
    throw new Error('Database error fetching top recommenders');
  }
};

const mapUserWithImageUrl = (row) => {
  let imageUrl = null;
  if (row.profile_image) {
    imageUrl = `${API_BASE_URL}/api/users/${row.id}/profile/image`;
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone_number: row.phone_number,
    username: row.username,
    user_score: row.user_score,
    profile_image_url: imageUrl,
    connected_at: row.connected_at,
    city: row.city,
    state: row.state,
  };
};

module.exports = {
  getConnectionsByEmail,
  sendConnectionRequest,
  getTrustCircleUsers,
  getConnectionsByUserId,
  getConnectionStatus,
  removeConnection,
  getTopRecommendersByState,
  getFollowing,
  getFollowers,
  searchUsers
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
