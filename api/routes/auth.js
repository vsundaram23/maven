const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../config/db.config');
const { checkEmail, getUserByEmail } = require('../controllers/authController');

// Existing email check route

router.post('/check-email', async (req, res) => {
  const { email } = req.body;

  try {
    const result = await checkEmail(email);

    console.log('Full result from checkEmail():', result);

    if (result.exists) {
      const token = crypto.randomBytes(64).toString('hex');
      res.json({
        exists: true,
        message: 'Email found',
        token,
        user: result.user
      });
    } else {
      res.json({ exists: false, message: 'Email not found' });
    }
  } catch (error) {
    console.error('check-email error:', error.message);
    res.status(500).json({ error: 'Server error checking email' });
  }
});


// router.post('/check-email', async (req, res) => {
//   const { email } = req.body;
  
//   try {
//     const result = await pool.query(
//       'SELECT name, email FROM users WHERE email = $1',
//       [email]
//     );
//     // console.log('Full query result:', result);
//     // console.log('Query rows:', result.rows);
//     // console.log('First row:', result.rows[0]);

//     const exists = result.rows.length > 0;
//     const user = result.rows[0];
    
//     if (exists) {
//       const token = crypto.randomBytes(64).toString('hex');
//       res.json({
//         exists,
//         message: 'Email found',
//         token,
//         id: result.rows[0].id,
//         name: result.rows[0].name,
//         email: result.rows[0].email
//       });
//     } else {
//       res.json({ 
//         exists,
//         message: 'Email not found'
//       });
//     }
//   } catch (error) {
//     res.status(500).json({ error: 'Server error checking email' });
//   }
// });

router.post('/signup', async (req, res) => {
  const { name, preferred_name, email, phone_number } = req.body;

  try {
    // 1) check for existing email
    const emailCheck = await pool.query(
      'SELECT email FROM users WHERE email = $1',
      [email]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // 2) insert with phone_number
    const result = await pool.query(
      `INSERT INTO users 
         (name, preferred_name, email, profile_image, phone_number) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, preferred_name, email, profile_image, phone_number, created_at`,
      [name, preferred_name, email, null, phone_number]
    );

    // 3) respond
    const token = crypto.randomBytes(64).toString('hex');
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      token,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error during signup' });
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
  const { email } = req.params;
  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ user });
  } catch (error) {
    console.error('Error retrieving user by email:', error.message);
    return res.status(500).json({ message: 'Error retrieving user data' });
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
