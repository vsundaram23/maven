const express = require("express");
const router = express.Router();

const {
    getAllVisibleMovingProviders,
    getVisibleMovingProviderById,
} = require("../controllers/movingProviderController");

router.get("/", getAllVisibleMovingProviders);
router.get("/:id", getVisibleMovingProviderById);

module.exports = router;
