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
      'SELECT name, email FROM users WHERE email = $1',
      [email]
    );
    // console.log('Full query result:', result);
    // console.log('Query rows:', result.rows);
    // console.log('First row:', result.rows[0]);

    const exists = result.rows.length > 0;
    const user = result.rows[0];
    
    if (exists) {
      const token = crypto.randomBytes(64).toString('hex');
      res.json({
        exists,
        message: 'Email found',
        token,
        name: result.rows[0].name,
        email: result.rows[0].email
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
