const express = require("express");
const router = express.Router();
const {
    getCurrentUserRecommendations,
    getRecommendationsByUserId,
} = require("../controllers/userController");

// Route for current user's recommendations
router.get("/me/recommendations", getCurrentUserRecommendations);

// Route for other users' recommendations
router.get("/:id/recommendations", getRecommendationsByUserId);

module.exports = router;
