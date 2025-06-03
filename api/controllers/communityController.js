const pool = require("../config/db.config");

const PENDING_SERVICE_PK_ID = "e2c2b91a-c577-448b-8bd1-3e0c17b20e46";
const PENDING_CATEGORY_PK_ID = "93859f52-830f-4b72-92fc-9316db28fb7e";
const API_BASE_URL = "https://api.seanag-recommendations.org:8080";

const createCommunity = async (name, description, created_by_clerk_id) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        let created_by_uuid = null;
        const userRes = await client.query(
            "SELECT id FROM users WHERE clerk_id = $1",
            [created_by_clerk_id]
        );
        if (userRes.rows.length > 0) {
            created_by_uuid = userRes.rows[0].id;
        } else {
            throw new Error("Creator user not found by Clerk ID.");
        }

        const communityResult = await client.query(
            `INSERT INTO communities (name, description, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
            [name, description, created_by_uuid]
        );
        const newCommunity = communityResult.rows[0];
        if (!newCommunity) {
            throw new Error("Failed to create community record.");
        }
        const membershipResult = await client.query(
            `INSERT INTO community_memberships (user_id, community_id, status, approved_at, requested_at)
       VALUES ($1, $2, 'approved', NOW(), NOW()) RETURNING *`,
            [created_by_uuid, newCommunity.id]
        );
        if (membershipResult.rows.length === 0) {
            throw new Error("Failed to add creator to community memberships.");
        }
        await client.query("COMMIT");
        return newCommunity;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const getUserCommunities = async (clerkUserId) => {
    if (!clerkUserId) {
        console.warn(
            "getUserCommunities called without clerkUserId. Returning empty array."
        );
        return [];
    }
    let client;
    try {
        client = await pool.connect();
        let internalUserUuid = null;

        const userRes = await client.query(
            "SELECT id FROM users WHERE clerk_id = $1",
            [clerkUserId]
        );
        if (userRes.rows.length > 0) {
            internalUserUuid = userRes.rows[0].id;
        } else {
            console.warn(
                `No internal user UUID found for Clerk ID: ${clerkUserId} in getUserCommunities. Returning empty array.`
            );
            return [];
        }

        const result = await client.query(
            `
      SELECT 
          c.id, c.name, c.description, c.created_by, c.created_at, 
          creator_u.name as creator_name, 
          cm.status as user_membership_status,
          (SELECT COUNT(*) FROM community_memberships cm_count WHERE cm_count.community_id = c.id AND cm_count.status = 'approved') as member_count,
          (SELECT COUNT(DISTINCT cs.service_provider_id) FROM community_shares cs WHERE cs.community_id = c.id) as recommendation_count 
      FROM community_memberships cm
      JOIN communities c ON cm.community_id = c.id
      JOIN users creator_u ON c.created_by = creator_u.id
      WHERE cm.user_id = $1 AND cm.status = 'approved'
      ORDER BY c.name ASC
    `,
            [internalUserUuid]
        );

        return result.rows.map((r) => ({
            ...r,
            member_count: parseInt(r.member_count, 10) || 0,
            recommendation_count: parseInt(r.recommendation_count, 10) || 0,
            isOwner: r.created_by === internalUserUuid,
        }));
    } catch (err) {
        console.error("Error in getUserCommunities:", err.message, err.stack);
        throw err;
    } finally {
        if (client) client.release();
    }
};

// Make sure getAllCommunities also correctly handles its userIdFromQuery (which should be an internal UUID)
const getAllCommunities = async (internalUserIdFromQuery) => {
    let client;
    try {
        client = await pool.connect();
        let queryText = `
      SELECT c.id, c.name, c.description, c.created_by, c.created_at, u.name as creator_name,
             (SELECT COUNT(*) FROM community_memberships cm_count WHERE cm_count.community_id = c.id AND cm_count.status = 'approved') as member_count,
             (SELECT COUNT(DISTINCT cs.service_provider_id) FROM community_shares cs WHERE cs.community_id = c.id) as recommendation_count`;
        const queryParams = [];

        if (internalUserIdFromQuery) {
            queryText += `, cm_user.status as user_membership_status
        FROM communities c
        JOIN users u ON c.created_by = u.id
        LEFT JOIN community_memberships cm_user ON c.id = cm_user.community_id AND cm_user.user_id = $1
        ORDER BY c.name ASC`;
            queryParams.push(internalUserIdFromQuery);
        } else {
            queryText += `
        FROM communities c
        JOIN users u ON c.created_by = u.id
        ORDER BY c.name ASC`;
        }
        const result = await client.query(queryText, queryParams);
        return result.rows.map((r) => ({
            ...r,
            member_count: parseInt(r.member_count, 10) || 0,
            recommendation_count: parseInt(r.recommendation_count, 10) || 0,
            isOwner: internalUserIdFromQuery
                ? r.created_by === internalUserIdFromQuery
                : false,
            user_membership_status: r.user_membership_status || "none",
        }));
    } catch (error) {
        console.error(
            "Error in getAllCommunities:",
            error.message,
            error.stack
        );
        throw error;
    } finally {
        if (client) client.release();
    }
};

const getCommunityDetails = async (communityId, clerkUserId) => {
    let client;
    try {
        client = await pool.connect();
        let internalUserUuid = null;
        if (clerkUserId) {
            const userRes = await client.query(
                "SELECT id FROM users WHERE clerk_id = $1",
                [clerkUserId]
            );
            if (userRes.rows.length > 0) {
                internalUserUuid = userRes.rows[0].id;
            }
        }

        const communityQuery = `
        SELECT c.id, c.name, c.description, c.created_by, c.created_at, u.name as creator_name,
               (SELECT COUNT(*) FROM community_memberships cm_count WHERE cm_count.community_id = c.id AND cm_count.status = 'approved') as member_count,
               (SELECT COUNT(DISTINCT cs.service_provider_id) FROM community_shares cs WHERE cs.community_id = c.id) as recommendation_count
        FROM communities c
        JOIN users u ON c.created_by = u.id
        WHERE c.id = $1`;
        const communityRes = await client.query(communityQuery, [communityId]);
        if (communityRes.rows.length === 0)
            throw new Error("Community not found");

        const community = communityRes.rows[0];
        community.member_count = parseInt(community.member_count, 10) || 0;
        community.recommendation_count =
            parseInt(community.recommendation_count, 10) || 0;
        community.isOwner = false;
        community.currentUserStatus = "none";

        if (internalUserUuid) {
            community.isOwner = community.created_by === internalUserUuid;
            const membershipRes = await client.query(
                `SELECT status FROM community_memberships WHERE user_id = $1 AND community_id = $2`,
                [internalUserUuid, communityId]
            );
            if (membershipRes.rows.length > 0)
                community.currentUserStatus = membershipRes.rows[0].status;
        }
        return community;
    } catch (error) {
        if (error.message === "Community not found") throw error;
        throw new Error(
            "Database error fetching community details: " + error.message
        );
    } finally {
        if (client) client.release();
    }
};

const requestToJoinCommunityByInternalId = async (
    internalUserId,
    communityId
) => {
    const client = await pool.connect();
    try {
        // Confirm user exists
        const userCheck = await client.query(
            "SELECT id FROM users WHERE id = $1",
            [internalUserId]
        );
        if (userCheck.rows.length === 0) {
            throw new Error("User not found.");
        }

        // Check if already a member or already requested
        const existing = await client.query(
            `SELECT status FROM community_memberships WHERE user_id = $1 AND community_id = $2`,
            [internalUserId, communityId]
        );
        if (existing.rows.length > 0) {
            throw new Error(
                `Already ${existing.rows[0].status} this community`
            );
        }

        // Insert request
        const result = await client.query(
            `INSERT INTO community_memberships (user_id, community_id, status, requested_at)
       VALUES ($1, $2, 'requested', NOW())
       RETURNING *`,
            [internalUserId, communityId]
        );

        return result.rows[0];
    } catch (error) {
        throw new Error(error.message);
    } finally {
        client.release();
    }
};

const requestToJoinCommunity = async (clerkUserId, community_id) => {
    let client;
    try {
        client = await pool.connect();
        let internalUserUuid = null;
        const userRes = await client.query(
            "SELECT id FROM users WHERE clerk_id = $1",
            [clerkUserId]
        );
        if (userRes.rows.length > 0) {
            internalUserUuid = userRes.rows[0].id;
        } else {
            throw new Error("User not found.");
        }

        const existing = await client.query(
            `SELECT status FROM community_memberships WHERE user_id = $1 AND community_id = $2`,
            [internalUserUuid, community_id]
        );
        if (existing.rows.length > 0) {
            if (existing.rows[0].status === "approved")
                throw new Error("Already a member of this community.");
            if (existing.rows[0].status === "requested")
                throw new Error("Already requested to join this community.");
        }
        const result = await client.query(
            `INSERT INTO community_memberships (user_id, community_id, status, requested_at) VALUES ($1, $2, 'requested', NOW()) RETURNING *`,
            [internalUserUuid, community_id]
        );
        return result.rows[0];
    } catch (error) {
        if (
            error.message.startsWith("Already") ||
            error.message === "User not found."
        )
            throw error;
        throw new Error(
            "Database error requesting to join community: " + error.message
        );
    } finally {
        if (client) client.release();
    }
};

const getJoinRequestsByInternalId = async (communityId, internalCreatorId) => {
    let client;
    try {
        client = await pool.connect();

        const checkCreator = await client.query(
            `SELECT 1 FROM communities WHERE id = $1 AND created_by = $2`,
            [communityId, internalCreatorId]
        );
        if (checkCreator.rows.length === 0) {
            throw new Error(
                "Not authorized to view join requests for this community."
            );
        }

        const result = await client.query(
            `SELECT u.clerk_id as user_id, cm.community_id, cm.status, cm.requested_at, u.name, u.email
       FROM community_memberships cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.community_id = $1 AND cm.status = 'requested'
       ORDER BY cm.requested_at ASC`,
            [communityId]
        );

        return result.rows;
    } catch (error) {
        if (
            error.message.startsWith("Not authorized") ||
            error.message === "Creator user not found."
        ) {
            throw error;
        }
        throw new Error(
            "Database error fetching join requests: " + error.message
        );
    } finally {
        if (client) client.release();
    }
};

const getJoinRequests = async (communityId, clerkCreatorId) => {
    let client;
    try {
        client = await pool.connect();
        let internalCreatorUuid = null;
        const userRes = await client.query(
            "SELECT id FROM users WHERE clerk_id = $1",
            [clerkCreatorId]
        );
        if (userRes.rows.length > 0) {
            internalCreatorUuid = userRes.rows[0].id;
        } else {
            throw new Error("Creator user not found.");
        }

        const checkCreator = await client.query(
            `SELECT 1 FROM communities WHERE id = $1 AND created_by = $2`,
            [communityId, internalCreatorUuid]
        );
        if (checkCreator.rows.length === 0)
            throw new Error(
                "Not authorized to view join requests for this community."
            );

        const result = await client.query(
            `SELECT cm.user_id, cm.community_id, cm.status, cm.requested_at, u.name, u.email, u.clerk_id
       FROM community_memberships cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.community_id = $1 AND cm.status = 'requested' ORDER BY cm.requested_at ASC`,
            [communityId]
        );
        return result.rows;
    } catch (error) {
        if (
            error.message.startsWith("Not authorized") ||
            error.message === "Creator user not found."
        )
            throw error;
        throw new Error(
            "Database error fetching join requests: " + error.message
        );
    } finally {
        if (client) client.release();
    }
};

const approveMembership = async (
    community_id,
    clerkNewUserId,
    clerkApproverId
) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const newUserRes = await client.query(
            "SELECT id FROM users WHERE clerk_id = $1",
            [clerkNewUserId]
        );
        if (newUserRes.rows.length === 0) {
            throw new Error("User to be approved not found");
        }
        const internalNewUserUuid = newUserRes.rows[0].id;

        const approverRes = await client.query(
            "SELECT id FROM users WHERE clerk_id = $1",
            [clerkApproverId]
        );
        if (approverRes.rows.length === 0) {
            throw new Error("Approver not found");
        }
        const internalApproverUuid = approverRes.rows[0].id;
        
        const communityCheck = await client.query(
            `SELECT created_by FROM communities WHERE id = $1`,
            [community_id]
        );
        if (communityCheck.rows.length === 0)
            throw new Error("Community not found.");
        if (communityCheck.rows[0].created_by !== internalApproverUuid)
            throw new Error("User not authorized to approve memberships.");

        const result = await client.query(
            `UPDATE community_memberships SET status = 'approved', approved_at = NOW()
         WHERE user_id = $1 AND community_id = $2 AND status = 'requested' RETURNING *`,
            [internalNewUserUuid, community_id]
        );
        if (result.rowCount === 0)
            throw new Error("No pending request found or already approved.");

        const otherUsers = await client.query(
            `SELECT user_id FROM community_memberships WHERE community_id = $1 AND status = 'approved' AND user_id != $2`,
            [community_id, internalNewUserUuid]
        );
        for (const row of otherUsers.rows) {
            const existingUserId = row.user_id;
            const connExists = await client.query(
                `SELECT 1 FROM user_connections WHERE (user_id = $1 AND connected_user_id = $2) OR (user_id = $2 AND connected_user_id = $1)`,
                [internalNewUserUuid, existingUserId]
            );
            if (connExists.rows.length === 0) {
                await client.query(
                    `INSERT INTO user_connections (user_id, connected_user_id, status, connected_at) VALUES ($1, $2, 'accepted', NOW()), ($2, $1, 'accepted', NOW())`,
                    [internalNewUserUuid, existingUserId]
                );
            }
        }
        await client.query("COMMIT");
        return result.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        if (
            error.message.includes("Not authorized") ||
            error.message.includes("No pending request") ||
            error.message.includes("not found")
        )
            throw error;
        throw new Error(
            "Database error approving membership: " + error.message
        );
    } finally {
        client.release();
    }
};
const getCommunityMembers = async (communityId) => {
    let client;
    try {
        client = await pool.connect();
        const result = await client.query(
            `SELECT u.id, u.clerk_id, u.name, u.email, u.phone_number, u.profile_image 
       FROM users u
       JOIN community_memberships cm ON u.id = cm.user_id
       WHERE cm.community_id = $1 AND cm.status = 'approved'
       ORDER BY u.name ASC`,
            [communityId]
        );

        return result.rows.map((row) => {
            let imageUrl = null;
            if (row.profile_image) {
                // Construct the full URL using your fixed API base URL
                // This assumes your image serving endpoint is /api/users/:userId/profile-image
                // and row.id is the internal UUID your image endpoint expects.
                imageUrl = `${API_BASE_URL}/api/users/${row.id}/profile/image`;
            }
            return {
                id: row.id,
                clerk_id: row.clerk_id,
                name: row.name,
                email: row.email,
                phone_number: row.phone_number,
                profile_image_url: imageUrl,
            };
        });
    } catch (error) {
        console.error("Database error fetching community members:", error);
        throw new Error(
            "Database error fetching community members: " + error.message
        );
    } finally {
        if (client) client.release();
    }
};

// const getCommunityRecommendations = async (communityId, clerkUserId) => {
//   let client;
//   try {
//       client = await pool.connect();
//       let internalUserUuid = null;
//       if (clerkUserId) {
//           const userRes = await client.query('SELECT id FROM users WHERE clerk_id = $1', [clerkUserId]);
//           if (userRes.rows.length > 0) {
//               internalUserUuid = userRes.rows[0].id;
//           }
//       }

//       const PENDING_SERVICE_PK_ID_val = 'e2c2b91a-c577-448b-8bd1-3e0c17b20e46';
//       const PENDING_CATEGORY_PK_ID_val = '93859f52-830f-4b72-92fc-9316db28fb7e';

//       const query = `
//           SELECT
//               sp.id, sp.business_name, sp.description, sp.email, sp.phone_number, sp.website,
//               sp.tags, sp.city, sp.state, sp.zip_code, sp.service_scope, sp.price_range,
//               sp.business_contact, sp.provider_message, sp.recommender_message,
//               sp.visibility, sp.date_of_recommendation, sp.created_at,
//               sp.submitted_category_name, sp.submitted_service_name,
//               cat.name AS category_name,
//               ser.name AS service_type,
//               rec_user.id AS recommender_user_id,
//               rec_user.clerk_id AS recommender_clerk_id,
//               COALESCE(rec_user.name, rec_user.email) AS recommender_name,
//               rec_user.email AS recommender_email,
//               rec_user.profile_image AS recommender_profile_image_url,
//               rec_user.phone_number AS recommender_phone,
//               COALESCE(sp.num_likes, 0) AS num_likes,
//               EXISTS (SELECT 1 FROM recommendation_likes rl WHERE rl.recommendation_id = sp.id AND rl.user_id = $1) AS "currentUserLiked"
//           FROM service_providers sp
//           JOIN community_shares cs ON sp.id = cs.service_provider_id
//           JOIN users rec_user ON sp.recommended_by = rec_user.id
//           LEFT JOIN services ser ON sp.service_id = ser.service_id AND ser.service_id != $2
//           LEFT JOIN service_categories cat ON ser.category_id = cat.service_id AND cat.service_id != $3
//           WHERE cs.community_id = $4
//             -- AND sp.service_id != $2  -- This line is removed to include pending items
//             AND (sp.visibility = 'public' OR sp.visibility = 'connections')
//           ORDER BY sp.created_at DESC;
//       `;

//       // Parameters are still needed for $1 (currentUserLiked), $2 & $3 (LEFT JOIN conditions), and $4 (communityId)
//       const params = [internalUserUuid, PENDING_SERVICE_PK_ID_val, PENDING_CATEGORY_PK_ID_val, communityId];

//       // console.log('--- DEBUG getCommunityRecommendations ---');
//       // console.log('Query String:', query);
//       // console.log('Parameters being passed:', params);
//       // console.log('Number of parameters provided:', params.length);
//       // console.log('--- END DEBUG ---');

//       const { rows } = await client.query(query, params);
//       return rows;
//   } catch (error) {
//       console.error('Database error fetching community recommendations:', error.message);
//       // console.error('Full error object in getCommunityRecommendations:', error);
//       throw new Error('Database error fetching community recommendations: ' + error.message);
//   } finally {
//       if (client) client.release();
//   }
// };

const getCommunityRecommendations = async (communityId, clerkUserId) => {
    let client;
    try {
        client = await pool.connect();
        let internalUserUuid = null;
        if (clerkUserId) {
            const userRes = await client.query(
                "SELECT id FROM users WHERE clerk_id = $1",
                [clerkUserId]
            );
            if (userRes.rows.length > 0) {
                internalUserUuid = userRes.rows[0].id;
            }
        }

        const PENDING_SERVICE_PK_ID_val =
            "e2c2b91a-c577-448b-8bd1-3e0c17b20e46";
        const PENDING_CATEGORY_PK_ID_val =
            "93859f52-830f-4b72-92fc-9316db28fb7e";

        const query = `
          SELECT
              sp.id, sp.business_name, sp.description, sp.email, sp.phone_number, sp.website,
              sp.tags, sp.city, sp.state, sp.zip_code, sp.service_scope, sp.price_range,
              sp.business_contact, sp.provider_message, sp.recommender_message,
              sp.visibility, sp.date_of_recommendation, sp.created_at,
              sp.submitted_category_name, sp.submitted_service_name,
              cs.community_service_category_id,
              cat.name AS category_name,
              ser.name AS service_type,
              rec_user.id AS recommender_user_id,
              rec_user.clerk_id AS recommender_clerk_id,
              COALESCE(rec_user.name, rec_user.email) AS recommender_name,
              rec_user.email AS recommender_email,
              rec_user.profile_image AS recommender_profile_image_url,
              rec_user.phone_number AS recommender_phone,
              COALESCE(sp.num_likes, 0) AS num_likes,
              EXISTS (SELECT 1 FROM recommendation_likes rl WHERE rl.recommendation_id = sp.id AND rl.user_id = $1) AS "currentUserLiked"
          FROM service_providers sp
          JOIN community_shares cs ON sp.id = cs.service_provider_id
          JOIN users rec_user ON sp.recommended_by = rec_user.id
          LEFT JOIN services ser ON sp.service_id = ser.service_id AND ser.service_id != $2
          LEFT JOIN service_categories cat ON ser.category_id = cat.service_id AND cat.service_id != $3
          WHERE cs.community_id = $4
            AND (sp.visibility = 'public' OR sp.visibility = 'connections')
          ORDER BY sp.created_at DESC;
      `;

        const params = [
            internalUserUuid,
            PENDING_SERVICE_PK_ID_val,
            PENDING_CATEGORY_PK_ID_val,
            communityId,
        ];

        const { rows } = await client.query(query, params);
        return rows;
    } catch (error) {
        console.error(
            "Database error fetching community recommendations:",
            error.message
        );
        throw new Error(
            "Database error fetching community recommendations: " +
                error.message
        );
    } finally {
        if (client) client.release();
    }
};

const getCommunityServiceCategories = async (communityId) => {
    let client;
    try {
        client = await pool.connect();
        const result = await client.query(
            `SELECT id, community_id, category_name, description
       FROM community_service_categories
       WHERE community_id = $1
       ORDER BY category_name ASC`,
            [communityId]
        );
        return result.rows;
    } catch (error) {
        console.error(
            `Database error fetching community service categories for community ${communityId}:`,
            error.message
        );
        throw new Error(
            "Database error fetching community service categories: " +
                error.message
        );
    } finally {
        if (client) client.release();
    }
};

const getUserCommunityCount = async ({ user_id, email }) => {
  // Check if neither clerkUserId nor email is provided
  if (!user_id && !email) {
    console.warn(
      "getUserCommunityCount called without clerkUserId or email. Returning 0."
    );
    return 0;
  }

  let client;
  try {
    client = await pool.connect();
    let internalUserUuid = null;

    if (user_id) {
      // If clerkUserId is provided, fetch internal UUID using it
      const userRes = await client.query(
        "SELECT id FROM users WHERE clerk_id = $1",
        [user_id]
      );
      if (userRes.rows.length > 0) {
        internalUserUuid = userRes.rows[0].id;
      } else {
        console.warn(
          `No internal user UUID found for Clerk ID: ${user_id} in getUserCommunityCount. Returning 0.`
        );
        return 0;
      }
    } else if (email) {
      // If email is provided, fetch internal UUID using it
      const userRes = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );
      if (userRes.rows.length > 0) {
        internalUserUuid = userRes.rows[0].id;
      } else {
        console.warn(
          `No internal user UUID found for email: ${email} in getUserCommunityCount. Returning 0.`
        );
        return 0;
      }
    }

    // If for some reason internalUserUuid is still null (shouldn't happen with the above checks)
    if (!internalUserUuid) {
      console.warn("Could not determine internal user UUID. Returning 0.");
      return 0;
    }

    // Now, use the obtained internalUserUuid to count community memberships
    const result = await client.query(
      `
          SELECT COUNT(*) FROM community_memberships
          WHERE user_id = $1 AND status = 'approved'
          `,
      [internalUserUuid]
    );

    return parseInt(result.rows[0].count, 10) || 0;
  } catch (err) {
    console.error("Error in getUserCommunityCount:", err.message, err.stack);
    throw err;
  } finally {
    if (client) client.release();
  }
};

