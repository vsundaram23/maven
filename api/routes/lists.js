const express = require("express");
const router = express.Router();
const listController = require("../controllers/listController");
const multer = require("multer");

router.get("/", listController.getUserLists);
router.get("/:listId", listController.getList);
router.post("/file-upload", listController.listFileUpload);
router.post("/", listController.createList);
router.delete("/:listId", listController.deleteList);

module.exports = router;
