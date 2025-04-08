const pool = require('../config/db.config');

// Create a new community
const createCommunity = async (name, description, created_by) => {
  try {
    const result = await pool.query(
      `INSERT INTO communities (name, description, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [name, description, created_by]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating community:', error.message);
    throw new Error('Database error creating community');
  }
};

// Get all communities
const getAllCommunities = async () => {
  try {
    const result = await pool.query(`SELECT * FROM communities`);
    return result.rows;
  } catch (error) {
    console.error('Error fetching communities:', error.message);
    throw new Error('Database error fetching communities');
  }
};

// Request to join a community
const requestToJoinCommunity = async (user_id, community_id) => {
  try {
    const existing = await pool.query(
      `SELECT * FROM community_memberships WHERE user_id = $1 AND community_id = $2`,
      [user_id, community_id]
    );

    if (existing.rows.length > 0) {
      throw new Error('Already requested or member');
    }

    const result = await pool.query(
      `INSERT INTO community_memberships (user_id, community_id)
       VALUES ($1, $2) RETURNING *`,
      [user_id, community_id]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error requesting to join community:', error.message);
    throw new Error('Database error requesting to join community');
  }
};

// Get pending join requests (creator only)
const getJoinRequests = async (communityId, creatorId) => {
  try {
    const checkCreator = await pool.query(
      `SELECT * FROM communities WHERE id = $1 AND created_by = $2`,
      [communityId, creatorId]
    );

    if (checkCreator.rows.length === 0) {
      throw new Error('Not authorized to view join requests');
    }

    const result = await pool.query(
      `SELECT cm.*, u.name, u.email
       FROM community_memberships cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.community_id = $1 AND cm.status = 'requested'`,
      [communityId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error fetching join requests:', error.message);
    throw new Error('Database error fetching join requests');
  }
};

// Approve a user's membership and create mutual connections
const approveMembership = async (community_id, newUserId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Approve the membership
    await client.query(
      `UPDATE community_memberships
       SET status = 'approved', approved_at = NOW()
       WHERE user_id = $1 AND community_id = $2`,
      [newUserId, community_id]
    );

    // Fetch other approved users
    const otherUsers = await client.query(
      `SELECT user_id FROM community_memberships
       WHERE community_id = $1 AND status = 'approved' AND user_id != $2`,
      [community_id, newUserId]
    );

    // Insert mutual connections
    for (const row of otherUsers.rows) {
      const existingUserId = row.user_id;

      await client.query(
        `INSERT INTO user_connections (user_id, connected_user_id, status, connected_at)
         VALUES ($1, $2, 'accepted', NOW()),
                ($2, $1, 'accepted', NOW())
         ON CONFLICT DO NOTHING`,
        [newUserId, existingUserId]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving community membership:', error.message);
    throw new Error('Database error approving membership');
  } finally {
    client.release();
  }
};

module.exports = {
  createCommunity,
  getAllCommunities,
  requestToJoinCommunity,
  getJoinRequests,
  approveMembership
};
