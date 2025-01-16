// routes/reviews.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db.config');
const { createReview } = require('../controllers/reviewController');

// Use the controller for the POST route
router.post('/', createReview);

// Add this route to get user's likes
router.post('/user-likes', async (req, res) => {
    const { email } = req.body;
    
    try {
      const userResult = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
  
      if (userResult.rows.length === 0) {
        return res.json([]);
      }
  
      const user_id = userResult.rows[0].id;
  
      const likesResult = await pool.query(
        'SELECT provider_id FROM reviews WHERE user_id = $1 AND rating = 1',
        [user_id]
      );
  
      res.json(likesResult.rows);
    } catch (error) {
      res.status(500).json({ error: 'Server error fetching user likes' });
    }
});

router.delete('/', async (req, res) => {
    const { provider_email, email } = req.body;
    
    try {
      const userResult = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.json({ 
          success: false,
          message: 'User not found' 
        });
      }

      const providerResult = await pool.query(
        'SELECT id FROM service_providers WHERE email = $1',
        [provider_email]
      );

      if (providerResult.rows.length === 0) {
        return res.json({ 
          success: false,
          message: 'Provider not found' 
        });
      }

      const user_id = userResult.rows[0].id;
      const provider_id = providerResult.rows[0].id;

      await pool.query(
        'DELETE FROM reviews WHERE user_id = $1 AND provider_id = $2',
        [user_id, provider_id]
      );

      await pool.query(`
        UPDATE service_providers 
        SET num_likes = (
          SELECT COUNT(*) 
          FROM reviews 
          WHERE provider_id = $1
        )
        WHERE id = $1`,
        [provider_id]
      );

      res.json({
        success: true,
        message: 'Review removed successfully'
      });

    } catch (error) {
      res.status(500).json({ error: 'Server error removing review' });
    }
});

router.get('/:providerId', async (req, res) => {
    const { providerId } = req.params;
    
    try {
      const reviewsResult = await pool.query(`
        SELECT r.*, u.name as user_name 
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.provider_id = $1
        ORDER BY r.created_at DESC
      `, [providerId]);
  
      res.json(reviewsResult.rows);
    } catch (error) {
      res.status(500).json({ error: 'Server error fetching reviews' });
    }
  });

module.exports = router;

