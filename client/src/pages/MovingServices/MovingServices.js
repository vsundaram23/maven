import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import {
    FaStar,
    FaPhone,
    FaEnvelope,
    FaUsers,
    FaPlusCircle,
} from "react-icons/fa";
import QuoteModal from "../../components/QuoteModal/QuoteModal";
import { useUser } from "@clerk/clerk-react";
import "./MovingServices.css";

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = "http://localhost:5000";

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
            {hasHalf && <FaStar key="half-star" className="half" />}
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

    useEffect(() => {
        if (isOpen) {
            setRating(0);
            setHover(0);
            setReview("");
            setTags([]);
            setTagInput("");
            setError("");
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!rating) {
            setError("Please select a rating");
            return;
        }
        onSubmit({ rating, review, tags });
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
                <h2>Review {provider.business_name}</h2>
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
                            placeholder="e.g. reliable, affordable"
                        />
                        <div className="tag-container modal-tag-container">
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
                        {provider.description || "N/A"}
                    </p>
                    <p>
                        <strong>Service Type:</strong>{" "}
                        {provider.service_type || "N/A"}
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
                                        setSelectedProvider(provider);
                                        setIsReviewModalOpen(true);
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

const MovingServices = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const [providers, setProviders] = useState([]);
    const [reviewMap, setReviewMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [sortOption, setSortOption] = useState("recommended");
    const [currentUserId, setCurrentUserId] = useState(null);
    const [clickedRecommender, setClickedRecommender] = useState(null);
    const [showFeatureComingModal, setShowFeatureComingModal] = useState(false);
    const [dropdownOpenForId, setDropdownOpenForId] = useState(null);
    const [showLinkCopied, setShowLinkCopied] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoaded) return;

        if (!isSignedIn) {
            setError("Please sign in to view moving service providers.");
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
                    `${API_URL}/api/movingProviders?${params.toString()}`
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
                            "Failed to fetch moving providers successfully"
                    );
                }

                let fetchedProviders = data.providers || [];
                const statsMap = {};
                const allReviewsMap = {};

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
                                allReviewsMap[provider.id] = [];
                            }
                        })
                    );
                }
                setReviewMap(allReviewsMap);

                const enrichedProviders = fetchedProviders.map((p, idx) => ({
                    ...p,
                    originalIndex: idx,
                    average_rating:
                        statsMap[p.id]?.average_rating || p.average_rating || 0,
                    total_reviews:
                        statsMap[p.id]?.total_reviews || p.total_reviews || 0,
                }));

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
                            (a.average_rating || 0) * (a.total_reviews || 0);
                        const scoreB =
                            (b.average_rating || 0) * (b.total_reviews || 0);
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
            } finally {
                setLoading(false);
            }
        };

        getProviders();
    }, [sortOption, isLoaded, isSignedIn, user]);

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
                    email: user.primaryEmailAddress?.emailAddress,
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

    if (loading) return <div className="loading-spinner">Loading...</div>;
    if (error && providers.length === 0)
        return <div className="error-message full-width-error">{error}</div>;

    return (
        <div className="moving-services-container">
            <h1 className="section-heading">Top Moving Service Providers</h1>
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
                    <h2>No Moving Services Found In Your Network</h2>
                    <p>
                        We couldn't find any moving service recommendations
                        visible to you right now.
                    </p>
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
                        const currentProviderStats = {
                            average_rating: provider.average_rating || 0,
                            total_reviews: provider.total_reviews || 0,
                        };
                        const currentReviews = reviewMap[provider.id] || [];
                        const displayAvgRating = (
                            parseFloat(currentProviderStats.average_rating) || 0
                        ).toFixed(1);

                        return (
                            <li key={provider.id} className="provider-card">
                                <div className="card-header">
                                    <h2 className="card-title">
                                        <Link
                                            to={`/provider/${provider.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="provider-name-link"
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
                                                currentProviderStats.average_rating
                                            ) || 0) >= 4.5 && (
                                                <span className="top-rated-badge">
                                                    Top Rated
                                                </span>
                                            )}
                                        </div>
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
                                                                `${window.location.origin}/provider/${provider.id}`
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
                                            {showLinkCopied && (
                                                <div className="toast">
                                                    Link copied!
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="review-summary">
                                    <StarRating
                                        rating={
                                            parseFloat(
                                                currentProviderStats.average_rating
                                            ) || 0
                                        }
                                    />
                                    <span className="review-score">
                                        {displayAvgRating} (
                                        {currentProviderStats.total_reviews ||
                                            0}
                                        )
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
                                                    key={`${idx}-${provider.id}`}
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
                                                    {"("}
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
                                                    {")"}
                                                </span>
                                            )}
                                        </div>

                                        {currentReviews.length > 0 &&
                                            [
                                                ...new Set(
                                                    currentReviews
                                                        .map((r) => r.user_name)
                                                        .filter(
                                                            (name) =>
                                                                name &&
                                                                name !==
                                                                    provider.recommender_name
                                                        )
                                                ),
                                            ].length > 0 && (
                                                <div className="recommended-row">
                                                    <span className="recommended-label">
                                                        Also used by:
                                                    </span>
                                                    <span className="used-by-names">
                                                        {[
                                                            ...new Set(
                                                                currentReviews
                                                                    .map(
                                                                        (r) =>
                                                                            r.user_name
                                                                    )
                                                                    .filter(
                                                                        (
                                                                            name
                                                                        ) =>
                                                                            name &&
                                                                            name !==
                                                                                provider.recommender_name
                                                                    )
                                                            ),
                                                        ].join(", ") ||
                                                            "No additional users yet"}
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
                                                    "Sorry, contact info for the recommender is not available."
                                                );
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
                    reviews={reviewMap[selectedProvider.id] || []}
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
        </div>
    );
};

export default MovingServices;
