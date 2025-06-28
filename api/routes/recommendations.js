const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');

router.post('/', recommendationController.createRecommendation);
router.get('/', recommendationController.getAllRecommendations);
router.get('/:id', recommendationController.getRecommendationById);
router.put('/:id', recommendationController.updateRecommendation);
router.delete('/:id', recommendationController.deleteRecommendation);

router.post("/lists", recommendationController.createList);
router.get("/lists/:listId", recommendationController.getList);
router.get("/lists", recommendationController.getUserLists);


module.exports = router;

// working 5/21 => pre my recs
// routes/recommendations.js
// const express = require('express');
// const router = express.Router();
// const recommendationController = require('../controllers/recommendationController');

// router.post('/', recommendationController.createRecommendation);
// router.get('/', recommendationController.getAllRecommendations);
// router.get('/:id', recommendationController.getRecommendationById);
// router.put('/:id', recommendationController.updateRecommendation);
// // router.delete('/:id', recommendationController.deleteRecommendation);

// module.exports = router;