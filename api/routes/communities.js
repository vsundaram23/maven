const express = require('express');
const router = express.Router();
const pool = require('../config/db.config');

const {
  createCommunity,
  getAllCommunities,
  requestToJoinCommunity,
  getJoinRequests,
  approveMembership
} = require('../controllers/communityController');

// Create a new community
router.post('/create', async (req, res) => {
  const { name, description, created_by } = req.body;

  if (!name || !created_by) {
    return res.status(400).json({ error: 'Name and creator ID are required' });
  }

  try {
    const community = await createCommunity(name, description, created_by);
    res.json(community);
  } catch (error) {
    console.error('Error creating community:', error.message);
    res.status(500).json({ error: 'Server error creating community' });
  }
});

// Get all communities
router.get('/all', async (_req, res) => {
  try {
    const communities = await getAllCommunities();
    res.json(communities);
  } catch (error) {
    console.error('Error fetching communities:', error.message);
    res.status(500).json({ error: 'Server error fetching communities' });
  }
});

// Request to join a community
router.post('/request', async (req, res) => {
  const { user_id, community_id } = req.body;

  if (!user_id || !community_id) {
    return res.status(400).json({ error: 'User ID and community ID are required' });
  }

  try {
    const request = await requestToJoinCommunity(user_id, community_id);
    res.json(request);
  } catch (error) {
    console.error('Error requesting to join community:', error.message);
    res.status(500).json({ error: 'Server error requesting to join' });
  }
});



// Get join requests for a specific community (creator only)
router.get('/:communityId/requests', async (req, res) => {
  const { communityId } = req.params;
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'Missing creator user ID' });
  }

  try {
    const requests = await getJoinRequests(communityId, user_id);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching join requests:', error.message);
    res.status(500).json({ error: 'Server error fetching join requests' });
  }
});

// Approve a user's membership in a community
router.post('/approve', async (req, res) => {
  const { community_id, user_id } = req.body;

  if (!community_id || !user_id) {
    return res.status(400).json({ error: 'Both community ID and user ID are required' });
  }

  try {
    await approveMembership(community_id, user_id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error approving membership:', error.message);
    res.status(500).json({ error: 'Server error approving membership' });
  }
});

// get the user id by using the email
router.get('/user/email/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user by email:', error.message);
    res.status(500).json({ error: 'Server error fetching user by email' });
  }
});

router.get('/user/:email/communities', async (req, res) => {
    const { email } = req.params;
  
    try {
      const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  
      if (userRes.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      const userId = userRes.rows[0].id;
  
      const result = await pool.query(`
        SELECT c.*
        FROM community_memberships cm
        JOIN communities c ON cm.community_id = c.id
        WHERE cm.user_id = $1 AND cm.status = 'approved'
      `, [userId]);
  
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching user communities:', err.message);
      res.status(500).json({ error: 'Server error fetching user communities' });
    }
  });
  

module.exports = router;
