import { useUser } from "@clerk/clerk-react";
import { EnvelopeIcon } from "@heroicons/react/24/solid";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    FaConciergeBell,
    FaMapMarkerAlt,
    FaPlusCircle,
    FaStar,
    FaThumbsUp
} from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import TrustScoreWheel from "../../components/TrustScoreWheel/TrustScoreWheel";
import "../Profile/Profile.css";
import "./PublicProfile.css";

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = "http://localhost:3000";

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
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            processTagInput();
        }
    };

    const processTagInput = () => {
        if (!tagInput.trim()) return;
        
        // Split by comma and process each tag
        const newTags = tagInput
            .split(',')
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag && !tags.includes(tag));
        
        if (newTags.length > 0) {
            setTags([...tags, ...newTags]);
        }
        setTagInput("");
    };

    // Handle blur event to process comma-separated tags when user leaves input
    const handleTagInputBlur = () => {
        if (tagInput.includes(',')) {
            processTagInput();
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
                        <label>Add tags (press Enter or comma to add):</label>
                        <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} onBlur={handleTagInputBlur} placeholder="e.g. friendly, affordable" />
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
        <div className="public-profile-scope">
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
        </div>
    );
};

// Add this badge component after the existing components but before PublicProfile component
const AchievementBadge = ({ recCount }) => {
    const getBadgeInfo = (count) => {
        if (count >= 100) {
            return {
                level: 'Diamond',
                tier: 'Diamond Recommender',
                className: 'achievement-badge-diamond',
                icon: '💎',
                description: `Diamond Recommender (${count} recommendations)`
            };
        } else if (count >= 50) {
            return {
                level: 'Platinum',
                tier: 'Platinum Recommender',
                className: 'achievement-badge-platinum',
                icon: '⭐',
                description: `Platinum Recommender (${count} recommendations)`
            };
        } else if (count >= 25) {
            return {
                level: 'Gold',
                tier: 'Gold Recommender',
                className: 'achievement-badge-gold',
                icon: '🏆',
                description: `Gold Recommender (${count} recommendations)`
            };
        } else if (count >= 10) {
            return {
                level: 'Silver',
                tier: 'Silver Recommender',
                className: 'achievement-badge-silver',
                icon: '🥈',
                description: `Silver Recommender (${count} recommendations)`
            };
        } else if (count >= 1) {
            return {
                level: 'Bronze',
                tier: 'Bronze Recommender',
                className: 'achievement-badge-bronze',
                icon: '🥉',
                description: `Bronze Recommender (${count} recommendations)`
            };
        }
        return null;
    };

    const badge = getBadgeInfo(recCount);

    if (!badge) {
        // Show placeholder for users with 0 recommendations (in public view)
        return (
            <div className="achievement-badge-starter" title="This user hasn't shared any recommendations yet">
                <div className="achievement-badge-icon">🌟</div>
            </div>
        );
    }

    return (
        <div className={`achievement-badge-circular ${badge.className}`} title={badge.description}>
            <div className="achievement-badge-icon">{badge.icon}</div>
        </div>
    );
};

