import { useUser } from "@clerk/clerk-react";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
    FaStar,
    FaPhone,
    FaEnvelope,
    FaMapMarkerAlt,
    FaQuestionCircle,
    FaShareAlt,
    FaRegBookmark,
    FaBookmark,
    FaSms,
    FaExternalLinkAlt,
    FaRegHandshake,
} from "react-icons/fa";
import "./ProviderProfile.css";
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

const API_URL = "https://api.seanag-recommendations.org:8080";
// const API_URL = "http://localhost:3000";

const ProviderProfile = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const { id } = useParams();
    const navigate = useNavigate();
    const [provider, setProvider] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [reviewStats, setReviewStats] = useState({
        average_rating: 0,
        total_reviews: 0,
    });
    const [activeTab, setActiveTab] = useState("Reviews");
    const [showLinkCopied, setShowLinkCopied] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [loadingProvider, setLoadingProvider] = useState(true);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [loadingStats, setLoadingStats] = useState(true);
    const [error, setError] = useState(null);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        if (!isLoaded) return;

        if (!isSignedIn) {
            navigate("/");
            return;
        }

        if (!id) {
            setLoadingProvider(false);
            setError("Provider ID is missing.");
            return;
        }

        const fetchProvider = async () => {
            setLoadingProvider(true);
            setError(null);
            try {
                const params = new URLSearchParams({
                    user_id: user.id,
                    email: user.primaryEmailAddress?.emailAddress,
                });

                const fetchUrl = `${API_URL}/api/providers/${id}?${params.toString()}`;
                const res = await fetch(fetchUrl);

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(
                        errData.message || `HTTP error! status: ${res.status}`
                    );
                }

                const data = await res.json();
                if (data.success) {
                    setProvider(data.provider);
                } else {
                    throw new Error(
                        data.message || "Failed to fetch provider details"
                    );
                }
            } catch (error) {
                console.error("Failed to fetch provider:", error);
                setError(error.message);
                setProvider(null);
            } finally {
                setLoadingProvider(false);
            }
        };

        fetchProvider();
    }, [id, isLoaded, isSignedIn, user, navigate]);

    useEffect(() => {
        if (!isLoaded || !isSignedIn || !id) return;

        const fetchReviews = async () => {
            setLoadingReviews(true);
            try {
                const params = new URLSearchParams({
                    user_id: user.id,
                    email: user.primaryEmailAddress?.emailAddress,
                });

                const res = await fetch(
                    `${API_URL}/api/reviews/${id}?${params.toString()}`
                );
                if (!res.ok)
                    throw new Error(
                        `HTTP error! status: ${res.status} fetching reviews list`
                    );
                const data = await res.json();
                setReviews(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Failed to fetch reviews:", error);
                setError((prevError) =>
                    prevError ? `${prevError}\n${error.message}` : error.message
                );
                setReviews([]);
            } finally {
                setLoadingReviews(false);
            }
        };

        fetchReviews();
    }, [id, isLoaded, isSignedIn, user]);

    useEffect(() => {
        if (!id) {
            setLoadingStats(false);
            return;
        }
        const fetchReviewStats = async () => {
            setLoadingStats(true);
            try {
                const res = await fetch(`${API_URL}/api/reviews/stats/${id}`);
                if (!res.ok)
                    throw new Error(
                        `HTTP error! status: ${res.status} fetching review stats`
                    );
                const data = await res.json();
                setReviewStats({
                    average_rating: parseFloat(data.average_rating) || 0,
                    total_reviews: parseInt(data.total_reviews, 10) || 0,
                });
            } catch (errorCatch) {
                console.error("Failed to fetch review stats:", errorCatch);
                setError((prevError) =>
                    prevError
                        ? `${prevError}\n${errorCatch.message}`
                        : errorCatch.message
                );
                setReviewStats({ average_rating: 0, total_reviews: 0 });
            } finally {
                setLoadingStats(false);
            }
        };
        fetchReviewStats();
    }, [id]);

    const avgRating = (parseFloat(reviewStats.average_rating) || 0).toFixed(1);
    const totalReviews = parseInt(reviewStats.total_reviews, 10) || 0;

    const starCounts = useMemo(() => {
        const counts = [0, 0, 0, 0, 0];
        reviews.forEach((r) => {
            const rating = parseInt(r.rating);
            if (rating >= 1 && rating <= 5) {
                counts[rating - 1]++;
            }
        });
        return counts;
    }, [reviews]);

    const formatDate = (dateString) => {
        if (!dateString) return "";
        try {
            return new Date(dateString).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        } catch (e) {
            return "";
        }
    };

    const getWebsiteHostname = (url) => {
        if (!url) return "";
        try {
            const parsedUrl = new URL(
                url.startsWith("http") ? url : `https://${url}`
            );
            return parsedUrl.hostname.replace(/^www\./, "");
        } catch (e) {
            return url;
        }
    };

    const handleShareClick = () => {
        const shareUrl = `${window.location.origin}/provider/${provider?.id}`;
        navigator.clipboard
            .writeText(shareUrl)
            .then(() => {
                setShowLinkCopied(true);
                setTimeout(() => setShowLinkCopied(false), 2500);
            })
            .catch((err) => console.error("Failed to copy: ", err));
    };

    const handleBookmarkClick = () => {
        setIsBookmarked(!isBookmarked);
    };

    const handleTabClick = (tab) => setActiveTab(tab);

    const handleReviewSubmit = async (reviewData) => {
        if (!isSignedIn) {
            navigate("/");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/reviews`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider_id: provider.id,
                    user_id: user.id,
                    email: user.primaryEmailAddress?.emailAddress,
                    content: reviewData.content,
                    rating: reviewData.rating,
                    tags: reviewData.tags,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to submit review");
            }

            // Refresh reviews after submission
            const params = new URLSearchParams({
                user_id: user.id,
                email: user.primaryEmailAddress?.emailAddress,
            });
            const newReviewsRes = await fetch(
                `${API_URL}/api/reviews/${id}?${params.toString()}`
            );
            const newReviews = await newReviewsRes.json();
            setReviews(Array.isArray(newReviews) ? newReviews : []);
        } catch (err) {
            console.error("Error submitting review:", err);
            setError(`Failed to submit review: ${err.message}`);
        }
    };

    const primaryRecommenderName = provider?.recommender_name;
    const alsoUsedBy = useMemo(() => {
        const recommenders = new Set();
        if (primaryRecommenderName) recommenders.add(primaryRecommenderName);
        reviews.forEach((r) => r.user_name && recommenders.add(r.user_name));
        return Array.from(recommenders).filter(
            (n) => n !== primaryRecommenderName
        );
    }, [reviews, primaryRecommenderName]);

    if (loadingProvider || loadingReviews || loadingStats) {
        return (
            <div id="provider-profile-page">
                <div className="profile-wrapper">
                    <div className="loading-state">Loading Profile...</div>
                </div>
            </div>
        );
    }

    if (error && !provider) {
        return (
            <div id="provider-profile-page">
                <div className="profile-wrapper">
                    <div className="error-message full-width-error">
                        Error: {error}
                    </div>
                </div>
            </div>
        );
    }

    if (!provider) {
        return (
            <div id="provider-profile-page">
                <div className="profile-wrapper">
                    <div className="no-providers-message">
                        Provider not found or not accessible.
                    </div>
                </div>
            </div>
        );
    }

    const recommendationDate = formatDate(provider.date_of_recommendation);

    return (
        <div id="provider-profile-page">
            <div className="profile-wrapper">
                <div className="profile-content">
                    <div className="core-info">
                        <h1>{provider.business_name}</h1>

                        <div className="rating-and-location">
                            <div className="rating-summary-inline">
                                <FaStar className="rating-star-icon" />
                                <span className="avg-rating-text">
                                    {avgRating}
                                </span>
                                <span className="review-count-text">
                                    ({totalReviews} reviews)
                                </span>
                            </div>
                            {provider.service_scope === "local" &&
                                provider.city &&
                                provider.state && (
                                    <span className="location-info">
                                        <FaMapMarkerAlt className="info-icon" />
                                        {provider.city}, {provider.state}
                                    </span>
                                )}
                            {provider.website && (
                                <a
                                    href={
                                        provider.website.startsWith("http")
                                            ? provider.website
                                            : `https://${provider.website}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="website-link-inline"
                                >
                                    <FaExternalLinkAlt className="info-icon" />
                                    {getWebsiteHostname(provider.website)}
                                </a>
                            )}
                            {provider.price_range && (
                                <span className="price-range-info">
                                    {provider.price_range}
                                </span>
                            )}
                        </div>

                        <div className="contact-actions-bar">
                            {provider.phone_number && (
                                <a
                                    href={`tel:${provider.phone_number}`}
                                    className="action-button"
                                >
                                    <FaPhone /> Call
                                </a>
                            )}
                            {provider.phone_number && (
                                <a
                                    href={`sms:${provider.phone_number}?body=Hi ${provider.business_name}, I saw a recommendation and wanted to connect.`}
                                    className="action-button"
                                >
                                    <FaSms /> Text
                                </a>
                            )}
                            {provider.email && (
                                <a
                                    href={`mailto:${provider.email}?subject=Inquiry%20via%20Tried%20&%20Trusted`}
                                    className="action-button"
                                >
                                    <FaEnvelope /> Email
                                </a>
                            )}
                        </div>
                    </div>

                    {provider.provider_message && (
                        <div className="message-block provider-message-block">
                            <p>
                                <strong>
                                    Message from{" "}
                                    {provider.business_contact ||
                                        provider.business_name ||
                                        "the provider"}
                                    :
                                </strong>{" "}
                                “{provider.provider_message}”
                            </p>
                        </div>
                    )}

                    {provider.description && (
                        <div className="description-block">
                            <p>{provider.description}</p>
                        </div>
                    )}

                    {provider.recommender_message && primaryRecommenderName && (
                        <div className="message-block recommender-quote-block">
                            <div className="recommender-header">
                                <strong>
                                    {primaryRecommenderName}'s Recommendation
                                </strong>
                                {recommendationDate && (
                                    <span className="recommendation-date">
                                        from {recommendationDate}
                                    </span>
                                )}
                            </div>
                            <p className="recommender-text">
                                "{provider.recommender_message}"
                            </p>
                            <div className="quote-actions">
                                {provider.recommender_phone && (
                                    <>
                                        <a
                                            href={`sms:${
                                                provider.recommender_phone
                                            }?body=Hey ${primaryRecommenderName}, just wanted to say thank you for recommending ${
                                                provider.business_name || "them"
                                            }! 🙏`}
                                            className="quote-action-icon"
                                            title="Thank Recommender"
                                        >
                                            <FaRegHandshake />
                                        </a>
                                        <a
                                            href={`sms:${
                                                provider.recommender_phone
                                            }?body=Hi ${primaryRecommenderName}! I saw your recommendation for ${
                                                provider.business_name || "them"
                                            } on Tried & Trusted and had a quick question.`}
                                            className="quote-action-icon"
                                            title="Ask Recommender a Question"
                                        >
                                            <FaQuestionCircle />
                                        </a>
                                    </>
                                )}
                                <button
                                    className="quote-action-icon share-button"
                                    title="Share this recommendation"
                                    onClick={handleShareClick}
                                >
                                    <FaShareAlt />
                                    {showLinkCopied && (
                                        <span className="tooltip-copied">
                                            Copied!
                                        </span>
                                    )}
                                </button>
                                <button
                                    className={`quote-action-icon bookmark-button ${
                                        isBookmarked ? "bookmarked" : ""
                                    }`}
                                    title={
                                        isBookmarked
                                            ? "Remove Bookmark"
                                            : "Bookmark"
                                    }
                                    onClick={handleBookmarkClick}
                                >
                                    {isBookmarked ? (
                                        <FaBookmark />
                                    ) : (
                                        <FaRegBookmark />
                                    )}
                                </button>
                                {provider.recommender_user_id && (
                                    <Link
                                        to={`/user/${provider.recommender_user_id}/recommendations`}
                                        className="recommender-profile-link-action"
                                    >
                                        View Recommender's Profile
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    {alsoUsedBy.length > 0 && (
                        <p className="also-used-by-text">
                            Also used by: {alsoUsedBy.slice(0, 3).join(", ")}
                            {alsoUsedBy.length > 3 &&
                                ` and ${alsoUsedBy.length - 3} others`}
                        </p>
                    )}

                    {Array.isArray(provider.tags) &&
                        provider.tags.length > 0 && (
                            <div className="tags-section">
                                <h3 className="tags-header">
                                    Highlights from Previous Users
                                </h3>
                                <div className="tags-container">
                                    {provider.tags.map((tag, i) => (
                                        <span key={i} className="tag">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                    {/* Add the image carousel here */}
                    {Array.isArray(provider?.images) &&
                        provider.images.length > 0 && (
                            <div className="provider-images-section">
                                <h3 className="images-header">Photos</h3>
                                <ImageCarousel
                                    images={provider.images}
                                    onImageClick={(image) =>
                                        setSelectedImage(image)
                                    }
                                />
                            </div>
                        )}
                    {selectedImage && (
                        <ImageModal
                            image={selectedImage}
                            onClose={() => setSelectedImage(null)}
                        />
                    )}

                    <div className="profile-tabs-container">
                        {["Reviews", "Details"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => handleTabClick(tab)}
                                className={`profile-tab ${
                                    activeTab === tab ? "active" : ""
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="profile-tab-content">
                        {activeTab === "Reviews" && (
                            <div className="reviews-content">
                                <div className="review-breakdown-section">
                                    <h3 className="tab-section-header">
                                        Rating Breakdown
                                    </h3>
                                    <div className="rating-bars">
                                        {[5, 4, 3, 2, 1].map((star) => {
                                            const count = starCounts[star - 1];
                                            const percent =
                                                totalReviews > 0
                                                    ? (count / totalReviews) *
                                                      100
                                                    : 0;
                                            return (
                                                <div
                                                    key={star}
                                                    className="rating-bar-row"
                                                >
                                                    <span className="rating-bar-label">
                                                        {star}★
                                                    </span>
                                                    <div className="rating-bar-track">
                                                        <div
                                                            className="rating-bar-fill"
                                                            style={{
                                                                width: `${percent}%`,
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span className="rating-bar-count">
                                                        {count}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <h3 className="tab-section-header">
                                    User Reviews ({reviews.length})
                                </h3>
                                {loadingReviews ? (
                                    <p>Loading reviews...</p>
                                ) : reviews.length === 0 ? (
                                    <p className="no-reviews-text">
                                        No reviews yet for this provider.
                                    </p>
                                ) : (
                                    <div className="reviews-list">
                                        {reviews.map((review, i) => (
                                            <div
                                                key={review.id || i}
                                                className="review-item"
                                            >
                                                <div className="review-item-header">
                                                    <div className="review-item-stars">
                                                        {[...Array(5)].map(
                                                            (_, j) => (
                                                                <FaStar
                                                                    key={j}
                                                                    className={
                                                                        j <
                                                                        review.rating
                                                                            ? "active"
                                                                            : ""
                                                                    }
                                                                />
                                                            )
                                                        )}
                                                    </div>
                                                    <span className="review-item-user">
                                                        {review.user_name ||
                                                            "Anonymous"}
                                                    </span>
                                                    {review.date && (
                                                        <span className="review-item-date">
                                                            {formatDate(
                                                                review.created_at ||
                                                                    review.date
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="review-item-content">
                                                    "{review.content}"
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === "Details" && (
                            <div className="details-content">
                                <h3 className="tab-section-header">
                                    Credentials & Information
                                </h3>
                                <div className="credentials-list">
                                    {(parseFloat(avgRating) || 0) >= 4.5 &&
                                        totalReviews > 5 && (
                                            <span className="credential-badge top-rated">
                                                Top Rated
                                            </span>
                                        )}
                                    {provider.service_type && (
                                        <span className="credential-badge">
                                            {provider.service_type}
                                        </span>
                                    )}
                                </div>
                                <p className="details-coming-soon">
                                    More details coming soon.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ImageCarousel = ({ images, onImageClick }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const containerRef = useRef(null);

    if (!images || !Array.isArray(images) || images.length === 0) return null;

    // Add getImageSrc function inside the component
    const getImageSrc = (image) => {
        if (!image) return "";
        const imageData = image.data?.data || image.data;
        if (!imageData) return "";

        try {
            if (Array.isArray(imageData)) {
                const bytes = new Uint8Array(imageData);
                const binary = bytes.reduce(
                    (acc, byte) => acc + String.fromCharCode(byte),
                    ""
                );
                const base64String = window.btoa(binary);
                return `data:${image.contentType};base64,${base64String}`;
            }

            if (typeof imageData === "string") {
                return `data:${image.contentType};base64,${imageData}`;
            }

            return "";
        } catch (error) {
            console.error("Error converting image data:", error);
            return "";
        }
    };

    const scrollToIndex = (index) => {
        if (containerRef.current) {
            const container = containerRef.current;
            const imageWidth = container.children[0].offsetWidth;
            const scrollPosition = index * (imageWidth + 16); // 16px is the gap
            container.scrollLeft = scrollPosition;
        }
    };

    const handleNext = () => {
        const newIndex = Math.min(currentIndex + 3, images.length - 1);
        setCurrentIndex(newIndex);
        scrollToIndex(newIndex);
    };

    const handlePrev = () => {
        const newIndex = Math.max(currentIndex - 3, 0);
        setCurrentIndex(newIndex);
        scrollToIndex(newIndex);
    };

    return (
        <div className="provider-image-carousel">
            <div
                className="provider-image-carousel-container"
                ref={containerRef}
            >
                {images.map((image, index) => (
                    <img
                        key={image.id || index}
                        src={getImageSrc(image)}
                        alt={`Provider image ${index + 1}`}
                        className="provider-carousel-image"
                        onClick={() => onImageClick?.(image)}
                    />
                ))}
            </div>
            {images.length > 3 && (
                <>
                    <button
                        onClick={handlePrev}
                        className="provider-carousel-btn prev"
                        disabled={currentIndex === 0}
                        type="button"
                    >
                        <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleNext}
                        className="provider-carousel-btn next"
                        disabled={currentIndex >= images.length - 3}
                        type="button"
                    >
                        <ChevronRightIcon className="w-4 h-4" />
                    </button>
                </>
            )}
        </div>
    );
};

const ImageModal = ({ image, onClose }) => {
    const getImageSrc = (img) => {
        if (!img) return "";
        const imageData = img.data?.data || img.data;
        if (!imageData) return "";

        try {
            if (Array.isArray(imageData)) {
                const bytes = new Uint8Array(imageData);
                const binary = bytes.reduce(
                    (acc, byte) => acc + String.fromCharCode(byte),
                    ""
                );
                const base64String = window.btoa(binary);
                return `data:${img.contentType};base64,${base64String}`;
            }

            if (typeof imageData === "string") {
                return `data:${img.contentType};base64,${imageData}`;
            }

            return "";
        } catch (error) {
            console.error("Error converting image data:", error);
            return "";
        }
    };

    return (
        <div className="provider-image-modal-overlay" onClick={onClose}>
            <div
                className="provider-image-modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    className="provider-image-modal-close"
                    onClick={onClose}
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>
                <img
                    src={getImageSrc(image)}
                    alt="Full size provider image"
                    className="provider-image-modal-img"
                    onError={(e) => {
                        console.error("Modal image load error:", e);
                        e.target.style.display = "none";
                    }}
                />
            </div>
        </div>
    );
};

export default ProviderProfile;
