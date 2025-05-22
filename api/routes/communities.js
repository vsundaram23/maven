const express = require('express');
const router = express.Router();
const pool = require('../config/db.config');

const {
  createCommunity,
  getAllCommunities,
  getUserCommunities,
  getCommunityDetails,
  requestToJoinCommunity,
  getJoinRequests,
  approveMembership,
  getCommunityMembers,
  getCommunityRecommendations
} = require('../controllers/communityController');

router.post('/create', async (req, res) => {
  const { name, description, created_by_clerk_id } = req.body;
  if (!name || !created_by_clerk_id) {
    return res.status(400).json({ error: 'Name and creator Clerk ID are required' });
  }
  try {
    const community = await createCommunity(name, description, created_by_clerk_id);
    res.status(201).json(community);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Server error creating community' });
  }
});

router.get('/all', async (req, res) => {
  const { user_id: internalUserIdFromQuery } = req.query; 
  try {
    const communities = await getAllCommunities(internalUserIdFromQuery || null);
    res.json(communities);
  } catch (error) {
    console.error('Route error fetching all communities:', error.message, error.stack);
    res.status(500).json({ error: error.message || 'Server error fetching communities' });
  }
});

router.post('/request', async (req, res) => {
  const { user_id: clerkUserId, community_id } = req.body;
  if (!clerkUserId || !community_id) {
    return res.status(400).json({ error: 'Clerk User ID and community ID are required' });
  }
  try {
    const request = await requestToJoinCommunity(clerkUserId, community_id);
    res.status(201).json(request);
  } catch (error) {
    if (error.message.startsWith('Already') || error.message === 'User not found.') {
        return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Server error requesting to join' });
  }
});

router.get('/:communityId/requests', async (req, res) => {
  const { communityId } = req.params;
  const { user_id: clerkCreatorId } = req.query;
  if (!clerkCreatorId) {
    return res.status(400).json({ error: 'Missing creator Clerk ID' });
  }
  try {
    const requests = await getJoinRequests(communityId, clerkCreatorId);
    res.json(requests);
  } catch (error) {
    if (error.message.startsWith('Not authorized') || error.message === 'Creator user not found.') {
        return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Server error fetching join requests' });
  }
});

router.post('/approve', async (req, res) => {
  const { community_id, user_id: clerkNewUserId, approver_id: clerkApproverId } = req.body;
  if (!community_id || !clerkNewUserId || !clerkApproverId) {
    return res.status(400).json({ error: 'Community ID, target Clerk User ID, and approver Clerk ID are required' });
  }
  try {
    const approvedMembership = await approveMembership(community_id, clerkNewUserId, clerkApproverId);
    res.json({ success: true, membership: approvedMembership });
  } catch (error) {
     if (error.message.includes('Not authorized') || error.message.includes('No pending request') || error.message.includes('not found')) {
        return res.status(error.message.includes('Not authorized') ? 403: 404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Server error approving membership' });
  }
});

router.get('/user/email/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const result = await pool.query('SELECT id, clerk_id, name, email FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching user by email' });
  }
});

router.get('/user/:email/communities', async (req, res) => {
  const { email } = req.params;
  try {
    const userResult = await pool.query('SELECT clerk_id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found for the given email to fetch communities.' });
    }
    const clerkUserId = userResult.rows[0].clerk_id;
    if (!clerkUserId) {
      return res.status(404).json({ error: 'Clerk ID not associated with this user email.' });
    }
    const communities = await getUserCommunities(clerkUserId);
    res.json(communities);
  } catch (err) {
    console.error('Route error fetching user communities for email:', email, err.message, err.stack);
    res.status(500).json({ error: err.message || 'Server error fetching user communities' });
  }
});

