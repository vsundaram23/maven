import { useUser } from "@clerk/clerk-react";
import React, { useEffect, useMemo, useState } from 'react';
import {
    FaChevronDown,
    FaEnvelope,
    FaEye,
    FaMapMarkerAlt,
    FaPhone,
    FaPlusCircle,
    FaStar,
    FaThumbsUp,
    FaUsers
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import QuoteModal from "../../components/QuoteModal/QuoteModal";
import ReviewModal from "../../components/ReviewModal/ReviewModal";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
import "./CleaningServices.css"; // Ensure you have styles for .like-button.liked here

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = "http://localhost:3000";

const StarRating = ({ rating }) => {
    const numRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalf = numRating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

    return (
        <div className="star-rating">
            {[...Array(fullStars)].map((_, i) => (
                <FaStar key={`full-${i}`} className="filled" />
            ))}
            {hasHalf && (
                <FaStar key={`half-${Date.now()}-sr`} className="half" />
            )}
            {[...Array(emptyStars)].map((_, i) => (
                <FaStar key={`empty-${i}`} className="empty" />
            ))}
        </div>
    );
};

const ProviderProfileModal = ({
    isOpen,
    onClose,
    provider,
    reviews = [],
    setSelectedProvider,
    setIsReviewModalOpen,
}) => {
    if (!isOpen || !provider) return null;

    const formattedDate = provider.date_of_recommendation
        ? new Date(provider.date_of_recommendation).toLocaleDateString(
            "en-US",
            {
                year: "2-digit",
                month: "numeric",
                day: "numeric",
            }
        )
        : "Not provided";

    const recommenders = new Set();
    if (provider.recommender_name) recommenders.add(provider.recommender_name);
    reviews.forEach((r) => r.user_name && recommenders.add(r.user_name));

    const alsoUsedBy = Array.from(recommenders).filter(
        (name) => name !== provider.recommender_name
    );
    const currentProviderAverageRating =
        parseFloat(provider.average_rating) || 0;

    return (
        <div className="modal-overlay">
            <div className="profile-modal-content">
                <button className="modal-close-x" onClick={onClose}>
                    ×
                </button>
                <div className="profile-header">
                    <h2 className="profile-name">{provider.business_name}</h2>
                    <div className="badge-wrapper">
                        {currentProviderAverageRating >= 4.5 && (
                            <span className="top-rated-badge">Top Rated</span>
                        )}
                        <div className="modal-icons">
                            {provider.phone_number && (
                                <a
                                    href={`tel:${provider.phone_number}`}
                                    title="Call"
                                >
                                    <FaPhone />
                                </a>
                            )}
                            {provider.email && (
                                <a
                                    href={`mailto:${provider.email}`}
                                    title="Email"
                                >
                                    <FaEnvelope />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
                <div className="profile-section">
                    <p>
                        <strong>Description:</strong>{" "}
                        {provider.description || provider.recommender_message || "N/A"}
                    </p>
                    <p>
                        <strong>Service Type:</strong>{" "}
                        {provider.service_type || provider.category || "N/A"}
                    </p>
                    <p>
                        <strong>Date of Recommendation:</strong> {formattedDate}
                    </p>
                    {provider.recommender_name && (
                        <p>
                            <strong>Recommended by:</strong>{" "}
                            {provider.recommender_name}
                        </p>
                    )}
                    {alsoUsedBy.length > 0 && (
                        <p>
                            <strong>Also used by:</strong>{" "}
                            {alsoUsedBy.join(", ")}
                        </p>
                    )}
                    {Array.isArray(provider.tags) &&
                        provider.tags.length > 0 && (
                            <div className="tag-container">
                                {provider.tags.map((tag, idx) => (
                                    <span key={idx} className="tag-badge">
                                        {tag}
                                    </span>
                                ))}
                                <button
                                    className="add-tag-button"
                                    onClick={() => {
                                        if (setSelectedProvider && setIsReviewModalOpen) {
                                            setSelectedProvider(provider);
                                            setIsReviewModalOpen(true);
                                        }
                                        onClose();
                                    }}
                                >
                                    +
                                </button>
                            </div>
                        )}
                </div>
                <hr className="my-4" />
                <div className="profile-reviews">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Reviews
                    </h3>
                    {reviews.length === 0 ? (
                        <p className="no-reviews">No reviews yet.</p>
                    ) : (
                        reviews.map((review, index) => (
                            <div key={index} className="profile-review">
                                <div className="review-stars">
                                    {[...Array(5)].map((_, i) => (
                                        <FaStar
                                            key={i}
                                            className={
                                                i < review.rating
                                                    ? "star active"
                                                    : "star"
                                            }
                                            style={{ color: "#1A365D" }}
                                        />
                                    ))}
                                </div>
                                <p className="review-content">
                                    "{review.content}"
                                </p>
                                <p className="review-user">
                                    – {review.user_name || "Anonymous"}
                                </p>
                            </div>
                        ))
                    )}
                </div>
                <div className="modal-buttons mt-6">
                    <button className="cancel-button" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const CleaningServices = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const navigate = useNavigate();

    const [rawProviders, setRawProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserEmail, setCurrentUserEmail] = useState(null);
    const [likedRecommendations, setLikedRecommendations] = useState(new Set());
    const [clickedRecommender, setClickedRecommender] = useState(null);
    const [showFeatureComingModal, setShowFeatureComingModal] = useState(false);
    const [dropdownOpenForId, setDropdownOpenForId] = useState(null);
    const [showLinkCopied, setShowLinkCopied] = useState(false);
    const [selectedCities, setSelectedCities] = useState([]);
    const [showCityFilter, setShowCityFilter] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

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
        } else if (isLoaded && !isSignedIn) {
            setCurrentUserId(null);
            setCurrentUserEmail(null);
        }
    }, [isLoaded, isSignedIn, user]);

    useEffect(() => {
        if (!isLoaded) return;

        if (!isSignedIn) {
            setError("Please log in to view cleaning service providers.");
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
                    `${API_URL}/api/cleaningProviders?${params.toString()}`
                );

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({
                        message: "Failed to fetch providers",
                    }));
                    throw new Error(errData.message || `HTTP error ${response.status}`);
                }
                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.message || "Failed to fetch cleaning providers successfully");
                }

                let fetchedProviders = data.providers || [];
                
                // Use review data directly from service_providers table instead of individual API calls
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
            setError("Please log in to view cleaning service providers.");
            setLoading(false);
            setRawProviders([]);
        }
    }, [refreshTrigger, isLoaded, isSignedIn, user, currentUserId, currentUserEmail]);

    const handleReviewSubmit = async (reviewData) => {
        if (!isSignedIn || !selectedProvider || !currentUserId || !currentUserEmail) {
            alert("Please sign in to submit a review");
            return;
        }
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
            setIsSuccessModalOpen(true);
            
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
        const originalProviders = JSON.parse(JSON.stringify(providers));
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
        setProviders(optimisticUpdate(providers));

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
            setProviders(prevSorted => finalUpdate(prevSorted));
            
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
            setProviders(originalProviders);
            setLikedRecommendations(originalLikedRecommendations);
            alert(`Failed to update like status: ${error.message}`);
        }
    };

    if (loading && providers.length === 0) return <div className="loading-spinner">Loading...</div>;
    if (error && providers.length === 0 && !loading)
        return <div className="error-message full-width-error">{error}</div>;

    return (
        <div className="cleaning-services-container">
            <h1 className="section-heading">Top Cleaning Service Providers</h1>
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
                    <h2>No Cleaning Services Found In Your Network</h2>
                    <p>
                        We couldn't find any cleaning service recommendations
                        visible to you right now. This might be because:
                    </p>
                    <ul>
                        <li>
                            No public cleaning recommendations are currently
                            available.
                        </li>
                        <li>
                            None of your direct connections have shared cleaning
                            recommendations with 'connections' visibility.
                        </li>
                        <li>
                            No cleaning recommendations have been shared into
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
                <ul className="provider-list">
                    {providers.map((provider) => {
                        const displayAvgRating = (
                            parseFloat(provider.average_rating) || 0
                        ).toFixed(1);
                        const displayTotalReviews =
                            parseInt(provider.total_reviews, 10) || 0;

                        return (
                            <li key={provider.id} className="provider-card">
                                <div className="card-header">
                                    <h2 className="card-title">
                                    <Link
                                             to={`/provider/${provider.id}`}
                                             target="_blank"
                                             rel="noopener noreferrer"
                                             className="clickable provider-name-link"
                                             onClick={() =>
                                                 localStorage.setItem(
                                                     "selectedProvider",
                                                     JSON.stringify(provider)
                                                 )
                                             }
                                         >
                                             {provider.business_name}
                                         </Link>
                                    </h2>
                                    <div className="badge-wrapper-with-menu">
                                        <div className="badge-group">
                                            {(parseFloat(provider.average_rating) || 0) >= 4.5 && (
                                                <span className="top-rated-badge">
                                                    Top Rated
                                                </span>
                                            )}
                                        </div>
                                        <div className="right-actions">
                                            <div className="dropdown-wrapper">
                                                <button
                                                    className="three-dots-button"
                                                    onClick={() =>
                                                        setDropdownOpenForId(
                                                            dropdownOpenForId === provider.id
                                                                ? null
                                                                : provider.id
                                                        )
                                                    }
                                                    title="Options"
                                                >
                                                    ⋮
                                                </button>
                                                {dropdownOpenForId === provider.id && (
                                                    <div className="dropdown-menu">
                                                        <button
                                                            className="dropdown-item"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(
                                                                    `${window.location.origin}/provider/${provider.id}`
                                                                );
                                                                setDropdownOpenForId(null);
                                                                setShowLinkCopied(true);
                                                                setTimeout(() => setShowLinkCopied(false), 2000);
                                                            }}
                                                        >
                                                            Share this Rec
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {showLinkCopied && dropdownOpenForId !== provider.id && (
                                                <div className="toast">
                                                    Link copied!
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="review-summary">
                                    <span className="stars-and-score">
                                        <StarRating rating={parseFloat(provider.average_rating) || 0} />
                                        {displayAvgRating} ({displayTotalReviews})
                                    </span>
                                    <button
                                        className="see-all-button"
                                        onClick={() => {
                                            setSelectedProvider(provider);
                                            setIsReviewModalOpen(true);
                                        }}
                                    >
                                        Write a Review
                                    </button>
                                    <button
                                        className={`like-button ${provider.currentUserLiked ? 'liked' : ''}`}
                                        onClick={() => handleLike(provider.id)}
                                        title={provider.currentUserLiked ? "Unlike this recommendation" : "Like this recommendation"}
                                    >
                                        <FaThumbsUp />
                                        <span className="like-count">{provider.num_likes || 0}</span>
                                    </button>
                                </div>

                                <p className="card-description">
                                    {provider.recommender_message || "No description available"}
                                </p>

                                {Array.isArray(provider.tags) && provider.tags.length > 0 && (
                                    <div className="tag-container">
                                        {provider.tags.map((tag, idx) => (
                                            <span
                                                key={`${idx}-${provider.id}`}
                                                className="tag-badge"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                        <button
                                            className="add-tag-button"
                                            onClick={() => {
                                                setSelectedProvider(provider);
                                                setIsReviewModalOpen(true);
                                            }}
                                            aria-label="Add a tag"
                                        >
                                            +
                                        </button>
                                    </div>
                                )}

                                {provider.recommender_name && (
                                    <>
                                        <div className="recommended-row">
                                            <span className="recommended-label">
                                                Recommended by:
                                            </span>
                                            {provider.recommender_user_id ? (
                                                <Link to={`/pro/${provider.recommender_username}`} className="recommended-name clickable" target="_blank" rel="noopener noreferrer">{provider.recommender_name}</Link>
                                            ) : (
                                                <span
                                                    className="recommended-name clickable"
                                                    onClick={() =>
                                                        setClickedRecommender(
                                                            provider.recommender_name
                                                        )
                                                    }
                                                >
                                                    {provider.recommender_name}
                                                </span>
                                            )}
                                            {provider.date_of_recommendation && (
                                                <span className="recommendation-date">
                                                    {" ("}
                                                    {new Date(
                                                        provider.date_of_recommendation
                                                    ).toLocaleDateString("en-US", {
                                                        year: "2-digit",
                                                        month: "numeric",
                                                        day: "numeric",
                                                    })}
                                                    {")"}
                                                </span>
                                            )}
                                        </div>

                                        {Array.isArray(provider.users_who_reviewed) && provider.users_who_reviewed.length > 0 &&
                                            provider.users_who_reviewed.filter(u => u.name && u.name !== provider.recommender_name).length > 0 && (
                                                <div className="recommended-row">
                                                    <span className="recommended-label">
                                                        Also used by:
                                                    </span>
                                                    <span className="used-by-names">
                                                        {provider.users_who_reviewed.filter(u => u.name && u.name !== provider.recommender_name).map(u => u.name).join(", ")}
                                                    </span>
                                                </div>
                                            )}
                                    </>
                                )}
                                <div className="action-buttons">
                                    <button
                                        className="primary-button"
                                        onClick={() => {
                                            setSelectedProvider(provider);
                                            setIsQuoteModalOpen(true);
                                        }}
                                    >
                                        Request a Quote
                                    </button>
                                    <button
                                        className="secondary-button"
                                        onClick={() => {
                                            if (provider.recommender_phone) {
                                                window.location.href = `sms:${provider.recommender_phone}`;
                                            } else if (provider.recommender_email) {
                                                window.location.href = `mailto:${provider.recommender_email}`;
                                            } else {
                                                alert("Sorry, contact info for the recommender is not available.");
                                            }
                                        }}
                                        disabled={
                                            !provider.recommender_phone &&
                                            !provider.recommender_email &&
                                            !provider.recommender_name
                                        }
                                    >
                                        Connect with Recommender
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {isReviewModalOpen && selectedProvider && (
                <ReviewModal
                    isOpen={isReviewModalOpen}
                    onClose={() => setIsReviewModalOpen(false)}
                    onSubmit={handleReviewSubmit}
                    provider={selectedProvider}
                />
            )}
            {isProfileModalOpen && selectedProvider && (
                <ProviderProfileModal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                    provider={selectedProvider}
                    reviews={[]} // Reviews now come from users_who_reviewed in provider data
                    setSelectedProvider={setSelectedProvider}
                    setIsReviewModalOpen={setIsReviewModalOpen}
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
                isOpen={isSuccessModalOpen}
                onClose={() => setIsSuccessModalOpen(false)}
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

export default CleaningServices;