module.exports = {
    createCommunity,
    getAllCommunities,
    getUserCommunities,
    getCommunityDetails,
    requestToJoinCommunity,
    getJoinRequests,
    approveMembership,
    getCommunityMembers,
    getCommunityRecommendations,
    getCommunityServiceCategories,
    getJoinRequestsByInternalId,
    requestToJoinCommunityByInternalId,
    getUserCommunityCount
};

// 5/21 working version
// const pool = require('../config/db.config');

// const createCommunity = async (name, description, created_by) => {
//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');
//     const communityResult = await client.query(
//       `INSERT INTO communities (name, description, created_by)
//        VALUES ($1, $2, $3) RETURNING *`,
//       [name, description, created_by]
//     );
//     const newCommunity = communityResult.rows[0];
//     if (!newCommunity) {
//       throw new Error('Failed to create community record.');
//     }
//     const membershipResult = await client.query(
//       `INSERT INTO community_memberships (user_id, community_id, status, approved_at, requested_at)
//        VALUES ($1, $2, 'approved', NOW(), NOW()) RETURNING *`,
//       [created_by, newCommunity.id]
//     );
//     if (membershipResult.rows.length === 0) {
//         throw new Error('Failed to add creator to community memberships.');
//     }
//     await client.query('COMMIT');
//     return newCommunity;
//   } catch (error) {
//     await client.query('ROLLBACK');
//     console.error('Error creating community and adding owner as member:', error.message);
//     throw new Error('Database error creating community');
//   } finally {
//     client.release();
//   }
// };

