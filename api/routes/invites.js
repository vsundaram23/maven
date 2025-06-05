const express = require('express');
const router = express.Router();
const pool = require('../config/db.config'); // Included for pattern consistency, though not directly used here
const UserService = require('../services/userService'); // Included for pattern consistency, though not directly used here

const {
  generateInviteToken,
  getInviteDetails,
  registerWithInvite,
  acceptInviteExistingUser
} = require('../controllers/inviteController'); // Adjust path as needed

// Note: The resolveClerkIdToInternalId helper from your communities.js
// is effectively handled within the controller functions now by directly using UserService.getOrCreateUser.
// If you have other pre-controller processing needs for Clerk IDs for these routes,
// you could add a similar helper here or as middleware.

router.post('/communities/:communityId/invites', async (req, res) => {
  const { communityId } = req.params;
  console.log("Received communityId for invite generation:", communityId);
  const { actingUserClerkId, expires_at, max_uses, emailAddresses, firstName, lastName, phoneNumbers } = req.body;

  if (!actingUserClerkId) {
    return res.status(401).json({ success: false, error: 'User authentication required (actingUserClerkId missing).' });
  }
  if (!communityId) {
    return res.status(400).json({ success: false, error: 'Community ID is required.' });
  }

  try {
    const tokenInfo = await generateInviteToken(communityId, actingUserClerkId, expires_at, max_uses, emailAddresses, firstName, lastName, phoneNumbers);
    const invite_url = `https://triedandtrusted.ai/invite/${tokenInfo.token_string}`;
    res.status(201).json({ success: true, invite_url: invite_url, token_string: tokenInfo.token_string, expires_at: tokenInfo.expires_at, max_uses: tokenInfo.max_uses });
  } catch (error) {
    if (error.message.includes('Not authorized')) {
        return res.status(403).json({ success: false, error: error.message });
    }
    if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, error: error.message });
    }
    console.error("Error in POST /communities/:communityId/invites route:", error);
    res.status(500).json({ success: false, error: error.message || 'Server error generating invite token.' });
  }
});

router.get('/invites/:tokenString', async (req, res) => {
  const { tokenString } = req.params;
  if (!tokenString) {
    return res.status(400).json({ success: false, error: 'Token string is required.' });
  }
  try {
    const details = await getInviteDetails(tokenString);
    res.status(200).json({ success: true, details });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('invalid') || error.message.includes('expired') || error.message.includes('limit')) {
        return res.status(404).json({ success: false, error: error.message });
    }
    console.error("Error in GET /invites/:tokenString route:", error);
    res.status(500).json({ success: false, error: error.message || 'Server error fetching invite details.' });
  }
});

router.post('/auth/register-with-invite', async (req, res) => {
  const { name, email, password, clerk_id: newUserClerkId, invite_token_string } = req.body;
  if (!name || !email || !password || !invite_token_string) {
    return res.status(400).json({ success: false, error: 'Missing required fields: name, email, password, and invite_token_string.' });
  }
  try {
    const result = await registerWithInvite(name, email, password, newUserClerkId, invite_token_string);
    // Session/JWT creation would typically happen here in a real app by your auth system
    res.status(201).json({ success: true, data: result, message: `Registration successful for ${email}.` });
  } catch (error) {
    if (error.message.includes('Invalid invite token') || error.message.includes('no longer valid')) {
        return res.status(400).json({ success: false, error: error.message });
    }
    if (error.message.includes('already registered')) {
        return res.status(409).json({ success: false, error: error.message });
    }
    if (error.message.includes('needs a defined local account creation strategy')) {
        return res.status(400).json({ success: false, error: error.message });
    }
    console.error("Error in POST /auth/register-with-invite route:", error);
    res.status(500).json({ success: false, error: error.message || 'Server error during registration with invite.' });
  }
});

router.post('/invites/:tokenString/accept', async (req, res) => {
  const { tokenString } = req.params;
  const { actingUserClerkId } = req.body;

  if (!actingUserClerkId) {
    return res.status(401).json({ success: false, error: 'User authentication required (actingUserClerkId missing).' });
  }
  if (!tokenString) {
    return res.status(400).json({ success: false, error: 'Token string is required.' });
  }

  try {
    const result = await acceptInviteExistingUser(tokenString, actingUserClerkId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error.message.includes('Invalid invite token') || error.message.includes('no longer valid')) {
        return res.status(400).json({ success: false, error: error.message });
    }
    if (error.message.includes('User not found')) {
         return res.status(404).json({ success: false, error: error.message });
    }
    console.error("Error in POST /invites/:tokenString/accept route:", error);
    res.status(500).json({ success: false, error: error.message || 'Server error accepting invite.' });
  }
});

module.exports = router;