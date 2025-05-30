import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { FaStar, FaThumbsUp, FaPlusCircle } from "react-icons/fa";
import { EnvelopeIcon, UsersIcon as UsersIconSolid, UserCircleIcon } from "@heroicons/react/24/solid";
import "../Profile/Profile.css";
import "./PublicProfile.css";

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = "http://localhost:3000";

// --- Helper components (StarRatingDisplay, ReviewModal, PublicRecommendationCard) remain the same ---
// (No changes needed in these components)
const StarRatingDisplay = ({ rating }) => {
    const numRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalf = numRating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

    return (
        <div className="star-rating">
            {[...Array(fullStars)].map((_, i) => <FaStar key={`full-${i}`} className="filled" />)}
            {hasHalf && <FaStar key={`half-${Date.now()}`} className="half" />}
            {[...Array(emptyStars)].map((_, i) => <FaStar key={`empty-${i}`} className="empty" />)}
        </div>
    );
};

const ReviewModal = ({ isOpen, onClose, onSubmit, providerName }) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [reviewText, setReviewText] = useState("");
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen) { setRating(0); setHover(0); setReviewText(""); setTags([]); setTagInput(""); setError(""); }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault(); if (!rating) { setError("Please select a rating."); return; }
        onSubmit({ rating, review: reviewText, tags }); onClose();
    };

    const handleTagKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const trimmed = tagInput.trim().toLowerCase();
            if (trimmed && !tags.includes(trimmed)) {
                setTags([...tags, trimmed]);
            }
            setTagInput("");
        }
    };

    const removeTag = (tagToRemove) => setTags(tags.filter((tag) => tag !== tagToRemove));

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content review-modal-content">
                <h2>Review {providerName}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="rating-container">
                        <label>Rate your experience: <span className="required">*</span></label>
                        <div className="stars">
                            {[...Array(5)].map((_, index) => (
                                <FaStar key={index} className={index < (hover || rating) ? "star active" : "star"} onClick={() => setRating(index + 1)} onMouseEnter={() => setHover(index + 1)} onMouseLeave={() => setHover(rating)} />
                            ))}
                        </div>
                        {error && <div className="error-message">{error}</div>}
                    </div>
                    <div className="review-input">
                        <label>Tell us about your experience:</label>
                        <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Optional: Share your thoughts..." rows={4} />
                    </div>
                    <div className="tag-input-group">
                        <label>Add tags (press Enter to add):</label>
                        <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="e.g. friendly, affordable" />
                        <div className="tag-container modal-tag-container">{tags.map((tag, idx) => (<span key={idx} className="tag-badge">{tag} <span className="remove-tag" onClick={() => removeTag(tag)}>×</span></span>))}</div>
                    </div>
                    <div className="modal-buttons">
                        <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
                        <button type="submit" className="submit-button">Submit Review</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const PublicRecommendationCard = ({ rec, onWriteReview, onLike, isLikedByCurrentUser, loggedInUserId, recommenderName }) => {
    const providerIdForLink = rec.provider_id || rec.id;
    const displayAvgRating = (parseFloat(rec.average_rating) || 0).toFixed(1);
    const displayTotalReviews = parseInt(rec.total_reviews, 10) || 0;
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);

    const shareLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/provider/${providerIdForLink}`);
        setDropdownOpen(false);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    return (
        <li className="provider-card">
            <div className="card-header">
                <h3 className="card-title">
                    <Link to={`/provider/${providerIdForLink}`} target="_blank" rel="noopener noreferrer" className="clickable provider-name-link" onClick={() => localStorage.setItem("selectedProvider", JSON.stringify(rec))}>
                        {rec.business_name || "Unknown Business"}
                    </Link>
                </h3>
                <div className="badge-wrapper-with-menu">
                    {(parseFloat(rec.average_rating) || 0) >= 4.5 && (<span className="badge top-rated-badge">Top Rated</span>)}
                    <div className="dropdown-wrapper">
                        <button className="three-dots-button" onClick={() => setDropdownOpen(!dropdownOpen)} title="Options">⋮</button>
                        {dropdownOpen && (
                            <div className="dropdown-menu">
                                <button className="dropdown-item" onClick={shareLink}>Share this Rec</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="review-summary">
                <StarRatingDisplay rating={rec.average_rating || 0} />
                <span className="review-score">{displayAvgRating}</span>
                <span className="review-count">({displayTotalReviews} {displayTotalReviews === 1 ? "review" : "reviews"})</span>
                {loggedInUserId && (
                    <button className="write-review-link" onClick={() => onWriteReview(rec)}>Write a Review</button>
                )}
                <button className={`like-button ${isLikedByCurrentUser ? 'liked' : ''}`} onClick={() => onLike(providerIdForLink)} title={isLikedByCurrentUser ? "Unlike" : "Like"} disabled={!loggedInUserId}>
                    <FaThumbsUp /> <span className="like-count">{rec.num_likes || 0}</span>
                </button>
            </div>

            <p className="card-description">{rec.recommender_message || "No description available"}</p>

            <div className="tag-container">
                {Array.isArray(rec.tags) && rec.tags.map((tag, idx) => (
                    <span key={idx} className="tag-badge">{tag}</span>
                ))}
                {loggedInUserId && (
                    <button className="add-tag-button" onClick={() => onWriteReview(rec)} aria-label="Add or edit tags">
                        <FaPlusCircle />
                    </button>
                )}
            </div>

            {recommenderName && (
              <div className="recommended-row">
                  <span className="recommended-label">Recommended by:</span>
                  <span className="recommended-name">{recommenderName}</span>
                  {rec.date_of_recommendation && (
                      <span className="recommendation-date">
                          ({new Date(rec.date_of_recommendation).toLocaleDateString("en-US", { year: "2-digit", month: "numeric", day: "numeric" })})
                      </span>
                  )}
              </div>
            )}

            <div className="action-buttons">
                {loggedInUserId && (rec.recommender_phone || rec.recommender_email) && (
                    <button className="secondary-button" onClick={() => {
                        if (rec.recommender_phone) window.location.href = `sms:${rec.recommender_phone.replace(/\D/g, '')}`;
                        else if (rec.recommender_email) window.location.href = `mailto:${rec.recommender_email}`;
                    }}>Connect with Recommender</button>
                )}
            </div>
            {linkCopied && (<div className="toast">Link copied!</div>)}
        </li>
    );
};


const PublicProfile = () => {
    const { userId } = useParams();
    const { user, isLoaded, isSignedIn } = useUser();

    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserEmail, setCurrentUserEmail] = useState(null);
    const [profileInfo, setProfileInfo] = useState(null);
    const [connections, setConnections] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [likedMap, setLikedMap] = useState(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedProviderForReview, setSelectedProviderForReview] = useState(null);

    // ADDED: State to track if the profile image fails to load.
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        if (isLoaded && user) {
            setCurrentUserId(user.id);
            setCurrentUserEmail(user.primaryEmailAddress?.emailAddress);
        } else if (isLoaded && !isSignedIn) {
            setCurrentUserId(null);
            setCurrentUserEmail(null);
        }
    }, [isLoaded, isSignedIn, user]);

    // ... (fetchPageData and other useEffects remain the same) ...
        const fetchPageData = useCallback(async () => {
        if (!userId || !isLoaded) return;
        setLoading(true);
        setError(null);

        const loggedInUserId = user ? user.id : null;

        try {
            const profileRes = await fetch(`${API_URL}/api/users/public-profile/${userId}?loggedInUserId=${loggedInUserId || ''}`);

            if (!profileRes.ok) throw new Error("Failed to fetch profile data");
            const data = await profileRes.json();
            setProfileInfo(data);

            const connectionsPromise = fetch(`${API_URL}/api/connections/check-connections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId }),
            });
            const connectionsRes = await connectionsPromise;
            if (connectionsRes.ok) {
                const connectionsData = await connectionsRes.json();
                setConnections(Array.isArray(connectionsData) ? connectionsData : []);
            } else {
                setConnections([]);
            }

            const baseRecs = data.recommendations || [];
            const enrichedRecs = await Promise.all(
                baseRecs.map(async (rec) => {
                    const providerId = rec.provider_id || rec.id;
                    try {
                        const statsRes = await fetch(`${API_URL}/api/reviews/stats/${providerId}`);
                        if (statsRes.ok) {
                            const statsData = await statsRes.json();
                            return {
                                ...rec,
                                average_rating: parseFloat(statsData.average_rating) || 0,
                                total_reviews: parseInt(statsData.total_reviews, 10) || 0,
                            };
                        }
                    } catch (e) {
                        console.error(`Failed to fetch stats for provider ${providerId}`, e);
                    }
                    return {
                        ...rec,
                        average_rating: parseFloat(rec.average_rating) || 0,
                        total_reviews: parseInt(rec.total_reviews, 10) || 0,
                    };
                })
            );

            setRecommendations(enrichedRecs);

            const initialLikes = new Map();
            enrichedRecs.forEach(r => {
                if (r.currentUserLiked) {
                    initialLikes.set(r.id || r.provider_id, true);
                }
            });
            setLikedMap(initialLikes);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userId, isLoaded, user]);


    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);


    // ADDED: Helper function to get user initials, adapted from CommunityProfile.js
    const getInitials = (name, email) => {
        if (name) {
            const names = name.split(' ').filter(n => n);
            if (names.length > 1) { return (names[0][0] + names[names.length - 1][0]).toUpperCase(); }
            else if (names.length === 1 && names[0].length > 1) { return names[0].substring(0, 2).toUpperCase(); }
            else if (names.length === 1 && names[0].length) { return names[0][0].toUpperCase(); }
        }
        if (email && email.length > 0) return email[0].toUpperCase();
        return "U"; // Ultimate fallback
    };

    // ADDED: Simple error handler for the image
    const handleImageError = () => {
        setImageFailed(true);
    };

    // ... (handleReviewSubmit and handleLikeToggle remain the same) ...
        const handleOpenReviewModal = (provider) => {
        setSelectedProviderForReview(provider);
        setReviewModalOpen(true);
    };

    const handleReviewSubmit = async (reviewData) => {
        if (!isSignedIn || !selectedProviderForReview || !currentUserId || !currentUserEmail) {
            alert("Please sign in to submit a review.");
            return;
        }
        const providerIdToUse = selectedProviderForReview.provider_id || selectedProviderForReview.id;
        try {
            const response = await fetch(`${API_URL}/api/reviews`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider_id: providerIdToUse,
                    provider_email: selectedProviderForReview.email || "",
                    user_id: currentUserId,
                    email: currentUserEmail,
                    rating: reviewData.rating, content: reviewData.review, tags: reviewData.tags,
                }),
            });
            if (!response.ok) throw new Error("Failed to submit review.");
            setReviewModalOpen(false);
            fetchPageData();
        } catch (err) {
            alert(`Error submitting review: ${err.message}`);
        }
    };

    const handleLikeToggle = async (providerId) => {
        if (!isSignedIn || !currentUserId || !currentUserEmail) {
            alert("Please log in to like recommendations.");
            return;
        }

        const originalRecs = JSON.parse(JSON.stringify(recommendations));
        const originalLikedMap = new Map(likedMap);
        const isCurrentlyLiked = likedMap.get(providerId) || false;

        setRecommendations(prev => prev.map(rec => {
            const currentRecId = rec.id || rec.provider_id;
            if (currentRecId === providerId) {
                return {
                    ...rec,
                    currentUserLiked: !isCurrentlyLiked,
                    num_likes: !isCurrentlyLiked ? (rec.num_likes || 0) + 1 : Math.max(0, (rec.num_likes || 0) - 1)
                };
            }
            return rec;
        }));
        setLikedMap(prev => new Map(prev).set(providerId, !isCurrentlyLiked));

        try {
            const response = await fetch(`${API_URL}/api/providers/${providerId}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUserId,
                    userEmail: currentUserEmail
                })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Failed to update like status.');
            }

            setRecommendations(prev => prev.map(rec => {
                const currentRecId = rec.id || rec.provider_id;
                if (currentRecId === providerId) {
                    return { ...rec, num_likes: result.num_likes, currentUserLiked: result.currentUserLiked };
                }
                return rec;
            }));
            setLikedMap(prev => new Map(prev).set(providerId, result.currentUserLiked));

        } catch (error) {
            alert(`Failed to update like: ${error.message}`);
            setRecommendations(originalRecs);
            setLikedMap(originalLikedMap);
        }
    };

    if (loading) {
        return <div className="profile-loading-container"><div className="profile-spinner"></div><p>Loading Profile...</p></div>;
    }
    if (error) {
        return <div className="profile-error-banner">{error}</div>;
    }
    if (!profileInfo) {
        return <div className="profile-empty-state"><p>User not found or profile could not be loaded.</p></div>;
    }

    const { userName, userBio, userEmail: profileUserEmail, profileImage } = profileInfo;

    return (
        <div className="public-profile-scope profile-page">
            <header className="profile-main-header">
                <div className="profile-avatar-section">
                    {/* CHANGED: This whole block is updated with the new fallback logic */}
                    <div className="profile-avatar-display-wrapper profile-avatar-container">
                        {profileImage && !imageFailed ? (
                            <img
                                src={`${API_URL}${profileImage}`}
                                alt={userName || profileUserEmail}
                                className="profile-avatar-image"
                                onError={handleImageError}
                            />
                        ) : (
                            <div className="profile-avatar-initials-fallback">
                                <span>{getInitials(userName, profileUserEmail)}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="profile-user-info">
                    <h1>{userName || "User Profile"}</h1>
                    {profileUserEmail && (<p><EnvelopeIcon className="inline-icon" />{profileUserEmail}</p>)}
                    {userBio && <p className="profile-user-bio">{userBio}</p>}
                </div>
            </header>

            {/* ... (rest of the component JSX remains the same) ... */}
            <section className="profile-stats-bar">
                <div className="stat-item">
                    <FaStar className="stat-icon" style={{ color: "#ffc107" }} />
                    <span>{recommendations.length}</span>
                    <p>Recommendations Made</p>
                </div>
                <div className="stat-item">
                    <UsersIconSolid className="stat-icon" />
                    <span>{connections.length}</span>
                    <p>Connections</p>
                </div>
            </section>

            <main className="profile-main-content">
                <section className="profile-content-section" id="my-recommendations">
                    <div className="section-header">
                        <h2>{userName ? `${userName}'s Recommendations` : "Recommendations"}</h2>
                    </div>
                    {recommendations.length > 0 ? (
                        <ul className="provider-list">
                            {recommendations.map((rec) => (
                                <PublicRecommendationCard
                                    key={rec.id || rec.provider_id}
                                    rec={rec}
                                    onWriteReview={handleOpenReviewModal}
                                    onLike={handleLikeToggle}
                                    isLikedByCurrentUser={likedMap.get(rec.id || rec.provider_id) || false}
                                    loggedInUserId={currentUserId}
                                    recommenderName={userName}
                                />
                            ))}
                        </ul>
                    ) : (
                         <div className="profile-empty-state no-providers-message">
                            <FaStar className="no-providers-icon" />
                            <p>{userName ? `${userName} hasn't` : "This user hasn't"} made any recommendations yet.</p>
                        </div>
                    )}
                </section>
            </main>

            {selectedProviderForReview && (
                <ReviewModal
                    isOpen={reviewModalOpen}
                    onClose={() => setReviewModalOpen(false)}
                    onSubmit={handleReviewSubmit}
                    providerName={selectedProviderForReview.business_name}
                />
            )}
        </div>
    );
};

export default PublicProfile;