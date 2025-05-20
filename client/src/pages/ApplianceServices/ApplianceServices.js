import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useUser } from "@clerk/clerk-react";
import {
    FaStar,
    FaPhone,
    FaEnvelope,
    FaUsers,
    FaPlusCircle,
    FaThumbsUp,
} from "react-icons/fa";
import QuoteModal from "../../components/QuoteModal/QuoteModal";
import "./ApplianceServices.css";

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

const ReviewModal = ({ isOpen, onClose, onSubmit, provider }) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [review, setReview] = useState("");
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!rating) {
            setError("Please select a rating");
            return;
        }
        onSubmit({ rating, review, tags });
        setRating(0);
        setReview("");
        setTags([]);
        setTagInput("");
        setError("");
        onClose();
    };

    const handleTagKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const trimmed = tagInput.trim();
            if (trimmed && !tags.includes(trimmed)) {
                setTags([...tags, trimmed]);
            }
            setTagInput("");
        }
    };

    const removeTag = (tagToRemove) => {
        setTags(tags.filter((tag) => tag !== tagToRemove));
    };

    if (!isOpen || !provider) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Review {provider?.business_name}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="rating-container">
                        <label>
                            Rate your experience:{" "}
                            <span className="required">*</span>
                        </label>
                        <div className="stars">
                            {[...Array(5)].map((_, index) => (
                                <FaStar
                                    key={index}
                                    className={
                                        index < (hover || rating)
                                            ? "star active"
                                            : "star"
                                    }
                                    onClick={() => setRating(index + 1)}
                                    onMouseEnter={() => setHover(index + 1)}
                                    onMouseLeave={() => setHover(rating)}
                                />
                            ))}
                        </div>
                        {error && <div className="error-message">{error}</div>}
                    </div>
                    <div className="review-input">
                        <label>Tell us about your experience:</label>
                        <textarea
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            placeholder="Optional: Share your thoughts..."
                            rows={4}
                        />
                    </div>
                    <div className="tag-input-group">
                        <label>Add tags (press Enter to add):</label>
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            placeholder="e.g. friendly, affordable"
                        />
                        <div className="tag-container">
                            {tags.map((tag, idx) => (
                                <span key={idx} className="tag-badge">
                                    {tag}
                                    <span
                                        className="remove-tag"
                                        onClick={() => removeTag(tag)}
                                    >
                                        ×
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="modal-buttons">
                        <button
                            type="button"
                            onClick={onClose}
                            className="cancel-button"
                        >
                            Cancel
                        </button>
                        <button type="submit" className="submit-button">
                            Submit Review
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ApplianceServices = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const navigate = useNavigate();
    const [providers, setProviders] = useState([]);
    const [rawProviders, setRawProviders] = useState([]);
    const [reviewMap, setReviewMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [sortOption, setSortOption] = useState("recommended");
    const [dropdownOpenForId, setDropdownOpenForId] = useState(null);
    const [showLinkCopied, setShowLinkCopied] = useState(false);
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserEmail, setCurrentUserEmail] = useState(null);
    const [likedRecommendations, setLikedRecommendations] = useState(new Set());

    const [clickedRecommender, setClickedRecommender] = useState(null);
    const [showFeatureComingModal, setShowFeatureComingModal] = useState(false);

    useEffect(() => {
        if (isLoaded && isSignedIn && user) {
            setCurrentUserId(user.id);
            setCurrentUserEmail(user.primaryEmailAddress?.emailAddress);
        }
    }, [isLoaded, isSignedIn, user]);

    useEffect(() => {
        if (!isLoaded) return;

        if (!isSignedIn) {
            setError("Please log in to view appliance service providers.");
            setLoading(false);
            setProviders([]);
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
                    `${API_URL}/api/applianceProviders?${params.toString()}`
                );

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({
                        message: "Failed to fetch providers",
                    }));
                    throw new Error(
                        errData.message || `HTTP error ${response.status}`
                    );
                }

                const data = await response.json();

                if (!data.success) {
                    throw new Error(
                        data.message ||
                        "Failed to fetch appliance providers successfully"
                    );
                }

                let fetchedProviders = data.providers || [];
                const statsMap = {};
                const allReviewsMap = {};
                const userLikesMap = {};

                if (fetchedProviders.length > 0) {
                    await Promise.all(
                        fetchedProviders.map(async (provider) => {
                            try {
                                const statsRes = await fetch(
                                    `${API_URL}/api/reviews/stats/${provider.id}`
                                );
                                if (statsRes.ok) {
                                    const statsData = await statsRes.json();
                                    statsMap[provider.id] = {
                                        average_rating:
                                            parseFloat(
                                                statsData.average_rating
                                            ) || 0,
                                        total_reviews:
                                            parseInt(
                                                statsData.total_reviews,
                                                10
                                            ) || 0,
                                    };
                                } else {
                                    statsMap[provider.id] = {
                                        average_rating: 0,
                                        total_reviews: 0,
                                    };
                                }
                            } catch (err) {
                                console.error(`Error fetching stats for provider ${provider.id}:`, err);
                                statsMap[provider.id] = {
                                    average_rating: 0,
                                    total_reviews: 0,
                                };
                            }
                            try {
                                const reviewsRes = await fetch(
                                    `${API_URL}/api/reviews/${provider.id}`
                                );
                                if (reviewsRes.ok) {
                                    allReviewsMap[provider.id] =
                                        await reviewsRes.json();
                                } else {
                                    allReviewsMap[provider.id] = [];
                                }
                            } catch (err) {
                                console.error(`Error fetching reviews for provider ${provider.id}:`, err);
                                allReviewsMap[provider.id] = [];
                            }
                            if (currentUserId) {
                                try {
                                    const likeStatusRes = await fetch(`${API_URL}/api/providers/${provider.id}/like-status?userId=${currentUserId}`);
                                    if (likeStatusRes.ok) {
                                        const likeStatusData = await likeStatusRes.json();
                                        userLikesMap[provider.id] = likeStatusData.liked;
                                    } else {
                                        userLikesMap[provider.id] = false;
                                    }
                                } catch (err) {
                                    console.error(`Error fetching like status for provider ${provider.id}:`, err);
                                    userLikesMap[provider.id] = false;
                                }
                            }
                        })
                    );
                }
                setReviewMap(allReviewsMap);

                const enrichedProviders = fetchedProviders.map((p, idx) => ({
                    ...p,
                    originalIndex: idx,
                    average_rating: statsMap[p.id]?.average_rating || 0,
                    total_reviews: statsMap[p.id]?.total_reviews || 0,
                    currentUserLiked: userLikesMap[p.id] || false,
                    num_likes: p.num_likes || 0,
                }));
                setRawProviders(enrichedProviders);

                const getBand = (rating) => {
                    if (rating >= 4) return 0;
                    if (rating >= 3) return 1;
                    if (rating >= 2) return 2;
                    if (rating >= 1) return 3;
                    return 4;
                };

                let sortedProviders;
                if (sortOption === "topRated") {
                    sortedProviders = [...enrichedProviders]
                        .filter((p) => p.average_rating >= 4.5)
                        .sort((a, b) => {
                            if (b.average_rating !== a.average_rating)
                                return b.average_rating - a.average_rating;
                            return (
                                (b.total_reviews || 0) - (a.total_reviews || 0)
                            );
                        });
                } else {
                    sortedProviders = [...enrichedProviders].sort((a, b) => {
                        const bandA = getBand(a.average_rating);
                        const bandB = getBand(b.average_rating);
                        if (bandA !== bandB) return bandA - bandB;

                        const scoreA =
                            a.average_rating * (a.total_reviews || 0);
                        const scoreB =
                            b.average_rating * (b.total_reviews || 0);
                        if (scoreB !== scoreA) return scoreB - scoreA;

                        if (b.average_rating !== a.average_rating)
                            return b.average_rating - a.average_rating;
                        if ((b.total_reviews || 0) !== (a.total_reviews || 0))
                            return (
                                (b.total_reviews || 0) - (a.total_reviews || 0)
                            );

                        return (a.originalIndex || 0) - (b.originalIndex || 0);
                    });
                }
                setProviders(sortedProviders);
            } catch (err) {
                setError(err.message || "Failed to fetch providers");
                setProviders([]);
                setRawProviders([]);
            } finally {
                setLoading(false);
            }
        };

        if (currentUserId) {
            getProviders();
        } else if (isLoaded && !isSignedIn) {
            setError("Please log in to view appliance service providers.");
            setLoading(false);
            setProviders([]);
            setRawProviders([]);
        }

    }, [sortOption, isLoaded, isSignedIn, user, currentUserId, currentUserEmail]);


    const handleReviewSubmit = async (reviewData) => {
        if (!isSignedIn || !selectedProvider) {
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

            const currentSort = sortOption;
            setSortOption("");
            setTimeout(() => setSortOption(currentSort), 0);
        } catch (err) {
            alert(`Error submitting review: ${err.message}`);
        }
    };

    const handleLike = async (providerId) => {
        if (!currentUserId || !currentUserEmail) {
            alert("Please log in to like a recommendation.");
            return;
        }

        const providerToUpdate = providers.find(p => p.id === providerId);
        if (!providerToUpdate) return;

        const isAlreadyLiked = providerToUpdate.currentUserLiked;

        setProviders(prevProviders =>
            prevProviders.map(provider =>
                provider.id === providerId
                    ? {
                        ...provider,
                        num_likes: isAlreadyLiked ? (provider.num_likes || 1) - 1 : (provider.num_likes || 0) + 1,
                        currentUserLiked: !isAlreadyLiked
                    }
                    : provider
            )
        );

        setRawProviders(prevRawProviders =>
            prevRawProviders.map(provider =>
                provider.id === providerId
                    ? {
                        ...provider,
                        num_likes: isAlreadyLiked ? (provider.num_likes || 1) - 1 : (provider.num_likes || 0) + 1,
                        currentUserLiked: !isAlreadyLiked
                    }
                    : provider
            )
        );


        try {
            const response = await fetch(`${API_URL}/api/providers/${providerId}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: currentUserId, userEmail: currentUserEmail })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Server error during like action." }));
                throw new Error(errorData.message || `Failed to like recommendation. Status: ${response.status}`);
            }
            const result = await response.json();

            setProviders(prevProviders =>
                prevProviders.map(provider =>
                    provider.id === providerId
                        ? { ...provider, num_likes: result.num_likes, currentUserLiked: result.currentUserLiked }
                        : provider
                )
            );
            setRawProviders(prevRawProviders =>
                prevRawProviders.map(provider =>
                    provider.id === providerId
                        ? { ...provider, num_likes: result.num_likes, currentUserLiked: result.currentUserLiked }
                        : provider
                )
            );

        } catch (error) {
            console.error("Error liking recommendation:", error.message);
            setProviders(prevProviders =>
                prevProviders.map(provider => {
                    if (provider.id === providerId) {
                        return {
                            ...provider,
                            num_likes: providerToUpdate.num_likes,
                            currentUserLiked: isAlreadyLiked
                        };
                    }
                    return provider;
                }
                )
            );
            setRawProviders(prevRawProviders =>
                prevRawProviders.map(provider => {
                    if (provider.id === providerId) {
                        return {
                            ...provider,
                            num_likes: providerToUpdate.num_likes,
                            currentUserLiked: isAlreadyLiked
                        };
                    }
                    return provider;
                }
                )
            );
        }
    };


    const openProviderProfilePage = (providerId) => {
        navigate(`/provider/${providerId}`);
    };

    if (loading && providers.length === 0)
        return <div className="loading-spinner">Loading...</div>;
    if (error && providers.length === 0 && !loading)
        return <div className="error-message full-width-error">{error}</div>;

    return (
        <div className="appliance-services-container">
            <h1 className="section-heading">Top Repair Service Providers</h1>
            <div className="sort-bar">
                Sort by:
                <select
                    className="sort-dropdown"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                >
                    <option value="recommended">Recommended</option>
                    <option value="topRated">Top Rated</option>
                </select>
            </div>

            {!loading && !error && providers.length === 0 && (
                <div className="no-providers-message">
                    <FaUsers className="no-providers-icon" />
                    <h2>No Repair Services Found In Your Network</h2>
                    <p>
                        We couldn't find any repair service recommendations
                        visible to you right now. This might be because:
                    </p>
                    <ul>
                        <li>
                            No public repair recommendations are currently
                            available.
                        </li>
                        <li>
                            None of your direct connections have shared repair
                            recommendations with 'connections' visibility.
                        </li>
                        <li>
                            No repair recommendations have been shared into
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
                        const currentReviews = reviewMap[provider.id] || [];
                        const displayAvgRating = (
                            parseFloat(provider.average_rating) || 0
                        ).toFixed(1);
                        const displayTotalReviews =
                            parseInt(provider.total_reviews, 10) || 0;
                        const hasUserLiked = provider.currentUserLiked;

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
                                            {(parseFloat(
                                                provider.average_rating
                                            ) || 0) >= 4.5 && (
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
                                                            dropdownOpenForId ===
                                                                provider.id
                                                                ? null
                                                                : provider.id
                                                        )
                                                    }
                                                    title="Options"
                                                >
                                                    ⋮
                                                </button>

                                                {dropdownOpenForId ===
                                                    provider.id && (
                                                        <div className="dropdown-menu">
                                                            <button
                                                                className="dropdown-item"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(
                                                                        `https://triedandtrusted.ai/provider/${provider.id}`
                                                                    );
                                                                    setDropdownOpenForId(
                                                                        null
                                                                    );
                                                                    setShowLinkCopied(
                                                                        true
                                                                    );
                                                                    setTimeout(
                                                                        () =>
                                                                            setShowLinkCopied(
                                                                                false
                                                                            ),
                                                                        2000
                                                                    );
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
                                        <StarRating
                                            rating={
                                                parseFloat(
                                                    provider.average_rating
                                                ) || 0
                                            }
                                        />
                                        {displayAvgRating} (
                                        {displayTotalReviews})
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
                                        className={`like-button ${hasUserLiked ? 'liked' : ''}`}
                                        onClick={() => handleLike(provider.id)}
                                        title={hasUserLiked ? "You liked this" : "Like this recommendation"}
                                    >
                                        <FaThumbsUp />
                                        <span className="like-count">{provider.num_likes || 0}</span>
                                    </button>
                                </div>

                                <p className="card-description">
                                    {provider.description ||
                                        "No description available"}
                                </p>
                                {Array.isArray(provider.tags) &&
                                    provider.tags.length > 0 && (
                                        <div className="tag-container">
                                            {provider.tags.map((tag, idx) => (
                                                <span
                                                    key={idx}
                                                    className="tag-badge"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                            <button
                                                className="add-tag-button"
                                                onClick={() => {
                                                    setSelectedProvider(
                                                        provider
                                                    );
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
                                                <Link
                                                    to={`/user/${provider.recommender_user_id}/recommendations`}
                                                    className="recommended-name clickable"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    {provider.recommender_name}
                                                </Link>
                                            ) : (
                                                <span className="recommended-name">
                                                    {provider.recommender_name}
                                                </span>
                                            )}
                                            {provider.date_of_recommendation && (
                                                <span className="recommendation-date">
                                                    {" "}
                                                    (
                                                    {new Date(
                                                        provider.date_of_recommendation
                                                    ).toLocaleDateString(
                                                        "en-US",
                                                        {
                                                            year: "2-digit",
                                                            month: "numeric",
                                                            day: "numeric",
                                                        }
                                                    )}
                                                    )
                                                </span>
                                            )}
                                        </div>

                                        {currentReviews.length > 0 &&
                                            [
                                                ...new Set(
                                                    currentReviews
                                                        .map(r => r.user_name)
                                                        .filter(name => (
                                                            name &&
                                                            name !== provider.recommender_name
                                                        ))
                                                ),
                                            ].filter(name => name).length > 0 && ( // Ensure the resulting array is not empty
                                                <div className="recommended-row">
                                                    <span className="recommended-label">
                                                        Also used by:
                                                    </span>
                                                    <span className="used-by-names">
                                                        {[
                                                            ...new Set(
                                                                currentReviews
                                                                    .map(r => r.user_name)
                                                                    .filter(name => (
                                                                        name &&
                                                                        name !== provider.recommender_name
                                                                    ))
                                                            ),
                                                        ].filter(name => name).join(", ")}
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
                                            } else if (
                                                provider.recommender_email
                                            ) {
                                                window.location.href = `mailto:${provider.recommender_email}`;
                                            } else {
                                                alert(
                                                    "Sorry, contact info not available."
                                                );
                                            }
                                        }}
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
                    onSubmit={(reviewData) =>
                        handleReviewSubmit({ ...reviewData })
                    }
                    provider={selectedProvider}
                />
            )}

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
                        <p>We're about to launch this feature. Stay tuned 👁️</p>
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
            {isQuoteModalOpen && selectedProvider && (
                <QuoteModal
                    providerName={selectedProvider.business_name}
                    providerEmail={selectedProvider.email}
                    providerPhotoUrl={selectedProvider.profile_image}
                    onClose={() => setIsQuoteModalOpen(false)}
                />
            )}
        </div>
    );
};

export default ApplianceServices;

// import { Link, useNavigate } from "react-router-dom";
// import React, { useState, useEffect } from "react";
// import { useUser } from "@clerk/clerk-react";
// import {
//     FaStar,
//     FaPhone,
//     FaEnvelope,
//     FaUsers,
//     FaPlusCircle,
// } from "react-icons/fa";
// import QuoteModal from "../../components/QuoteModal/QuoteModal";
// import "./ApplianceServices.css";

// const API_URL = 'https://api.seanag-recommendations.org:8080';
// // const API_URL = "http://localhost:5000";

// const StarRating = ({ rating }) => {
//     const numRating = parseFloat(rating) || 0;
//     const fullStars = Math.floor(numRating);
//     const hasHalf = numRating - fullStars >= 0.5;
//     const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

//     return (
//         <div className="star-rating">
//             {[...Array(fullStars)].map((_, i) => (
//                 <FaStar key={`full-${i}`} className="filled" />
//             ))}
//             {hasHalf && (
//                 <FaStar key={`half-${Date.now()}-sr`} className="half" />
//             )}
//             {[...Array(emptyStars)].map((_, i) => (
//                 <FaStar key={`empty-${i}`} className="empty" />
//             ))}
//         </div>
//     );
// };

// const ReviewModal = ({ isOpen, onClose, onSubmit, provider }) => {
//     const [rating, setRating] = useState(0);
//     const [hover, setHover] = useState(0);
//     const [review, setReview] = useState("");
//     const [tags, setTags] = useState([]);
//     const [tagInput, setTagInput] = useState("");
//     const [error, setError] = useState("");

//     const handleSubmit = (e) => {
//         e.preventDefault();
//         if (!rating) {
//             setError("Please select a rating");
//             return;
//         }
//         onSubmit({ rating, review, tags });
//         setRating(0);
//         setReview("");
//         setTags([]);
//         setTagInput("");
//         setError("");
//         onClose();
//     };

//     const handleTagKeyDown = (e) => {
//         if (e.key === "Enter") {
//             e.preventDefault();
//             const trimmed = tagInput.trim();
//             if (trimmed && !tags.includes(trimmed)) {
//                 setTags([...tags, trimmed]);
//             }
//             setTagInput("");
//         }
//     };

//     const removeTag = (tagToRemove) => {
//         setTags(tags.filter((tag) => tag !== tagToRemove));
//     };

//     if (!isOpen || !provider) return null;

//     return (
//         <div className="modal-overlay">
//             <div className="modal-content">
//                 <h2>Review {provider?.business_name}</h2>
//                 <form onSubmit={handleSubmit}>
//                     <div className="rating-container">
//                         <label>
//                             Rate your experience:{" "}
//                             <span className="required">*</span>
//                         </label>
//                         <div className="stars">
//                             {[...Array(5)].map((_, index) => (
//                                 <FaStar
//                                     key={index}
//                                     className={
//                                         index < (hover || rating)
//                                             ? "star active"
//                                             : "star"
//                                     }
//                                     onClick={() => setRating(index + 1)}
//                                     onMouseEnter={() => setHover(index + 1)}
//                                     onMouseLeave={() => setHover(rating)}
//                                 />
//                             ))}
//                         </div>
//                         {error && <div className="error-message">{error}</div>}
//                     </div>
//                     <div className="review-input">
//                         <label>Tell us about your experience:</label>
//                         <textarea
//                             value={review}
//                             onChange={(e) => setReview(e.target.value)}
//                             placeholder="Optional: Share your thoughts..."
//                             rows={4}
//                         />
//                     </div>
//                     <div className="tag-input-group">
//                         <label>Add tags (press Enter to add):</label>
//                         <input
//                             type="text"
//                             value={tagInput}
//                             onChange={(e) => setTagInput(e.target.value)}
//                             onKeyDown={handleTagKeyDown}
//                             placeholder="e.g. friendly, affordable"
//                         />
//                         <div className="tag-container">
//                             {tags.map((tag, idx) => (
//                                 <span key={idx} className="tag-badge">
//                                     {tag}
//                                     <span
//                                         className="remove-tag"
//                                         onClick={() => removeTag(tag)}
//                                     >
//                                         ×
//                                     </span>
//                                 </span>
//                             ))}
//                         </div>
//                     </div>
//                     <div className="modal-buttons">
//                         <button
//                             type="button"
//                             onClick={onClose}
//                             className="cancel-button"
//                         >
//                             Cancel
//                         </button>
//                         <button type="submit" className="submit-button">
//                             Submit Review
//                         </button>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// };

// const ApplianceServices = () => {
//     const { isLoaded, isSignedIn, user } = useUser();
//     const navigate = useNavigate();
//     const [providers, setProviders] = useState([]);
//     const [reviewMap, setReviewMap] = useState({});
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
//     const [selectedProvider, setSelectedProvider] = useState(null);
//     const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
//     const [sortOption, setSortOption] = useState("recommended");
//     const [dropdownOpenForId, setDropdownOpenForId] = useState(null);
//     const [showLinkCopied, setShowLinkCopied] = useState(false);
//     const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
//     const [currentUserId, setCurrentUserId] = useState(null);

//     const [clickedRecommender, setClickedRecommender] = useState(null);
//     const [showFeatureComingModal, setShowFeatureComingModal] = useState(false);

//     useEffect(() => {
//         if (!isLoaded) return;

//         if (!isSignedIn) {
//             setError("Please log in to view appliance service providers.");
//             setLoading(false);
//             setProviders([]);
//             return;
//         }

//         const getProviders = async () => {
//             setLoading(true);
//             setError(null);
//             try {
//                 // Make sure we have required data
//                 if (!user.id || !user.primaryEmailAddress?.emailAddress) {
//                     throw new Error("Missing required user data");
//                 }

//                 const params = new URLSearchParams({
//                     user_id: user.id,
//                     email: user.primaryEmailAddress?.emailAddress,
//                     firstName: user.firstName || "",
//                     lastName: user.lastName || "",
//                 });
//                 const response = await fetch(
//                     `${API_URL}/api/applianceProviders?${params.toString()}`
//                 );

//                 if (!response.ok) {
//                     const errData = await response.json().catch(() => ({
//                         message: "Failed to fetch providers",
//                     }));
//                     throw new Error(
//                         errData.message || `HTTP error ${response.status}`
//                     );
//                 }

//                 const data = await response.json();

//                 if (!data.success) {
//                     throw new Error(
//                         data.message ||
//                             "Failed to fetch appliance providers successfully"
//                     );
//                 }

//                 let fetchedProviders = data.providers || [];
//                 const statsMap = {}; // Use statsMap like in CleaningServices
//                 const allReviewsMap = {};

//                 if (fetchedProviders.length > 0) {
//                     await Promise.all(
//                         fetchedProviders.map(async (provider) => {
//                             try {
//                                 const statsRes = await fetch(
//                                     `${API_URL}/api/reviews/stats/${provider.id}`
//                                 );
//                                 if (statsRes.ok) {
//                                     const statsData = await statsRes.json();
//                                     statsMap[provider.id] = {
//                                         average_rating:
//                                             parseFloat(
//                                                 statsData.average_rating
//                                             ) || 0,
//                                         total_reviews:
//                                             parseInt(
//                                                 statsData.total_reviews,
//                                                 10
//                                             ) || 0,
//                                     };
//                                 } else {
//                                     statsMap[provider.id] = {
//                                         average_rating: 0,
//                                         total_reviews: 0,
//                                     };
//                                 }
//                             } catch (err) {
//                                 statsMap[provider.id] = {
//                                     average_rating: 0,
//                                     total_reviews: 0,
//                                 };
//                             }
//                             try {
//                                 const reviewsRes = await fetch(
//                                     `${API_URL}/api/reviews/${provider.id}`
//                                 );
//                                 if (reviewsRes.ok) {
//                                     allReviewsMap[provider.id] =
//                                         await reviewsRes.json();
//                                 } else {
//                                     allReviewsMap[provider.id] = [];
//                                 }
//                             } catch (err) {
//                                 allReviewsMap[provider.id] = [];
//                             }
//                         })
//                     );
//                 }
//                 setReviewMap(allReviewsMap);

//                 const enrichedProviders = fetchedProviders.map((p, idx) => ({
//                     ...p,
//                     originalIndex: idx,
//                     average_rating: statsMap[p.id]?.average_rating || 0,
//                     total_reviews: statsMap[p.id]?.total_reviews || 0,
//                 }));

//                 const getBand = (rating) => {
//                     if (rating >= 4) return 0;
//                     if (rating >= 3) return 1;
//                     if (rating >= 2) return 2;
//                     if (rating >= 1) return 3;
//                     return 4;
//                 };

//                 let sortedProviders;
//                 if (sortOption === "topRated") {
//                     sortedProviders = [...enrichedProviders]
//                         .filter((p) => p.average_rating >= 4.5)
//                         .sort((a, b) => {
//                             if (b.average_rating !== a.average_rating)
//                                 return b.average_rating - a.average_rating;
//                             return (
//                                 (b.total_reviews || 0) - (a.total_reviews || 0)
//                             );
//                         });
//                 } else {
//                     sortedProviders = [...enrichedProviders].sort((a, b) => {
//                         const bandA = getBand(a.average_rating);
//                         const bandB = getBand(b.average_rating);
//                         if (bandA !== bandB) return bandA - bandB;

//                         const scoreA =
//                             a.average_rating * (a.total_reviews || 0);
//                         const scoreB =
//                             b.average_rating * (b.total_reviews || 0);
//                         if (scoreB !== scoreA) return scoreB - scoreA;

//                         if (b.average_rating !== a.average_rating)
//                             return b.average_rating - a.average_rating;
//                         if ((b.total_reviews || 0) !== (a.total_reviews || 0))
//                             return (
//                                 (b.total_reviews || 0) - (a.total_reviews || 0)
//                             );

//                         return (a.originalIndex || 0) - (b.originalIndex || 0);
//                     });
//                 }
//                 setProviders(sortedProviders);
//             } catch (err) {
//                 setError(err.message || "Failed to fetch providers");
//                 setProviders([]);
//             } finally {
//                 setLoading(false);
//             }
//         };

//         getProviders();
//     }, [sortOption, isLoaded, isSignedIn, user]);

//     const handleReviewSubmit = async (reviewData) => {
//         if (!isSignedIn || !selectedProvider) {
//             alert("Please sign in to submit a review");
//             return;
//         }

//         try {
//             const response = await fetch(`${API_URL}/api/reviews`, {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({
//                     provider_id: selectedProvider.id,
//                     provider_email: selectedProvider.email || "",
//                     email: user.primaryEmailAddress?.emailAddress,
//                     rating: reviewData.rating,
//                     content: reviewData.review,
//                     tags: reviewData.tags,
//                 }),
//             });

//             if (!response.ok) {
//                 const errText = await response.text();
//                 throw new Error(errText || "Failed to submit review");
//             }

//             const currentSort = sortOption;
//             setSortOption("");
//             setTimeout(() => setSortOption(currentSort), 0);
//         } catch (err) {
//             alert(`Error submitting review: ${err.message}`);
//         }
//     };

//     const openProviderProfilePage = (providerId) => {
//         // Changed from handleViewProfile
//         navigate(`/provider/${providerId}`);
//     };

//     if (loading && providers.length === 0)
//         return <div className="loading-spinner">Loading...</div>;
//     if (error && providers.length === 0)
//         return <div className="error-message full-width-error">{error}</div>;

//     return (
//         <div className="appliance-services-container">
//             <h1 className="section-heading">Top Repair Service Providers</h1>
//             <div className="sort-bar">
//                 Sort by:
//                 <select
//                     className="sort-dropdown"
//                     value={sortOption}
//                     onChange={(e) => setSortOption(e.target.value)}
//                 >
//                     <option value="recommended">Recommended</option>
//                     <option value="topRated">Top Rated</option>
//                 </select>
//             </div>

//             {!loading && !error && providers.length === 0 && (
//                 <div className="no-providers-message">
//                     <FaUsers className="no-providers-icon" />
//                     <h2>No Repair Services Found In Your Network</h2>
//                     <p>
//                         We couldn't find any repair service recommendations
//                         visible to you right now. This might be because:
//                     </p>
//                     <ul>
//                         <li>
//                             No public repair recommendations are currently
//                             available.
//                         </li>
//                         <li>
//                             None of your direct connections have shared repair
//                             recommendations with 'connections' visibility.
//                         </li>
//                         <li>
//                             No repair recommendations have been shared into
//                             communities you're a member of.
//                         </li>
//                     </ul>
//                     <p>Try expanding your Trust Circle or check back later!</p>
//                     <div className="no-providers-actions">
//                         <button
//                             onClick={() => navigate("/trustcircles")}
//                             className="primary-button"
//                         >
//                             <FaUsers style={{ marginRight: "8px" }} /> Manage
//                             Your Trust Circle
//                         </button>
//                         <button
//                             onClick={() => navigate("/share-recommendation")}
//                             className="secondary-button"
//                         >
//                             <FaPlusCircle style={{ marginRight: "8px" }} />{" "}
//                             Recommend a Provider
//                         </button>
//                     </div>
//                 </div>
//             )}

//             {providers.length > 0 && (
//                 <ul className="provider-list">
//                     {providers.map((provider) => {
//                         const currentReviews = reviewMap[provider.id] || [];
//                         const displayAvgRating = (
//                             parseFloat(provider.average_rating) || 0
//                         ).toFixed(1);
//                         const displayTotalReviews =
//                             parseInt(provider.total_reviews, 10) || 0;

//                         return (
//                             <li key={provider.id} className="provider-card">
//                                 <div className="card-header">
//                                     <h2 className="card-title">
//                                         <Link
//                                             to={`/provider/${provider.id}`}
//                                             target="_blank"
//                                             rel="noopener noreferrer"
//                                             className="clickable provider-name-link"
//                                             onClick={() =>
//                                                 localStorage.setItem(
//                                                     "selectedProvider",
//                                                     JSON.stringify(provider)
//                                                 )
//                                             }
//                                         >
//                                             {provider.business_name}
//                                         </Link>
//                                     </h2>
//                                     <div className="badge-wrapper-with-menu">
//                                         <div className="badge-group">
//                                             {(parseFloat(
//                                                 provider.average_rating
//                                             ) || 0) >= 4.5 && (
//                                                 <span className="top-rated-badge">
//                                                     Top Rated
//                                                 </span>
//                                             )}
//                                             {/* <span className="profile-badge">{provider.service_type}</span> */}
//                                         </div>

//                                         <div className="right-actions">
//                                             <div className="dropdown-wrapper">
//                                                 <button
//                                                     className="three-dots-button"
//                                                     onClick={() =>
//                                                         setDropdownOpenForId(
//                                                             dropdownOpenForId ===
//                                                                 provider.id
//                                                                 ? null
//                                                                 : provider.id
//                                                         )
//                                                     }
//                                                     title="Options"
//                                                 >
//                                                     ⋮
//                                                 </button>

//                                                 {dropdownOpenForId ===
//                                                     provider.id && (
//                                                     <div className="dropdown-menu">
//                                                         <button
//                                                             className="dropdown-item"
//                                                             onClick={() => {
//                                                                 navigator.clipboard.writeText(
//                                                                     `https://triedandtrusted.ai/provider/${provider.id}`
//                                                                 );
//                                                                 setDropdownOpenForId(
//                                                                     null
//                                                                 );
//                                                                 setShowLinkCopied(
//                                                                     true
//                                                                 );
//                                                                 setTimeout(
//                                                                     () =>
//                                                                         setShowLinkCopied(
//                                                                             false
//                                                                         ),
//                                                                     2000
//                                                                 );
//                                                             }}
//                                                         >
//                                                             Share this Rec
//                                                         </button>
//                                                     </div>
//                                                 )}
//                                             </div>
//                                             {showLinkCopied && (
//                                                 <div className="toast">
//                                                     Link copied!
//                                                 </div>
//                                             )}
//                                         </div>
//                                     </div>
//                                 </div>

//                                 <div className="review-summary">
//                                     <span className="stars-and-score">
//                                         <StarRating
//                                             rating={
//                                                 parseFloat(
//                                                     provider.average_rating
//                                                 ) || 0
//                                             }
//                                         />
//                                         {displayAvgRating} (
//                                         {displayTotalReviews})
//                                     </span>
//                                     <button
//                                         className="see-all-button"
//                                         onClick={() => {
//                                             setSelectedProvider(provider);
//                                             setIsReviewModalOpen(true);
//                                         }}
//                                     >
//                                         Write a Review
//                                     </button>
//                                 </div>

//                                 <p className="card-description">
//                                     {provider.description ||
//                                         "No description available"}
//                                 </p>
//                                 {Array.isArray(provider.tags) &&
//                                     provider.tags.length > 0 && (
//                                         <div className="tag-container">
//                                             {provider.tags.map((tag, idx) => (
//                                                 <span
//                                                     key={idx}
//                                                     className="tag-badge"
//                                                 >
//                                                     {tag}
//                                                 </span>
//                                             ))}
//                                             <button
//                                                 className="add-tag-button"
//                                                 onClick={() => {
//                                                     setSelectedProvider(
//                                                         provider
//                                                     );
//                                                     setIsReviewModalOpen(true);
//                                                 }}
//                                                 aria-label="Add a tag"
//                                             >
//                                                 +
//                                             </button>
//                                         </div>
//                                     )}
//                                 {provider.recommender_name && (
//                                     <>
//                                         <div className="recommended-row">
//                                             <span className="recommended-label">
//                                                 Recommended by:
//                                             </span>
//                                             {provider.recommender_user_id ? (
//                                                 <Link
//                                                     to={`/user/${provider.recommender_user_id}/recommendations`}
//                                                     className="recommended-name clickable"
//                                                     target="_blank"
//                                                     rel="noopener noreferrer"
//                                                 >
//                                                     {provider.recommender_name}
//                                                 </Link>
//                                             ) : (
//                                                 <span className="recommended-name">
//                                                     {provider.recommender_name}
//                                                 </span>
//                                             )}
//                                             {provider.date_of_recommendation && (
//                                                 <span className="recommendation-date">
//                                                     {" "}
//                                                     (
//                                                     {new Date(
//                                                         provider.date_of_recommendation
//                                                     ).toLocaleDateString(
//                                                         "en-US",
//                                                         {
//                                                             year: "2-digit",
//                                                             month: "numeric",
//                                                             day: "numeric",
//                                                         }
//                                                     )}
//                                                     )
//                                                 </span>
//                                             )}
//                                         </div>

//                                         {currentReviews.length > 0 &&
//                                             [
//                                                 ...new Set(
//                                                     currentReviews
//                                                         .map((r) => r.user_name)
//                                                         .filter(
//                                                             (name) =>
//                                                                 name &&
//                                                                 name !==
//                                                                     provider.recommender_name
//                                                         )
//                                                 ),
//                                             ].length > 0 && (
//                                                 <div className="recommended-row">
//                                                     <span className="recommended-label">
//                                                         Also used by:
//                                                     </span>
//                                                     <span className="used-by-names">
//                                                         {[
//                                                             ...new Set(
//                                                                 currentReviews
//                                                                     .map(
//                                                                         (r) =>
//                                                                             r.user_name
//                                                                     )
//                                                                     .filter(
//                                                                         (
//                                                                             name
//                                                                         ) =>
//                                                                             name &&
//                                                                             name !==
//                                                                                 provider.recommender_name
//                                                                     )
//                                                             ),
//                                                         ].join(", ") ||
//                                                             "No additional users yet"}
//                                                     </span>
//                                                 </div>
//                                             )}
//                                     </>
//                                 )}
//                                 <div className="action-buttons">
//                                     <button
//                                         className="primary-button"
//                                         onClick={() => {
//                                             setSelectedProvider(provider);
//                                             setIsQuoteModalOpen(true);
//                                         }}
//                                     >
//                                         Request a Quote
//                                     </button>
//                                     <button
//                                         className="secondary-button"
//                                         onClick={() => {
//                                             if (provider.recommender_phone) {
//                                                 window.location.href = `sms:${provider.recommender_phone}`;
//                                             } else if (
//                                                 provider.recommender_email
//                                             ) {
//                                                 window.location.href = `mailto:${provider.recommender_email}`;
//                                             } else {
//                                                 alert(
//                                                     "Sorry, contact info not available."
//                                                 );
//                                             }
//                                         }}
//                                     >
//                                         Connect with Recommender
//                                     </button>
//                                 </div>
//                             </li>
//                         );
//                     })}
//                 </ul>
//             )}

//             {isReviewModalOpen && selectedProvider && (
//                 <ReviewModal
//                     isOpen={isReviewModalOpen}
//                     onClose={() => setIsReviewModalOpen(false)}
//                     onSubmit={(reviewData) =>
//                         handleReviewSubmit({ ...reviewData })
//                     }
//                     provider={selectedProvider}
//                 />
//             )}

//             {/* {isProfileModalOpen && selectedProvider && (
//         <ProviderProfileModal
//           isOpen={isProfileModalOpen}
//           onClose={() => setIsProfileModalOpen(false)}
//           provider={selectedProvider}
//           reviews={reviewMap[selectedProvider.id] || []}
//           setSelectedProvider={setSelectedProvider} // Pass these if ProviderProfileModal uses them
//           setIsReviewModalOpen={setIsReviewModalOpen} // Pass these if ProviderProfileModal uses them
//         />
//       )} */}
//             {clickedRecommender && (
//                 <div className="modal-overlay">
//                     <div className="simple-modal">
//                         <button
//                             className="modal-close-x"
//                             onClick={() => setClickedRecommender(null)}
//                         >
//                             ×
//                         </button>
//                         <h3 className="modal-title">
//                             Want to connect with{" "}
//                             <span className="highlight">
//                                 {clickedRecommender}
//                             </span>
//                             ?
//                         </h3>
//                         <div className="modal-buttons-vertical">
//                             <button
//                                 className="secondary-button"
//                                 onClick={() => {
//                                     setClickedRecommender(null);
//                                     setShowFeatureComingModal(true);
//                                 }}
//                             >
//                                 Thank {clickedRecommender}
//                             </button>
//                             <button
//                                 className="secondary-button"
//                                 onClick={() => {
//                                     setClickedRecommender(null);
//                                     setShowFeatureComingModal(true);
//                                 }}
//                             >
//                                 Ask {clickedRecommender} a question
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {showFeatureComingModal && (
//                 <div className="modal-overlay">
//                     <div className="modal-content">
//                         <p>We're about to launch this feature. Stay tuned 👁️</p>
//                         <div className="modal-buttons">
//                             <button
//                                 className="primary-button"
//                                 onClick={() => setShowFeatureComingModal(false)}
//                             >
//                                 OK
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//             {isQuoteModalOpen && selectedProvider && (
//                 <QuoteModal
//                     providerName={selectedProvider.business_name}
//                     providerEmail={selectedProvider.email}
//                     providerPhotoUrl={selectedProvider.profile_image}
//                     onClose={() => setIsQuoteModalOpen(false)}
//                 />
//             )}
//         </div>
//     );
// };

// export default ApplianceServices;
