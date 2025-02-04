const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../config/db.config');
const { checkEmail, getUserByEmail } = require('../controllers/authController');

// Existing email check route
router.post('/check-email', async (req, res) => {
  const { email } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT name, email, community FROM users WHERE email = $1',
      [email]
    );

    const exists = result.rows.length > 0;
    const user = result.rows[0];
    
    if (exists) {
      const token = crypto.randomBytes(64).toString('hex');
      res.json({
        exists,
        message: 'Email found',
        token,
        name: user.name,
        email: user.email,
        community: user.community
      });
    } else {
      res.json({ 
        exists,
        message: 'Email not found'
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error checking email' });
  }
});

router.post('/signup', async (req, res) => {
  const { name, email, community } = req.body;
  
  try {
    const emailCheck = await pool.query(
      'SELECT email FROM users WHERE email = $1',
      [email]
    );
    
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }
    
    const result = await pool.query(
      'INSERT INTO users (name, email, profile_image, community) VALUES ($1, $2, $3, $4) RETURNING id, name, email, community, created_at',
      [name, email, null, community]
    );
    
    const token = crypto.randomBytes(64).toString('hex');
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      token,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during signup' 
    });
  }
});

router.post('/available-communities', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description FROM available_communities ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Database error details:', error);  // Add this line
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching communities',
      error: error.message  // Add this line for debugging
    });
  }
});


// Existing session creation route
router.post('/create-session', (req, res) => {
  const { email } = req.body;
  const token = crypto.randomBytes(64).toString('hex');
  res.json({ token });
});

// New route to get user data by email
router.get('/users/email/:email', async (req, res) => {
  try {
    const result = await getUserByEmail(req, res);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user data' });
  }
});

module.exports = router;

// const express = require('express');
// const router = express.Router();
// const { checkEmail } = require('../controllers/authController');

// router.post('/check-email', async (req, res) => {
//   const { email } = req.body;
  
//   try {
//     const { exists, user } = await checkEmail(email);
//     res.json({ 
//       exists,
//       message: exists ? 'Email found' : 'Email not found'
//     });
//   } catch (error) {
//     res.status(500).json({ error: 'Server error checking email' });
//   }
// });

// module.exports = router;
