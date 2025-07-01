import React, { useEffect, useRef, useState } from 'react';
import { FaMapMarkerAlt, FaPlusCircle, FaStar } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import CommentModal from '../CommentModal/CommentModal';
import CommentsDisplay from '../CommentsDisplay/CommentsDisplay';
import LikesModal from '../LikesModal/LikesModal';
import './RecommendationCard.css';

const StarRatingDisplay = ({ rating }) => {
    const numRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalfStar = numRating - fullStars >= 0.25 && numRating - fullStars < 0.75;
    const effectivelyFullStars = numRating - fullStars >= 0.75 ? fullStars + 1 : fullStars;
    const displayFullStars = hasHalfStar ? fullStars : effectivelyFullStars;
    const displayHalfStar = hasHalfStar;
    const emptyStars = 5 - displayFullStars - (displayHalfStar ? 1 : 0);

    return (
        <div className="star-rating-display">
            {[...Array(displayFullStars)].map((_, i) => <FaStar key={`full-${i}`} className="star-filled" />)}
            {displayHalfStar && <FaStar key="half" className="star-half" />}
            {[...Array(emptyStars < 0 ? 0 : emptyStars)].map((_, i) => <FaStar key={`empty-${i}`} className="star-empty" />)}
        </div>
    );
};

const RecommendationCard = ({ 
    rec, 
    onWriteReview, 
    onLike, 
    isLikedByCurrentUser, 
    loggedInUserId, 
    currentUserName,
    comments = [], // Comments passed as props instead of fetching individually
    onCommentAdded, // Callback when a new comment is added
    hidePhotoPreview = false
}) => {
    const providerIdForLink = rec.provider_id || rec.id;
    const displayAvgRating = (parseFloat(rec.average_rating) || 0).toFixed(1);
    const displayTotalReviews = parseInt(rec.total_reviews, 10) || 0;
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [isCommentsDisplayOpen, setIsCommentsDisplayOpen] = useState(false);
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [showInlineCommentForm, setShowInlineCommentForm] = useState(false);
    const [inlineCommentText, setInlineCommentText] = useState('');
    const [isSubmittingInlineComment, setIsSubmittingInlineComment] = useState(false);
    const [commentsError, setCommentsError] = useState(null);
    const [isLikesModalOpen, setIsLikesModalOpen] = useState(false);
    const [likers, setLikers] = useState([]);
    const [isLoadingLikers, setIsLoadingLikers] = useState(false);
    const dropdownRef = useRef(null);
    const inlineCommentRef = useRef(null);
    const textareaRef = useRef(null);

    const API_URL = 'https://api.seanag-recommendations.org:8080';
    // const API_URL = "http://localhost:3000";

    const getImageSrc = (photo) => {
        if (!photo) return null;
        if (typeof photo === 'string') return photo;
        if (photo.url) return photo.url;
        if (photo.data && photo.contentType) {
            const bufferData = photo.data.data;
            if (!bufferData) return null;
            try {
                const base64String = btoa(
                    new Uint8Array(bufferData).reduce(
                        (data, byte) => data + String.fromCharCode(byte),
                        ''
                    )
                );
                return `data:${photo.contentType};base64,${base64String}`;
            } catch (e) {
                console.error("Error converting image buffer for display:", e);
                return null;
            }
        }
        return null;
    };

    const shareLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/provider/${providerIdForLink}`);
        setDropdownOpen(false);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const commentCount = comments.length;

    const handleViewLikers = async () => {
        setIsLikesModalOpen(true);
        setIsLoadingLikers(true);
        try {
            const session = await window.Clerk.session.getToken();
            const response = await fetch(`${API_URL}/api/recommendations/${providerIdForLink}/likers`, {
                headers: {
                    'Authorization': `Bearer ${session}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setLikers(data.likers);
            } else {
                console.error("Failed to fetch likers");
                setLikers([]);
            }
        } catch (error) {
            console.error('Error fetching likers:', error);
            setLikers([]);
        } finally {
            setIsLoadingLikers(false);
        }
    };

    // Handle comment submission from CommentModal
    const handleCommentSubmit = async ({ commentText }) => {
        if (!loggedInUserId || !commentText.trim()) return;

        setCommentsError(null);

        try {
            const session = await window.Clerk.session.getToken();
            const response = await fetch(`${API_URL}/api/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session}`
                },
                body: JSON.stringify({
                    user_id: loggedInUserId,
                    service_id: providerIdForLink,
                    comment_text: commentText.trim()
                })
            });

            if (response.ok) {
                const result = await response.json();
                
                // Create new comment object
                const newCommentObj = {
                    id: result.comment.id || Date.now(),
                    comment_text: commentText.trim(),
                    user_id: loggedInUserId,
                    preferred_name: currentUserName,
                    created_at: new Date().toISOString(),
                    service_id: providerIdForLink
                };
                
                // Close modal
                setIsCommentModalOpen(false);
                setShowInlineCommentForm(false);
                
                // Notify parent component about the new comment
                if (onCommentAdded) {
                    onCommentAdded(providerIdForLink, newCommentObj);
                }
            } else {
                throw new Error('Failed to submit comment');
            }
        } catch (error) {
            console.error('Error submitting comment:', error);
            setCommentsError('Failed to submit comment. Please try again.');
        }
    };

    // Handle inline comment submission
    const handleInlineCommentSubmit = async () => {
        if (!loggedInUserId || !inlineCommentText.trim() || isSubmittingInlineComment) return;

        setIsSubmittingInlineComment(true);
        setCommentsError(null);

        try {
            const session = await window.Clerk.session.getToken();
            const response = await fetch(`${API_URL}/api/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session}`
                },
                body: JSON.stringify({
                    user_id: loggedInUserId,
                    service_id: providerIdForLink,
                    comment_text: inlineCommentText.trim()
                })
            });

            if (response.ok) {
                const result = await response.json();
                
                // Create new comment object
                const newCommentObj = {
                    id: result.comment.id || Date.now(),
                    comment_text: inlineCommentText.trim(),
                    user_id: loggedInUserId,
                    preferred_name: currentUserName,
                    created_at: new Date().toISOString(),
                    service_id: providerIdForLink
                };
                
                // Reset form
                setInlineCommentText('');
                setShowInlineCommentForm(false);
                
                // Notify parent component about the new comment
                if (onCommentAdded) {
                    onCommentAdded(providerIdForLink, newCommentObj);
                }
            } else {
                throw new Error('Failed to submit comment');
            }
        } catch (error) {
            console.error('Error submitting comment:', error);
            setCommentsError('Failed to submit comment. Please try again.');
        } finally {
            setIsSubmittingInlineComment(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    // Note: Removed automatic scrolling to comment form to avoid unwanted page jumps

    // Auto-resize textarea function
    const autoResizeTextarea = (textarea) => {
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        }
    };

    // Handle textarea change with auto-resize
    const handleTextareaChange = (e) => {
        setInlineCommentText(e.target.value);
        autoResizeTextarea(e.target);
    };

    return (
        <div className="public-provider-card">
            <div className="public-card-header">
                <h3 className="public-card-title">
                    <Link to={`/provider/${providerIdForLink}`} className="public-provider-name-link" onClick={() => localStorage.setItem("selectedProvider", JSON.stringify(rec))}>
                        {rec.business_name || "Unknown Business"}
                    </Link>
                </h3>
                <div className="public-badge-wrapper-with-menu">
                    {(parseFloat(rec.average_rating) || 0) >= 4.5 && (<span className="public-badge top-rated-badge">Top Rated</span>)}
                    <div className="public-dropdown-wrapper" ref={dropdownRef}>
                        <button className="public-three-dots-button" onClick={() => setDropdownOpen(!dropdownOpen)} title="Options">⋮</button>
                        {dropdownOpen && (
                            <div className="public-dropdown-menu">
                                <button className="public-dropdown-item" onClick={shareLink}>Share this Rec</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {(rec.city || rec.state) && (
                <div className="public-location-info">
                    <FaMapMarkerAlt />
                    <span>
                        {rec.city}{rec.city && rec.state && ', '}{rec.state}
                    </span>
                </div>
            )}

            <div className="public-review-summary">
                <StarRatingDisplay rating={rec.average_rating || 0} />
                <span className="public-review-score">{displayAvgRating}</span>
                <span className="public-review-count">({displayTotalReviews} {displayTotalReviews === 1 ? "review" : "reviews"})</span>
                {loggedInUserId && (
                    <button className="public-write-review-link" onClick={() => onWriteReview(rec)}>Write a Review</button>
                )}
            </div>

            <p className="public-card-description">{rec.recommender_message || "No specific message provided for this recommendation."}</p>

            <div className="public-tag-container">
                {Array.isArray(rec.tags) && rec.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="public-tag-badge">{tag}</span>
                ))}
                {loggedInUserId && (
                    <button className="public-add-tag-button" onClick={() => onWriteReview(rec)} aria-label="Add or edit tags">
                        <FaPlusCircle />
                    </button>
                )}
            </div>

            <div className="public-card-footer">
                <div className="public-card-footer-content">
                    {rec.recommender_name && (
                        <div className="public-recommendation-details">
                            <div className="public-recommended-row">
                                <span className="public-recommended-label">Recommended by:</span>
                                <Link to={`/pro/${rec.recommender_username || 'user'}`} className="public-recommended-name">{rec.recommender_name}</Link>
                                {rec.date_of_recommendation && (
                                    <span className="public-recommendation-date">
                                        ({new Date(rec.date_of_recommendation).toLocaleDateString("en-US", { year: "2-digit", month: "numeric", day: "numeric" })})
                                    </span>
                                )}
                            </div>
                            {rec.users_who_reviewed && 
                                rec.users_who_reviewed.length > 0 &&
                                rec.users_who_reviewed.filter(user => 
                                    user && user.name && user.name !== rec.recommender_name
                                ).length > 0 && (
                                    <div className="public-recommended-row">
                                        <span className="public-recommended-label">
                                            Also used by:
                                        </span>
                                        <span className="public-used-by-names">
                                            {rec.users_who_reviewed
                                                .filter(user => 
                                                    user && user.name && user.name !== rec.recommender_name
                                                )
                                                .map(user => user.name)
                                                .join(", ")}
                                        </span>
                                    </div>
                                )}
                        </div>
                    )}
                    
                    <div className="public-bottom-actions">
                        <div className="public-bottom-actions-left">
                            <button
                                className={`public-like-button ${isLikedByCurrentUser ? 'liked' : ''}`}
                                onClick={() => onLike(providerIdForLink)}
                                title={isLikedByCurrentUser ? "Unlike" : "Like"}
                                disabled={!loggedInUserId}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" 
                                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                                        fill={isLikedByCurrentUser ? 'currentColor' : 'none'}/>
                                </svg>
                                <span className="public-like-count">{rec.num_likes || 0}</span>
                            </button>
                            
                            <button
                                className="public-comment-button"
                                onClick={() => {
                                    if (commentCount > 0 && !loggedInUserId) {
                                        setIsCommentsDisplayOpen(true);
                                    } else if (loggedInUserId) {
                                        setShowInlineCommentForm(!showInlineCommentForm);
                                    }
                                }}
                                title={commentCount > 0 ? `${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}` : 'Comments'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" 
                                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                {commentCount > 0 && <span className="public-comment-count">{commentCount}</span>}
                            </button>
                        </div>
                    </div>

                    {rec.num_likes > 0 && (
                        <div className="view-more-section">
                            <button className="public-view-more-link" onClick={handleViewLikers}>
                                View likes
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {!hidePhotoPreview && rec.images && rec.images.length > 0 && (
                <Link to={`/provider/${providerIdForLink}`} className="public-photo-preview">
                    {rec.images.slice(0, 1).map((photo, index) => {
                        const imageSrc = getImageSrc(photo);
                        if (!imageSrc) return null;
                        return (
                            <img 
                                key={index} 
                                src={imageSrc} 
                                alt={`Preview ${index + 1}`} 
                                className="preview-image" 
                            />
                        );
                    })}
                    {rec.images.length > 1 && (
                        <div className="more-photos-indicator">+{rec.images.length - 1}</div>
                    )}
                </Link>
            )}

            {/* Recent Comments Section */}
            {comments.length > 0 && (
                <div className="recent-comments-section">
                    <div className="recent-comments-list">
                        {comments.slice(0, 2).map((comment) => (
                            <div key={comment.id} className="recent-comment-item">
                                <div className="recent-comment-header">
                                    <span className="recent-comment-author">
                                        {comment.preferred_name || comment.user_name || 'Anonymous'}
                                    </span>
                                    <span className="recent-comment-date">
                                        {new Date(comment.created_at).toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric' 
                                        })}
                                    </span>
                                </div>
                                <p className="recent-comment-text">{comment.comment_text}</p>
                            </div>
                        ))}
                    </div>
                    
                    {comments.length > 2 && (
                        <button 
                            className="view-all-comments-link"
                            onClick={() => setIsCommentsDisplayOpen(true)}
                        >
                            View all {comments.length} comments
                        </button>
                    )}
                </div>
            )}

            {/* Inline Comment Form */}
            {loggedInUserId && showInlineCommentForm && (
                <div className="inline-comment-section" ref={inlineCommentRef}>
                    <div className="inline-comment-input-wrapper">
                        <div className="user-avatar">
                            {currentUserName ? currentUserName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <textarea
                            placeholder="Add a comment"
                            className="inline-comment-textarea"
                            value={inlineCommentText}
                            onChange={handleTextareaChange}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey && inlineCommentText.trim()) {
                                    e.preventDefault();
                                    handleInlineCommentSubmit();
                                }
                            }}
                            disabled={isSubmittingInlineComment}
                            autoFocus
                            rows="1"
                            ref={textareaRef}
                        />
                        <button 
                            className="inline-post-button"
                            onClick={handleInlineCommentSubmit}
                            disabled={!inlineCommentText.trim() || isSubmittingInlineComment}
                        >
                            {isSubmittingInlineComment ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                    {commentsError && (
                        <div className="inline-comment-error">{commentsError}</div>
                    )}
                </div>
            )}

            {linkCopied && (<div className="toast">Link copied!</div>)}

            {/* Comment Modal */}
            {isCommentModalOpen && (
                <CommentModal
                    isOpen={isCommentModalOpen}
                    onClose={() => setIsCommentModalOpen(false)}
                    onSubmit={handleCommentSubmit}
                    provider={rec}
                />
            )}

            {/* Comments Display Modal */}
            {isCommentsDisplayOpen && (
                <CommentsDisplay
                    isOpen={isCommentsDisplayOpen}
                    onClose={() => setIsCommentsDisplayOpen(false)}
                    provider={rec}
                    currentUserId={loggedInUserId}
                    currentUserName={currentUserName}
                    comments={comments}
                    onCommentAdded={onCommentAdded}
                />
            )}

            <LikesModal
                isOpen={isLikesModalOpen}
                onClose={() => setIsLikesModalOpen(false)}
                likers={likers}
                isLoading={isLoadingLikers}
                providerName={rec.business_name || "Recommendation"}
                API_URL={API_URL}
            />
        </div>
    );
};

export default RecommendationCard; 