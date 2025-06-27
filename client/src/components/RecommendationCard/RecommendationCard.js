import React, { useEffect, useRef, useState } from 'react';
import { FaPlusCircle, FaStar } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import CommentsDisplay from '../CommentsDisplay/CommentsDisplay';
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

const RecommendationCard = ({ rec, onWriteReview, onLike, isLikedByCurrentUser, loggedInUserId, currentUserName }) => {
    const providerIdForLink = rec.provider_id || rec.id;
    const displayAvgRating = (parseFloat(rec.average_rating) || 0).toFixed(1);
    const displayTotalReviews = parseInt(rec.total_reviews, 10) || 0;
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [isCommentsDisplayOpen, setIsCommentsDisplayOpen] = useState(false);
    const [commentCount, setCommentCount] = useState(0);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [commentsError, setCommentsError] = useState(null);
    const [showCommentForm, setShowCommentForm] = useState(false);
    const dropdownRef = useRef(null);

    const API_URL = 'https://api.seanag-recommendations.org:8080';
    // const API_URL = "http://localhost:3000";

    const shareLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/provider/${providerIdForLink}`);
        setDropdownOpen(false);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    // Fetch comments and count
    useEffect(() => {
        const fetchComments = async () => {
            try {
                const response = await fetch(`${API_URL}/api/comments/${providerIdForLink}`);
                if (response.ok) {
                    const data = await response.json();
                    const fetchedComments = data.success ? data.comments : [];
                    setComments(fetchedComments);
                    setCommentCount(fetchedComments.length);
                } else {
                    setComments([]);
                    setCommentCount(0);
                }
            } catch (error) {
                console.error('Error fetching comments:', error);
                setComments([]);
                setCommentCount(0);
            }
        };

        if (providerIdForLink) {
            fetchComments();
        }
    }, [providerIdForLink, API_URL]);

    // Handle comment submission
    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!loggedInUserId || !newComment.trim()) return;

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
                    comment_text: newComment.trim()
                })
            });

            if (response.ok) {
                const result = await response.json();
                // Add new comment to the beginning of the list
                const newCommentObj = {
                    id: result.comment_id || Date.now(),
                    comment_text: newComment.trim(),
                    user_id: loggedInUserId,
                    preferred_name: currentUserName,
                    created_at: new Date().toISOString()
                };
                setComments(prev => [newCommentObj, ...prev]);
                setCommentCount(prev => prev + 1);
                setNewComment('');
                setShowCommentForm(false);
                setCommentsError(null);
            } else {
                throw new Error('Failed to submit comment');
            }
        } catch (error) {
            console.error('Error submitting comment:', error);
            setCommentsError('Failed to submit comment. Please try again.');
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

            {rec.recommender_name && (
                <>
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
                        rec.users_who_reviewed.filter(name => 
                            name && name !== rec.recommender_name
                        ).length > 0 && (
                            <div className="public-recommended-row">
                                <span className="public-recommended-label">
                                    Also used by:
                                </span>
                                <span className="public-used-by-names">
                                    {rec.users_who_reviewed
                                        .filter(name => 
                                            name && name !== rec.recommender_name
                                        )
                                        .join(", ")}
                                </span>
                            </div>
                        )}
                </>
            )}

            {/* Bottom Action Bar */}
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
                        className={`public-comment-button ${showCommentForm ? 'active' : ''}`}
                        onClick={() => {
                            if (commentCount > 0 && !loggedInUserId) {
                                setIsCommentsDisplayOpen(true);
                            } else if (loggedInUserId) {
                                setShowCommentForm(!showCommentForm);
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

            {/* Recent Comments Section */}
            {comments.length > 0 && (
                <div className="recent-comments-section">
                    {comments.slice(0, 2).map((comment) => (
                        <div key={comment.id} className="comment-preview">
                            <div className="comment-preview-header">
                                <span className="comment-preview-author">
                                    {comment.preferred_name || comment.user_name || 'Anonymous'}
                                </span>
                                <span className="comment-preview-date">
                                    {new Date(comment.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="comment-preview-text">{comment.comment_text}</div>
                        </div>
                    ))}
                    
                    {comments.length > 2 && (
                        <button 
                            className="view-all-comments-inline"
                            onClick={() => setIsCommentsDisplayOpen(true)}
                        >
                            View all {commentCount} comments
                        </button>
                    )}
                </div>
            )}

            {/* Add Comment Form */}
            {showCommentForm && loggedInUserId && (
                <form onSubmit={handleCommentSubmit} className="inline-comment-form">
                    <div className="inline-comment-input-wrapper">
                        <div className="user-avatar">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <div className="inline-comment-input-container">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment, @ to mention"
                                rows={2}
                                maxLength={1000}
                            />
                            <div className="inline-comment-actions">
                                <button 
                                    type="button" 
                                    onClick={() => setShowCommentForm(false)}
                                    className="cancel-comment-button"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={!newComment.trim()} 
                                    className="post-comment-button"
                                >
                                    Post
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            )}
            {linkCopied && (<div className="public-toast">Link copied to clipboard!</div>)}
            {commentsError && (<div className="public-toast error">{commentsError}</div>)}

            <CommentsDisplay
                isOpen={isCommentsDisplayOpen}
                onClose={() => setIsCommentsDisplayOpen(false)}
                provider={rec}
                currentUserId={loggedInUserId}
            />
        </div>
    );
};

export default RecommendationCard; 