const pool = require('../config/db.config');

const checkEmail = async (email) => {
  try {
    const result = await pool.query(
      'SELECT name, email, community FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];
    return {
      exists: result.rows.length > 0,
      user: result.rows.length > 0 ? {
        name: user.name,
        email: user.email,
        community: user.community
      } : null
    };
  } catch (error) {
    throw new Error('Database error checking email');
  }
};

const createUser = async (userData) => {
  try {
    const { name, email, community } = userData;
    const result = await pool.query(
      'INSERT INTO users (name, email, profile_image, community) VALUES ($1, $2, $3, $4) RETURNING id, name, email, community',
      [name, email, null, community]
    );
    
    return {
      user: result.rows[0],
      success: true
    };
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Email already exists');
    }
    throw new Error('Database error creating user');
  }
};

const getAvailableCommunities = async () => {
  try {
    const result = await pool.query(
      'SELECT id, name, description FROM available_communities ORDER BY name ASC'
    );
    return result.rows;
  } catch (error) {
    throw new Error('Database error fetching communities');
  }
};

module.exports = { 
  checkEmail,
  createUser,
  getAvailableCommunities 
};

// const pool = require('../config/db.config');

// const checkEmail = async (email) => {
//   try {
//     const result = await pool.query(
//       'SELECT name, email FROM users WHERE email = $1',
//       [email]
//     );
//     const user = result.rows[0];
//     return {
//       exists: result.rows.length > 0,
//       user: result.rows.length > 0 ? {
//         name: user.name,
//         email: user.email
//       } : null
//     };
//   } catch (error) {
//     throw new Error('Database error checking email');
//   }
// };

// const createUser = async (userData) => {
//   try {
//     const { name, email } = userData;
//     const result = await pool.query(
//       'INSERT INTO users (name, email, profile_image) VALUES ($1, $2, $3) RETURNING id, name, email, profile_image',
//       [name, email, null] // Setting profile_image as null initially
//     );
    
//     return {
//       user: result.rows[0],
//       success: true
//     };
//   } catch (error) {
//     if (error.code === '23505') {
//       throw new Error('Email already exists');
//     }
//     throw new Error('Database error creating user');
//   }
// };

// module.exports = { 
//   checkEmail,
//   createUser 
// };




// const checkEmail = async (email) => {
//   try {
//     const result = await pool.query(
//       'SELECT * FROM users WHERE email = $1',
//       [email]
//     );
//     return {
//       exists: result.rows.length > 0,
//       user: result.rows[0]
//     };
//   } catch (error) {
//     throw new Error('Database error checking email');
//   }
// };

// const getUserByEmail = async (req, res) => {
//   try {
//     const { email } = req.params;
//     const result = await pool.query(
//       'SELECT name, email FROM users WHERE email = $1',
//       [email]
//     );
    
//     if (result.rows.length === 0) {
//       return res.status(404).json({ message: 'User not found' });
//     }
    
//     const userData = {
//       name: result.rows[0].name,
//       email: result.rows[0].email
//     };
    
//     res.json(userData);
//   } catch (error) {
//     res.status(500).json({ message: 'Error retrieving user data' });
//   }
// };

// const getUserProfile = async (req, res) => {
//   try {
//     const userEmail = req.user?.email;
//     if (!userEmail) {
//       return res.status(401).json({ message: 'User email not found' });
//     }

//     const result = await pool.query(
//       'SELECT name, email FROM users WHERE email = $1',
//       [userEmail]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     res.json(result.rows[0]);
//   } catch (error) {
//     res.status(500).json({ message: 'Error retrieving user profile' });
//   }
// };

// module.exports = { 
//   checkEmail
//   // getUserByEmail
// };