const UnfollowConfirmationModal = ({ isOpen, onClose, onConfirm, userName, isLoading }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2 style={{ marginTop: 0 }}>Unfollow {userName}?</h2>
                <p>
                    Their recommendations will no longer appear in your feed. You can always follow them back later.
                </p>
                <div className="modal-buttons" style={{ justifyContent: 'flex-end' }}>
                    <button type="button" onClick={onClose} className="cancel-button" disabled={isLoading}>
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        onClick={onConfirm} 
                        className="submit-button danger" 
                        disabled={isLoading}
                    >
                        {isLoading ? 'Processing...' : 'Unfollow'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PublicProfile = () => {
    const { username } = useParams();
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
    const [imageFailed, setImageFailed] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('not_connected');
    const [isFollowLoading, setIsFollowLoading] = useState(false);
    const [isUnfollowModalOpen, setIsUnfollowModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCities, setSelectedCities] = useState([]);
    const [showCityFilter, setShowCityFilter] = useState(false);
    const [selectedServices, setSelectedServices] = useState([]);
    const [showServiceFilter, setShowServiceFilter] = useState(false);
    const [userScore, setUserScore] = useState(0);


    useEffect(() => {
        if (isLoaded && user) {
            setCurrentUserId(user.id);
            setCurrentUserEmail(user.primaryEmailAddress?.emailAddress);
        } else if (isLoaded && !isSignedIn) {
            setCurrentUserId(null);
            setCurrentUserEmail(null);
        }
    }, [isLoaded, isSignedIn, user]);

    const fetchPageData = useCallback(async () => {
        if (!username || !isLoaded) return;
        setLoading(true);
        setError(null);
        const loggedInUserId = user ? user.id : null;
        try {
            const profileRes = await fetch(`${API_URL}/api/users/public-profile/${username}?loggedInUserId=${loggedInUserId || ''}`);
            if (!profileRes.ok) throw new Error("Failed to fetch profile data");
            const data = await profileRes.json();
            setProfileInfo(data);
            
            // Fetch user score for Trust Points Wheel
            try {
                const scoreResponse = await fetch(`${API_URL}/api/users/preferred-name?email=${encodeURIComponent(data.userEmail || '')}`);
                if (scoreResponse.ok) {
                    const scoreData = await scoreResponse.json();
                    const score = parseInt(scoreData.userScore || scoreData.user_score) || 0;
                    setUserScore(score);
                } else {
                    setUserScore(0);
                }
            } catch (scoreError) {
                console.error("Error fetching user score:", scoreError);
                setUserScore(0);
            }
            
            const followersRes = await fetch(`${API_URL}/api/connections/followers?user_id=${data.clerkId}`);
            if (followersRes.ok) {
                const followersData = await followersRes.json();
                setConnections(Array.isArray(followersData) ? followersData : []);
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
    }, [username, isLoaded, user]);

    // Add this function to fetch connection status
    const fetchConnectionStatus = useCallback(async () => {
    if (!currentUserId || !profileInfo?.userId || currentUserId === profileInfo.userId) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/connections/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fromUserId: currentUserId,
            toUserId: profileInfo.userId
        })
        });

        if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data.status);
        }
    } catch (error) {
        console.error('Error fetching connection status:', error);
    }
    }, [currentUserId, profileInfo?.userId]);

    const handleConfirmUnfollow = async () => {
        if (!currentUserId || !profileInfo?.userId || isFollowLoading) return;
    
        setIsFollowLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/connections/remove`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromUserId: currentUserId,
                    toUserId: profileInfo.userId
                })
            });
    
            if (response.ok) {
                setConnectionStatus('not_connected');
                fetchPageData(); // Refresh data to update follower count, etc.
            } else {
                alert('Failed to unfollow user. Please try again.');
            }
        } catch (error) {
            console.error('Error removing connection:', error);
            alert('An error occurred while trying to unfollow.');
        } finally {
            setIsFollowLoading(false);
            setIsUnfollowModalOpen(false); // Close the modal regardless of outcome
        }
    };

    // Add this function to handle follow/unfollow
    const handleFollowToggle = async () => {
    if (!currentUserId || !profileInfo?.userId || isFollowLoading) return;

    if (connectionStatus === 'connected') {
        // Open the confirmation modal instead of directly unfollowing
        setIsUnfollowModalOpen(true);
        return; 
    }

    setIsFollowLoading(true);
    try {
        // Follow logic remains the same
        const response = await fetch(`${API_URL}/api/connections/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            fromUserId: currentUserId,
            toUserId: profileInfo.userId
            })
        });

        if (response.ok) {
            const data = await response.json();
            setConnectionStatus(data.status === 'accepted' ? 'connected' : 'pending_outbound');
            // Refresh connections count
            fetchPageData();
        }
    } catch (error) {
        console.error('Error toggling follow status:', error);
        alert('Failed to update follow status');
    } finally {
        setIsFollowLoading(false);
    }
    };

    // Add this function to render the follow button
    const renderFollowButton = () => {
    if (!isSignedIn || !currentUserId || currentUserId === profileInfo?.userId) {
        return null;
    }

    const getButtonText = () => {
        switch (connectionStatus) {
            case 'connected':
                return <span className="follow-text">Following</span>;
            case 'pending_outbound':
                return <span className="follow-text">Requested</span>;
            case 'pending_inbound':
                return <span className="follow-text">Accept Request</span>;
            default:
                return <span className="follow-text">Follow</span>;
        }
    };

    const getButtonClass = () => {
        switch (connectionStatus) {
            case 'connected':
                return 'follow-button following';
            case 'pending_outbound':
                return 'follow-button pending';
            case 'pending_inbound':
                return 'follow-button accept';
            default:
                return 'follow-button';
        }
    };

    return (
        <button
            className={getButtonClass()}
            onClick={handleFollowToggle}
            disabled={isFollowLoading}
        >
            {isFollowLoading ? (
                <>
                    <span>⏳</span>
                    <span>Loading...</span>
                </>
            ) : (
                getButtonText()
            )}
        </button>
    );
    };

    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);
    
    useEffect(() => {
        if (profileInfo && currentUserId) {
            fetchConnectionStatus();
        }
    }, [profileInfo, currentUserId, fetchConnectionStatus]);

    const getInitials = (name, email) => {
        if (name) {
            const names = name.split(' ').filter(n => n);
            if (names.length > 1) { return (names[0][0] + names[names.length - 1][0]).toUpperCase(); }
            else if (names.length === 1 && names[0].length > 1) { return names[0].substring(0, 2).toUpperCase(); }
            else if (names.length === 1 && names[0].length) { return names[0][0].toUpperCase(); }
        }
        if (email && email.length > 0) return email[0].toUpperCase();
        return "U";
    };

    const handleImageError = () => {
        setImageFailed(true);
    };

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
                body: JSON.stringify({ userId: currentUserId, userEmail: currentUserEmail })
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

    const sortedRecommendations = useMemo(() => {
        let sortableItems = [...recommendations];
        
        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            sortableItems = sortableItems.filter(item => {
                const businessName = (item.business_name || "").toLowerCase();
                const message = (item.recommender_message || "").toLowerCase();
                const tags = Array.isArray(item.tags) ? item.tags.join(" ").toLowerCase() : "";
                const contactName = (item.provider_contact_name || item.business_contact || "").toLowerCase();
                
                return businessName.includes(query) || 
                       message.includes(query) || 
                       tags.includes(query) ||
                       contactName.includes(query);
            });
        }
        
        // Apply service filter
        if (selectedServices.length > 0) {
            sortableItems = sortableItems.filter(item => {
                const itemService = item.recommended_service_name || "Other";
                return selectedServices.includes(itemService);
            });
        }
        
        // Apply city filter
        if (selectedCities.length > 0) {
            sortableItems = sortableItems.filter(item => {
                const itemCity = item.city || "Other";
                return selectedCities.includes(itemCity);
            });
        }
        
        return sortableItems;
    }, [recommendations, searchQuery, selectedCities, selectedServices]);

    const availableCities = useMemo(() => {
        if (!recommendations || recommendations.length === 0) return [];
        const cityCounts = recommendations.reduce((acc, rec) => {
            const city = rec.city || "Other";
            acc[city] = (acc[city] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(cityCounts).sort(([, countA], [, countB]) => countB - countA);
    }, [recommendations]);

    const availableServices = useMemo(() => {
        if (!recommendations || recommendations.length === 0) return [];
        const serviceCounts = recommendations.reduce((acc, rec) => {
            const service = rec.recommended_service_name || "Other";
            if (service) {
                acc[service] = (acc[service] || 0) + 1;
            }
            return acc;
        }, {});

        return Object.entries(serviceCounts).sort(([, countA], [, countB]) => countB - countA);
    }, [recommendations]);

    const handleServiceSelection = (serviceName) => {
        setSelectedServices((prev) =>
            prev.includes(serviceName) ? prev.filter((s) => s !== serviceName) : [...prev, serviceName]
        );
    };

    const handleCitySelection = (cityName) => {
        setSelectedCities((prev) =>
            prev.includes(cityName) ? prev.filter((c) => c !== cityName) : [...prev, cityName]
        );
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

    const { userName, userBio, userEmail: profileUserEmail, userPhone: profileUserPhone, profileImage } = profileInfo;

    return (
        <div className="profile-page-container">
            <header className="profile-hero-header">
                <div className="profile-hero-content">
                    <div className="profile-avatar-wrapper">
                         {profileImage && !imageFailed ? (
                            <img
                                src={`${API_URL}${profileImage}`}
                                alt={userName || profileUserEmail}
                                className="profile-avatar-image"
                                onError={handleImageError}
                            />
                        ) : (
                            <div className="profile-avatar-initials">
                                <span>{getInitials(userName, profileUserEmail)}</span>
                            </div>
                        )}
                    </div>
                    <div className="profile-details-wrapper">
                        <div className="profile-header-top">
                            <h1 className="profile-user-name">{userName || "User Profile"}</h1>
                            {renderFollowButton()}
                        </div>
                        
                        <div className="profile-contact-info">
                            {profileUserPhone && (
                                <a 
                                    href={`sms:${profileUserPhone.replace(/\D/g, '')}`} 
                                    className="profile-contact-link phone"
                                    title="Send a text to this person"
                                >
                                    <svg className="contact-icon" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                                    </svg>
                                    {profileUserPhone}
                                </a>
                            )}
                            
                            {profileUserEmail && (
                                <a 
                                    href={`mailto:${profileUserEmail}`} 
                                    className="profile-contact-link email"
                                    title="Send email to this person"
                                >
                                    <EnvelopeIcon className="contact-icon" />
                                    {profileUserEmail}
                                </a>
                            )}
                        </div>
                        
                        {userBio && (
                            <blockquote className="profile-user-bio">
                                <p>{userBio}</p>
                            </blockquote>
                        )}
                    </div>
                    <div className="profile-stats-wrapper">
                        <div className="profile-top-stats">
                            <div className="profile-stat-item">
                                <span className="profile-stat-number">{recommendations.length}</span>
                                <span className="profile-stat-label">Recommendations</span>
                            </div>
                            <div className="profile-stat-item">
                                <span className="profile-stat-number">{connections.length}</span>
                                <span className="profile-stat-label">Followers</span>
                            </div>
                        </div>
                        <div className="profile-stat-item">
                            <div className="profile-trust-score-wrapper">
                                <TrustScoreWheel 
                                    score={userScore} 
                                    showDebug={false}
                                />
                            </div>
                        </div>
                        <div className="profile-stat-item profile-achievement-hidden" style={{display: 'none'}}>
                            <div className="profile-stat-achievement">
                                <AchievementBadge recCount={recommendations.length} />
                            </div>
                            <span className="profile-stat-label">
                                {(() => {
                                    const count = recommendations.length;
                                    if (count >= 100) return 'Diamond Recommender';
                                    if (count >= 50) return 'Platinum Recommender';
                                    if (count >= 25) return 'Gold Recommender';
                                    if (count >= 10) return 'Silver Recommender';
                                    if (count >= 1) return 'Bronze Recommender';
                                    return 'Getting Started';
                                })()}
                            </span>
                            {(() => {
                                const count = recommendations.length;
                                let nextTier, remaining;
                                if (count < 1) {
                                    nextTier = 'Bronze';
                                    remaining = 1 - count;
                                } else if (count < 10) {
                                    nextTier = 'Silver';
                                    remaining = 10 - count;
                                } else if (count < 25) {
                                    nextTier = 'Gold';
                                    remaining = 25 - count;
                                } else if (count < 50) {
                                    nextTier = 'Platinum';
                                    remaining = 50 - count;
                                } else if (count < 100) {
                                    nextTier = 'Diamond';
                                    remaining = 100 - count;
                                } else {
                                    return null; // Max tier reached
                                }
                                return (
                                    <span className="profile-stat-progress">
                                        {count === 0 ? 'No recommendations yet' : `${remaining} more to reach ${nextTier}`}
                                    </span>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </header>

            <main className="profile-content-area">
                <div className="profile-recommendations-header">
                    <h2>{userName ? `${userName}'s Recommendations` : "Recommendations"}</h2>
                    {recommendations.length > 0 && (
                        <div className="profile-search-wrapper">
                            <div className="profile-search-container">
                                <svg className="profile-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search recommendations..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="profile-search-input"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="profile-search-clear"
                                        title="Clear search"
                                    >
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <div
                                className={`filters-container ${
                                    showCityFilter || showServiceFilter
                                        ? "filters-container--open"
                                        : ""
                                }`}
                            >
                                {availableServices.length > 0 && (
                                    <div className="profile-city-filter-toggle-section">
                                        <button
                                            className="profile-city-filter-toggle"
                                            onClick={() =>
                                                setShowServiceFilter(
                                                    !showServiceFilter
                                                )
                                            }
                                        >
                                            <FaConciergeBell className="profile-filter-icon" />
                                            <span className="filter-button-text">
                                                <span className="filter-button-text-long">
                                                    Filter by{" "}
                                                </span>
                                                <span>Service</span>
                                            </span>
                                            {selectedServices.length > 0 && (
                                                <span className="profile-active-filters-badge">
                                                    {selectedServices.length}
                                                </span>
                                            )}
                                            <svg
                                                className={`profile-filter-chevron ${
                                                    showServiceFilter
                                                        ? "rotated"
                                                        : ""
                                                }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M19 9l-7 7-7-7"
                                                />
                                            </svg>
                                        </button>

                                        {showServiceFilter && (
                                            <div className="profile-city-filter-wrapper">
                                                <div className="profile-city-filter-checkboxes">
                                                    {availableServices.map(
                                                        ([service, count]) => (
                                                            <div
                                                                key={service}
                                                                className="profile-city-checkbox-item"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    id={`service-${service.replace(/\s+/g, '-')}`}
                                                                    name={service}
                                                                    checked={selectedServices.includes(
                                                                        service
                                                                    )}
                                                                    onChange={() =>
                                                                        handleServiceSelection(
                                                                            service
                                                                        )
                                                                    }
                                                                />
                                                                <label
                                                                    htmlFor={`service-${service.replace(/\s+/g, '-')}`}
                                                                    className="profile-city-checkbox-label"
                                                                >
                                                                    {service}
                                                                </label>
                                                                <span className="profile-city-count">
                                                                    ({count})
                                                                </span>
                                                            </div>
                                                        )
                                                    )}
                                                    {selectedServices.length > 0 && (
                                                        <button
                                                            className="profile-city-clear-all"
                                                            onClick={() => setSelectedServices([])}
                                                            title="Clear all service filters"
                                                        >
                                                            Clear All
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {availableCities.length > 1 && (
                                    <div className="profile-city-filter-toggle-section">
                                        <button
                                            className="profile-city-filter-toggle"
                                            onClick={() =>
                                                setShowCityFilter(
                                                    !showCityFilter
                                                )
                                            }
                                        >
                                            <FaMapMarkerAlt className="profile-filter-icon" />
                                            <span className="filter-button-text">
                                                <span className="filter-button-text-long">
                                                    Filter by{" "}
                                                </span>
                                                <span>City</span>
                                            </span>
                                            {selectedCities.length > 0 && (
                                                <span className="profile-active-filters-badge">
                                                    {selectedCities.length}
                                                </span>
                                            )}
                                            <svg
                                                className={`profile-filter-chevron ${
                                                    showCityFilter
                                                        ? "rotated"
                                                        : ""
                                                }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M19 9l-7 7-7-7"
                                                />
                                            </svg>
                                        </button>

                                        {showCityFilter && (
                                            <div className="profile-city-filter-wrapper">
                                                <div className="profile-city-filter-checkboxes">
                                                    {availableCities.map(
                                                        ([city, count]) => (
                                                            <div
                                                                key={city}
                                                                className="profile-city-checkbox-item"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    id={`city-${city.replace(
                                                                        /\s+/g,
                                                                        '-'
                                                                    )}`}
                                                                    name={city}
                                                                    checked={selectedCities.includes(
                                                                        city
                                                                    )}
                                                                    onChange={() =>
                                                                        handleCitySelection(
                                                                            city
                                                                        )
                                                                    }
                                                                />
                                                                <label
                                                                    htmlFor={`city-${city.replace(
                                                                        /\s+/g,
                                                                        '-'
                                                                    )}`}
                                                                    className="profile-city-checkbox-label"
                                                                >
                                                                    {city}
                                                                </label>
                                                                <span className="profile-city-count">
                                                                    ({count})
                                                                </span>
                                                            </div>
                                                        )
                                                    )}
                                                    {selectedCities.length > 0 && (
                                                        <button
                                                            className="profile-city-clear-all"
                                                            onClick={() => setSelectedCities([])}
                                                            title="Clear all city filters"
                                                        >
                                                            Clear All
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {sortedRecommendations.length > 0 && (
                                <span className="profile-recommendations-count">
                                    {searchQuery.trim() ||
                                    selectedCities.length > 0 ||
                                    selectedServices.length > 0 ? `${sortedRecommendations.length} of ${recommendations.length} recommendations` : `${sortedRecommendations.length} recommendations`}
                                </span>
                            )}
                        </div>
                    )}
                </div>
                 {sortedRecommendations.length > 0 ? (
                    <ul className="provider-list">
                        {sortedRecommendations.map((rec) => (
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
                    (searchQuery.trim() || selectedCities.length > 0 || selectedServices.length > 0) ? (
                        <div className="profile-empty-state no-search-results">
                            <svg className="no-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <p>
                                No recommendations found
                                {searchQuery.trim() && ` for "${searchQuery}"`}
                                {selectedServices.length > 0 && ` for ${selectedServices.join(", ")}`}
                                {selectedCities.length > 0 && ` in ${selectedCities.join(", ")}`}
                            </p>
                            <p className="search-suggestions">
                                Try {searchQuery.trim() ? "different search terms" : "selecting different cities"} 
                                {searchQuery.trim() && selectedCities.length > 0 ? " or clearing filters" : ""}.
                            </p>
                            <div className="profile-filter-clear-buttons">
                                {searchQuery.trim() && (
                                    <button
                                        className="profile-secondary-action-btn"
                                        onClick={() => setSearchQuery("")}
                                    >
                                        Clear Search
                                    </button>
                                )}
                                {selectedServices.length > 0 && (
                                    <button
                                        className="profile-secondary-action-btn"
                                        onClick={() => setSelectedServices([])}
                                    >
                                        Clear Service Filters
                                    </button>
                                )}
                                {selectedCities.length > 0 && (
                                    <button
                                        className="profile-secondary-action-btn"
                                        onClick={() => setSelectedCities([])}
                                    >
                                        Clear City Filters
                                    </button>
                                )}
                                {(searchQuery.trim() || selectedCities.length > 0 || selectedServices.length > 0) && (
                                    <button
                                        className="profile-secondary-action-btn"
                                        onClick={() => {
                                            setSearchQuery("");
                                            setSelectedCities([]);
                                            setSelectedServices([]);
                                        }}
                                    >
                                        Clear All Filters
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="profile-empty-state no-providers-message">
                            <FaStar className="no-providers-icon" />
                            <p>{userName ? `${userName} hasn't` : "This user hasn't"} made any recommendations yet.</p>
                        </div>
                    )
                )}
            </main>

            <UnfollowConfirmationModal
                isOpen={isUnfollowModalOpen}
                onClose={() => setIsUnfollowModalOpen(false)}
                onConfirm={handleConfirmUnfollow}
                userName={profileInfo?.userName || 'this user'}
                isLoading={isFollowLoading}
            />

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