// const getAllCommunities = async (currentUserId) => {
//   console.log('getAllCommunities called with currentUserId:', currentUserId);
//   try {
//     let queryText = `
//       SELECT
//         c.id,
//         c.name,
//         c.description,
//         c.created_by,
//         c.created_at,
//         u.name as creator_name,
//         (SELECT COUNT(*) FROM community_memberships cm_count WHERE cm_count.community_id = c.id AND cm_count.status = 'approved') as member_count`;

//     const queryParams = [];

//     if (currentUserId) {
//       queryText += `,
//         cm_user.status as user_membership_status
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
//     console.log("Executing SQL for getAllCommunities:");
//     console.log("Query Text:", queryText);
//     console.log("Query Params:", queryParams);
//     const result = await pool.query(queryText, queryParams);

//     return result.rows.map(r => ({
//         ...r,
//         member_count: parseInt(r.member_count, 10) || 0,
//         recommendation_count: 0,
//         isOwner: currentUserId ? r.created_by === currentUserId : false,
//         user_membership_status: r.user_membership_status || null
//     }));
//   } catch (error) {
//     console.error('Error fetching all communities:', error.message);
//     throw new Error('Database error fetching communities');
//   }
// };

// const getUserCommunities = async (userId) => {
//     try {
//       const result = await pool.query(`
//         SELECT
//             c.id,
//             c.name,
//             c.description,
//             c.created_by,
//             c.created_at,
//             creator_u.name as creator_name,
//             cm.status as user_membership_status,
//             (SELECT COUNT(*) FROM community_memberships cm_count WHERE cm_count.community_id = c.id AND cm_count.status = 'approved') as member_count
//         FROM community_memberships cm
//         JOIN communities c ON cm.community_id = c.id
//         JOIN users creator_u ON c.created_by = creator_u.id
//         WHERE cm.user_id = $1 AND cm.status = 'approved'
//         ORDER BY c.name
//       `, [userId]);
//       return result.rows.map(r => ({
//           ...r,
//           member_count: parseInt(r.member_count, 10) || 0,
//           recommendation_count: 0,
//           isOwner: r.created_by === userId
//       }));
//     } catch (err) {
//       console.error('Error fetching user communities:', err.message);
//       throw new Error('Database error fetching user communities');
//     }
// };

