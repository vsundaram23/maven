const express = require('express');
const router = express.Router();
const bumpController = require('../controllers/bumpYourNetworkController');

// Main resource: /asks

// Get suggestions FOR an ask
router.post('/asks/suggest-recommenders', bumpController.suggestRecommenders);

// Create a new ask
router.post('/ask', bumpController.createAsk);

// Calculate score for a potential recommender for an ask
router.post('/asks/calculate-score', bumpController.calculateMatchScore);

// Decline an ask (acting on a specific ask)
router.post('/asks/decline', bumpController.declineAsk);

// Submit a recommendation FOR an ask
router.post('/asks/process-recommendation', bumpController.processRecommendationSubmission);

// Submit a text response TO an ask
router.post('/asks/respond', bumpController.submitAskResponse);

// Get inbound asks for a recipient
router.get('/asks/inbound', bumpController.getInboundAsks);

// Get outbound asks for an asker
router.get('/asks/outbound', bumpController.getOutboundAsks);

// Get all responses for a specific ask
router.get('/asks/:askId/responses', bumpController.getAskResponses);

// Delete an ask
router.delete('/asks/:askId', bumpController.deleteAsk);

module.exports = router;