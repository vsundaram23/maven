const express = require("express");
const router = express.Router();
const listController = require("../controllers/listController");
const multer = require("multer");

router.get("/", listController.getUserLists);
router.get("/:listId", listController.getList);
router.post("/file-upload", listController.listFileUpload);
router.post("/", listController.createList);
router.delete("/:listId", listController.deleteList);
router.put("/:listId", listController.updateList);
router.post(
    "/:listId/add-recommendations",
    listController.addRecommendationsToList
);
router.post(
    "/:listId/remove-recommendations",
    listController.removeRecommendationsFromList
);

module.exports = router;