router.get('/:communityId/details', async (req, res) => {
  const { communityId } = req.params;
  const { user_id: clerkUserId } = req.query; 
  try {
    const details = await getCommunityDetails(communityId, clerkUserId || null);
    res.json(details);
  } catch (error) {
    if (error.message === 'Community not found') {
        return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Server error fetching community details' });
  }
});

router.get('/:communityId/members', async (req, res) => {
    const { communityId } = req.params;
    try {
        const members = await getCommunityMembers(communityId);
        res.json({ success: true, members: members });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Server error fetching community members' });
    }
});

router.get('/:communityId/recommendations', async (req, res) => {
  const { communityId } = req.params;
  const { user_id: clerkUserId } = req.query; // clerkUserId might be null if user not logged in
  try {
      const recommendations = await getCommunityRecommendations(communityId, clerkUserId || null);
      res.json({ success: true, recommendations: recommendations });
  } catch (error) {
      console.error('Error in GET /:communityId/recommendations route:', error.message);
      res.status(500).json({ success: false, message: error.message || 'Server error fetching community recommendations' });
  }
});

module.exports = router;

// const express = require('express');
// const router = express.Router();
// const pool = require('../config/db.config');

// const {
//   createCommunity,
//   getAllCommunities,
//   getUserCommunities,
//   getCommunityDetails,
//   requestToJoinCommunity,
//   getJoinRequests,
//   approveMembership,
//   getCommunityMembers,
//   getCommunityRecommendations
// } = require('../controllers/communityController');

// router.post('/create', async (req, res) => {
//   const { name, description, created_by_clerk_id } = req.body;
//   if (!name || !created_by_clerk_id) {
//     return res.status(400).json({ error: 'Name and creator Clerk ID are required' });
//   }
//   try {
//     const community = await createCommunity(name, description, created_by_clerk_id);
//     res.status(201).json(community);
//   } catch (error) {
//     res.status(500).json({ error: error.message || 'Server error creating community' });
//   }
// });

// router.get('/all', async (req, res) => {
//   const { user_id: internalUserIdFromQuery } = req.query; 
//   try {
//     const communities = await getAllCommunities(internalUserIdFromQuery || null);
//     res.json(communities);
//   } catch (error) {
//     console.error('Route error fetching all communities:', error.message, error.stack);
//     res.status(500).json({ error: error.message || 'Server error fetching communities' });
//   }
// });

// router.post('/request', async (req, res) => {
//   const { user_id: clerkUserId, community_id } = req.body;
//   if (!clerkUserId || !community_id) {
//     return res.status(400).json({ error: 'Clerk User ID and community ID are required' });
//   }
//   try {
//     const request = await requestToJoinCommunity(clerkUserId, community_id);
//     res.status(201).json(request);
//   } catch (error) {
//     if (error.message.startsWith('Already') || error.message === 'User not found.') {
//         return res.status(409).json({ error: error.message });
//     }
//     res.status(500).json({ error: error.message || 'Server error requesting to join' });
//   }
// });

// router.get('/:communityId/requests', async (req, res) => {
//   const { communityId } = req.params;
//   const { user_id: clerkCreatorId } = req.query;
//   if (!clerkCreatorId) {
//     return res.status(400).json({ error: 'Missing creator Clerk ID' });
//   }
//   try {
//     const requests = await getJoinRequests(communityId, clerkCreatorId);
//     res.json(requests);
//   } catch (error) {
//     if (error.message.startsWith('Not authorized') || error.message === 'Creator user not found.') {
//         return res.status(403).json({ error: error.message });
//     }
//     res.status(500).json({ error: error.message || 'Server error fetching join requests' });
//   }
// });

// router.post('/approve', async (req, res) => {
//   const { community_id, user_id: clerkNewUserId, approver_id: clerkApproverId } = req.body;
//   if (!community_id || !clerkNewUserId || !clerkApproverId) {
//     return res.status(400).json({ error: 'Community ID, target Clerk User ID, and approver Clerk ID are required' });
//   }
//   try {
//     const approvedMembership = await approveMembership(community_id, clerkNewUserId, clerkApproverId);
//     res.json({ success: true, membership: approvedMembership });
//   } catch (error) {
//      if (error.message.includes('Not authorized') || error.message.includes('No pending request') || error.message.includes('not found')) {
//         return res.status(error.message.includes('Not authorized') ? 403: 404).json({ error: error.message });
//     }
//     res.status(500).json({ error: error.message || 'Server error approving membership' });
//   }
// });

// router.get('/user/email/:email', async (req, res) => {
//   const { email } = req.params;
//   try {
//     const result = await pool.query('SELECT id, clerk_id, name, email FROM users WHERE email = $1', [email]);
//     if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
//     res.json(result.rows[0]);
//   } catch (error) {
//     res.status(500).json({ error: 'Server error fetching user by email' });
//   }
// });

// router.get('/user/:email/communities', async (req, res) => {
//   const { email } = req.params;
//   try {
//     const userResult = await pool.query('SELECT clerk_id FROM users WHERE email = $1', [email]);
//     if (userResult.rows.length === 0) {
//       return res.status(404).json({ error: 'User not found for the given email to fetch communities.' });
//     }
//     const clerkUserId = userResult.rows[0].clerk_id;
//     if (!clerkUserId) {
//       return res.status(404).json({ error: 'Clerk ID not associated with this user email.' });
//     }
//     const communities = await getUserCommunities(clerkUserId);
//     res.json(communities);
//   } catch (err) {
//     console.error('Route error fetching user communities for email:', email, err.message, err.stack);
//     res.status(500).json({ error: err.message || 'Server error fetching user communities' });
//   }
// });

// router.get('/:communityId/details', async (req, res) => {
//   const { communityId } = req.params;
//   const { user_id: clerkUserId } = req.query; 
//   try {
//     const details = await getCommunityDetails(communityId, clerkUserId || null);
//     res.json(details);
//   } catch (error) {
//     if (error.message === 'Community not found') {
//         return res.status(404).json({ error: error.message });
//     }
//     res.status(500).json({ error: error.message || 'Server error fetching community details' });
//   }
// });

// router.get('/:communityId/members', async (req, res) => {
//     const { communityId } = req.params;
//     try {
//         const members = await getCommunityMembers(communityId);
//         res.json({ success: true, members: members });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message || 'Server error fetching community members' });
//     }
// });

// router.get('/:communityId/recommendations', async (req, res) => {
//     const { communityId } = req.params;
//     const { user_id: clerkUserId } = req.query;
//     try {
//         const recommendations = await getCommunityRecommendations(communityId, clerkUserId || null);
//         res.json({ success: true, recommendations: recommendations });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message || 'Server error fetching community recommendations' });
//     }
// });

// module.exports = router;

// 5/21 working version
// const express = require('express');
// const router = express.Router();
// const pool = require('../config/db.config');

// const {
//   createCommunity,
//   getAllCommunities, // Make sure this is imported
//   getUserCommunities, // Make sure this is imported
//   getCommunityDetails, // Make sure this is imported
//   requestToJoinCommunity,
//   getJoinRequests,
//   approveMembership
// } = require('../controllers/communityController');

// router.post('/create', async (req, res) => {
//   const { name, description, created_by } = req.body;
//   if (!name || !created_by) {
//     return res.status(400).json({ error: 'Name and creator ID are required' });
//   }
//   try {
//     const community = await createCommunity(name, description, created_by);
//     res.status(201).json(community);
//   } catch (error) {
//     console.error('Route error creating community:', error.message);
//     res.status(500).json({ error: 'Server error creating community' });
//   }
// });

// router.get('/all', async (req, res) => { // Changed _req to req
//   const { user_id } = req.query; // Extract user_id from query parameters
//   try {
//     // Pass user_id to getAllCommunities. It can be undefined if not provided.
//     const communities = await getAllCommunities(user_id ? String(user_id) : null);
//     res.json(communities);
//   } catch (error) {
//     console.error('Route error fetching all communities:', error.message);
//     res.status(500).json({ error: 'Server error fetching communities' });
//   }
// });

// router.post('/request', async (req, res) => {
//   const { user_id, community_id } = req.body;
//   if (!user_id || !community_id) {
//     return res.status(400).json({ error: 'User ID and community ID are required' });
//   }
//   try {
//     const request = await requestToJoinCommunity(user_id, community_id);
//     res.status(201).json(request);
//   } catch (error) {
//     console.error('Route error requesting to join community:', error.message);
//     if (error.message.startsWith('Already')) {
//         return res.status(409).json({ error: error.message });
//     }
//     res.status(500).json({ error: 'Server error requesting to join' });
//   }
// });

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
//     console.error('Route error fetching join requests:', error.message);
//     if (error.message.startsWith('Not authorized')) {
//         return res.status(403).json({ error: error.message });
//     }
//     res.status(500).json({ error: 'Server error fetching join requests' });
//   }
// });

// router.post('/approve', async (req, res) => {
//   const { community_id, user_id, approver_id } = req.body; // Ensure approver_id is passed from frontend
//   if (!community_id || !user_id || !approver_id) {
//     return res.status(400).json({ error: 'Community ID, target user ID, and approver ID are required' });
//   }
//   try {
//     const approvedMembership = await approveMembership(community_id, user_id, approver_id);
//     res.json({ success: true, membership: approvedMembership });
//   } catch (error) {
//     console.error('Route error approving membership:', error.message);
//      if (error.message.includes('Not authorized')) {
//         return res.status(403).json({ error: error.message });
//     }
//     if (error.message.includes('No pending request') || error.message.includes('Community not found')) {
//         return res.status(404).json({ error: error.message });
//     }
//     res.status(500).json({ error: 'Server error approving membership' });
//   }
// });

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
//       const communities = await getUserCommunities(userId);
//       res.json(communities);
//     } catch (err) {
//       console.error('Route error fetching user communities:', err.message);
//       res.status(500).json({ error: err.message || 'Server error fetching user communities' });
//     }
// });

// router.get('/:communityId/details', async (req, res) => {
//   const { communityId } = req.params;
//   const { user_id } = req.query; // user_id is optional for knowing current user status
//   try {
//     // This line calls the function from your controller
//     const details = await getCommunityDetails(communityId, user_id ? String(user_id) : null);
//     res.json(details);
//   } catch (error) {
//     console.error('Route error fetching community details:', error.message);
//     if (error.message === 'Community not found') {
//         return res.status(404).json({ error: error.message });
//     }
//     res.status(500).json({ error: 'Server error fetching community details' });
//   }
// });


// module.exports = router;
