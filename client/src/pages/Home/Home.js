import { SignUpButton, useClerk, useUser } from "@clerk/clerk-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import CountUp from "react-countup";
import { useMediaQuery } from "react-responsive";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import useNotifications from "../../hooks/useNotifications";

import {
    MagnifyingGlassIcon,
    MapPinIcon,
    XMarkIcon
} from "@heroicons/react/24/solid";
import { FaPlusCircle, FaStar, FaThumbsUp } from 'react-icons/fa';
import NotificationModal from "../../components/NotificationModal/NotificationModal";
import TrustScoreWheel from '../../components/TrustScoreWheel/TrustScoreWheel';
import "./Home.css";

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = "http://localhost:3000";

const stateMap = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
};

const stateNameMap = Object.fromEntries(
  Object.entries(stateMap).map(([abbr, name]) => [name.toLowerCase(), name])
);

const getFullStateName = (input) => {
  if (!input) return "";
  const trimmed = input.trim();
  const upper = trimmed.toUpperCase();

  if (stateMap[upper]) {
    return stateMap[upper];
  }

  const lower = trimmed.toLowerCase();
  if (stateNameMap[lower]) {
    return stateNameMap[lower];
  }
  return trimmed;
};

const BRAND_PHRASE = "Tried & Trusted.";

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
            if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
                setTags([...tags, trimmed]);
            }
            setTagInput("");
        }
    };

    const removeTag = (tagToRemove) => setTags(tags.filter((tag) => tag !== tagToRemove));

    if (!isOpen) return null;

    return (
        <div className="modal-overlay review-modal-overlay">
            <div className="modal-content review-modal-content">
                <button className="modal-close-button" onClick={onClose}><XMarkIcon /></button>
                <h2>Review {providerName}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="rating-container">
                        <label>Rate your experience: <span className="required">*</span></label>
                        <div className="stars-interactive">
                            {[...Array(5)].map((_, index) => (
                                <FaStar key={index} className={index < (hover || rating) ? "star-interactive active" : "star-interactive"} onClick={() => setRating(index + 1)} onMouseEnter={() => setHover(index + 1)} onMouseLeave={() => setHover(rating)} />
                            ))}
                        </div>
                        {error && <div className="error-message">{error}</div>}
                    </div>
                    <div className="review-text-input">
                        <label htmlFor="reviewTextArea">Tell us about your experience:</label>
                        <textarea id="reviewTextArea" value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Share your thoughts..." rows={4} />
                    </div>
                    <div className="tag-input-group">
                        <label htmlFor="tagReviewInput">Add tags (up to 5, press Enter):</label>
                        <input id="tagReviewInput" type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="e.g. friendly, affordable" />
                        <div className="tag-container modal-tag-container">{tags.map((tag, idx) => (<span key={idx} className="tag-badge">{tag} <span className="remove-tag" onClick={() => removeTag(tag)}>×</span></span>))}</div>
                    </div>
                    <div className="modal-buttons">
                        <button type="button" onClick={onClose} className="button-cancel">Cancel</button>
                        <button type="submit" className="button-submit">Submit Review</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PublicRecommendationCard = ({ rec, onWriteReview, onLike, isLikedByCurrentUser, loggedInUserId, currentUserName }) => {
    const providerIdForLink = rec.provider_id || rec.id;
    const displayAvgRating = (parseFloat(rec.average_rating) || 0).toFixed(1);
    const displayTotalReviews = parseInt(rec.total_reviews, 10) || 0;
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const dropdownRef = React.useRef(null);

    const shareLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/provider/${providerIdForLink}`);
        setDropdownOpen(false);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
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
                <button
                    className={`public-like-button ${isLikedByCurrentUser ? 'liked' : ''}`}
                    onClick={() => onLike(providerIdForLink)}
                    title={isLikedByCurrentUser ? "Unlike" : "Like"}
                    disabled={!loggedInUserId}
                >
                    <FaThumbsUp /> <span className="public-like-count">{rec.num_likes || 0}</span>
                </button>
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
                <div className="public-recommended-row">
                    <span className="public-recommended-label">Recommended by:</span>
                    <Link to={`/pro/${rec.recommender_username || 'user'}`} className="public-recommended-name">{rec.recommender_name}</Link>
                    {rec.date_of_recommendation && (
                        <span className="public-recommendation-date">
                            ({new Date(rec.date_of_recommendation).toLocaleDateString("en-US", { year: "2-digit", month: "numeric", day: "numeric" })})
                        </span>
                    )}
                </div>
            )}

            <div className="public-action-buttons">
                {loggedInUserId && (rec.recommender_phone || rec.recommender_email) && (
                    <button className="card-connect-button" onClick={() => {
                        if (rec.recommender_phone) window.location.href = `sms:${rec.recommender_phone.replace(/\D/g, '')}`;
                        else if (rec.recommender_email) window.location.href = `mailto:${rec.recommender_email}`;
                    }}>Connect with Recommender</button>
                )}
            </div>
            {linkCopied && (<div className="public-toast">Link copied to clipboard!</div>)}
        </div>
    );
};

const Home = () => {
    const { user, isLoaded, isSignedIn } = useUser();
    const { openSignIn } = useClerk();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useMediaQuery({ maxWidth: 768 });

    // Smart notification management
    const {
        unreadCount: newNotificationsCount,
        notifications,
        isLoadingCount: isLoadingNotificationsCount,
        isLoadingNotifications,
        fetchNotifications,
        markAsRead: handleMarkNotificationAsRead,
        markAllAsRead: handleMarkAllNotificationsAsRead,
        forceRefresh: refreshNotifications
    } = useNotifications();

    // Essential UI state variables
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [preferredName, setPreferredName] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [locationInput, setLocationInput] = useState('');
    const [isEditingLocation, setIsEditingLocation] = useState(false);

    // Typing animation state
    const [displayText, setDisplayText] = useState("");
    const [isTyping, setIsTyping] = useState(true);

    // Other state variables
    const [newRecsCount, setNewRecsCount] = useState(0);
    const [isLoadingNewRecsCount, setIsLoadingNewRecsCount] = useState(true);
    
    const [providerCount, setProviderCount] = useState(0);
    const [connectionCount, setConnectionCount] = useState(0);
    const [communityCount, setCommunityCount] = useState(0);
    const [isLoadingCounts, setIsLoadingCounts] = useState(true);
    
    const [recentRecommendations, setRecentRecommendations] = useState([]);
    const [isLoadingRecentRecommendations, setIsLoadingRecentRecommendations] = useState(true);
    const [likedRecommendations, setLikedRecommendations] = useState(new Set());
    const [recentRecommendationsError, setRecentRecommendationsError] = useState(null);

    const [publicRecommendations, setPublicRecommendations] = useState([]);
    const [isLoadingPublicRecommendations, setIsLoadingPublicRecommendations] = useState(true);
    const [publicRecommendationsError, setPublicRecommendationsError] = useState(null);

    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [providerForReview, setProviderForReview] = useState(null);

    // Notification modal state
    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

    // Loading states for counts
    const [showStatsLine, setShowStatsLine] = useState(false);

    // Mock data for new dashboard features
    const [progressToNextLevel, setProgressToNextLevel] = useState(0);
    const [currentLevel, setCurrentLevel] = useState(0);
    const [userScore, setUserScore] = useState(0);
    const [isLoadingUserScore, setIsLoadingUserScore] = useState(true);

    // Leaderboard data from connections
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);

    useEffect(() => {
        // Update local storage whenever location changes, ensuring persistence for non-logged-in users
        // or as a fallback.
        if (city && state) {
            localStorage.setItem('userSelectedLocation', `${city}, ${state}`);
        }
    }, [city, state]);

    const handleUpdateLocation = async () => {
        setIsEditingLocation(false);
        const originalLocation = `${city}, ${state}`;

        if (locationInput !== originalLocation && isSignedIn && user) {
            const parts = locationInput.split(',').map(p => p.trim());
            const newCity = parts[0] || '';
            const newState = parts.length > 1 ? getFullStateName(parts[1]) : '';

            if (!newCity || !newState) {
                console.warn("Invalid location format. Reverting.");
                setLocationInput(`${city}, ${state}`); // Revert input field
                return;
            }

            const previousCity = city;
            const previousState = state;

            // Optimistically update UI
            setCity(newCity);
            setState(newState);
            setLocationInput(`${newCity}, ${newState}`); // Update input to reflect change

            try {
                const session = await window.Clerk.session.getToken();
                const response = await fetch(`${API_URL}/api/users/me/location`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session}`
                    },
                    body: JSON.stringify({
                        email: user.primaryEmailAddress.emailAddress,
                        location: newCity,
                        state: newState,
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to update location on the backend.");
                }
            } catch (error) {
                console.error("Error updating location, reverting UI change.", error);
                // Revert the optimistic update
                setCity(previousCity);
                setState(previousState);
                setLocationInput(`${previousCity}, ${previousState}`);
            }
        }
    };

    // Blue gradient color function (light blue to dark blue)
    const getBlueGradientColor = (percentage) => {
        // Light blue: #87CEEB (135, 206, 235)
        // Dark blue: #1A365D (26, 54, 93)
        const lightBlue = { r: 135, g: 206, b: 235 };
        const darkBlue = { r: 26, g: 54, b: 93 };
        
        const ratio = percentage / 100;
        const r = Math.round(lightBlue.r + (darkBlue.r - lightBlue.r) * ratio);
        const g = Math.round(lightBlue.g + (darkBlue.g - lightBlue.g) * ratio);
        const b = Math.round(lightBlue.b + (darkBlue.b - lightBlue.b) * ratio);
        
        return `rgb(${r}, ${g}, ${b})`;
    };

    const particlesInit = useCallback(async (engine) => {
        await loadFull(engine);
    }, []);

    const particlesOptions = useMemo(() => ({
        background: { color: { value: "transparent" } },
        fpsLimit: 60,
        interactivity: {
            events: {
                onHover: { enable: true, mode: "grab" },
                onClick: { enable: false, mode: "push" },
            },
            modes: {
                grab: { distance: 140, links: { opacity: 0.1 } },
                push: { quantity: 1 },
            },
        },
        particles: {
            color: { value: "#1A365D" },
            links: { color: "#1A365D", distance: 150, enable: true, opacity: 0.25, width: 1, triangles: { enable: true, opacity: 0.02, color: { value: "#1A365D" } } },
            collisions: { enable: false },
            move: { direction: "none", enable: true, outModes: { default: "bounce" }, random: true, speed: 0.5, straight: false },
            number: { density: { enable: true, area: 900 }, value: isMobile ? 30 : 60 },
            opacity: { value: { min: 0.1, max: 0.35 }, animation: { enable: true, speed: 0.6, minimumValue: 0.05, sync: false } },
            shape: { type: "circle" },
            size: { value: { min: 1, max: 2.5 }, animation: { enable: true, speed: 1.5, minimumValue: 0.5, sync: false } },
        },
        detectRetina: true,
        fullScreen: { enable: true, zIndex: -1 }
    }), [isMobile]);

    const handleOpenReviewModal = (provider) => {
        if (!isSignedIn) { openSignIn(); return; }
        setProviderForReview(provider);
        setIsReviewModalOpen(true);
    };
    const handleCloseReviewModal = () => setIsReviewModalOpen(false);

    const handleSubmitReview = async (reviewData) => {
        if (!providerForReview || !user) return;
        const session = window.Clerk.session;
        if (!session) { console.error("Clerk session not available"); return; }
        const token = await session.getToken();
        if (!token) { console.error("Not authenticated, no token"); return; }

        try {
            const response = await fetch(`${API_URL}/api/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    provider_id: providerForReview.provider_id || providerForReview.id,
                    provider_email: providerForReview.email || "",
                    user_id: user.id,
                    email: user.primaryEmailAddress?.emailAddress,
                    rating: reviewData.rating,
                    content: reviewData.review,
                    tags: reviewData.tags,
                }),
            });
            if (!response.ok) throw new Error('Failed to submit review');
        } catch (error) {
            console.error("Error submitting review:", error);
        }
    };

    const handleLikeRecommendation = async (providerId) => {
        if (!isSignedIn || !user) {
            openSignIn();
            return;
        }

        const currentUserId = user.id;
        const recommendation = recentRecommendations.find(rec => (rec.provider_id || rec.id) === providerId);
        if (!recommendation) {
            console.error("Recommendation not found for like action:", providerId);
            return;
        }

        const originallyLiked = likedRecommendations.has(providerId);
        const originalNumLikes = recommendation.num_likes || 0;
        const newNumLikesOptimistic = originallyLiked ? originalNumLikes - 1 : originalNumLikes + 1;

        setRecentRecommendations(prevRecs =>
            prevRecs.map(rec =>
                (rec.provider_id || rec.id) === providerId
                    ? { ...rec, num_likes: newNumLikesOptimistic, currentUserLiked: !originallyLiked }
                    : rec
            )
        );
        setLikedRecommendations(prevLiked => {
            const newSet = new Set(prevLiked);
            if (originallyLiked) {
                newSet.delete(providerId);
            } else {
                newSet.add(providerId);
            }
            return newSet;
        });

        try {
            const session = window.Clerk.session;
            if (!session) { throw new Error("Clerk session not available for like action."); }
            const token = await session.getToken();
            if (!token) { throw new Error("Not authenticated (no token) for like action."); }

            const response = await fetch(`${API_URL}/api/providers/${providerId}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: currentUserId,
                    userEmail: user.primaryEmailAddress.emailAddress
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Server error during like action." }));
                throw new Error(errorData.message || `Failed to update like status. Status: ${response.status}`);
            }

            const result = await response.json();

            setRecentRecommendations(prevRecs =>
                prevRecs.map(rec =>
                    (rec.provider_id || rec.id) === providerId
                        ? { ...rec, num_likes: parseInt(result.num_likes, 10) || 0, currentUserLiked: result.currentUserLiked }
                        : rec
                )
            );
            setLikedRecommendations(prevLiked => {
                const newSet = new Set(prevLiked);
                if (result.currentUserLiked) {
                    newSet.add(providerId);
                } else {
                    newSet.delete(providerId);
                }
                return newSet;
            });

        } catch (error) {
            console.error("Error updating like status:", error.message);
            setRecentRecommendations(prevRecs =>
                prevRecs.map(rec =>
                    (rec.provider_id || rec.id) === providerId
                        ? { ...rec, num_likes: originalNumLikes, currentUserLiked: originallyLiked }
                        : rec
                )
            );
            setLikedRecommendations(prevLiked => {
                const newSet = new Set(prevLiked);
                if (originallyLiked) {
                    newSet.add(providerId);
                } else {
                    newSet.delete(providerId);
                }
                return newSet;
            });
        }
    };

    const fetchLeaderboardData = useCallback(async (currentUserScore, currentUserPreferredName) => {
        if (!isLoaded || !isSignedIn || !user?.primaryEmailAddress?.emailAddress) {
            setLeaderboardData([]);
            setIsLoadingLeaderboard(false);
            return;
        }

        setIsLoadingLeaderboard(true);
        try {
            // Fetch connections with scores
            const response = await fetch(`${API_URL}/api/connections/check-connections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: user.primaryEmailAddress.emailAddress }),
            });

            let connections = [];
            if (response.ok) {
                connections = await response.json();
            }

            // Create leaderboard array with current user and connections
            const allUsers = [
                {
                    name: currentUserPreferredName || user.firstName || "You",
                    username: user.username || null, // Current user's username
                    leaderboard_user_score: currentUserScore,
                    isCurrentUser: true,
                    avatar: currentUserPreferredName ? currentUserPreferredName.charAt(0).toUpperCase() : user.firstName ? user.firstName.charAt(0).toUpperCase() : "U"
                },
                ...connections.map(conn => ({
                    name: conn.name || "Unknown",
                    username: conn.username || null,
                    leaderboard_user_score: conn.user_score || 0,
                    isCurrentUser: false,
                    avatar: conn.name ? conn.name.charAt(0).toUpperCase() : "U"
                }))
            ];

            // Sort by score and add ranks
            const sortedUsers = allUsers
                .sort((a, b) => (b.leaderboard_user_score || 0) - (a.leaderboard_user_score || 0))
                .map((user, index) => ({
                    ...user,
                    rank: index + 1,
                    score: user.leaderboard_user_score || 0
                }));

            // Find current user's position
            const currentUserIndex = sortedUsers.findIndex(user => user.isCurrentUser);
            const currentUserRank = currentUserIndex + 1;

            let displayUsers = [];
            
            if (currentUserRank <= 5) {
                // Current user is in top 5, show top 5
                displayUsers = sortedUsers.slice(0, 5);
            } else {
                // Current user is not in top 5, show top 4 + separator + current user
                const top4 = sortedUsers.slice(0, 4);
                const currentUser = sortedUsers[currentUserIndex];
                
                displayUsers = [
                    ...top4,
                    { isSeparator: true }, // Special separator item
                    currentUser
                ];
            }

            setLeaderboardData(displayUsers);
        } catch (error) {
            console.error("Error fetching leaderboard data:", error);
            // Fallback to just current user
            setLeaderboardData([{
                rank: 1,
                name: currentUserPreferredName || user.firstName || "You",
                score: currentUserScore,
                avatar: currentUserPreferredName ? currentUserPreferredName.charAt(0).toUpperCase() : user.firstName ? user.firstName.charAt(0).toUpperCase() : "U",
                isCurrentUser: true
            }]);
        } finally {
            setIsLoadingLeaderboard(false);
        }
    }, [isLoaded, isSignedIn, user]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!isLoaded || !isSignedIn || !user?.id || !user?.primaryEmailAddress?.emailAddress) {
                // Reset states for logged-out user
                setPreferredName("");
                setUserScore(0);
                setCurrentLevel(0);
                setProgressToNextLevel(0);
                setProviderCount(0);
                setConnectionCount(0);
                setCommunityCount(0);
                setNewRecsCount(0);
                setRecentRecommendations([]);
                setRecentRecommendationsError(null);
                setIsLoadingUserScore(false);
                setIsLoadingCounts(false);
                setIsLoadingNewRecsCount(false);
                setIsLoadingRecentRecommendations(false);
                return;
            }

            setIsLoadingUserScore(true);
            setIsLoadingCounts(true);
            setIsLoadingNewRecsCount(true);
            setIsLoadingRecentRecommendations(true);
            setRecentRecommendationsError(null);

            try {
                const userEmail = user.primaryEmailAddress.emailAddress;
                const userId = user.id;

                // --- Start all fetches in parallel ---
                const userDataPromise = fetch(`${API_URL}/api/users/preferred-name?email=${encodeURIComponent(userEmail)}`);
                
                const countParams = new URLSearchParams({ user_id: userId, email: userEmail });
                const providerCountPromise = fetch(`${API_URL}/api/providers/count?${countParams.toString()}`);
                const connectionCountPromise = fetch(`${API_URL}/api/connections/followers?user_id=${userId}`);
                const communityCountPromise = fetch(`${API_URL}/api/communities/count/communities`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, email: userEmail }),
                });
                const newRecsCountPromise = fetch(`${API_URL}/api/providers/new/count?${countParams.toString()}`);

                const recsParams = new URLSearchParams({ ...Object.fromEntries(countParams), limit: '3', sortBy: 'date_of_recommendation', sortOrder: 'desc' });
                const recentRecsPromise = fetch(`${API_URL}/api/providers/newest-visible?${recsParams.toString()}`);

                // Await all promises
                const [
                    userDataRes,
                    providerCountRes,
                    connectionCountRes,
                    communityCountRes,
                    newRecsCountRes,
                    recentRecsRes
                ] = await Promise.all([
                    userDataPromise,
                    providerCountPromise,
                    connectionCountPromise,
                    communityCountPromise,
                    newRecsCountPromise,
                    recentRecsPromise
                ]);

                // --- Process results ---

                // Process User Data and then trigger leaderboard fetch
                if (userDataRes.ok) {
                    const data = await userDataRes.json();
                    const name = data.preferredName || "";
                    const score = parseInt(data.userScore || data.user_score) || 0;
                    const { level, progress } = calculateLevel(score);
                    
                    setPreferredName(name);
                    setUserScore(score);
                    setCurrentLevel(level);
                    setProgressToNextLevel(progress);

                    if (data.location && data.state) {
                        setCity(data.location);
                        setState(data.state);
                    } else {
                        const cachedLocation = localStorage.getItem('userSelectedLocation') || 'Seattle, WA';
                        const parts = cachedLocation.split(',').map(p => p.trim());
                        setCity(parts[0] || 'Seattle');
                        setState(parts[1] || 'WA');
                    }
                    fetchLeaderboardData(score, name);
                } else {
                    setPreferredName("");
                    setUserScore(0);
                    setCurrentLevel(0);
                    setProgressToNextLevel(0);
                    fetchLeaderboardData(0, "");
                }
                setIsLoadingUserScore(false);

                // Process Counts
                if (providerCountRes.ok) {
                    const d = await providerCountRes.json();
                    setProviderCount(d.count || 0);
                } else { setProviderCount(0); }

                if (connectionCountRes.ok) {
                    const d = await connectionCountRes.json();
                    setConnectionCount(Array.isArray(d) ? d.length : 0);
                } else { setConnectionCount(0); }

                if (communityCountRes.ok) {
                    const data = await communityCountRes.json();
                    setCommunityCount(data.count || 0);
                } else { setCommunityCount(0); }
                setIsLoadingCounts(false);

                // Process New Recs Count
                if (newRecsCountRes.ok) {
                    const data = await newRecsCountRes.json();
                    setNewRecsCount(data.success ? (data.newRecommendationCount || 0) : 0);
                } else { setNewRecsCount(0); }
                setIsLoadingNewRecsCount(false);

                // Process Recent Recommendations
                if (recentRecsRes.ok) {
                    const jsonResponse = await recentRecsRes.json();
                    const rawData = jsonResponse.success && Array.isArray(jsonResponse.providers) ? jsonResponse.providers : [];
                    
                    if (rawData.length > 0) {
                        const newLikedSet = new Set();
                        const statsMap = {};

                        await Promise.all(
                            rawData.map(async (p) => {
                                const providerId = p.provider_id || p.id;
                                try {
                                    const statsRes = await fetch(`${API_URL}/api/reviews/stats/${providerId}`);
                                    if (statsRes.ok) {
                                        statsMap[providerId] = await statsRes.json();
                                    }
                                } catch (err) {
                                    console.error(`Failed to fetch stats for provider ${providerId}`, err);
                                }
                            })
                        );

                        const processedData = rawData.map(p => {
                            const providerId = p.provider_id || p.id;
                            if (p.currentUserLiked) {
                                newLikedSet.add(providerId);
                            }
                            const stats = statsMap[providerId] || { average_rating: p.average_rating, total_reviews: p.total_reviews };
                            return {
                                ...p,
                                id: providerId,
                                average_rating: parseFloat(stats.average_rating) || 0,
                                total_reviews: parseInt(stats.total_reviews, 10) || 0,
                            };
                        });
                        
                        setRecentRecommendations(processedData);
                        setLikedRecommendations(newLikedSet);
                    } else {
                        setRecentRecommendations([]);
                    }
                } else {
                    setRecentRecommendationsError('Failed to load recent recommendations.');
                    setRecentRecommendations([]);
                }
                setIsLoadingRecentRecommendations(false);

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                // Reset all states on error
                setPreferredName("");
                setUserScore(0);
                setCurrentLevel(0);
                setProgressToNextLevel(0);
                setProviderCount(0);
                setConnectionCount(0);
                setCommunityCount(0);
                setNewRecsCount(0);
                setRecentRecommendations([]);
                setRecentRecommendationsError(error.message);
                setIsLoadingUserScore(false);
                setIsLoadingCounts(false);
                setIsLoadingNewRecsCount(false);
                setIsLoadingRecentRecommendations(false);
                fetchLeaderboardData(0, ""); // Ensure leaderboard is cleared or shows default
            }
        };

        fetchDashboardData();
    }, [isLoaded, isSignedIn, user, fetchLeaderboardData]);

    useEffect(() => {
        const fetchPublicRecommendations = async () => {
            if (isSignedIn) {
                setPublicRecommendations([]);
                setIsLoadingPublicRecommendations(false);
                return;
            }

            setIsLoadingPublicRecommendations(true);
            setPublicRecommendationsError(null);

            try {
                const response = await fetch(`${API_URL}/api/providers/public?limit=3&sortBy=date_of_recommendation&sortOrder=desc`);
                if (!response.ok) throw new Error(`API error: ${response.statusText}`);
                
                const jsonResponse = await response.json();
                const rawData = jsonResponse.success && jsonResponse.providers ? jsonResponse.providers : [];

                if (rawData.length === 0) {
                    setPublicRecommendations([]);
                } else {
                    const statsMap = {};
                    await Promise.all(
                        rawData.map(async (p) => {
                            const providerId = p.id;
                            try {
                                const statsRes = await fetch(`${API_URL}/api/reviews/stats/${providerId}`);
                                if (statsRes.ok) {
                                    statsMap[providerId] = await statsRes.json();
                                }
                            } catch (err) {
                                console.error(`Failed to fetch stats for provider ${providerId}`, err);
                            }
                        })
                    );

                    const processedData = rawData.map(p => {
                        const providerId = p.id;
                        const stats = statsMap[providerId] || { average_rating: p.average_rating, total_reviews: p.total_reviews };

                        return {
                            ...p,
                            provider_id: providerId,
                            average_rating: stats.average_rating || 0,
                            total_reviews: stats.total_reviews || 0,
                        };
                    });

                    setPublicRecommendations(processedData);
                }
            } catch (error) {
                console.error("Error fetching public recommendations:", error);
                setPublicRecommendationsError(error.message);
                setPublicRecommendations([]);
            } finally {
                setIsLoadingPublicRecommendations(false);
            }
        };

        fetchPublicRecommendations();
    }, [isSignedIn, API_URL]);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        const q = searchQuery.trim();
        if (!q || !isLoaded) return;
        if (!isSignedIn) { openSignIn(); setIsSearching(false); return; }
        setIsSearching(true);
        try {
            const finalState = getFullStateName(state);
            const params = new URLSearchParams({
                q: q,
                user_id: user.id,
                email: user.primaryEmailAddress?.emailAddress,
                state: finalState
            });
            const searchUrl = `${API_URL}/api/providers/search?${params.toString()}`;
            const response = await fetch(searchUrl);
            const responseBody = await response.text();
            if (!response.ok) { let errP; try { errP = JSON.parse(responseBody); } catch (pE) { throw new Error(`HTTP error! status: ${response.status}, Non-JSON response: ${responseBody}`); } throw new Error(errP.message || errP.error || `HTTP error! ${response.status}`); }
            const d = JSON.parse(responseBody);
            if (d.success) {
                const base = `/search?q=${encodeURIComponent(q)}&state=${encodeURIComponent(finalState)}`; // Pass state to URL
                navigate(d.providers?.length > 0 ? base : base + "&noResults=true", {
                    state: { initialProviders: d.providers, currentSearchUserId: user.id },
                });
            } else { throw new Error(d.message || d.error || "Search not successful"); }
        } catch (err) { console.error("Search error:", err); }
        finally { setIsSearching(false); }
    };

    const handleLocationClick = () => setShowLocationModal(true);

    // Notification handlers
    const handleNotificationClick = () => {
        setIsNotificationModalOpen(true);
        if (notifications.length === 0) {
            fetchNotifications();
        }
    };
    const handleCloseNotificationModal = () => setIsNotificationModalOpen(false);
    
    // Leaderboard click handler
    const handleLeaderboardUserClick = (user) => {
        if (user.username) {
            navigate(`/pro/${user.username}`);
        }
    };
    
    // Calculate user level and progress
    const calculateLevel = (score) => {
        const level = Math.floor(score / 100);
        const progress = score % 100;
        return { level, progress };
    };

    // Typing animation logic
    const targetText = useMemo(() => {
        if (!isLoaded) return `Welcome to ${BRAND_PHRASE}`;
        if (!isSignedIn) return `Welcome to ${BRAND_PHRASE}`;
        return preferredName || user?.firstName ? `Welcome back, ${preferredName || user.firstName}.` : `Welcome to ${BRAND_PHRASE}`;
    }, [isLoaded, isSignedIn, preferredName, user?.firstName]);

    useEffect(() => {
        setDisplayText(""); 
        setIsTyping(true); 
        setShowStatsLine(false);
    }, [targetText]);

    useEffect(() => {
        if (!isTyping || !targetText) { 
            if (!targetText) setIsTyping(false); 
            return; 
        }
        if (displayText.length < targetText.length) {
            const next = targetText.substring(0, displayText.length + 1);
            const t = setTimeout(() => setDisplayText(next), 100);
            return () => clearTimeout(t);
        } else { 
            setIsTyping(false); 
        }
    }, [displayText, isTyping, targetText]);

    useEffect(() => {
        if (!isTyping && displayText === targetText && displayText !== "") {
            if (isSignedIn) setShowStatsLine(true);
        } else { 
            setShowStatsLine(false); 
        }
    }, [isTyping, displayText, targetText, isSignedIn]);

    if (location.pathname !== "/") return null;

    if (!isLoaded) {
        return <div className="loading-full-page">Loading Tried & Trusted...</div>;
    }

    // Dashboard layout for signed-in users
    if (isSignedIn) {
        return (
            <div className="home dashboard-layout">
                <Particles
                    id="tsparticles"
                    init={particlesInit}
                    options={particlesOptions}
                />
                <div className="dashboard-container">
                    {/* Left Column */}
                    <div className="dashboard-left">
                        {/* Welcome Message */}
                        <div className="dashboard-welcome">
                            <h1 className="dashboard-title">
                                {displayText}
                            </h1>
                            <p className="dashboard-subtitle">
                                {isLoadingNewRecsCount || isLoadingNotificationsCount ? (
                                    "Loading your latest updates..."
                                ) : (
                                    (() => {
                                        const hasNewRecs = newRecsCount > 0;
                                        const hasNotifications = newNotificationsCount > 0;

                                        if (!hasNewRecs && !hasNotifications) {
                                            return (
                                                <>
                                                    Check out anything cool recently?{" "}
                                                    <span 
                                                        className="underline-highlight"
                                                        onClick={() => navigate('/share-recommendation')}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        Share it with your Trust Circle
                                                    </span>.
                                                </>
                                            );
                                        } else if (hasNewRecs && hasNotifications) {
                                            // Both recs and notifications
                                            return (
                                                <>
                                                    Let's get you caught up. You have{" "}
                                                    <strong>{newRecsCount} new Rec{newRecsCount === 1 ? '' : 's'}</strong> and{" "}
                                                    <strong 
                                                        className="notification-link" 
                                                        onClick={handleNotificationClick}
                                                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                    >
                                                        {newNotificationsCount} notification{newNotificationsCount === 1 ? '' : 's'}
                                                    </strong>!
                                                </>
                                            );
                                        } else if (hasNewRecs && !hasNotifications) {
                                            // Only recs
                                            return (
                                                <>
                                                    Let's get you caught up. You have{" "}
                                                    <strong>{newRecsCount} new Rec{newRecsCount === 1 ? '' : 's'}</strong>!
                                                </>
                                            );
                                        } else {
                                            // Only notifications
                                            return (
                                                <>
                                                    Let's get you caught up. You have{" "}
                                                    <strong 
                                                        className="notification-link" 
                                                        onClick={handleNotificationClick}
                                                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                    >
                                                        {newNotificationsCount} notification{newNotificationsCount === 1 ? '' : 's'}
                                                    </strong>!
                                                </>
                                            );
                                        }
                                    })()
                                )}
                            </p>
                        </div>

                        {/* Search Bar */}
                        <form className="dashboard-search-form dashboard-search-extended" onSubmit={handleSearch}>
                            <div className="search-input-group">
                                <input 
                                    className="main-search-input" 
                                    type="text" 
                                    placeholder={isMobile ? "Search home services... " : "Search for home services, financial advisors... "} 
                                    value={searchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)} 
                                    disabled={isSearching} 
                                />
                                <div className="location-input-wrapper">
                                    <MapPinIcon className="location-icon" />
                                    {isEditingLocation ? (
                                        <input
                                            className="location-input"
                                            type="text"
                                            value={locationInput}
                                            onChange={e => setLocationInput(e.target.value)}
                                            onBlur={handleUpdateLocation}
                                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateLocation()}
                                            autoFocus
                                        />
                                    ) : (
                                        <>
                                            <span className="location-text">{city && state ? `${city}, ${state}` : 'Your Location'}</span>
                                            <button type="button" className="location-change-button" onClick={() => {
                                                setLocationInput(`${city}, ${state}`);
                                                setIsEditingLocation(true);
                                            }}>
                                                Change
                                            </button>
                                        </>
                                    )}
                                </div>
                                <button type="submit" className="search-submit-button" disabled={isSearching}> 
                                    {isSearching ? <span className="search-spinner"></span> : <MagnifyingGlassIcon className="search-button-icon" />} 
                                </button>
                            </div>
                            {/* Mobile Location Info Below Search */}
                            {isMobile && (
                                isEditingLocation ? (
                                    <div className="mobile-location-edit-wrapper">
                                        <input
                                            className="location-input mobile-edit"
                                            type="text"
                                            value={locationInput}
                                            onChange={e => setLocationInput(e.target.value)}
                                            onBlur={handleUpdateLocation}
                                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateLocation()}
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            className="location-save-button"
                                            onClick={handleUpdateLocation}
                                        >
                                            Save
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mobile-location-info">
                                        <MapPinIcon className="location-icon" />
                                        <span>{city && state ? `${city}, ${state}` : "Set Location"}</span>
                                        <button type="button" className="mobile-location-change" onClick={() => {
                                            setLocationInput(`${city}, ${state}`);
                                            setIsEditingLocation(true);
                                        }}>
                                            Change
                                        </button>
                                    </div>
                                )
                            )}
                        </form>

                        {/* Recent Recommendations */}
                        <div className="dashboard-recommendations">
                            <h2 className="section-title">Recent Recommendations For You</h2>
                            <div className="recommendations-feed">
                                {isLoadingRecentRecommendations && <div className="feed-message">Loading recommendations...</div>}
                                {recentRecommendationsError && <div className="feed-message feed-error">Could not load recommendations.</div>}
                                {!isLoadingRecentRecommendations && !recentRecommendationsError && recentRecommendations.length > 0 ? (
                                    <>
                                        {recentRecommendations.map((rec) => (
                                            <PublicRecommendationCard
                                                key={rec.id}
                                                rec={rec}
                                                onWriteReview={handleOpenReviewModal}
                                                onLike={handleLikeRecommendation}
                                                isLikedByCurrentUser={likedRecommendations.has(rec.id)}
                                                loggedInUserId={user?.id}
                                                currentUserName={user?.firstName}
                                            />
                                        ))}
                                    </>
                                ) : (
                                    !isLoadingRecentRecommendations && !recentRecommendationsError && (
                                        <div className="feed-message">No recent recommendations for you yet.</div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="dashboard-right">
                        {/* Score Wheel */}
                        <TrustScoreWheel 
                            score={userScore} 
                            showDebug={false}
                        />

                        {/* Stats Cards */}
                        <div className="dashboard-stats">
                            <button className="metric-card" onClick={() => navigate("/trustcircles?tab=myRecommendations")}>
                                <div className="metric-icon-container">
                                    {isLoadingCounts ? (
                                        <div className="metric-loading-spinner"></div>
                                    ) : (
                                        <div className="metric-number"><CountUp end={providerCount || 0} duration={2} separator="," /></div>
                                    )}
                                </div>
                                <div className="metric-content">
                                    <div className="metric-label">Recommendations</div>
                                    <div className="metric-sublabel">for you</div>
                                </div>
                            </button>
                            <button className="metric-card" onClick={() => navigate("/trustcircles?tab=myTrust")}>
                                <div className="metric-icon-container">
                                    {isLoadingCounts ? (
                                        <div className="metric-loading-spinner"></div>
                                    ) : (
                                        <div className="metric-number"><CountUp end={connectionCount || 0} duration={2} /></div>
                                    )}
                                </div>
                                <div className="metric-content">
                                    <div className="metric-label">Followers</div>
                                </div>
                            </button>
                            <button className="metric-card" onClick={() => navigate("/communities")}>
                                <div className="metric-icon-container">
                                    {isLoadingCounts ? (
                                        <div className="metric-loading-spinner"></div>
                                    ) : (
                                        <div className="metric-number"><CountUp end={communityCount || 0} duration={2} /></div>
                                    )}
                                </div>
                                <div className="metric-content">
                                    <div className="metric-label">Communities</div>
                                </div>
                            </button>
                        </div>

                        {/* Leaderboard */}
                        <div className="leaderboard-container">
                            <h3 className="section-title">Your Trust Circle Leaderboard</h3>
                            <div className="leaderboard">
                                {isLoadingLeaderboard ? (
                                    <div className="leaderboard-loading">
                                        <div className="metric-loading-spinner"></div>
                                        <span>Loading leaderboard...</span>
                                    </div>
                                ) : leaderboardData.length > 0 ? (
                                    leaderboardData.map((user, index) => {
                                        if (user.isSeparator) {
                                            return (
                                                <div key="separator" className="leaderboard-separator">
                                                    <div className="separator-dots">⋮</div>
                                                </div>
                                            );
                                        }
                                        
                                        return (
                                            <div 
                                                key={user.rank || index} 
                                                className={`leaderboard-item ${user.isCurrentUser ? 'current-user' : ''} ${user.username ? 'clickable' : ''}`}
                                                onClick={() => handleLeaderboardUserClick(user)}
                                                style={{ cursor: user.username ? 'pointer' : 'default' }}
                                            >
                                                <div className="rank">#{user.rank}</div>
                                                <div className="avatar">{user.avatar}</div>
                                                <div className="user-info">
                                                    <div className="name">{user.name}</div>
                                                    <div className="score">{user.score} pts</div>
                                                </div>
                                                {user.rank <= 3 && (
                                                    <div className="trophy">
                                                        {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : '🥉'}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="leaderboard-empty">
                                        <p>Connect with others to see the leaderboard!</p>
                                        <button 
                                            className="button-primary"
                                            onClick={() => navigate("/trustcircles")}
                                        >
                                            Find Connections
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <ReviewModal
                    isOpen={isReviewModalOpen}
                    onClose={handleCloseReviewModal}
                    onSubmit={handleSubmitReview}
                    providerName={providerForReview?.business_name}
                />

                <NotificationModal
                    isOpen={isNotificationModalOpen}
                    onClose={handleCloseNotificationModal}
                    notifications={notifications}
                    isLoading={isLoadingNotifications}
                    onMarkAsRead={handleMarkNotificationAsRead}
                    onMarkAllAsRead={handleMarkAllNotificationsAsRead}
                />

                {showLocationModal && (
                    <div className="location-modal-overlay">
                        <div className="location-modal-content">
                            <button className="location-modal-close" onClick={() => setShowLocationModal(false)}> <XMarkIcon /> </button>
                            <h3>Expanding Our Horizons!</h3>
                            <p>We're currently focused on serving the <strong>Greater Seattle Area</strong>.</p>
                            <p>We're working hard to expand and will be launching nationally soon. Stay tuned!</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Dashboard layout for non-signed-in users
    return (
        <div className="home dashboard-layout not-logged-in">
            <Particles
                id="tsparticles"
                init={particlesInit}
                options={particlesOptions}
            />
            <div className="dashboard-container">
                {/* Left Column */}
                <div className="dashboard-left">
                    {/* Welcome Message */}
                    <div className="dashboard-welcome">
                        <h1 className="dashboard-title dashboard-title-extended">
                            Welcome to <span className="highlight-name">Tried & Trusted</span>.
                        </h1>
                        <p className="dashboard-subtitle">
                            The #1 way to share and discover <span className="underline-highlight">trusted recommendations</span>.
                        </p>
                    </div>

                    {/* Search Bar */}
                    <form className="dashboard-search-form dashboard-search-extended" onSubmit={handleSearch}>
                        <div className="search-input-group">
                            <input 
                                className="main-search-input" 
                                type="text" 
                                placeholder="Search for services, restaurants..." 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                disabled={isSearching} 
                            />
                            <div className="location-input-wrapper" onClick={openSignIn}>
                                <MapPinIcon className="location-icon" />
                                <span className="location-text">{city && state ? `${city}, ${state}` : 'Your Location'}</span>
                                <button type="button" className="location-change-button" onClick={openSignIn}>
                                    Change
                                </button>
                            </div>
                            <button type="submit" className="search-submit-button" disabled={isSearching}>
                                {isSearching ? <span className="search-spinner"></span> : <MagnifyingGlassIcon className="search-button-icon" />}
                            </button>
                        </div>
                        {/* Mobile Location Info Below Search */}
                        {isMobile && (
                            <div className="mobile-location-info" onClick={openSignIn}>
                                <MapPinIcon className="location-icon" />
                                <span>{city && state ? `${city}, ${state}` : "Set Location"}</span>
                                <button type="button" className="mobile-location-change" onClick={openSignIn}>
                                    Change
                                </button>
                            </div>
                        )}
                    </form>

                    {/* Mobile Social Proof Banner */}
                    <div className="social-proof-banner mobile-social-proof">
                        <div className="social-proof-content">
                            <div className="social-proof-number">100+</div>
                            <div className="social-proof-text">trusted recommenders</div>
                            <div className="social-proof-subtext">building their Trust Circle</div>
                        </div>
                        <div className="social-proof-gradient"></div>
                    </div>

                    {/* Public Recommendations */}
                    <div className="dashboard-recommendations">
                        <h2 className="section-title">
                            Not logged in? Here are some public Recs:
                        </h2>
                        <div className="recommendations-feed">
                            {isLoadingPublicRecommendations && <div className="feed-message">Loading recommendations...</div>}
                            {publicRecommendationsError && <div className="feed-message feed-error">Could not load recommendations.</div>}
                            {!isLoadingPublicRecommendations && !publicRecommendationsError && publicRecommendations.length > 0 ? (
                                <>
                                    {publicRecommendations.map((rec) => (
                                        <PublicRecommendationCard
                                            key={rec.id}
                                            rec={rec}
                                            onWriteReview={handleOpenReviewModal}
                                            onLike={handleLikeRecommendation}
                                            isLikedByCurrentUser={false}
                                            loggedInUserId={null}
                                            currentUserName={null}
                                        />
                                    ))}
                                </>
                            ) : (
                                !isLoadingPublicRecommendations && !publicRecommendationsError && (
                                    <div className="feed-message">
                                        <SignUpButton mode="modal">
                                            <span className="underline-highlight" style={{ cursor: 'pointer' }}>
                                                Join to unlock your network's favorites.
                                            </span>
                                        </SignUpButton>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* Mobile Activity Sections */}
                    <div className="mobile-activity-sections">
                        {/* Live Activity Feed */}
                        <div className="activity-feed-container">
                            <h3 className="section-title">Live Activity</h3>
                            <div className="activity-feed">
                                <div className="activity-item">
                                    <div className="activity-avatar">S</div>
                                    <div className="activity-content">
                                        <div className="activity-text">Sarah earned <strong>50 trust points</strong></div>
                                        <div className="activity-time">2 min ago</div>
                                    </div>
                                    <div className="activity-pulse"></div>
                                </div>
                                <div className="activity-item">
                                    <div className="activity-avatar">M</div>
                                    <div className="activity-content">
                                        <div className="activity-text">Mike joined <strong>Seattle Foodies</strong></div>
                                        <div className="activity-time">5 min ago</div>
                                    </div>
                                </div>
                                <div className="activity-item">
                                    <div className="activity-avatar">A</div>
                                    <div className="activity-content">
                                        <div className="activity-text">Alex shared a <strong>home service rec</strong></div>
                                        <div className="activity-time">12 min ago</div>
                                    </div>
                                </div>
                                <div className="activity-item">
                                    <div className="activity-avatar">J</div>
                                    <div className="activity-content">
                                        <div className="activity-text">Jessica reached <strong>Level 3</strong></div>
                                        <div className="activity-time">18 min ago</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Community Highlights */}
                        <div className="community-highlights-container">
                            <h3 className="section-title">Most Active This Week</h3>
                            <div className="community-highlights">
                                <div className="community-highlight-item">
                                    <div className="community-icon">🏠</div>
                                    <div className="community-info">
                                        <div className="community-name">Home Services</div>
                                        <div className="community-activity">234 new recommendations</div>
                                    </div>
                                </div>
                                <div className="community-highlight-item">
                                    <div className="community-icon">🍽️</div>
                                    <div className="community-info">
                                        <div className="community-name">Restaurants</div>
                                        <div className="community-activity">189 new recommendations</div>
                                    </div>
                                </div>
                                <div className="community-highlight-item">
                                    <div className="community-icon">💰</div>
                                    <div className="community-info">
                                        <div className="community-name">Financial Services</div>
                                        <div className="community-activity">156 new recommendations</div>
                                    </div>
                                </div>
                            </div>
                            <SignUpButton mode="modal">
                                <button className="cta-join-button">
                                    Join the Action
                                </button>
                            </SignUpButton>
                        </div>
                    </div>
                </div>

                {/* Right Column - Hidden on Mobile for non-logged-in */}
                <div className="dashboard-right desktop-only-right">
                    {/* Social Proof Banner */}
                    <div className="social-proof-banner">
                        <div className="social-proof-content">
                            <div className="social-proof-number">100+</div>
                            <div className="social-proof-text">trusted recommenders</div>
                            <div className="social-proof-subtext">building their Trust Circle</div>
                        </div>
                        <div className="social-proof-gradient"></div>
                    </div>

                    {/* Live Activity Feed */}
                    <div className="activity-feed-container">
                        <h3 className="section-title">Live Activity</h3>
                        <div className="activity-feed">
                            <div className="activity-item">
                                <div className="activity-avatar">S</div>
                                <div className="activity-content">
                                    <div className="activity-text">Sarah earned <strong>50 trust points</strong></div>
                                    <div className="activity-time">2 min ago</div>
                                </div>
                                <div className="activity-pulse"></div>
                            </div>
                            <div className="activity-item">
                                <div className="activity-avatar">M</div>
                                <div className="activity-content">
                                    <div className="activity-text">Mike joined <strong>Seattle Foodies</strong></div>
                                    <div className="activity-time">5 min ago</div>
                                </div>
                            </div>
                            <div className="activity-item">
                                <div className="activity-avatar">A</div>
                                <div className="activity-content">
                                    <div className="activity-text">Alex shared a <strong>home service rec</strong></div>
                                    <div className="activity-time">12 min ago</div>
                                </div>
                            </div>
                            <div className="activity-item">
                                <div className="activity-avatar">J</div>
                                <div className="activity-content">
                                    <div className="activity-text">Jessica reached <strong>Level 3</strong></div>
                                    <div className="activity-time">18 min ago</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Community Highlights */}
                    <div className="community-highlights-container">
                        <h3 className="section-title">Most Active This Week</h3>
                        <div className="community-highlights">
                            <div className="community-highlight-item">
                                <div className="community-icon">🏠</div>
                                <div className="community-info">
                                    <div className="community-name">Home Services</div>
                                    <div className="community-activity">234 new recommendations</div>
                                </div>
                            </div>
                            <div className="community-highlight-item">
                                <div className="community-icon">🍽️</div>
                                <div className="community-info">
                                    <div className="community-name">Restaurants</div>
                                    <div className="community-activity">189 new recommendations</div>
                                </div>
                            </div>
                            <div className="community-highlight-item">
                                <div className="community-icon">💰</div>
                                <div className="community-info">
                                    <div className="community-name">Financial Services</div>
                                    <div className="community-activity">156 new recommendations</div>
                                </div>
                            </div>
                        </div>
                        <SignUpButton mode="modal">
                            <button className="cta-join-button">
                                Join the Action
                            </button>
                        </SignUpButton>
                    </div>
                </div>
            </div>

            <ReviewModal
                isOpen={isReviewModalOpen}
                onClose={handleCloseReviewModal}
                onSubmit={handleSubmitReview}
                providerName={providerForReview?.business_name}
            />

            <NotificationModal
                isOpen={isNotificationModalOpen}
                onClose={handleCloseNotificationModal}
                notifications={notifications}
                isLoading={isLoadingNotifications}
                onMarkAsRead={handleMarkNotificationAsRead}
                onMarkAllAsRead={handleMarkAllNotificationsAsRead}
            />

            {showLocationModal && (
                <div className="location-modal-overlay">
                    <div className="location-modal-content">
                        <button className="location-modal-close" onClick={() => setShowLocationModal(false)}> <XMarkIcon /> </button>
                        <h3>Expanding Our Horizons!</h3>
                        <p>We're currently focused on serving the <strong>Greater Seattle Area</strong>.</p>
                        <p>We're working hard to expand and will be launching nationally soon. Stay tuned!</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;