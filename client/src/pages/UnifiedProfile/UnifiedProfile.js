import { useUser } from "@clerk/clerk-react";
import { ChevronDownIcon, EnvelopeIcon } from "@heroicons/react/24/solid";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    FaConciergeBell,
    FaMapMarkerAlt,
    FaStar
} from "react-icons/fa";
import { useParams } from "react-router-dom";
import RecommendationCard from "../../components/RecommendationCard/RecommendationCard";
import ReviewModal from "../../components/ReviewModal/ReviewModal";
import TrustScoreWheel from "../../components/TrustScoreWheel/TrustScoreWheel";
import "../Profile/Profile.css";
import "../PublicProfile/PublicProfile.css";

const API_URL = 'https://api.seanag-recommendations.org:8080';

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

const UnifiedProfile = () => {
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
    const [commentsMap, setCommentsMap] = useState(new Map());
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    
    // Check if this is the current user's own profile
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const [currentUserUsername, setCurrentUserUsername] = useState(null);

    useEffect(() => {
        if (isLoaded && user) {
            setCurrentUserId(user.id);
            setCurrentUserEmail(user.primaryEmailAddress?.emailAddress);
        } else if (isLoaded && !isSignedIn) {
            setCurrentUserId(null);
            setCurrentUserEmail(null);
        }
    }, [isLoaded, isSignedIn, user]);

    // Determine if this is the user's own profile
    useEffect(() => {
        const checkIfOwnProfile = async () => {
            if (!isSignedIn || !user || !username) {
                setIsOwnProfile(false);
                return;
            }

            try {
                // Get current user's username
                const response = await fetch(`${API_URL}/api/users/me/recommendations?user_id=${user.id}&email=${user.primaryEmailAddress?.emailAddress}`);
                if (response.ok) {
                    const data = await response.json();
                    const userUsername = data.userUsername;
                    setCurrentUserUsername(userUsername);
                    setIsOwnProfile(userUsername === username);
                }
            } catch (error) {
                console.error('Error checking profile ownership:', error);
                setIsOwnProfile(false);
            }
        };

        checkIfOwnProfile();
    }, [isSignedIn, user, username]);

    const fetchPageData = useCallback(async () => {
        if (!username || !isLoaded) return;
        setLoading(true);
        setError(null);
        const loggedInUserId = user ? user.id : null;
        
        try {
            // Use the appropriate endpoint based on whether it's own profile or not
            const endpoint = isOwnProfile 
                ? `${API_URL}/api/users/me/recommendations?user_id=${user.id}&email=${user.primaryEmailAddress?.emailAddress}`
                : `${API_URL}/api/users/public-profile/${username}?loggedInUserId=${loggedInUserId || ''}`;
                
            const profileRes = await fetch(endpoint);
            if (!profileRes.ok) throw new Error("Failed to fetch profile data");
            const data = await profileRes.json();
            
            if (isOwnProfile) {
                // Transform the data structure to match what the component expects
                setProfileInfo({
                    userId: data.userId,
                    userName: data.userName,
                    userBio: data.userBio,
                    userEmail: data.userEmail,
                    userPhone: data.userPhone,
                    clerkId: user.id,
                    recommendations: data.recommendations
                });
                setRecommendations(data.recommendations || []);
            } else {
                setProfileInfo(data);
                const enrichedRecs = (data.recommendations || []).map(rec => ({
                    ...rec,
                    average_rating: parseFloat(rec.average_rating) || 0,
                    total_reviews: parseInt(rec.total_reviews, 10) || 0,
                    users_who_reviewed: rec.users_who_reviewed || []
                }));
                setRecommendations(enrichedRecs);
            }
            
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
            
            // Fetch followers
            const targetClerkId = isOwnProfile ? user.id : data.clerkId;
            const followersRes = await fetch(`${API_URL}/api/connections/followers?user_id=${targetClerkId}`);
            if (followersRes.ok) {
                const followersData = await followersRes.json();
                setConnections(Array.isArray(followersData) ? followersData : []);
            } else {
                setConnections([]);
            }
            
            // Set up liked map
            const initialLikes = new Map();
            const recs = isOwnProfile ? (data.recommendations || []) : enrichedRecs;
            recs.forEach(r => {
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
    }, [username, isLoaded, user, isOwnProfile]);

    const fetchConnectionStatus = useCallback(async () => {
        if (!currentUserId || !profileInfo?.userId || currentUserId === profileInfo.userId || isOwnProfile) {
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
    }, [currentUserId, profileInfo?.userId, isOwnProfile]);

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
                fetchPageData();
            } else {
                alert('Failed to unfollow user. Please try again.');
            }
        } catch (error) {
            console.error('Error removing connection:', error);
            alert('An error occurred while trying to unfollow.');
        } finally {
            setIsFollowLoading(false);
            setIsUnfollowModalOpen(false);
        }
    };

    const handleFollowToggle = async () => {
        if (!currentUserId || !profileInfo?.userId || isFollowLoading || isOwnProfile) return;

        if (connectionStatus === 'connected') {
            setIsUnfollowModalOpen(true);
            return; 
        }

        setIsFollowLoading(true);
        try {
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
                fetchPageData();
            }
        } catch (error) {
            console.error('Error toggling follow status:', error);
            alert('Failed to update follow status');
        } finally {
            setIsFollowLoading(false);
        }
    };

    const renderFollowButton = () => {
        if (!isSignedIn || !currentUserId || isOwnProfile) {
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

    // Add New Recommendation button for own profile
    const renderAddNewButton = () => {
        if (!isOwnProfile) return null;
        
        return (
            <div className="profile-recommendations-controls">
                <button
                    className="profile-add-new-btn"
                    onClick={() => window.location.href = '/share-recommendation'}
                >
                    <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add New
                </button>
            </div>
        );
    };

    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);
    
    useEffect(() => {
        if (profileInfo && currentUserId && !isOwnProfile) {
            fetchConnectionStatus();
        }
    }, [profileInfo, currentUserId, fetchConnectionStatus, isOwnProfile]);

    useEffect(() => {
        if (!loading && recommendations.length > 0) {
            fetchBatchComments(recommendations);
        }
    }, [recommendations, loading]);

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
                method: "POST", 
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider_id: providerIdToUse,
                    provider_email: selectedProviderForReview.email || "",
                    user_id: currentUserId,
                    email: currentUserEmail,
                    rating: reviewData.rating, 
                    content: reviewData.review, 
                    tags: reviewData.tags,
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
        
        if (selectedServices.length > 0) {
            sortableItems = sortableItems.filter(item => {
                const itemService = item.recommended_service_name || "Other";
                return selectedServices.includes(itemService);
            });
        }
        
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

    const fetchBatchComments = async (recommendations) => {
        if (!recommendations || recommendations.length === 0) return;
        
        setIsLoadingComments(true);
        try {
            const serviceIds = recommendations.map(rec => rec.provider_id || rec.id).filter(Boolean);
            
            if (serviceIds.length === 0) return;

            const response = await fetch(`${API_URL}/api/comments/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ service_ids: serviceIds })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.comments) {
                    const commentsMap = new Map();
                    Object.entries(data.comments).forEach(([serviceId, comments]) => {
                        commentsMap.set(serviceId, comments || []);
                    });
                    setCommentsMap(commentsMap);
                }
            }
        } catch (error) {
            console.error('Error fetching batch comments:', error);
        } finally {
            setIsLoadingComments(false);
        }
    };

    const handleCommentAdded = (serviceId, newComment) => {
        setCommentsMap(prev => {
            const newMap = new Map(prev);
            const existingComments = newMap.get(serviceId) || [];
            newMap.set(serviceId, [newComment, ...existingComments]);
            return newMap;
        });
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
                        </div>
                    </div>
                </div>
            </header>

            <main className="profile-content-area">
                <div className="profile-recommendations-header">
                    <div className="profile-recommendations-title-section">
                        <h2>{isOwnProfile ? "My Recommendations" : `${userName ? `${userName}'s` : ""} Recommendations`}</h2>
                        {renderAddNewButton()}
                    </div>
                    
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
                            
                            <div className="filters-container">
                                {availableServices.length > 0 && (
                                    <div className="profile-city-filter-toggle-section">
                                        <button
                                            className="profile-city-filter-toggle"
                                            onClick={() => setShowServiceFilter(!showServiceFilter)}
                                        >
                                            <FaConciergeBell className="profile-filter-icon" />
                                            <span className="filter-button-text">
                                                <span className="filter-button-text-long">Filter by </span>
                                                <span>Service</span>
                                            </span>
                                            {selectedServices.length > 0 && (
                                                <span className="profile-active-filters-badge">
                                                    {selectedServices.length}
                                                </span>
                                            )}
                                            <ChevronDownIcon
                                                className={`profile-filter-chevron ${showServiceFilter ? "rotated" : ""}`}
                                            />
                                        </button>
                                    </div>
                                )}
                                
                                {availableCities.length > 1 && (
                                    <div className="profile-city-filter-toggle-section">
                                        <button
                                            className="profile-city-filter-toggle"
                                            onClick={() => setShowCityFilter(!showCityFilter)}
                                        >
                                            <FaMapMarkerAlt className="profile-filter-icon" />
                                            <span className="filter-button-text">
                                                <span className="filter-button-text-long">Filter by </span>
                                                <span>City</span>
                                            </span>
                                            {selectedCities.length > 0 && (
                                                <span className="profile-active-filters-badge">
                                                    {selectedCities.length}
                                                </span>
                                            )}
                                            <ChevronDownIcon
                                                className={`profile-filter-chevron ${showCityFilter ? "rotated" : ""}`}
                                            />
                                        </button>
                                    </div>
                                )}
                                
                                {showServiceFilter && availableServices.length > 0 && (
                                    <div className="profile-city-filter-wrapper">
                                        <div className="profile-city-filter-checkboxes">
                                            {availableServices.map(([service, count]) => (
                                                <div
                                                    key={service}
                                                    className="profile-city-checkbox-item"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        id={`service-${service.replace(/\s+/g, '-')}`}
                                                        name={service}
                                                        checked={selectedServices.includes(service)}
                                                        onChange={() => handleServiceSelection(service)}
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
                                            ))}
                                            {selectedServices.length > 0 && (
                                                <button
                                                    onClick={() => setSelectedServices([])}
                                                    className="profile-city-clear-all"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                {showCityFilter && availableCities.length > 1 && (
                                    <div className="profile-city-filter-wrapper">
                                        <div className="profile-city-filter-checkboxes">
                                            {availableCities.map(([city, count]) => (
                                                <div
                                                    key={city}
                                                    className="profile-city-checkbox-item"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        id={`city-${city.replace(/\s+/g, '-')}`}
                                                        name={city}
                                                        checked={selectedCities.includes(city)}
                                                        onChange={() => handleCitySelection(city)}
                                                    />
                                                    <label
                                                        htmlFor={`city-${city.replace(/\s+/g, '-')}`}
                                                        className="profile-city-checkbox-label"
                                                    >
                                                        {city}
                                                    </label>
                                                    <span className="profile-city-count">
                                                        ({count})
                                                    </span>
                                                </div>
                                            ))}
                                            {selectedCities.length > 0 && (
                                                <button
                                                    onClick={() => setSelectedCities([])}
                                                    className="profile-city-clear-all"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
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
                    <div className="recommendations-feed">
                        {sortedRecommendations.map((rec) => (
                            <RecommendationCard
                                key={rec.id || rec.provider_id}
                                rec={rec}
                                onWriteReview={handleOpenReviewModal}
                                onLike={handleLikeToggle}
                                isLikedByCurrentUser={likedMap.get(rec.id || rec.provider_id) || false}
                                loggedInUserId={currentUserId}
                                currentUserName={userName}
                                comments={commentsMap.get(String(rec.provider_id || rec.id)) || []}
                                onCommentAdded={handleCommentAdded}
                                showEditDelete={isOwnProfile}
                                onEdit={isOwnProfile ? () => {
                                    // TODO: Implement edit functionality
                                    console.log('Edit clicked for rec:', rec);
                                } : undefined}
                                onRefreshList={fetchPageData}
                            />
                        ))}
                    </div>
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
                            <p>
                                {isOwnProfile ? "You haven't" : (userName ? `${userName} hasn't` : "This user hasn't")} made any recommendations yet.
                            </p>
                            {isOwnProfile && (
                                <button 
                                    className="profile-primary-action-btn"
                                    onClick={() => window.location.href = '/share-recommendation'}
                                >
                                    Share Your First Recommendation
                                </button>
                            )}
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
                    provider={selectedProviderForReview}
                />
            )}
        </div>
    );
};

export default UnifiedProfile; 