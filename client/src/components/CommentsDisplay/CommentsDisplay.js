import React, { useEffect, useState } from 'react';
import { FaComment, FaTimes, FaTrash, FaUser } from 'react-icons/fa';
import './CommentsDisplay.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = "http://localhost:3000";

const CommentsDisplay = ({ isOpen, onClose, provider, currentUserId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const fetchComments = async () => {
      if (!isOpen || !provider) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const providerId = provider.provider_id || provider.id;
        const response = await fetch(`${API_URL}/api/comments/${providerId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch comments');
        }
        
        const data = await response.json();
        setComments(data.success ? data.comments : []);
      } catch (error) {
        console.error('Error fetching comments:', error);
        setError('Failed to load comments');
        setComments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [isOpen, provider]);

  const handleDeleteComment = async (commentId) => {
    if (!currentUserId || !window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const session = await window.Clerk.session.getToken();
      const response = await fetch(`${API_URL}/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session}`
        },
        body: JSON.stringify({
          user_id: currentUserId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      // Remove the comment from the local state
      setComments(comments.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment. Please try again.');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!currentUserId || !newComment.trim()) return;

    try {
      const session = await window.Clerk.session.getToken();
      const providerId = provider.provider_id || provider.id;
      const response = await fetch(`${API_URL}/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session}`
        },
        body: JSON.stringify({
          user_id: currentUserId,
          service_id: providerId,
          comment_text: newComment.trim()
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Add new comment to the beginning of the list
        const newCommentObj = {
          id: result.comment_id || Date.now(),
          comment_text: newComment.trim(),
          user_id: currentUserId,
          preferred_name: 'You', // Will be replaced by actual name from API
          created_at: new Date().toISOString()
        };
        setComments(prev => [newCommentObj, ...prev]);
        setNewComment('');
      } else {
        throw new Error('Failed to submit comment');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Failed to submit comment. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="comments-display-overlay">
      <div className="comments-display-content">
        <div className="comments-display-header">
          <h2><FaComment /> Comments for {provider?.business_name || provider?.name}</h2>
          <FaTimes className="close-icon" onClick={onClose} />
        </div>
        <div className="comments-container">
          {loading ? (
            <div className="loading">Loading comments...</div>
          ) : error ? (
            <div className="error-state">{error}</div>
          ) : comments.length === 0 ? (
            <div className="no-comments">
              <FaComment className="no-comments-icon" />
              <p>No comments yet</p>
              <p>Be the first to share your thoughts!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="comment-card">
                <div className="comment-header">
                  <div className="user-info">
                    <FaUser className="user-icon" />
                    <span className="username">
                      {comment.preferred_name || comment.user_name || 'Anonymous'}
                    </span>
                  </div>
                  <div className="comment-actions">
                    <div className="comment-date">
                      {new Date(comment.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    {currentUserId && comment.user_id && currentUserId === comment.user_id && (
                      <button 
                        className="delete-comment-btn"
                        onClick={() => handleDeleteComment(comment.id)}
                        title="Delete comment"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                </div>
                <div className="comment-content">{comment.comment_text}</div>
              </div>
            ))
          )}
        </div>
        
        {/* Add Comment Form at Bottom */}
        {currentUserId && (
          <div className="add-comment-section">
            <form onSubmit={handleAddComment} className="modal-comment-form">
              <div className="modal-comment-input-wrapper">
                <div className="modal-user-avatar">
                  <FaUser />
                </div>
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment, @ to mention"
                  maxLength={1000}
                  className="modal-comment-input"
                />
                <button 
                  type="submit" 
                  disabled={!newComment.trim()} 
                  className="modal-post-button"
                >
                  Post
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentsDisplay; 