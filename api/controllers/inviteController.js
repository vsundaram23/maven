const pool = require('../config/db.config');
const UserService = require('../services/userService');
const { v4: uuidv4 } = require('uuid');

const generateInviteTokenString = () => {
  return uuidv4().replace(/-/g, '').substring(0, 20).toLowerCase();
};

const generateInviteToken = async (communityId, actingUserClerkId, expires_at, max_uses) => {
  const client = await pool.connect();
  try {
    const internalAdminUserId = await UserService.getOrCreateUser({ id: actingUserClerkId });
    if (!internalAdminUserId) {
        throw new Error(`Admin user not found or created for Clerk ID: ${actingUserClerkId}`);
    }

    const communityRes = await client.query(
      'SELECT created_by FROM communities WHERE id = $1',
      [communityId]
    );

    if (communityRes.rows.length === 0) {
      throw new Error('Community not found.');
    }
    if (communityRes.rows[0].created_by !== internalAdminUserId) {
      throw new Error('User is not authorized to create invites for this community.');
    }

    const tokenString = generateInviteTokenString();

    const result = await client.query(
      `INSERT INTO invite_tokens (token_string, community_id, generated_by_user_id, status, expires_at, max_uses)
       VALUES ($1, $2, $3, 'active', $4, $5)
       RETURNING invite_token_id, token_string, expires_at, max_uses`,
      [tokenString, communityId, internalAdminUserId, expires_at || null, max_uses || null]
    );
    return result.rows[0];
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

const getInviteDetails = async (tokenString) => {
  const client = await pool.connect();
  try {
    const tokenRes = await client.query(
      `SELECT it.invite_token_id, it.community_id, it.status, it.expires_at, it.max_uses, it.current_uses,
              c.name AS community_name, c.description AS community_description,
              u.name AS invited_by_name, u.preferred_name AS invited_by_preferred_name
       FROM invite_tokens it
       JOIN communities c ON it.community_id = c.id
       LEFT JOIN users u ON it.generated_by_user_id = u.id
       WHERE it.token_string = $1`,
      [tokenString]
    );

    if (tokenRes.rows.length === 0) {
      throw new Error('Invite token not found.');
    }

    const token = tokenRes.rows[0];
    const now = new Date();
    const isExpired = token.expires_at && new Date(token.expires_at) < now;
    const isMaxedOut = token.max_uses !== null && token.current_uses >= token.max_uses;

    if (token.status !== 'active' || isExpired || isMaxedOut) {
      throw new Error('Invite token is invalid, expired, or has reached its use limit.');
    }

    return {
      community_id: token.community_id,
      community_name: token.community_name,
      community_description: token.community_description,
      invited_by_name: token.invited_by_preferred_name || token.invited_by_name || 'Community Admin'
    };
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

const registerWithInvite = async (name, email, password, newUserClerkId, inviteTokenString) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tokenRes = await client.query(
      'SELECT invite_token_id, community_id, status, expires_at, max_uses, current_uses FROM invite_tokens WHERE token_string = $1 FOR UPDATE',
      [inviteTokenString]
    );

    if (tokenRes.rows.length === 0) {
      throw new Error('Invalid invite token.');
    }
    const token = tokenRes.rows[0];
    const now = new Date();
    const isExpired = token.expires_at && new Date(token.expires_at) < now;
    const isMaxedOut = token.max_uses !== null && token.current_uses >= token.max_uses;

    if (token.status !== 'active' || isExpired || isMaxedOut) {
      throw new Error('Invite token is no longer valid.');
    }

    const existingUserByEmail = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUserByEmail.rows.length > 0) {
        throw new Error('Email address is already registered.');
    }

    let internalNewUserId;
    if (newUserClerkId) {
        internalNewUserId = await UserService.getOrCreateUser({
            id: newUserClerkId,
            emailAddresses: [{ emailAddress: email }],
            firstName: name ? name.split(' ')[0] : '',
            lastName: name ? name.split(' ').slice(1).join(' ') : '',
        });
        if (!internalNewUserId) {
             throw new Error(`Failed to get or create user for Clerk ID: ${newUserClerkId}`);
        }
    } else {
        // This path requires a local user creation strategy (e.g. hashing password)
        // which depends on how your UserService or direct DB interaction is set up for non-Clerk users.
        // For now, throwing an error to indicate this needs specific implementation.
        // If you always expect a newUserClerkId, this 'else' block might not be needed.
        throw new Error("User registration via invite without a Clerk ID needs a defined local account creation strategy (including password handling).");
    }

    await client.query(
      `INSERT INTO community_memberships (user_id, community_id, status, approved_at, requested_at)
       VALUES ($1, $2, 'approved', NOW(), NOW())`,
      [internalNewUserId, token.community_id]
    );

    const newCurrentUses = token.current_uses + 1;
    let newStatus = token.status; // Should be 'active' at this point
    if (token.max_uses !== null && newCurrentUses >= token.max_uses) {
      newStatus = 'used';
    }
    await client.query(
      `UPDATE invite_tokens SET current_uses = $1, status = $2, last_used_at = NOW()
       WHERE invite_token_id = $3`,
      [newCurrentUses, newStatus, token.invite_token_id]
    );

    await client.query('COMMIT');
    return {
      user_id: internalNewUserId,
      name: name,
      email: email,
      community_id: token.community_id
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const acceptInviteExistingUser = async (tokenString, actingUserClerkId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const internalUserId = await UserService.getOrCreateUser({ id: actingUserClerkId });
     if (!internalUserId) {
        throw new Error(`User not found or created for Clerk ID: ${actingUserClerkId}`);
    }

    const tokenRes = await client.query(
      'SELECT invite_token_id, community_id, status, expires_at, max_uses, current_uses FROM invite_tokens WHERE token_string = $1 FOR UPDATE',
      [tokenString]
    );

    if (tokenRes.rows.length === 0) {
      throw new Error('Invalid invite token.');
    }
    const token = tokenRes.rows[0];
    const now = new Date();
    const isExpired = token.expires_at && new Date(token.expires_at) < now;
    const isMaxedOut = token.max_uses !== null && token.current_uses >= token.max_uses;

    if (token.status !== 'active' || isExpired || isMaxedOut) {
      throw new Error('Invite token is no longer valid.');
    }

    const existingMembership = await client.query(
      'SELECT status FROM community_memberships WHERE user_id = $1 AND community_id = $2',
      [internalUserId, token.community_id]
    );

    if (existingMembership.rows.length > 0 && existingMembership.rows[0].status === 'approved') {
        await client.query('COMMIT');
        return { message: 'You are already a member of this community.', alreadyMember: true, community_id: token.community_id };
    }

    await client.query(
      `INSERT INTO community_memberships (user_id, community_id, status, approved_at, requested_at)
       VALUES ($1, $2, 'approved', NOW(), NOW())
       ON CONFLICT (user_id, community_id) DO UPDATE SET status = 'approved', approved_at = NOW()`,
      [internalUserId, token.community_id]
    );

    const newCurrentUses = token.current_uses + 1;
    let newStatus = token.status; // Should be 'active'
    if (token.max_uses !== null && newCurrentUses >= token.max_uses) {
      newStatus = 'used';
    }
    await client.query(
      `UPDATE invite_tokens SET current_uses = $1, status = $2, last_used_at = NOW()
       WHERE invite_token_id = $3`,
      [newCurrentUses, newStatus, token.invite_token_id]
    );

    await client.query('COMMIT');
    return { message: `Successfully joined community!`, community_id: token.community_id, alreadyMember: false };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  generateInviteToken,
  getInviteDetails,
  registerWithInvite,
  acceptInviteExistingUser,
};