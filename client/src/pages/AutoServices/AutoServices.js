import { useUser } from "@clerk/clerk-react";
import React, { useEffect, useMemo, useState } from "react";
import {
    FaChevronDown,
    FaEye,
    FaMapMarkerAlt,
    FaPlusCircle,
    FaUsers
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import QuoteModal from "../../components/QuoteModal/QuoteModal";
import ReviewModal from "../../components/ReviewModal/ReviewModal";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
import RecommendationCard from "../../components/RecommendationCard/RecommendationCard";
import "./AutoServices.css"; // Ensure you have styles for .like-button.liked here

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = "http://localhost:3000";



const AutoServices = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const navigate = useNavigate();

    const [rawProviders, setRawProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserEmail, setCurrentUserEmail] = useState(null);
    const [currentUserName, setCurrentUserName] = useState(null);
    const [likedRecommendations, setLikedRecommendations] = useState(new Set());
    const [clickedRecommender, setClickedRecommender] = useState(null);
    const [showFeatureComingModal, setShowFeatureComingModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [selectedCities, setSelectedCities] = useState([]);
    const [showCityFilter, setShowCityFilter] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [commentsMap, setCommentsMap] = useState(new Map());
    const [isLoadingComments, setIsLoadingComments] = useState(false);

    const handleCitySelection = (cityName) => {
        setSelectedCities((prev) =>
            prev.includes(cityName)
                ? prev.filter((c) => c !== cityName)
                : [...prev, cityName]
        );
    };

    const availableCities = useMemo(() => {
        if (!rawProviders || rawProviders.length === 0) return [];
        const cityCounts = rawProviders.reduce((acc, rec) => {
            const city = rec.city || "Other";
            acc[city] = (acc[city] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(cityCounts).sort(
            ([, countA], [, countB]) => countB - countA
        );
    }, [rawProviders]);

    const providers = useMemo(() => {
        let list = [...rawProviders];

        if (selectedCities.length > 0) {
            list = list.filter(p => {
                const city = p.city || "Other";
                return selectedCities.includes(city);
            });
        }
        
        return list.sort((a, b) => {
            const dateA = a.date_of_recommendation;
            const dateB = b.date_of_recommendation;

            if (dateA && dateB) return new Date(dateB) - new Date(dateA);
            if (dateA) return -1;
            if (dateB) return 1;
            return (a.originalIndex || 0) - (b.originalIndex || 0);
        });
    }, [rawProviders, selectedCities]);

    useEffect(() => {
        if (isLoaded && isSignedIn && user) {
            setCurrentUserId(user.id);
            setCurrentUserEmail(user.primaryEmailAddress?.emailAddress);
            setCurrentUserName(user.firstName || user.lastName || "User");
        } else if (isLoaded && !isSignedIn) {
            setCurrentUserId(null);
            setCurrentUserEmail(null);
            setCurrentUserName(null);
        }
    }, [isLoaded, isSignedIn, user]);

    useEffect(() => {
        if (!isLoaded) return;

        if (!isSignedIn) {
            setError("Please log in to view auto service providers.");
            setLoading(false);
            setRawProviders([]);
            return;
        }

        const getProviders = async () => {
            setLoading(true);
            setError(null);
            try {
                if (!user.id || !user.primaryEmailAddress?.emailAddress) {
                    throw new Error("Missing required user data");
                }
                const params = new URLSearchParams({
                    user_id: user.id,
                    email: user.primaryEmailAddress?.emailAddress,
                    firstName: user.firstName || "",
                    lastName: user.lastName || "",
                });
                const response = await fetch(
                    `${API_URL}/api/autoProviders?${params.toString()}`
                );
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({
                        message: "Failed to fetch providers",
                    }));
                    throw new Error(errData.message || `HTTP error ${response.status}`);
                }
                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.message || "Failed to fetch auto providers successfully");
                }

                let fetchedProviders = data.providers || [];

                const enrichedProviders = fetchedProviders.map((p, idx) => ({
                    ...p,
                    originalIndex: idx,
                    average_rating: parseFloat(p.average_rating) || 0,
                    total_reviews: parseInt(p.total_reviews, 10) || 0,
                    users_who_reviewed: p.users_who_reviewed || [],
                    currentUserLiked: p.currentUserLiked || false,
                    num_likes: parseInt(p.num_likes, 10) || 0,
                }));

                const newInitialUserLikes = new Set();
                enrichedProviders.forEach(p => {
                    if (p.currentUserLiked) {
                        newInitialUserLikes.add(p.id);
                    }
                });
                setLikedRecommendations(newInitialUserLikes);
                
                setRawProviders(enrichedProviders);
            } catch (err) {
                setError(err.message || "Failed to fetch providers");
                setRawProviders([]);
            } finally {
                setLoading(false);
            }
        };

        if (currentUserId && currentUserEmail) {
            getProviders();
        } else if (isLoaded && !isSignedIn) {
            setError("Please log in to view auto service providers.");
            setLoading(false);
            setRawProviders([]);
        }
    }, [refreshTrigger, isLoaded, isSignedIn, user, currentUserId, currentUserEmail]);

    // Fetch batch comments when providers are loaded
    useEffect(() => {
        if (!loading && providers.length > 0) {
            fetchBatchComments(providers);
        }
    }, [providers, loading]);

    // Batch fetch comments for multiple recommendations
    const fetchBatchComments = async (recommendations) => {
        if (!recommendations || recommendations.length === 0) return;
        
        setIsLoadingComments(true);
        try {
            const serviceIds = recommendations.map(rec => rec.id).filter(Boolean);
            
            if (serviceIds.length === 0) return;

            const response = await fetch(`${API_URL}/api/comments/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ service_ids: serviceIds }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.comments) {
                    const newCommentsMap = new Map();
                    Object.entries(data.comments).forEach(([serviceId, comments]) => {
                        newCommentsMap.set(parseInt(serviceId), comments || []);
                    });
                    setCommentsMap(newCommentsMap);
                }
            }
        } catch (error) {
            console.error('Error fetching batch comments:', error);
        } finally {
            setIsLoadingComments(false);
        }
    };

    // Handle comment added callback
    const handleCommentAdded = (serviceId, newComment) => {
        setCommentsMap(prevMap => {
            const newMap = new Map(prevMap);
            const existingComments = newMap.get(serviceId) || [];
            newMap.set(serviceId, [newComment, ...existingComments]);
            return newMap;
        });
    };

    const handleReviewSubmit = async (reviewData) => {
        if (!isSignedIn || !selectedProvider || !currentUserId || !currentUserEmail) {
            alert("Please sign in to submit a review");
            return;
        }
        setIsReviewModalOpen(false);
        try {
            const response = await fetch(`${API_URL}/api/reviews`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider_id: selectedProvider.id,
                    provider_email: selectedProvider.email || "",
                    user_id: currentUserId,
                    email: currentUserEmail,
                    rating: reviewData.rating,
                    content: reviewData.review,
                    tags: reviewData.tags,
                }),
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || "Failed to submit review");
            }
            
            // Show success modal
            setSuccessMessage(`Thank you for reviewing ${selectedProvider.business_name}! Your feedback helps others make better decisions.`);
            setShowSuccessModal(true);
            
            setRefreshTrigger(Date.now());
        } catch (err) {
            alert(`Error submitting review: ${err.message}`);
        }
    };

    const handleLike = async (providerId) => {
        if (!currentUserId || !currentUserEmail) {
            alert("Please log in to like/unlike a recommendation.");
            return;
        }

        const providerToUpdate = rawProviders.find(p => p.id === providerId);
        if (!providerToUpdate) {
            console.error("Provider not found for like action:", providerId);
            return;
        }

        const originalRawProviders = JSON.parse(JSON.stringify(rawProviders));
        const originalLikedRecommendations = new Set(likedRecommendations);

        const newCurrentUserLikedState = !providerToUpdate.currentUserLiked;
        const newNumLikes = newCurrentUserLikedState
            ? (providerToUpdate.num_likes || 0) + 1
            : Math.max(0, (providerToUpdate.num_likes || 1) - 1);

        const optimisticUpdate = (items) =>
            items.map(p =>
                p.id === providerId
                    ? { ...p, num_likes: newNumLikes, currentUserLiked: newCurrentUserLikedState }
                    : p
            );

        setRawProviders(optimisticUpdate(rawProviders));

        if (newCurrentUserLikedState) {
            setLikedRecommendations(prevLiked => new Set(prevLiked).add(providerId));
        } else {
            setLikedRecommendations(prevLiked => {
                const newSet = new Set(prevLiked);
                newSet.delete(providerId);
                return newSet;
            });
        }

        try {
            const response = await fetch(`${API_URL}/api/providers/${providerId}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId, userEmail: currentUserEmail })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Server error during like/unlike action." }));
                throw new Error(errorData.message || `Failed to update like status. Status: ${response.status}`);
            }
            const result = await response.json();

            const finalUpdate = (items) =>
                items.map(p =>
                    p.id === providerId
                        ? { ...p, num_likes: parseInt(result.num_likes, 10) || 0, currentUserLiked: result.currentUserLiked }
                        : p
                );

            setRawProviders(prevRaw => finalUpdate(prevRaw));
            
            if (result.currentUserLiked) {
                setLikedRecommendations(prev => new Set(prev).add(providerId));
            } else {
                setLikedRecommendations(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(providerId);
                    return newSet;
                });
            }

        } catch (error) {
            console.error("Error updating like status:", error.message);
            setRawProviders(originalRawProviders);
            setLikedRecommendations(originalLikedRecommendations);
            alert(`Failed to update like status: ${error.message}`);
        }
    };

    const conditionalLoadingJsx = () => {
        if (!isLoaded) return <div className="loading-spinner">Loading...</div>;
        if (!isSignedIn && isLoaded) {
            return (
                <div className="error-message full-width-error">
                    Please sign in to view auto service providers.
                </div>
            );
        }
        if (loading && providers.length === 0) return <div className="loading-spinner">Loading...</div>;
        if (error && providers.length === 0 && !loading) {
            return <div className="error-message full-width-error">{error}</div>;
        }
        return null;
    }

    const loadingOrErrorDisplay = conditionalLoadingJsx();
    if (loadingOrErrorDisplay) return loadingOrErrorDisplay;

    return (
        <div className="auto-services-container">
            <h1 className="section-heading">Top Auto Service Providers</h1>
            {availableCities.length > 0 && (
                <div className="profile-city-filter-toggle-section">
                    <button
                        className="profile-city-filter-toggle"
                        onClick={() =>
                            setShowCityFilter(!showCityFilter)
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
                        <FaChevronDown
                            className={`profile-filter-chevron ${
                                showCityFilter ? "rotated" : ""
                            }`}
                        />
                    </button>
                    {showCityFilter && (
                        <div className="profile-city-filter-wrapper">
                            <div className="profile-city-filter-checkboxes">
                                {availableCities.map(
                                    ([cityName, count]) => (
                                        <div
                                            key={cityName}
                                            className="profile-city-checkbox-item"
                                        >
                                            <input
                                                type="checkbox"
                                                id={`city-${cityName.replace(/\s+/g, '-')}`}
                                                name={cityName}
                                                checked={selectedCities.includes(
                                                    cityName
                                                )}
                                                onChange={() =>
                                                    handleCitySelection(
                                                        cityName
                                                    )
                                                }
                                            />
                                            <label
                                                htmlFor={`city-${cityName.replace(/\s+/g, '-')}`}
                                                className="profile-city-checkbox-label"
                                            >
                                                {cityName}
                                            </label>
                                            <span className="profile-city-count">
                                                ({count})
                                            </span>
                                        </div>
                                    )
                                )}
                                {selectedCities.length > 0 && (
                                    <button
                                        onClick={() =>
                                            setSelectedCities([])
                                        }
                                        className="profile-city-clear-all"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!loading && !error && providers.length === 0 && (
                <div className="no-providers-message">
                    <FaUsers className="no-providers-icon" />
                    <h2>No Auto Services Found In Your Network</h2>
                    <p>
                        We couldn't find any auto service recommendations
                        visible to you right now. This might be because:
                    </p>
                    <ul>
                        <li>
                            No public auto recommendations are currently
                            available.
                        </li>
                        <li>
                            None of your direct connections have shared auto
                            recommendations with 'connections' visibility.
                        </li>
                        <li>
                            No auto recommendations have been shared into
                            communities you're a member of.
                        </li>
                    </ul>
                    <p>Try expanding your Trust Circle or check back later!</p>
                    <div className="no-providers-actions">
                        <button
                            onClick={() => navigate("/trustcircles")}
                            className="primary-button"
                        >
                            <FaUsers style={{ marginRight: "8px" }} /> Manage
                            Your Trust Circle
                        </button>
                        <button
                            onClick={() => navigate("/share-recommendation")}
                            className="secondary-button"
                        >
                            <FaPlusCircle style={{ marginRight: "8px" }} />{" "}
                            Recommend a Provider
                        </button>
                    </div>
                </div>
            )}

            {providers.length > 0 && (
                <div className="provider-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                    {providers.map((provider) => (
                        <RecommendationCard
                            key={provider.id}
                            rec={provider}
                            onWriteReview={(rec) => {
                                setSelectedProvider(rec);
                                setIsReviewModalOpen(true);
                            }}
                            onLike={handleLike}
                            isLikedByCurrentUser={likedRecommendations.has(provider.id)}
                            loggedInUserId={currentUserId}
                            currentUserName={currentUserName}
                            comments={commentsMap.get(provider.id) || []}
                            onCommentAdded={handleCommentAdded}
                        />
                    ))}
                </div>
            )}

            {isReviewModalOpen && selectedProvider && (
                <ReviewModal
                    isOpen={isReviewModalOpen}
                    onClose={() => setIsReviewModalOpen(false)}
                    onSubmit={handleReviewSubmit}
                    provider={selectedProvider}
                />
            )}

            {isQuoteModalOpen && selectedProvider && (
                <QuoteModal
                    isOpen={isQuoteModalOpen}
                    providerName={selectedProvider.business_name}
                    providerEmail={selectedProvider.email}
                    providerPhotoUrl={selectedProvider.profile_image}
                    onClose={() => setIsQuoteModalOpen(false)}
                />
            )}
            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                message={successMessage}
                title="Review Submitted!"
            />
            {clickedRecommender && (
                <div className="modal-overlay">
                    <div className="simple-modal">
                        <button
                            className="modal-close-x"
                            onClick={() => setClickedRecommender(null)}
                        >
                            ×
                        </button>
                        <h3 className="modal-title">
                            Want to connect with{" "}
                            <span className="highlight">
                                {clickedRecommender}
                            </span>
                            ?
                        </h3>
                        <div className="modal-buttons-vertical">
                            <button
                                className="secondary-button"
                                onClick={() => {
                                    setClickedRecommender(null);
                                    setShowFeatureComingModal(true);
                                }}
                            >
                                Thank {clickedRecommender}
                            </button>
                            <button
                                className="secondary-button"
                                onClick={() => {
                                    setClickedRecommender(null);
                                    setShowFeatureComingModal(true);
                                }}
                            >
                                Ask {clickedRecommender} a question
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showFeatureComingModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button
                            className="modal-close-x"
                            onClick={() => setShowFeatureComingModal(false)}
                        >
                            ×
                        </button>
                        <p>We're about to launch this feature. Stay tuned <FaEye style={{ marginLeft: '5px' }} /></p>
                        <div className="modal-buttons">
                            <button
                                className="primary-button"
                                onClick={() => setShowFeatureComingModal(false)}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AutoServices;