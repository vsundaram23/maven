// routes/quotes.js
const express = require('express');
const router = express.Router();
const {
  createQuoteRequest,
  getQuotesByProvider
} = require('../controllers/quoteController');

// POST /api/quotes
// body: { provider_email?, provider_phone_number?, email, message }
router.post('/', createQuoteRequest);

// GET /api/quotes/provider/:providerId
router.get('/provider/:providerId', getQuotesByProvider);

module.exports = router;
