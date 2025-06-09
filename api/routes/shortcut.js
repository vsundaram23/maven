const express = require('express');
const router = express.Router();
const pool = require('../config/db.config');
const { findRecommendation, shareRecommendation, getUserInfoByPhoneNumber } = require('../controllers/shortcutController');

router.post('/find-rec', findRecommendation);
router.post('/share-rec', shareRecommendation);
router.post('/get-user-info', getUserInfoByPhoneNumber);

module.exports = router;