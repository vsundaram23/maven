const express = require('express');
const router  = express.Router();
const {
  getAllFinancialProviders,
  getFinancialProviderById
} = require('../controllers/financialProviderController');

// Log and return all
router.get('/', (req, res, next) => {
  console.log('=== HIT GET /api/financialProviders ===');
  next();
}, getAllFinancialProviders);

// Get one by ID
router.get('/:id', getFinancialProviderById);

// Quick test
router.get('/test', (req, res) => {
  res.json({ message: 'Financial Providers route is working!' });
});

module.exports = router;
