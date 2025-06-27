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
        <div className="comments-modal-overlay">
            <div className="comments-modal">
                <div className="comments-modal-header">
                    <h3>Comments for {provider.business_name}</h3>
                    <button 
                        className="comments-modal-close" 
                        onClick={onClose}
                        aria-label="Close comments"
                    >
                        ×
                    </button>
                </div>
                
                <div className="comments-modal-content">
                    <div className="comments-list">
                        {comments.length > 0 ? (
                            comments.map((comment) => (
                                <div key={comment.id} className="comment-item">
                                    <div className="comment-header">
                                        <div className="comment-avatar">
                                            {(comment.preferred_name || comment.user_name || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="comment-meta">
                                            <span className="comment-author">
                                                {comment.preferred_name || comment.user_name || 'Anonymous'}
                                            </span>
                                            <span className="comment-date">
                                                {new Date(comment.created_at).toLocaleDateString('en-US', { 
                                                    year: 'numeric',
                                                    month: 'short', 
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="comment-text">{comment.comment_text}</p>
                                </div>
                            ))
                        ) : (
                            <div className="no-comments">
                                <p>No comments yet. Be the first to comment!</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Comment Input Section */}
                    {currentUserId && (
                        <div className="comment-input-section">
                            <form onSubmit={handleSubmit} className="comment-form">
                                <div className="comment-input-wrapper">
                                    <div className="comment-user-avatar">
                                        {currentUserName ? currentUserName.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Add a comment..."
                                        className="comment-input"
                                        disabled={isSubmitting}
                                    />
                                    <button 
                                        type="submit" 
                                        className="comment-submit-btn"
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
                </div>
            </div>
        </div>
    );
};

export default CommentsDisplay; 