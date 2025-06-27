const pool = require('../config/db.config');

const createComment = async (req, res) => {
  const { user_id: clerk_id, service_id, comment_text } = req.body;

  if (!clerk_id || !service_id || !comment_text) {
    return res.status(400).json({ error: 'clerk_id, service_id, and comment_text are required' });
  }

  try {
    // Get the actual user_id from the clerk_id
    const userQuery = 'SELECT id FROM users WHERE clerk_id = $1';
    const userResult = await pool.query(userQuery, [clerk_id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found for the provided clerk_id' });
    }
    const actual_user_id = userResult.rows[0].id;

    // Verify the service exists
    const serviceQuery = 'SELECT id FROM service_providers WHERE id = $1';
    const serviceResult = await pool.query(serviceQuery, [service_id]);

    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service provider not found' });
    }

    // Insert the comment
    const insertQuery = `
      INSERT INTO comments (user_id, service_id, comment_text, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await pool.query(insertQuery, [actual_user_id, service_id, comment_text]);

    res.status(201).json({ 
      success: true,
      message: 'Comment created successfully',
      comment: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

const getComments = async (req, res) => {
  const { service_id } = req.params;

  if (!service_id) {
    return res.status(400).json({ error: 'service_id is required' });
  }

  try {
    const commentsQuery = `
      SELECT 
        c.*,
        u.name as user_name,
        u.preferred_name,
        u.username
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.service_id = $1
      ORDER BY c.created_at DESC
    `;
    const result = await pool.query(commentsQuery, [service_id]);

    res.status(200).json({
      success: true,
      comments: result.rows
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

// New function to get comments for multiple services in one call
const getBatchComments = async (req, res) => {
  const { service_ids } = req.body;

  if (!service_ids || !Array.isArray(service_ids) || service_ids.length === 0) {
    return res.status(400).json({ error: 'service_ids array is required' });
  }

  // Limit to reasonable batch size to prevent abuse
  if (service_ids.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 service_ids allowed per batch request' });
  }

  try {
    const placeholders = service_ids.map((_, index) => `$${index + 1}`).join(',');
    const commentsQuery = `
      SELECT 
        c.*,
        u.name as user_name,
        u.preferred_name,
        u.username
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.service_id IN (${placeholders})
      ORDER BY c.service_id, c.created_at DESC
    `;
    
    const result = await pool.query(commentsQuery, service_ids);

    // Group comments by service_id
    const commentsByService = {};
    service_ids.forEach(id => {
      commentsByService[id] = [];
    });

    result.rows.forEach(comment => {
      if (commentsByService[comment.service_id]) {
        commentsByService[comment.service_id].push(comment);
      }
    });

    res.status(200).json({
      success: true,
      comments: commentsByService
    });
  } catch (error) {
    console.error('Error fetching batch comments:', error);
    res.status(500).json({ error: 'Failed to fetch batch comments' });
  }
};

const deleteComment = async (req, res) => {
  const { comment_id } = req.params;
  const { user_id: clerk_id } = req.body;

  if (!comment_id || !clerk_id) {
    return res.status(400).json({ error: 'comment_id and clerk_id are required' });
  }

  try {
    // Get the actual user_id from the clerk_id
    const userQuery = 'SELECT id FROM users WHERE clerk_id = $1';
    const userResult = await pool.query(userQuery, [clerk_id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found for the provided clerk_id' });
    }
    const actual_user_id = userResult.rows[0].id;

    // Check if the comment exists and belongs to the user
    const commentQuery = 'SELECT * FROM comments WHERE id = $1 AND user_id = $2';
    const commentResult = await pool.query(commentQuery, [comment_id, actual_user_id]);

    if (commentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found or you do not have permission to delete it' });
    }

    // Delete the comment
    const deleteQuery = 'DELETE FROM comments WHERE id = $1 AND user_id = $2';
    await pool.query(deleteQuery, [comment_id, actual_user_id]);

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

const getCommentCount = async (req, res) => {
  const { service_id } = req.params;

  if (!service_id) {
    return res.status(400).json({ error: 'service_id is required' });
  }

  try {
    const countQuery = 'SELECT COUNT(*) as comment_count FROM comments WHERE service_id = $1';
    const result = await pool.query(countQuery, [service_id]);

    res.status(200).json({
      success: true,
      comment_count: parseInt(result.rows[0].comment_count, 10)
    });
  } catch (error) {
    console.error('Error fetching comment count:', error);
    res.status(500).json({ error: 'Failed to fetch comment count' });
  }
};

module.exports = {
  createComment,
  getComments,
  getBatchComments,
  deleteComment,
  getCommentCount
};