// const getCommunityDetails = async (communityId, currentUserId) => {
//   try {
//     const communityQuery = `
//         SELECT
//             c.id,
//             c.name,
//             c.description,
//             c.created_by,
//             c.created_at,
//             u.name as creator_name,
//             (SELECT COUNT(*) FROM community_memberships cm_count WHERE cm_count.community_id = c.id AND cm_count.status = 'approved') as member_count,
//             (SELECT COUNT(DISTINCT cs.service_provider_id) FROM community_shares cs WHERE cs.community_id = c.id) recommendation_count
//         FROM communities c
//         JOIN users u ON c.created_by = u.id
//         WHERE c.id = $1`;
//     const communityRes = await pool.query(communityQuery, [communityId]);

//     if (communityRes.rows.length === 0) {
//       throw new Error('Community not found');
//     }

//     const community = communityRes.rows[0];

//     community.member_count = parseInt(community.member_count, 10) || 0;
//     community.recommendation_count = parseInt(community.recommendation_count, 10) || 0;

//     community.isOwner = false;
//     community.currentUserStatus = 'none';

//     if (currentUserId) {
//       community.isOwner = String(community.created_by) === String(currentUserId);
//       const membershipRes = await pool.query(
//         `SELECT status FROM community_memberships WHERE user_id = $1 AND community_id = $2`,
//         [currentUserId, communityId]
//       );
//       if (membershipRes.rows.length > 0) {
//         community.currentUserStatus = membershipRes.rows[0].status;
//       }
//     }

