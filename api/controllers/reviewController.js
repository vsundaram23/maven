const pool = require('../config/db.config');

const createReview = async (req, res) => {
  const { user_id: clerk_id, provider_id, rating, content, tags = [] } = req.body;

  if (!clerk_id || !provider_id) {
    return res.status(400).json({ error: 'clerk_id and provider_id are required' });
  }

  try {
    const userQuery = 'SELECT id FROM users WHERE clerk_id = $1';
    const userResult = await pool.query(userQuery, [clerk_id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found for the provided clerk_id' });
    }
    const actual_user_id = userResult.rows[0].id;

    const providerTagsQuery = 'SELECT tags FROM service_providers WHERE id = $1';
    const providerTagsResult = await pool.query(providerTagsQuery, [provider_id]);

    if (providerTagsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service provider not found' });
    }
    const existingTags = providerTagsResult.rows[0].tags || [];

    const insertQuery = `
      INSERT INTO reviews (user_id, provider_id, rating, content, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    await pool.query(insertQuery, [actual_user_id, provider_id, rating, content]);

    const newTags = tags.map(t => t.trim().toLowerCase()).filter(Boolean);
    const mergedTags = Array.from(new Set([...existingTags, ...newTags]));

    await pool.query(
      `UPDATE service_providers SET tags = $1 WHERE id = $2`,
      [mergedTags, provider_id]
    );

    await pool.query(
      `UPDATE service_providers
       SET num_likes = (
         SELECT COUNT(*)
         FROM reviews
         WHERE provider_id = $1
       )
       WHERE id = $1`,
      [provider_id]
    );

    res.status(201).json({ message: 'Review and tags submitted successfully' });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
};

module.exports = {
  createReview
};

// // controllers/reviewController.js
// const pool = require('../config/db.config');

// const createReview = async (req, res) => {
//   const { provider_email, email, rating, content, tags = [] } = req.body;

//   try {
//     // Get user_id from email
//     const userQuery = 'SELECT id FROM users WHERE email = $1';
//     const userResult = await pool.query(userQuery, [email]);

//     if (userResult.rows.length === 0) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     // Get provider_id and existing tags from provider_email
//     const providerQuery = 'SELECT id, tags FROM service_providers WHERE email = $1';
//     const providerResult = await pool.query(providerQuery, [provider_email]);

//     if (providerResult.rows.length === 0) {
//       return res.status(404).json({ error: 'Service provider not found' });
//     }

//     const user_id = userResult.rows[0].id;
//     const provider_id = providerResult.rows[0].id;
//     const existingTags = providerResult.rows[0].tags || [];

//     // Insert review
//     const insertQuery = `
//       INSERT INTO reviews (user_id, provider_id, rating, content, created_at)
//       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
//       RETURNING *
//     `;
//     await pool.query(insertQuery, [user_id, provider_id, rating, content]);

//     // Merge and deduplicate tags (case-insensitive)
//     const newTags = tags.map(t => t.trim().toLowerCase()).filter(Boolean);
//     const mergedTags = Array.from(new Set([...existingTags, ...newTags]));

//     // Update provider tags
//     await pool.query(
//       `UPDATE service_providers SET tags = $1 WHERE id = $2`,
//       [mergedTags, provider_id]
//     );

//     // Update provider likes count
//     await pool.query(
//       `UPDATE service_providers 
//        SET num_likes = (
//          SELECT COUNT(*) 
//          FROM reviews 
//          WHERE provider_id = $1
//        )
//        WHERE id = $1`,
//       [provider_id]
//     );

//     res.status(201).json({ message: 'Review and tags submitted successfully' });
//   } catch (error) {
//     console.error('Error creating review:', error);
//     res.status(500).json({ error: 'Failed to create review' });
//   }
// };
  
// module.exports = {
//   createReview
// };

