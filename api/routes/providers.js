const express = require('express');
const router = express.Router();

const {
  getAllVisibleProviders,
  getProviderById,
  getRecommendationsByTargetUser,
  searchVisibleProviders,
  getProviderCount,
  likeRecommendation,
  simpleLikeRecommendation,
  getNewestVisibleProviders
} = require('../controllers/providerController');

router.get('/visible', getAllVisibleProviders);
router.get('/search', searchVisibleProviders);
router.get('/count', getProviderCount);
router.get('/user-recommendations', getRecommendationsByTargetUser);
router.get("/newest-visible", getNewestVisibleProviders);
router.get('/:id', getProviderById);
router.post('/:id/like', likeRecommendation);
router.post('/:id/like-simple', simpleLikeRecommendation);

module.exports = router;

// working 5/21
// const express = require('express');
// const router = express.Router();

// const {
//   getAllVisibleProviders,
//   getProviderById,
//   getRecommendationsByTargetUser,
//   searchVisibleProviders,
//   getProviderCount,
//   likeRecommendation
// } = require('../controllers/providerController');

// router.get('/', getAllVisibleProviders);
// router.get('/search', searchVisibleProviders);
// router.get('/count', getProviderCount);
// router.get('/user-recommendations', getRecommendationsByTargetUser);
// router.get('/:id', getProviderById);
// router.post('/:id/like', likeRecommendation);

// module.exports = router;