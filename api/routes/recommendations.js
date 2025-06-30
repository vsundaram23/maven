const express = require("express");
const router = express.Router();
const recommendationController = require("../controllers/recommendationController");
const multer = require("multer");

router.get("/lists", recommendationController.getUserLists);
router.get("/lists/:listId", recommendationController.getList);
router.post("/list-file-upload", recommendationController.listFileUpload);
router.post("/lists", recommendationController.createList);
router.delete("/lists/:listId", recommendationController.deleteList);

router.post("/", recommendationController.createRecommendation);
router.get("/", recommendationController.getAllRecommendations);
router.get("/:id", recommendationController.getRecommendationById);
router.put("/:id", recommendationController.updateRecommendation);
router.delete("/:id", recommendationController.deleteRecommendation);

module.exports = router;
