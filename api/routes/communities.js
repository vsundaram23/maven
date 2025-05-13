const express = require('express');
const router = express.Router();
const pool = require('../config/db.config');

const {
  createCommunity,
  getAllCommunities, // Make sure this is imported
  getUserCommunities, // Make sure this is imported
  getCommunityDetails, // Make sure this is imported
  requestToJoinCommunity,
  getJoinRequests,
  approveMembership
} = require('../controllers/communityController');

router.post('/create', async (req, res) => {
  const { name, description, created_by } = req.body;
  if (!name || !created_by) {
    return res.status(400).json({ error: 'Name and creator ID are required' });
  }
  try {
    const community = await createCommunity(name, description, created_by);
    res.status(201).json(community);
  } catch (error) {
    console.error('Route error creating community:', error.message);
    res.status(500).json({ error: 'Server error creating community' });
  }
});

router.get('/all', async (req, res) => { // Changed _req to req
  const { user_id } = req.query; // Extract user_id from query parameters
  try {
    // Pass user_id to getAllCommunities. It can be undefined if not provided.
    const communities = await getAllCommunities(user_id ? String(user_id) : null);
    res.json(communities);
  } catch (error) {
    console.error('Route error fetching all communities:', error.message);
    res.status(500).json({ error: 'Server error fetching communities' });
  }
});

router.post('/request', async (req, res) => {
  const { user_id, community_id } = req.body;
  if (!user_id || !community_id) {
    return res.status(400).json({ error: 'User ID and community ID are required' });
  }
  try {
    const request = await requestToJoinCommunity(user_id, community_id);
    res.status(201).json(request);
  } catch (error) {
    console.error('Route error requesting to join community:', error.message);
    if (error.message.startsWith('Already')) {
        return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error requesting to join' });
  }
});

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
    console.error('Route error fetching join requests:', error.message);
    if (error.message.startsWith('Not authorized')) {
        return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error fetching join requests' });
  }
});

router.post('/approve', async (req, res) => {
  const { community_id, user_id, approver_id } = req.body; // Ensure approver_id is passed from frontend
  if (!community_id || !user_id || !approver_id) {
    return res.status(400).json({ error: 'Community ID, target user ID, and approver ID are required' });
  }
  try {
    const approvedMembership = await approveMembership(community_id, user_id, approver_id);
    res.json({ success: true, membership: approvedMembership });
  } catch (error) {
    console.error('Route error approving membership:', error.message);
     if (error.message.includes('Not authorized')) {
        return res.status(403).json({ error: error.message });
    }
    if (error.message.includes('No pending request') || error.message.includes('Community not found')) {
        return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error approving membership' });
  }
});

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
      const communities = await getUserCommunities(userId);
      res.json(communities);
    } catch (err) {
      console.error('Route error fetching user communities:', err.message);
      res.status(500).json({ error: err.message || 'Server error fetching user communities' });
    }
});

// Ensure getCommunityDetails and other necessary functions from controller are imported if you add routes for them
router.get('/:communityId/details', async (req, res) => {
  const { communityId } = req.params;
  const { user_id } = req.query;
  try {
    const details = await getCommunityDetails(communityId, user_id ? String(user_id) : null);
    res.json(details);
  } catch (error) {
    console.error('Route error fetching community details:', error.message);
    if (error.message === 'Community not found') {
        return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error fetching community details' });
  }
});


module.exports = router;

// const express = require('express');
// const router = express.Router();
// const pool = require('../config/db.config');

// const {
//   createCommunity,
//   getAllCommunities,
//   requestToJoinCommunity,
//   getJoinRequests,
//   approveMembership
// } = require('../controllers/communityController');

// // Create a new community
// router.post('/create', async (req, res) => {
//   const { name, description, created_by } = req.body;

//   if (!name || !created_by) {
//     return res.status(400).json({ error: 'Name and creator ID are required' });
//   }

//   try {
//     const community = await createCommunity(name, description, created_by);
//     res.json(community);
//   } catch (error) {
//     console.error('Error creating community:', error.message);
//     res.status(500).json({ error: 'Server error creating community' });
//   }
// });

// // Get all communities
// router.get('/all', async (_req, res) => {
//   try {
//     const communities = await getAllCommunities();
//     res.json(communities);
//   } catch (error) {
//     console.error('Error fetching communities:', error.message);
//     res.status(500).json({ error: 'Server error fetching communities' });
//   }
// });

// // Request to join a community
// router.post('/request', async (req, res) => {
//   const { user_id, community_id } = req.body;

//   if (!user_id || !community_id) {
//     return res.status(400).json({ error: 'User ID and community ID are required' });
//   }

//   try {
//     const request = await requestToJoinCommunity(user_id, community_id);
//     res.json(request);
//   } catch (error) {
//     console.error('Error requesting to join community:', error.message);
//     res.status(500).json({ error: 'Server error requesting to join' });
//   }
// });



// // Get join requests for a specific community (creator only)
// router.get('/:communityId/requests', async (req, res) => {
//   const { communityId } = req.params;
//   const { user_id } = req.query;

//   if (!user_id) {
//     return res.status(400).json({ error: 'Missing creator user ID' });
//   }

//   try {
//     const requests = await getJoinRequests(communityId, user_id);
//     res.json(requests);
//   } catch (error) {
//     console.error('Error fetching join requests:', error.message);
//     res.status(500).json({ error: 'Server error fetching join requests' });
//   }
// });

// // Approve a user's membership in a community
// router.post('/approve', async (req, res) => {
//   const { community_id, user_id } = req.body;

//   if (!community_id || !user_id) {
//     return res.status(400).json({ error: 'Both community ID and user ID are required' });
//   }

//   try {
//     await approveMembership(community_id, user_id);
//     res.json({ success: true });
//   } catch (error) {
//     console.error('Error approving membership:', error.message);
//     res.status(500).json({ error: 'Server error approving membership' });
//   }
// });

// // get the user id by using the email
// router.get('/user/email/:email', async (req, res) => {
//   const { email } = req.params;

//   try {
//     const result = await pool.query(
//       'SELECT id, name, email FROM users WHERE email = $1',
//       [email]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     res.json(result.rows[0]);
//   } catch (error) {
//     console.error('Error fetching user by email:', error.message);
//     res.status(500).json({ error: 'Server error fetching user by email' });
//   }
// });

// router.get('/user/:email/communities', async (req, res) => {
//     const { email } = req.params;
  
//     try {
//       const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  
//       if (userRes.rows.length === 0) {
//         return res.status(404).json({ error: 'User not found' });
//       }
  
//       const userId = userRes.rows[0].id;
  
//       const result = await pool.query(`
//         SELECT c.*
//         FROM community_memberships cm
//         JOIN communities c ON cm.community_id = c.id
//         WHERE cm.user_id = $1 AND cm.status = 'approved'
//       `, [userId]);
  
//       res.json(result.rows);
//     } catch (err) {
//       console.error('Error fetching user communities:', err.message);
//       res.status(500).json({ error: 'Server error fetching user communities' });
//     }
//   });
  

// module.exports = router;