//     return community;
//   } catch (error) {
//     console.error('Error fetching community details:', error.message); // This will log the actual DB error
//     if (error.message === 'Community not found') {
//         throw error;
//     }
//     throw new Error('Database error fetching community details');
//   }
// };

// const requestToJoinCommunity = async (user_id, community_id) => {
//   try {
//     const existing = await pool.query(
//       `SELECT status FROM community_memberships WHERE user_id = $1 AND community_id = $2`,
//       [user_id, community_id]
//     );

//     if (existing.rows.length > 0) {
//       if(existing.rows[0].status === 'approved'){
//         throw new Error('Already a member of this community.');
//       } else if (existing.rows[0].status === 'requested') {
//         throw new Error('Already requested to join this community.');
//       }
//     }

//     const result = await pool.query(
//       `INSERT INTO community_memberships (user_id, community_id, status, requested_at)
//        VALUES ($1, $2, 'requested', NOW()) RETURNING *`,
//       [user_id, community_id]
//     );
//     return result.rows[0];
//   } catch (error) {
//     console.error('Error requesting to join community:', error.message);
//     if (error.message.startsWith('Already')) throw error;
//     throw new Error('Database error requesting to join community');
//   }
// };

// const getJoinRequests = async (communityId, creatorId) => {
//   try {
//     const checkCreator = await pool.query(
//       `SELECT 1 FROM communities WHERE id = $1 AND created_by = $2`,
//       [communityId, creatorId]
//     );

