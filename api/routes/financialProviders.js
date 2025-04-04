const express = require('express');
const router = express.Router();
const {
  getAllFinancialProviders,
  getFinancialProviderById
} = require('../controllers/financialProviderController');

router.get('/', (req, res) => {
    console.log('🔥 HIT /api/financialProviders!');
    res.send('This route works');
  });
router.get('/:id', getFinancialProviderById);

router.get('/test', (req, res) => {
    res.json({ message: 'Test route working!' });
  });

module.exports = router;
