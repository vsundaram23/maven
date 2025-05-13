const pool = require('../config/db.config');

const createCommunity = async (name, description, created_by) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const communityResult = await client.query(
      `INSERT INTO communities (name, description, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [name, description, created_by]
    );
    const newCommunity = communityResult.rows[0];
    if (!newCommunity) {
      throw new Error('Failed to create community record.');
    }
    const membershipResult = await client.query(
      `INSERT INTO community_memberships (user_id, community_id, status, approved_at, requested_at)
       VALUES ($1, $2, 'approved', NOW(), NOW()) RETURNING *`,
      [created_by, newCommunity.id]
    );
    if (membershipResult.rows.length === 0) {
        throw new Error('Failed to add creator to community memberships.');
    }
    await client.query('COMMIT');
    return newCommunity;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating community and adding owner as member:', error.message);
    throw new Error('Database error creating community');
  } finally {
    client.release();
  }
};

const getAllCommunities = async (currentUserId) => {
  console.log('getAllCommunities called with currentUserId:', currentUserId);
  try {
    let queryText = `
      SELECT
        c.id,
        c.name,
        c.description,
        c.created_by,
        c.created_at,
        u.name as creator_name,
        (SELECT COUNT(*) FROM community_memberships cm_count WHERE cm_count.community_id = c.id AND cm_count.status = 'approved') as member_count`;

    const queryParams = [];

    if (currentUserId) {
      queryText += `,
        cm_user.status as user_membership_status
        FROM communities c
        JOIN users u ON c.created_by = u.id
        LEFT JOIN community_memberships cm_user ON c.id = cm_user.community_id AND cm_user.user_id = $1
        ORDER BY c.name`;
      queryParams.push(currentUserId);
    } else {
      queryText += `
        FROM communities c
        JOIN users u ON c.created_by = u.id
        ORDER BY c.name`;
    }
    console.log("Executing SQL for getAllCommunities:");
    console.log("Query Text:", queryText);
    console.log("Query Params:", queryParams);
    const result = await pool.query(queryText, queryParams);

    return result.rows.map(r => ({
        ...r,
        member_count: parseInt(r.member_count, 10) || 0,
        recommendation_count: 0,
        isOwner: currentUserId ? r.created_by === currentUserId : false,
        user_membership_status: r.user_membership_status || null
    }));
  } catch (error) {
    console.error('Error fetching all communities:', error.message);
    throw new Error('Database error fetching communities');
  }
};

const getUserCommunities = async (userId) => {
    try {
      const result = await pool.query(`
        SELECT
            c.id,
            c.name,
            c.description,
            c.created_by,
            c.created_at,
            creator_u.name as creator_name,
            cm.status as user_membership_status,
            (SELECT COUNT(*) FROM community_memberships cm_count WHERE cm_count.community_id = c.id AND cm_count.status = 'approved') as member_count
        FROM community_memberships cm
        JOIN communities c ON cm.community_id = c.id
        JOIN users creator_u ON c.created_by = creator_u.id
        WHERE cm.user_id = $1 AND cm.status = 'approved'
        ORDER BY c.name
      `, [userId]);
      return result.rows.map(r => ({
          ...r,
          member_count: parseInt(r.member_count, 10) || 0,
          recommendation_count: 0,
          isOwner: r.created_by === userId
      }));
    } catch (err) {
      console.error('Error fetching user communities:', err.message);
      throw new Error('Database error fetching user communities');
    }
};

const getCommunityDetails = async (communityId, currentUserId) => {
  try {
    const communityQuery = `
        SELECT
            c.id,
            c.name,
            c.description,
            c.created_by,
            c.created_at,
            u.name as creator_name,
            (SELECT COUNT(*) FROM community_memberships cm_count WHERE cm_count.community_id = c.id AND cm_count.status = 'approved') as member_count
        FROM communities c
        JOIN users u ON c.created_by = u.id
        WHERE c.id = $1`;
    const communityRes = await pool.query(communityQuery, [communityId]);

    if (communityRes.rows.length === 0) {
      throw new Error('Community not found');
    }
    const community = communityRes.rows[0];
    community.member_count = parseInt(community.member_count, 10) || 0;
    community.recommendation_count = 0;
    community.isOwner = false;
    community.currentUserStatus = 'none';

    if (currentUserId) {
        community.isOwner = community.created_by === currentUserId;
        const membershipRes = await pool.query(
            `SELECT status FROM community_memberships WHERE user_id = $1 AND community_id = $2`,
            [currentUserId, communityId]
        );
        if (membershipRes.rows.length > 0) {
            community.currentUserStatus = membershipRes.rows[0].status;
        }
    }
    return community;
  } catch (error) {
    console.error('Error fetching community details:', error.message);
    if (error.message === 'Community not found') throw error;
    throw new Error('Database error fetching community details');
  }
};

const requestToJoinCommunity = async (user_id, community_id) => {
  try {
    const existing = await pool.query(
      `SELECT status FROM community_memberships WHERE user_id = $1 AND community_id = $2`,
      [user_id, community_id]
    );

    if (existing.rows.length > 0) {
      if(existing.rows[0].status === 'approved'){
        throw new Error('Already a member of this community.');
      } else if (existing.rows[0].status === 'requested') {
        throw new Error('Already requested to join this community.');
      }
    }

    const result = await pool.query(
      `INSERT INTO community_memberships (user_id, community_id, status, requested_at)
       VALUES ($1, $2, 'requested', NOW()) RETURNING *`,
      [user_id, community_id]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error requesting to join community:', error.message);
    if (error.message.startsWith('Already')) throw error;
    throw new Error('Database error requesting to join community');
  }
};

const getJoinRequests = async (communityId, creatorId) => {
  try {
    const checkCreator = await pool.query(
      `SELECT 1 FROM communities WHERE id = $1 AND created_by = $2`,
      [communityId, creatorId]
    );

    if (checkCreator.rows.length === 0) {
      throw new Error('Not authorized to view join requests for this community.');
    }

    const result = await pool.query(
      `SELECT cm.user_id, cm.community_id, cm.status, cm.requested_at, u.name, u.email
       FROM community_memberships cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.community_id = $1 AND cm.status = 'requested'
       ORDER BY cm.requested_at ASC`,
      [communityId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching join requests:', error.message);
    if (error.message.startsWith('Not authorized')) throw error;
    throw new Error('Database error fetching join requests');
  }
};

const approveMembership = async (community_id, newUserId, approverId) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const communityCheck = await client.query(
        `SELECT created_by FROM communities WHERE id = $1`,
        [community_id]
      );
      if (communityCheck.rows.length === 0) {
        throw new Error('Community not found.');
      }
      if (communityCheck.rows[0].created_by !== approverId) {
        throw new Error('User not authorized to approve memberships for this community.');
      }

      const membershipUpdate = await client.query(
        `UPDATE community_memberships
         SET status = 'approved', approved_at = NOW()
         WHERE user_id = $1 AND community_id = $2 AND status = 'requested'
         RETURNING *`,
        [newUserId, community_id]
      );

      if (membershipUpdate.rowCount === 0) {
          throw new Error('No pending request found for this user or already approved.');
      }

      const otherUsers = await client.query(
        `SELECT user_id FROM community_memberships
         WHERE community_id = $1 AND status = 'approved' AND user_id != $2`,
        [community_id, newUserId]
      );

      for (const row of otherUsers.rows) {
        const existingUserId = row.user_id;
        const connectionExists = await client.query(
          `SELECT 1 FROM user_connections
           WHERE (user_id = $1 AND connected_user_id = $2)
              OR (user_id = $2 AND connected_user_id = $1)`,
          [newUserId, existingUserId]
        );

        if (connectionExists.rows.length === 0) {
          await client.query(
            `INSERT INTO user_connections (user_id, connected_user_id, status, connected_at)
             VALUES ($1, $2, 'accepted', NOW()),
                    ($2, $1, 'accepted', NOW())`,
            [newUserId, existingUserId]
          );
        }
      }
      await client.query('COMMIT');
      return membershipUpdate.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error approving community membership:', error.message);
      if (error.message.includes('Not authorized') || error.message.includes('No pending request') || error.message.includes('Community not found')) {
          throw error;
      }
      throw new Error('Database error approving membership');
    } finally {
      client.release();
    }
  };

module.exports = {
  createCommunity,
  getAllCommunities,
  getUserCommunities,
  getCommunityDetails,
  requestToJoinCommunity,
  getJoinRequests,
  approveMembership
};

// const pool = require('../config/db.config');

// // Create a new community
// // const createCommunity = async (name, description, created_by) => {
// //   try {
// //     const result = await pool.query(
// //       `INSERT INTO communities (name, description, created_by)
// //        VALUES ($1, $2, $3) RETURNING *`,
// //       [name, description, created_by]
// //     );
// //     return result.rows[0];
// //   } catch (error) {
// //     console.error('Error creating community:', error.message);
// //     throw new Error('Database error creating community');
// //   }
// // };
// const createCommunity = async (name, description, created_by) => {
//   const client = await pool.connect(); // Use a client for transaction
//   try {
//     await client.query('BEGIN'); // Start transaction

//     // 1. Insert the new community
//     const communityResult = await client.query(
//       `INSERT INTO communities (name, description, created_by)
//        VALUES ($1, $2, $3) RETURNING *`,
//       [name, description, created_by]
//     );
//     const newCommunity = communityResult.rows[0];

//     if (!newCommunity) {
//       throw new Error('Failed to create community record.');
//     }

//     // 2. Automatically add the creator as an approved member
//     const membershipResult = await client.query(
//       `INSERT INTO community_memberships (user_id, community_id, status, approved_at, requested_at)
//        VALUES ($1, $2, 'approved', NOW(), NOW()) RETURNING *`, // Set status to 'approved'
//       [created_by, newCommunity.id]
//     );

//     if (membershipResult.rows.length === 0) {
//         throw new Error('Failed to add creator to community memberships.');
//     }

//     await client.query('COMMIT'); // Commit transaction
//     return newCommunity; // Return the created community object

//   } catch (error) {
//     await client.query('ROLLBACK'); // Rollback on error
//     console.error('Error creating community and adding owner as member:', error.message);
//     throw new Error('Database error creating community');
//   } finally {
//     client.release(); // Release client
//   }
// };

// // Get all communities
// // const getAllCommunities = async () => {
// //   try {
// //     const result = await pool.query(`SELECT * FROM communities`);
// //     return result.rows;
// //   } catch (error) {
// //     console.error('Error fetching communities:', error.message);
// //     throw new Error('Database error fetching communities');
// //   }
// // };
// const getAllCommunities = async (currentUserId) => {
//   try {
//     let queryText = `
//       SELECT
//         c.id,
//         c.name,
//         c.description,
//         c.created_by,
//         c.created_at,
//         u.name as creator_name,
//         (SELECT COUNT(*) FROM community_memberships cm_count WHERE cm_count.community_id = c.id AND cm_count.status = 'approved') as member_count,
//         (SELECT COUNT(*) FROM community_recommendations cr_count WHERE cr_count.community_id = c.id) as recommendation_count`; // Assuming you have community_recommendations table

//     const queryParams = [];

//     if (currentUserId) {
//       queryText += `,
//         cm_user.status as user_membership_status  -- Get the specific user's membership status
//         FROM communities c
//         JOIN users u ON c.created_by = u.id
//         LEFT JOIN community_memberships cm_user ON c.id = cm_user.community_id AND cm_user.user_id = $1
//         ORDER BY c.name`;
//       queryParams.push(currentUserId);
//     } else {
//       queryText += `
//         FROM communities c
//         JOIN users u ON c.created_by = u.id
//         ORDER BY c.name`;
//     }

//     const result = await pool.query(queryText, queryParams);

//     return result.rows.map(r => ({
//         ...r,
//         member_count: parseInt(r.member_count, 10) || 0,
//         recommendation_count: parseInt(r.recommendation_count, 10) || 0,
//         isOwner: currentUserId ? r.created_by === currentUserId : false,
//         // Ensure user_membership_status is null if no record, or the actual status
//         user_membership_status: r.user_membership_status || null
//     }));
//   } catch (error) {
//     console.error('Error fetching all communities:', error.message);
//     throw new Error('Database error fetching communities');
//   }
// };

// // Request to join a community
// const requestToJoinCommunity = async (user_id, community_id) => {
//   try {
//     const existing = await pool.query(
//       `SELECT * FROM community_memberships WHERE user_id = $1 AND community_id = $2`,
//       [user_id, community_id]
//     );

//     if (existing.rows.length > 0) {
//       throw new Error('Already requested or member');
//     }

//     const result = await pool.query(
//       `INSERT INTO community_memberships (user_id, community_id)
//        VALUES ($1, $2) RETURNING *`,
//       [user_id, community_id]
//     );

//     return result.rows[0];
//   } catch (error) {
//     console.error('Error requesting to join community:', error.message);
//     throw new Error('Database error requesting to join community');
//   }
// };

// // Get pending join requests (creator only)
// const getJoinRequests = async (communityId, creatorId) => {
//   try {
//     const checkCreator = await pool.query(
//       `SELECT * FROM communities WHERE id = $1 AND created_by = $2`,
//       [communityId, creatorId]
//     );

//     if (checkCreator.rows.length === 0) {
//       throw new Error('Not authorized to view join requests');
//     }

//     const result = await pool.query(
//       `SELECT cm.*, u.name, u.email
//        FROM community_memberships cm
//        JOIN users u ON u.id = cm.user_id
//        WHERE cm.community_id = $1 AND cm.status = 'requested'`,
//       [communityId]
//     );

//     return result.rows;
//   } catch (error) {
//     console.error('Error fetching join requests:', error.message);
//     throw new Error('Database error fetching join requests');
//   }
// };

// // Approve a user's membership and create mutual connections
// const approveMembership = async (community_id, newUserId) => {
//     const client = await pool.connect();
  
//     try {
//       await client.query('BEGIN');
  
//       // 1. Approve the membership
//       await client.query(
//         `UPDATE community_memberships
//          SET status = 'approved', approved_at = NOW()
//          WHERE user_id = $1 AND community_id = $2`,
//         [newUserId, community_id]
//       );
  
//       // 2. Fetch all *other* approved users
//       const otherUsers = await client.query(
//         `SELECT user_id FROM community_memberships
//          WHERE community_id = $1 AND status = 'approved' AND user_id != $2`,
//         [community_id, newUserId]
//       );
  
//       for (const row of otherUsers.rows) {
//         const existingUserId = row.user_id;
  
//         // 3. Check if a connection already exists
//         const connectionExists = await client.query(
//           `SELECT 1 FROM user_connections
//            WHERE (user_id = $1 AND connected_user_id = $2)
//               OR (user_id = $2 AND connected_user_id = $1)`,
//           [newUserId, existingUserId]
//         );
  
//         // 4. Only insert if no connection exists
//         if (connectionExists.rows.length === 0) {
//           await client.query(
//             `INSERT INTO user_connections (user_id, connected_user_id, status, connected_at)
//              VALUES ($1, $2, 'accepted', NOW()),
//                     ($2, $1, 'accepted', NOW())`,
//             [newUserId, existingUserId]
//           );
//         }
//       }
  
//       await client.query('COMMIT');
//     } catch (error) {
//       await client.query('ROLLBACK');
//       console.error('Error approving community membership:', error.message);
//       throw new Error('Database error approving membership');
//     } finally {
//       client.release();
//     }
//   };

// module.exports = {
//   createCommunity,
//   getAllCommunities,
//   requestToJoinCommunity,
//   getJoinRequests,
//   approveMembership
// };
