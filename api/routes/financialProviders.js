const express = require('express');
const router = express.Router();
const {
  getAllFinancialProviders,
  getFinancialProviderById
} = require('../controllers/financialProviderController');

router.get('/', (req, res, next) => {
  console.log('🔥 HIT /api/financialProviders');
  next(); // Pass control to the actual controller
}, getAllFinancialProviders);

router.get('/:id', getFinancialProviderById);

router.get('/test', (req, res) => {
  res.json({ message: '✅ Test route working!' });
});

module.exports = router;