//     if (checkCreator.rows.length === 0) {
//       throw new Error('Not authorized to view join requests for this community.');
//     }

//     const result = await pool.query(
//       `SELECT cm.user_id, cm.community_id, cm.status, cm.requested_at, u.name, u.email
//        FROM community_memberships cm
//        JOIN users u ON u.id = cm.user_id
//        WHERE cm.community_id = $1 AND cm.status = 'requested'
//        ORDER BY cm.requested_at ASC`,
//       [communityId]
//     );
//     return result.rows;
//   } catch (error) {
//     console.error('Error fetching join requests:', error.message);
//     if (error.message.startsWith('Not authorized')) throw error;
//     throw new Error('Database error fetching join requests');
//   }
// };

// const approveMembership = async (community_id, newUserId, approverId) => {
//     const client = await pool.connect();
//     try {
//       await client.query('BEGIN');

//       const communityCheck = await client.query(
//         `SELECT created_by FROM communities WHERE id = $1`,
//         [community_id]
//       );
//       if (communityCheck.rows.length === 0) {
//         throw new Error('Community not found.');
//       }
//       if (communityCheck.rows[0].created_by !== approverId) {
//         throw new Error('User not authorized to approve memberships for this community.');
//       }

//       const membershipUpdate = await client.query(
//         `UPDATE community_memberships
//          SET status = 'approved', approved_at = NOW()
//          WHERE user_id = $1 AND community_id = $2 AND status = 'requested'
//          RETURNING *`,
//         [newUserId, community_id]
//       );

