const express = require("express");
const router = express.Router();
const recommendationController = require("../controllers/recommendationController");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.post("/uuid", recommendationController.createRecommendationWithUuid);
router.post("/", recommendationController.createRecommendation);
router.get("/", recommendationController.getAllRecommendations);
router.get("/:id", recommendationController.getRecommendationById);
router.get("/:recommendation_id/likers", recommendationController.getLikers);
router.put("/:id", recommendationController.updateRecommendation);
router.delete("/:id", recommendationController.deleteRecommendation);
router.get("/user/:userId", recommendationController.getRecommendationsByUser);

module.exports = router;
