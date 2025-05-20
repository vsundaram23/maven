const express = require('express');
const router = express.Router();

const {
  getAllVisibleProviders,
  getProviderById,
  getRecommendationsByTargetUser,
  searchVisibleProviders,
  getProviderCount,
  likeRecommendation
} = require('../controllers/providerController');

router.get('/', getAllVisibleProviders);
router.get('/search', searchVisibleProviders);
router.get('/count', getProviderCount);
router.get('/user-recommendations', getRecommendationsByTargetUser);
router.get('/:id', getProviderById);
router.post('/:id/like', likeRecommendation);

module.exports = router;
// working 5/20
// const express = require('express');
// const router = express.Router();

// const {
//   getAllVisibleProviders,
//   getProviderById,
//   getRecommendationsByTargetUser,
//   searchVisibleProviders,
//   getProviderCount
// } = require('../controllers/providerController');

// router.get('/', getAllVisibleProviders);

// router.get('/search', searchVisibleProviders);

// router.get('/count', getProviderCount);

// router.get('/user-recommendations', getRecommendationsByTargetUser);

// router.get('/:id', getProviderById);

// module.exports = router;