//       if (membershipUpdate.rowCount === 0) {
//           throw new Error('No pending request found for this user or already approved.');
//       }

//       const otherUsers = await client.query(
//         `SELECT user_id FROM community_memberships
//          WHERE community_id = $1 AND status = 'approved' AND user_id != $2`,
//         [community_id, newUserId]
//       );

//       for (const row of otherUsers.rows) {
//         const existingUserId = row.user_id;
//         const connectionExists = await client.query(
//           `SELECT 1 FROM user_connections
//            WHERE (user_id = $1 AND connected_user_id = $2)
//               OR (user_id = $2 AND connected_user_id = $1)`,
//           [newUserId, existingUserId]
//         );

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
//       return membershipUpdate.rows[0];
//     } catch (error) {
//       await client.query('ROLLBACK');
//       console.error('Error approving community membership:', error.message);
//       if (error.message.includes('Not authorized') || error.message.includes('No pending request') || error.message.includes('Community not found')) {
//           throw error;
//       }
//       throw new Error('Database error approving membership');
//     } finally {
//       client.release();
//     }
//   };

// module.exports = {
//   createCommunity,
//   getAllCommunities,
//   getUserCommunities,
//   getCommunityDetails,
//   requestToJoinCommunity,
//   getJoinRequests,
//   approveMembership
// };
