// CommentModal.js
import React, { useEffect, useState } from 'react';
import './CommentModal.css';

const CommentModal = ({ isOpen, onClose, onSubmit, provider }) => {
  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCommentText('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) {
      setError('Please enter a comment');
      return;
    }

    onSubmit({ commentText: commentText.trim() });
    onClose();
  };

  if (!isOpen || !provider) return null;

  return (
    <div className="comment-modal-overlay">
      <div className="comment-modal-content">
        <h2>Add Comment for {provider.business_name || provider.name}</h2>
        <form onSubmit={handleSubmit}>
          <div className="comment-input">
            <label>Your comment: <span className="required">*</span></label>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts about this recommendation..."
              rows={4}
              maxLength={1000}
            />
            <div className="character-count">
              {commentText.length}/1000 characters
            </div>
            {error && <div className="error-message">{error}</div>}
          </div>
          <div className="comment-modal-buttons">
            <button type="button" onClick={onClose} className="comment-cancel-button">Cancel</button>
            <button type="submit" className="comment-submit-button">Add Comment</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommentModal;
