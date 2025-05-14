const express = require('express');
const router = express.Router();
const { validate: isUuid } = require('uuid');

const {
  getAllVisibleFinancialProviders,
  getVisibleFinancialProviderById
} = require('../controllers/financialProviderController');


router.get('/', getAllVisibleFinancialProviders);

router.get('/:id', (req, res, next) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({
        success: false,
        message: 'Invalid provider ID format'
    });
  }
  next();
}, getVisibleFinancialProviderById);

module.exports = router;

// const express = require('express');
// const router  = express.Router();
// const {
//   getAllFinancialProviders,
//   getFinancialProviderById
// } = require('../controllers/financialProviderController');

// // Log and return all
// router.get('/', (req, res, next) => {
//   console.log('=== HIT GET /api/financialProviders ===');
//   next();
// }, getAllFinancialProviders);

// // Get one by ID
// router.get('/:id', getFinancialProviderById);

// // Quick test
// router.get('/test', (req, res) => {
//   res.json({ message: 'Financial Providers route is working!' });
// });

// module.exports = router;
