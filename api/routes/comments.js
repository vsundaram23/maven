const express = require('express');
const router = express.Router();
const { createComment, getComments, getBatchComments, deleteComment, getCommentCount } = require('../controllers/commentController');

// Create a new comment
router.post('/', createComment);

// Get comments for multiple services in one call (batch)
router.post('/batch', getBatchComments);

// Get all comments for a service
router.get('/:service_id', getComments);

// Get comment count for a service
router.get('/:service_id/count', getCommentCount);

// Delete a comment (only by the user who created it)
router.delete('/:comment_id', deleteComment);

module.exports = router;
