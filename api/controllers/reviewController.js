// controllers/reviewController.js
const pool = require('../config/db.config');

const createReview = async (req, res) => {
    const { provider_email, email, rating, content } = req.body;
  
    try {
      // Get user_id from email
      const userQuery = 'SELECT id FROM users WHERE email = $1';
      const userResult = await pool.query(userQuery, [email]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Get provider_id from provider_email
      const providerQuery = 'SELECT id FROM service_providers WHERE email = $1';
      const providerResult = await pool.query(providerQuery, [provider_email]);
  
      if (providerResult.rows.length === 0) {
        return res.status(404).json({ error: 'Service provider not found' });
      }
  
      const user_id = userResult.rows[0].id;
      const provider_id = providerResult.rows[0].id;
  
      // Insert review
      const insertQuery = `
        INSERT INTO reviews (user_id, provider_id, rating, content, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      await pool.query(insertQuery, [user_id, provider_id, rating, content]);
  
      // Update provider likes count
      const updateQuery = `
        UPDATE service_providers 
        SET num_likes = (
          SELECT COUNT(*) 
          FROM reviews 
          WHERE provider_id = $1
        )
        WHERE id = $1
      `;
      await pool.query(updateQuery, [provider_id]);
  
      res.status(201).json({ message: 'Review created successfully' });
    } catch (error) {
      console.error('Error creating review:', error);
      res.status(500).json({ error: 'Failed to create review' });
    }
  };
  
  module.exports = {
    createReview
  };

