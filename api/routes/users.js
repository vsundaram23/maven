const express = require('express');
const router = express.Router();
const { getRecommendationsByUserId } = require('../controllers/userController');

router.get('/:id/recommendations', getRecommendationsByUserId);

module.exports = router;