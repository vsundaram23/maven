const express = require('express');
const router = express.Router();
const { validate: isUuid } = require('uuid');

const {
  getAllVisibleAutoProviders,
  getVisibleAutoProviderById
} = require('../controllers/autoProviderController');


router.get('/', getAllVisibleAutoProviders);

router.get('/:id', (req, res, next) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({
        success: false,
        message: 'Invalid provider ID format'
    });
  }
  next();
}, getVisibleAutoProviderById);

module.exports = router;

// // routes/autoProvider.js
// const express = require('express');
// const router  = express.Router();
// const {
//   getAllAutoProviders,
//   getAutoProviderById
// } = require('../controllers/autoProviderController');

// // Log and return all
// router.get('/', (req, res, next) => {
//   console.log('=== HIT GET /api/autoProviders ===');
//   next();
// }, getAllAutoProviders);

// // Get one by ID
// router.get('/:id', getAutoProviderById);

// // Quick test
// router.get('/test', (req, res) => {
//   res.json({ message: 'Auto Providers route is working!' });
// });

// module.exports = router;
