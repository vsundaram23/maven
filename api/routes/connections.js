const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/connectionsController');
const pool = require('../config/db.config');

// Get accepted connections for a user by email
router.post('/check-connections', async (req, res) => {
  const { email, user_id } = req.body;
  try {
    let connections;
    if (user_id) {
      connections = await getConnectionsByUserId(user_id);
    } else if (email) {
      connections = await getConnectionsByEmail(email);
    } else {
      return res.status(400).json({ error: 'Request body must contain either a user_id or an email.' });
    }
    res.json(connections);

  } catch (error) {
    console.error("Failed to fetch connections:", error); 
    res.status(500).json({ error: 'Server error fetching connections' });
  }
});

// Send or accept a friend request
router.post('/send', async (req, res) => {
  const { fromUserId, toUserId } = req.body;

  if (!fromUserId || !toUserId) {
    return res.status(400).json({ error: 'Both user IDs are required' });
  }

  try {
    const result = await sendConnectionRequest(fromUserId, toUserId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Server error sending connection request' });
  }
});

// Fetch users and their connection status
router.post('/trust-circle/users', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Missing email' });
  }

  try {
    // Look up userId from email
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = result.rows[0].id;
    const users = await getTrustCircleUsers(userId);
    res.json(users);
  } catch (error) {
    console.error('Error in /trust-circle/users route:', error.message);
    res.status(500).json({ error: 'Failed to fetch trust circle users' });
  }
});


router.post('/status', async (req, res) => {
  const { fromUserId, toUserId } = req.body;      // Get from request body

  if (!toUserId) {
    return res.status(400).json({ error: 'The target user ID (toUserId) is required' });
  }

  try {
    const status = await getConnectionStatus(fromUserId, toUserId);
    res.json(status);
  } catch (error) {
    console.error('Error in /status route:', error);
    res.status(500).json({ error: 'Server error checking connection status' });
  }
});

router.delete('/remove', async (req, res) => {
  const { fromUserId, toUserId } = req.body;

  if (!fromUserId || !toUserId) {
    return res.status(400).json({ error: 'Both user IDs are required' });
  }

  try {
    const result = await removeConnection(fromUserId, toUserId);
    res.json(result);
  } catch (error) {
    console.error('Error removing connection:', error);
    res.status(500).json({ error: 'Server error removing connection' });
  }
});

router.get('/top-recommenders', async (req, res) => {
  const { state, userId } = req.query; // userId is clerk_id

  if (!state || !userId) {
    return res.status(400).json({ error: 'State and userId query parameters are required.' });
  }

  try {
    const recommenders = await getTopRecommendersByState(userId, state);
    res.json(recommenders);
  } catch (error) {
    console.error('Failed to fetch top recommenders:', error);
    res.status(500).json({ error: 'Server error fetching top recommenders' });
  }
});

router.get('/followers', async (req, res) => {
  const { user_id } = req.query; // This is clerk_id from frontend
  if (!user_id) {
    return res.status(400).json({ error: 'user_id query parameter is required.' });
  }

  try {
    const followersList = await getFollowers(user_id);
    res.json(followersList);
  } catch (error) {
    console.error('Failed to fetch followers list:', error);
    res.status(500).json({ error: 'Server error fetching followers list' });
  }
});

router.get('/following', async (req, res) => {
  const { user_id } = req.query; // This is clerk_id from frontend
  if (!user_id) {
    return res.status(400).json({ error: 'user_id query parameter is required.' });
  }

  try {
    const followingList = await getFollowing(user_id);
    res.json(followingList);
  } catch (error) {
    console.error('Failed to fetch following list:', error);
    res.status(500).json({ error: 'Server error fetching following list' });
  }
});

router.get('/search-users', async (req, res) => {
    const { userId, term } = req.query; // userId is clerk_id
    if (!userId || !term) {
        return res.status(400).json({ error: 'userId and term query parameters are required.' });
    }

    try {
        const users = await searchUsers(userId, term);
        res.json(users);
    } catch (error) {
        console.error('Failed to search users:', error);
        res.status(500).json({ error: 'Server error searching users' });
    }
});

module.exports = router;



// // routes/connections.js
// const express = require('express');
// const router = express.Router();
// const pool = require('../config/db.config');
// const { getConnectionsByEmail } = require('../controllers/connectionsController');

// router.post('/check-connections', async (req, res) => {
//   const { email } = req.body;
  
//   try {
//     const connections = await getConnectionsByEmail(email);
//     res.json(connections);
//   } catch (error) {
//     res.status(500).json({ error: 'Server error fetching connections' });
//   }
// });

// module.exports = router;
