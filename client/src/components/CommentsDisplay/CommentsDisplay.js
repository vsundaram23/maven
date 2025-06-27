import React, { useState } from 'react';
import './CommentsDisplay.css';

const CommentsDisplay = ({ 
    isOpen, 
    onClose, 
    provider, 
    currentUserId,
    currentUserName,
    comments = [], // Comments passed as props
    onCommentAdded // Callback when comment is added
}) => {
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const API_URL = 'https://api.seanag-recommendations.org:8080';
    // const API_URL = "http://localhost:3000";

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !currentUserId || isSubmitting) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const session = await window.Clerk.session.getToken();
            const response = await fetch(`${API_URL}/api/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session}`
                },
                body: JSON.stringify({
                    user_id: currentUserId,
                    service_id: provider.provider_id || provider.id,
                    comment_text: newComment.trim()
                })
            });

            if (response.ok) {
                const result = await response.json();
                
                // Create new comment object
                const newCommentObj = {
                    id: result.comment.id || Date.now(),
                    comment_text: newComment.trim(),
                    user_id: currentUserId,
                    preferred_name: currentUserName,
                    created_at: new Date().toISOString(),
                    service_id: provider.provider_id || provider.id
                };
                
                setNewComment('');
                
                // Notify parent component about the new comment
                if (onCommentAdded) {
                    onCommentAdded(provider.provider_id || provider.id, newCommentObj);
                }
            } else {
                throw new Error('Failed to submit comment');
            }
        } catch (err) {
            console.error('Error submitting comment:', err);
            setError('Failed to submit comment. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="comments-display-overlay">
            <div className="comments-display-content">
                <div className="comments-display-header">
                    <h2>Comments for {provider.business_name}</h2>
                    <span 
                        className="close-icon" 
                        onClick={onClose}
                        aria-label="Close comments"
                    >
                        ×
                    </span>
                </div>
                
                <div className="comments-container">
                    {comments.length > 0 ? (
                        comments.map((comment) => (
                            <div key={comment.id} className="comment-card">
                                <div className="comment-header">
                                    <div className="user-info">
                                        <svg className="user-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                        </svg>
                                        <span className="username">
                                            {comment.preferred_name || comment.user_name || 'Anonymous'}
                                        </span>
                                    </div>
                                    <div className="comment-actions">
                                        <span className="comment-date">
                                            {new Date(comment.created_at).toLocaleDateString('en-US', { 
                                                month: 'short', 
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                </div>
                                <div className="comment-content">{comment.comment_text}</div>
                            </div>
                        ))
                    ) : (
                        <div className="no-comments">
                            <div className="no-comments-icon">💬</div>
                            <p>No comments yet</p>
                            <p>Be the first to share your thoughts!</p>
                        </div>
                    )}
                </div>
                
                {/* Add Comment Section */}
                {currentUserId && (
                    <div className="add-comment-section">
                        <form onSubmit={handleSubmit} className="modal-comment-form">
                            <div className="modal-comment-input-wrapper">
                                <div className="modal-user-avatar">
                                    {currentUserName ? currentUserName.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Add a comment..."
                                    className="modal-comment-input"
                                    disabled={isSubmitting}
                                />
                                <button 
                                    type="submit" 
                                    className="modal-post-button"
                                    disabled={!newComment.trim() || isSubmitting}
                                >
                                    {isSubmitting ? 'Posting...' : 'Post'}
                                </button>
                            </div>
                        </form>
                        {error && (
                            <div className="comment-error">{error}</div>
                        )}
                    </div>
                )}
                
                {/* Mobile Close Button */}
                <div className="mobile-close-section">
                    <button 
                        className="mobile-close-button"
                        onClick={onClose}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommentsDisplay; 