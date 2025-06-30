import { useClerk, useUser } from "@clerk/clerk-react";
import {
    ArrowPathIcon,
    CalendarDaysIcon,
    CameraIcon,
    ChatBubbleLeftEllipsisIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    EnvelopeIcon,
    ExclamationTriangleIcon,
    GlobeAltIcon,
    StarIcon as OutlineStarIcon,
    PencilSquareIcon,
    PlusCircleIcon,
    ShareIcon,
    TrashIcon,
    UserCircleIcon,
    UsersIcon as UsersIconSolid,
    XCircleIcon,
    XMarkIcon
} from "@heroicons/react/24/outline";
import { StarIcon as SolidStarIcon } from "@heroicons/react/24/solid";
import React, {
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";
import {
    FaConciergeBell,
    FaMapMarkerAlt,
    FaStar,
    FaStarHalfAlt,
} from "react-icons/fa";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Link, useNavigate } from "react-router-dom";
import EditRecommendationModal from "../../components/Profile/EditRecommendationModal";
import ListCard from "../../components/Profile/ListCard";
import ProfileRecommendationCard from "../../components/Profile/ProfileRecommendationCard";
import ReviewModal from "../../components/ReviewModal/ReviewModal";
import ShareProfileModal from "../../components/ShareProfileModal/ShareProfileModal";
import TrustScoreWheel from "../../components/TrustScoreWheel/TrustScoreWheel";
import "./Profile.css";

const API_URL = "https://api.seanag-recommendations.org:8080";
// const API_URL = "http://localhost:3000";

function getCroppedImg(image, crop, fileName) {
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
    );
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error("Canvas is empty"));
                    return;
                }
                blob.name = fileName;
                resolve(blob);
            },
            "image/jpeg",
            0.95
        );
    });
}

const StarRatingDisplay = ({ rating, isProfileCard }) => {
    const numRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalf = isProfileCard
        ? numRating - fullStars >= 0.4
        : numRating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    const starClass = isProfileCard ? "profile-star-icon" : "as-star-icon";

    return (
        <div
            className={
                isProfileCard ? "profile-star-display" : "as-star-rating"
            }
        >
            {[...Array(fullStars)].map((_, i) => (
                <FaStar key={`full-${i}`} className={`${starClass} filled`} />
            ))}
            {hasHalf &&
                (isProfileCard ? (
                    <FaStarHalfAlt
                        key="half"
                        className={`${starClass} filled`}
                    />
                ) : (
                    <FaStar
                        key={`half-${Date.now()}-srd`}
                        className={`${starClass} half`}
                    />
                ))}
            {[...Array(emptyStars)].map((_, i) => (
                <FaStar key={`empty-${i}`} className={`${starClass} empty`} />
            ))}
        </div>
    );
};

const EditModalStarDisplay = ({
    active,
    onClick,
    onMouseEnter,
    onMouseLeave,
}) => {
    if (active) {
        return (
            <SolidStarIcon
                className="profile-edit-modal-star-icon filled"
                onClick={onClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                aria-hidden="true"
            />
        );
    }
    return (
        <OutlineStarIcon
            className="profile-edit-modal-star-icon"
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            aria-hidden="true"
        />
    );
};

const EDIT_MODAL_PUBLISH_OPTIONS = [
    {
        value: "Full Trust Circle",
        label: "Entire Trust Circle",
        icon: UsersIconSolid,
    },
    {
        value: "Specific Trust Circles",
        label: "Specific Trust Circles",
        icon: UserCircleIcon,
    },
    { value: "Public", label: "Public", icon: GlobeAltIcon },
];

const ImageCarousel = ({ images, onImageClick }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!images || !Array.isArray(images) || images.length === 0) return null;

    const getImageSrc = (image) => {
        if (!image) return "";

        // Handle nested data structure
        const imageData = image.data?.data || image.data;
        if (!imageData) return "";

        try {
            // Handle array buffer data
            if (Array.isArray(imageData)) {
                const bytes = new Uint8Array(imageData);
                const binary = bytes.reduce(
                    (acc, byte) => acc + String.fromCharCode(byte),
                    ""
                );
                const base64String = window.btoa(binary);
                return `data:${image.contentType};base64,${base64String}`;
            }

            // Handle string data
            if (typeof imageData === "string") {
                return `data:${image.contentType};base64,${imageData}`;
            }

            console.error("Unsupported image data format:", imageData);
            return "";
        } catch (error) {
            console.error("Error converting image data:", error);
            return "";
        }
    };

    return (
        <div className="profile-image-carousel">
            <div className="profile-image-carousel-container">
                <img
                    src={getImageSrc(images[currentIndex])}
                    alt={`Provider image ${currentIndex + 1}`}
                    className="profile-carousel-image"
                    onClick={() => onImageClick?.(images[currentIndex])}
                />
                {images.length > 1 && (
                    <>
                        <button
                            onClick={() =>
                                setCurrentIndex(
                                    (prev) =>
                                        (prev - 1 + images.length) %
                                        images.length
                                )
                            }
                            className="profile-carousel-btn prev"
                        >
                            <ChevronLeftIcon />
                        </button>
                        <button
                            onClick={() =>
                                setCurrentIndex(
                                    (prev) => (prev + 1) % images.length
                                )
                            }
                            className="profile-carousel-btn next"
                        >
                            <ChevronRightIcon />
                        </button>
                    </>
                )}
            </div>
            {images.length > 1 && (
                <div className="profile-carousel-dots">
                    {images.map((_, idx) => (
                        <button
                            key={idx}
                            className={`profile-carousel-dot ${
                                idx === currentIndex ? "active" : ""
                            }`}
                            onClick={() => setCurrentIndex(idx)}
                        />
                    ))}
                </div>
            )}
            {/* {isReviewModalOpen && providerForReview && (
                <ReviewModal
                    isOpen={isReviewModalOpen}
                    onClose={handleCloseReviewModal}
                    onSubmit={handleSubmitReview}
                    provider={providerForReview}
                />
            )} */}
        </div>
    );
};

const ImageModal = ({ image, onClose }) => {
    const getImageSrc = (img) => {
        if (!img) return "";

        // Handle nested data structure
        const imageData = img.data?.data || img.data;
        if (!imageData) return "";

        try {
            // Handle array buffer data
            if (Array.isArray(imageData)) {
                const bytes = new Uint8Array(imageData);
                const binary = bytes.reduce(
                    (acc, byte) => acc + String.fromCharCode(byte),
                    ""
                );
                const base64String = window.btoa(binary);
                return `data:${img.contentType};base64,${base64String}`;
            }

            // Handle string data
            if (typeof imageData === "string") {
                return `data:${img.contentType};base64,${imageData}`;
            }

            console.error("Unsupported image data format:", imageData);
            return "";
        } catch (error) {
            console.error("Error converting image data:", error);
            return "";
        }
    };

    return (
        <div className="profile-image-modal-overlay" onClick={onClose}>
            <div
                className="profile-image-modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                <button className="profile-image-modal-close" onClick={onClose}>
                    <XMarkIcon />
                </button>
                <img
                    src={getImageSrc(image)}
                    alt="Full size provider image"
                    className="profile-image-modal-img"
                    onError={(e) => {
                        console.error("Modal image load error:", e);
                        e.target.style.display = "none";
                    }}
                />
            </div>
        </div>
    );
};

const MyRecommendationCard = ({
    rec,
    onEdit,
    onLikeRecommendation,
    onRefreshList,
    user,
}) => {
    const providerIdForLink = rec.provider_id || rec.id;
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const cardRef = useRef(null);
    const formatDate = (dateString) =>
        !dateString
            ? "Date not available"
            : new Date(dateString).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
              });
    const handleShare = async () => {
        const providerIdForLink = rec.provider_id || rec.id;
        const url = `${window.location.origin}/provider/${providerIdForLink}`;

        try {
            await navigator.clipboard.writeText(url);

            // Show a temporary success message on button
            const button = document.querySelector(
                ".profile-my-rec-dropdown-menu .profile-my-rec-dropdown-item:nth-child(2)"
            );
            if (button) {
                const originalContent = button.innerHTML;
                button.innerHTML =
                    '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Link Copied!';
                button.style.color = "#28a745";
                setTimeout(() => {
                    button.innerHTML = originalContent;
                    button.style.color = "";
                }, 2000);
            }

            // Show a prominent success notification
            const notification = document.createElement("div");
            notification.innerHTML = `
                <div style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #28a745;
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                    font-family: 'Inter', sans-serif;
                    font-size: 14px;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    animation: slideInFromRight 0.3s ease-out;
                ">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    Recommendation link copied to clipboard!
                </div>
            `;

            // Add CSS animation if not already present
            if (!document.querySelector("#copy-link-animation-styles")) {
                const style = document.createElement("style");
                style.id = "copy-link-animation-styles";
                style.textContent = `
                    @keyframes slideInFromRight {
                        from {
                            opacity: 0;
                            transform: translateX(100%);
                        }
                        to {
                            opacity: 1;
                            transform: translateX(0);
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            document.body.appendChild(notification);

            // Remove notification after 3 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation =
                        "slideInFromRight 0.3s ease-out reverse";
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }
            }, 3000);
        } catch (err) {
            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement("textarea");
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand("copy");

                // Show success notification for fallback method too
                const notification = document.createElement("div");
                notification.innerHTML = `
                    <div style="
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: #28a745;
                        color: white;
                        padding: 12px 20px;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        z-index: 10000;
                        font-family: 'Inter', sans-serif;
                        font-size: 14px;
                        font-weight: 500;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                        Recommendation link copied to clipboard!
                    </div>
                `;
                document.body.appendChild(notification);
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 3000);

                console.log("Link copied to clipboard (fallback)");
            } catch (fallbackErr) {
                console.error("Failed to copy link:", fallbackErr);
                alert(`Copy this link: ${url}`);
            }
            document.body.removeChild(textArea);
        }
        setDropdownOpen(false);
    };
    const displayCommunityAvgRatingVal = (
        parseFloat(rec.average_rating) || 0
    ).toFixed(1);
    const displayTotalReviewsVal = parseInt(rec.total_reviews, 10) || 0;

    const handleLikeClick = () => {
        const providerIdToLike = rec.provider_id || rec.id;
        if (providerIdToLike && onLikeRecommendation) {
            onLikeRecommendation(providerIdToLike);
        } else {
            console.warn(
                "Provider ID is missing for like action on recommendation card.",
                rec
            );
        }
    };

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const handleDelete = async (e) => {
        e.preventDefault();
        setIsDeleting(true);
        setDeleteError(null);

        try {
            const response = await fetch(
                `${API_URL}/api/recommendations/${rec.id}?user_id=${user?.id}&email=${user?.emailAddresses[0].emailAddress}`,
                {
                    method: "DELETE",
                }
            );

            if (!response.ok) {
                throw new Error("Failed to delete recommendation");
            }

            setShowDeleteModal(false);
            setTimeout(() => {
                onRefreshList(); // Add this prop to handle list refresh
            }, 500);
        } catch (error) {
            setDeleteError(
                "Failed to delete recommendation. Please try again."
            );
            console.log("Error deleting recommendation:", error);
            setIsDeleting(false);
        }
    };

    // Parse images if they're stored as a string
    const parsedImages = React.useMemo(() => {
        if (!rec.images) return [];
        if (Array.isArray(rec.images)) return rec.images;
        try {
            return JSON.parse(rec.images);
        } catch (e) {
            console.error("Error parsing images:", e);
            return [];
        }
    }, [rec.images]);

    return (
        <li className="profile-my-rec-card">
            <div className="profile-my-rec-card-header">
                <h2 className="profile-my-rec-card-title">
                    <Link
                        to={`/provider/${providerIdForLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="clickable provider-name-link"
                        onClick={() => {
                            const essentialProviderData = {
                                id: rec.id,
                                provider_id: rec.provider_id,
                                business_name: rec.business_name,
                                recommender_message: rec.recommender_message,
                                rating: rec.rating,
                                average_rating: rec.average_rating,
                                total_reviews: rec.total_reviews,
                                tags: rec.tags,
                                provider_contact_name:
                                    rec.provider_contact_name,
                                website: rec.website,
                                phone_number: rec.phone_number,
                                city: rec.city,
                                recommended_service_name:
                                    rec.recommended_service_name,
                                date_of_recommendation:
                                    rec.date_of_recommendation,
                                created_at: rec.created_at,
                            };
                            localStorage.setItem(
                                "selectedProvider",
                                JSON.stringify(essentialProviderData)
                            );
                        }}
                    >
                        {rec.business_name || "Unknown Business"}
                    </Link>
                </h2>
                <div className="profile-my-rec-badge-wrapper-with-menu">
                    <div className="profile-my-rec-badge-group">
                        {(parseFloat(rec.average_rating) || 0) >= 4.5 && (
                            <span className="profile-my-rec-top-rated-badge">
                                Top Rated
                            </span>
                        )}
                    </div>
                    <div className="profile-my-rec-right-actions">
                        <div className="profile-my-rec-dropdown-wrapper">
                            <button
                                className="profile-my-rec-three-dots-button"
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                title="Options"
                            >
                                ⋮
                            </button>
                            {dropdownOpen && (
                                <div className="profile-my-rec-dropdown-menu">
                                    <button
                                        className="profile-my-rec-dropdown-item"
                                        onClick={() => {
                                            onEdit(rec);
                                            setDropdownOpen(false);
                                        }}
                                    >
                                        <PencilSquareIcon /> Edit Recommendation
                                    </button>
                                    <button
                                        className="profile-my-rec-dropdown-item"
                                        onClick={handleShare}
                                    >
                                        <ShareIcon /> Share Recommendation
                                    </button>
                                    <button
                                        className="profile-my-rec-dropdown-item delete-action"
                                        onClick={() => {
                                            handleDeleteClick();
                                            setDropdownOpen(false);
                                        }}
                                    >
                                        <TrashIcon />{" "}
                                        <span className="delete-text">
                                            Delete Recommendation
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {(rec.city || rec.state) && (
                <div className="profile-my-rec-location-info">
                    <FaMapMarkerAlt />
                    <span>
                        {rec.city}
                        {rec.city && rec.state && ", "}
                        {rec.state}
                    </span>
                </div>
            )}
            <div className="profile-my-rec-review-summary">
                {typeof rec.average_rating === "number" ||
                rec.average_rating === 0 ? (
                    <>
                        <StarRatingDisplay
                            rating={rec.average_rating || 0}
                            isProfileCard={false}
                        />
                        <span className="profile-my-rec-rating-score-text">
                            {displayCommunityAvgRatingVal} (
                            {displayTotalReviewsVal} Reviews)
                        </span>
                    </>
                ) : (
                    <>
                        <StarRatingDisplay rating={0} isProfileCard={false} />
                        <span className="profile-my-rec-rating-score-text">
                            0.0 (0 Reviews)
                        </span>
                    </>
                )}
                {/* <button
                    className={`profile-my-rec-like-button ${rec.currentUserLiked ? 'liked' : ''}`}
                    onClick={handleLikeClick}
                    title={rec.currentUserLiked ? "Unlike this provider" : "Like this provider"}
                >
                    <FaThumbsUp />
                    <span className="profile-my-rec-like-count">{rec.num_likes || 0}</span>
                </button> */}
            </div>
            <p className="profile-my-rec-card-description">
                <ChatBubbleLeftEllipsisIcon className="inline-icon" />
                {rec.recommender_message || "No detailed message provided."}
            </p>
            {rec.users_who_reviewed &&
                rec.users_who_reviewed.length > 0 &&
                rec.users_who_reviewed.filter((name) => {
                    if (!name) return false;
                    // Exclude the current user's name
                    const currentUserName =
                        user?.firstName && user?.lastName
                            ? `${user.firstName} ${user.lastName}`.trim()
                            : user?.firstName || user?.lastName || "";
                    return name !== currentUserName;
                }).length > 0 && (
                    <div className="recommended-row">
                        <span className="recommended-label">Also used by:</span>
                        <span className="used-by-names">
                            {rec.users_who_reviewed
                                .filter((name) => {
                                    if (!name) return false;
                                    const currentUserName =
                                        user?.firstName && user?.lastName
                                            ? `${user.firstName} ${user.lastName}`.trim()
                                            : user?.firstName ||
                                              user?.lastName ||
                                              "";
                                    return name !== currentUserName;
                                })
                                .join(", ")}
                        </span>
                    </div>
                )}
            {parsedImages.length > 0 && (
                <div className="profile-my-rec-images">
                    <ImageCarousel
                        images={parsedImages}
                        onImageClick={(image) => setSelectedImage(image)}
                    />
                </div>
            )}
            {Array.isArray(rec.tags) && rec.tags.length > 0 && (
                <div className="profile-my-rec-tag-container">
                    {rec.tags.map((tag, idx) => (
                        <span key={idx} className="profile-my-rec-tag-badge">
                            {tag}
                        </span>
                    ))}
                    <button
                        className="profile-my-rec-add-tag-button"
                        onClick={() => onEdit(rec)}
                        aria-label="Edit tags"
                    >
                        +
                    </button>
                </div>
            )}
            {Array.isArray(rec.tags) && rec.tags.length === 0 && (
                <div className="profile-my-rec-tag-container">
                    <span className="profile-my-rec-no-tags-text">
                        No tags.
                    </span>
                    <button
                        className="profile-my-rec-add-tag-button"
                        onClick={() => onEdit(rec)}
                        aria-label="Add a tag"
                    >
                        +
                    </button>
                </div>
            )}
            <div className="profile-my-rec-card-footer">
                <div className="profile-my-rec-date">
                    <CalendarDaysIcon className="inline-icon" />
                    Recommended on:{" "}
                    {formatDate(rec.date_of_recommendation || rec.created_at)}
                </div>
                <div className="profile-my-rec-action-buttons">
                    <button
                        className="profile-my-rec-primary-action-button"
                        onClick={() => onEdit(rec)}
                    >
                        <PencilSquareIcon className="btn-icon" /> Edit My Rec
                    </button>
                </div>
            </div>
            {selectedImage && (
                <ImageModal
                    image={selectedImage}
                    onClose={() => setSelectedImage(null)}
                />
            )}
            {showDeleteModal && (
                <div className="profile-edit-modal-overlay">
                    <div className="profile-edit-modal-content">
                        <button
                            onClick={() => setShowDeleteModal(false)}
                            className="profile-edit-modal-close-btn"
                        >
                            &times;
                        </button>
                        <h2 className="profile-edit-modal-title">
                            Delete Recommendation
                        </h2>
                        <div className="profile-delete-modal-body">
                            <div className="profile-delete-modal-warning">
                                <ExclamationTriangleIcon className="warning-icon" />
                                <p>
                                    Are you sure you want to delete this
                                    recommendation? This action cannot be
                                    undone.
                                </p>
                            </div>
                            {deleteError && (
                                <div className="profile-edit-modal-message error">
                                    <XCircleIcon />
                                    <span>{deleteError}</span>
                                </div>
                            )}
                            <div className="profile-edit-modal-button-row">
                                <button
                                    className="profile-edit-modal-btn cancel-btn"
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={isDeleting}
                                >
                                    <XCircleIcon /> Cancel
                                </button>
                                <button
                                    className="profile-edit-modal-btn delete-btn"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <>
                                            <ArrowPathIcon className="animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <TrashIcon />
                                            Delete
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </li>
    );
};

const AchievementBadge = ({ recCount, onStartRecommending }) => {
    const getBadgeInfo = (count) => {
        if (count >= 100) {
            return {
                level: "Diamond",
                tier: "Diamond Recommender",
                className: "achievement-badge-diamond",
                icon: "💎",
                description: `Diamond Recommender (${count} recommendations)`,
            };
        } else if (count >= 50) {
            return {
                level: "Platinum",
                tier: "Platinum Recommender",
                className: "achievement-badge-platinum",
                icon: "⭐",
                description: `Platinum Recommender (${count} recommendations)`,
            };
        } else if (count >= 25) {
            return {
                level: "Gold",
                tier: "Gold Recommender",
                className: "achievement-badge-gold",
                icon: "🏆",
                description: `Gold Recommender (${count} recommendations)`,
            };
        } else if (count >= 10) {
            return {
                level: "Silver",
                tier: "Silver Recommender",
                className: "achievement-badge-silver",
                icon: "🥈",
                description: `Silver Recommender (${count} recommendations)`,
            };
        } else if (count >= 1) {
            return {
                level: "Bronze",
                tier: "Bronze Recommender",
                className: "achievement-badge-bronze",
                icon: "🥉",
                description: `Bronze Recommender (${count} recommendations)`,
            };
        }
        return null;
    };

    const badge = getBadgeInfo(recCount);

    if (!badge) {
        // Show incentivizing starter badge for users with 0 recommendations
        return (
            <div
                className="achievement-badge-starter"
                title="Share your first recommendation to unlock Bronze tier!"
                onClick={onStartRecommending}
            >
                <div className="achievement-badge-icon">🌟</div>
            </div>
        );
    }

    return (
        <div
            className={`achievement-badge-circular ${badge.className}`}
            title={badge.description}
        >
            <div className="achievement-badge-icon">{badge.icon}</div>
        </div>
    );
};

function UserListCard({ list, fetchListRecommendations }) {
    const [expanded, setExpanded] = useState(false);
    const [recs, setRecs] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleExpand = async () => {
        setExpanded((prev) => !prev);
        if (!expanded && recs.length === 0) {
            setLoading(true);
            const recommendations = await fetchListRecommendations(list.id);
            setRecs(recommendations);
            setLoading(false);
        }
    };

    return (
        <li className="profile-user-list-card">
            <div
                className="profile-user-list-header"
                onClick={handleExpand}
                style={{ cursor: "pointer" }}
            >
                <h3>{list.title}</h3>
                <span className="profile-user-list-date">
                    {new Date(list.created_at).toLocaleDateString()}
                </span>
                <ChevronDownIcon
                    className={`profile-user-list-chevron${
                        expanded ? " rotated" : ""
                    }`}
                />
            </div>
            <p className="profile-user-list-description">{list.description}</p>
            {expanded && (
                <div className="profile-user-list-recommendations">
                    {loading ? (
                        <div>Loading recommendations...</div>
                    ) : recs.length === 0 ? (
                        <div>No recommendations in this list.</div>
                    ) : (
                        <ul className="profile-user-list-recs">
                            {recs.map((rec) => (
                                <li
                                    key={rec.id}
                                    className="profile-user-list-rec-card"
                                >
                                    <div className="profile-user-list-rec-header">
                                        <span className="profile-user-list-rec-title">
                                            {rec.business_name}
                                        </span>
                                        <StarRatingDisplay
                                            rating={
                                                rec.rating ||
                                                rec.initial_rating ||
                                                0
                                            }
                                            isProfileCard={false}
                                        />
                                    </div>
                                    <div className="profile-user-list-rec-details">
                                        <span>{rec.recommender_message}</span>
                                        {Array.isArray(rec.tags) &&
                                            rec.tags.length > 0 && (
                                                <div className="profile-user-list-rec-tags">
                                                    {rec.tags.map(
                                                        (tag, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="profile-user-list-rec-tag"
                                                            >
                                                                {tag}
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            )}
                                        {rec.images &&
                                            rec.images.length > 0 && (
                                                <div className="profile-user-list-rec-images">
                                                    <img
                                                        src={
                                                            typeof rec
                                                                .images[0] ===
                                                            "string"
                                                                ? rec.images[0]
                                                                : rec.images[0]
                                                                      ?.preview ||
                                                                  ""
                                                        }
                                                        alt="Preview"
                                                        className="profile-user-list-rec-image"
                                                        style={{
                                                            maxWidth: "80px",
                                                            maxHeight: "80px",
                                                            borderRadius: "8px",
                                                        }}
                                                    />
                                                    {rec.images.length > 1 && (
                                                        <span className="profile-user-list-rec-image-count">
                                                            +
                                                            {rec.images.length -
                                                                1}{" "}
                                                            more
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </li>
    );
}

const Profile = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const { signOut } = useClerk();
    const navigate = useNavigate();
    const [baseRecommendations, setBaseRecommendations] = useState([]);
    const [enrichedRecommendations, setEnrichedRecommendations] = useState([]);
    const [connections, setConnections] = useState([]);
    const [profileUserData, setProfileUserData] = useState(null);
    const [userBio, setUserBio] = useState("");
    const [profileImage, setProfileImage] = useState("");
    const [editingBio, setEditingBio] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [imgSrcForCropper, setImgSrcForCropper] = useState("");
    const imgRef = useRef(null);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const [originalFile, setOriginalFile] = useState(null);
    const [sortOption, setSortOption] = useState("date_of_recommendation");
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentEditingRec, setCurrentEditingRec] = useState(null);
    const [userTrustCircles, setUserTrustCircles] = useState([]);
    const [trustCirclesLoading, setTrustCirclesLoading] = useState(false);
    const [trustCirclesError, setTrustCirclesError] = useState("");
    const [likedRecommendations, setLikedRecommendations] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [selectedCities, setSelectedCities] = useState([]);
    const [showCityFilter, setShowCityFilter] = useState(false);
    const [selectedServices, setSelectedServices] = useState([]);
    const [showServiceFilter, setShowServiceFilter] = useState(false);
    const [userScore, setUserScore] = useState(0);
    // Review modal state for writing reviews
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [providerForReview, setProviderForReview] = useState(null);
    // Batch comments state
    const [commentsMap, setCommentsMap] = useState(new Map());
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [currentUserName, setCurrentUserName] = useState(null);
    const ASPECT_RATIO = 1;
    const MIN_DIMENSION = 150;

    const [userLists, setUserLists] = useState([]);
    const [listsLoading, setListsLoading] = useState(false);
    const [listsError, setListsError] = useState("");

    const [expandedListId, setExpandedListId] = useState(null);
    const [listRecs, setListRecs] = useState({});
    const [listRecsLoading, setListRecsLoading] = useState({});

    const getClerkUserQueryParams = useCallback(() => {
        if (!user) return "";
        return new URLSearchParams({
            user_id: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            phoneNumber: user.primaryPhoneNumber?.phoneNumber || "",
        }).toString();
    }, [user]);

    const fetchProfileData = useCallback(async () => {
        if (!isLoaded || !isSignedIn || !user) return;
        setLoading(true);
        setError(null);
        try {
            const queryParams = getClerkUserQueryParams();
            if (!queryParams) throw new Error("User details not available.");
            const profileResPromise = fetch(
                `${API_URL}/api/users/me/recommendations?${queryParams}`
            );
            const connectionsResPromise = fetch(
                `${API_URL}/api/connections/followers?user_id=${user.id}`
            );
            const [profileRes, connectionsRes] = await Promise.all([
                profileResPromise,
                connectionsResPromise,
            ]);
            if (!profileRes.ok) {
                const errData = await profileRes.json().catch(() => ({}));
                throw new Error(
                    errData.message || "Failed to fetch profile data"
                );
            }
            const profileData = await profileRes.json();
            setProfileUserData(profileData);
            setBaseRecommendations(profileData.recommendations || []);
            setUserBio(profileData.userBio || "");
            setEditingBio(profileData.userBio || "");

            // Fetch user score for Trust Points Wheel
            try {
                const scoreResponse = await fetch(
                    `${API_URL}/api/users/preferred-name?email=${encodeURIComponent(
                        user.primaryEmailAddress.emailAddress
                    )}`
                );
                if (scoreResponse.ok) {
                    const scoreData = await scoreResponse.json();
                    const score =
                        parseInt(scoreData.userScore || scoreData.user_score) ||
                        0;
                    setUserScore(score);
                } else {
                    setUserScore(0);
                }
            } catch (scoreError) {
                console.error("Error fetching user score:", scoreError);
                setUserScore(0);
            }

            const imageQuery = getClerkUserQueryParams();
            if (imageQuery)
                setProfileImage(
                    `${API_URL}/api/users/me/profile/image?${imageQuery}&timestamp=${new Date().getTime()}`
                );
            if (!connectionsRes.ok) setConnections([]);
            else {
                const connsData = await connectionsRes.json();
                setConnections(Array.isArray(connsData) ? connsData : []);
            }
        } catch (err) {
            setError(err.message);
            setBaseRecommendations([]);
        } finally {
            setLoading(false);
        }
    }, [isLoaded, isSignedIn, user, getClerkUserQueryParams]);

    const fetchUserLists = useCallback(async () => {
        if (!user?.id || !user.primaryEmailAddress?.emailAddress) return;
        setListsLoading(true);
        setListsError("");
        try {
            const res = await fetch(
                `${API_URL}/api/recommendations/lists?user_id=${
                    user.id
                }&email=${encodeURIComponent(
                    user.primaryEmailAddress.emailAddress
                )}`
            );
            if (!res.ok) throw new Error("Failed to fetch lists");
            const data = await res.json();
            if (!data.success)
                throw new Error(data.message || "Failed to fetch lists");
            setUserLists(data.lists || []);
        } catch (err) {
            setListsError(err.message || "Could not load your lists.");
            setUserLists([]);
        } finally {
            setListsLoading(false);
        }
    }, [user]);

    const fetchListRecommendations = async (listId) => {
        try {
            const res = await fetch(
                `${API_URL}/api/recommendations/lists/${listId}?user_id=${
                    user.id
                }&email=${encodeURIComponent(
                    user.primaryEmailAddress.emailAddress
                )}`
            );
            if (!res.ok)
                throw new Error("Failed to fetch list recommendations");
            const data = await res.json();
            return data.recommendations || [];
        } catch (err) {
            return [];
        }
    };

    const handleExpandList = async (listId) => {
        setExpandedListId(listId);
        if (!listRecs[listId]) {
            setListRecsLoading((prev) => ({ ...prev, [listId]: true }));
            const recs = await fetchListRecommendations(listId);
            setListRecs((prev) => ({ ...prev, [listId]: recs }));
            setListRecsLoading((prev) => ({ ...prev, [listId]: false }));
        }
    };

    useEffect(() => {
        if (isSignedIn && user) fetchProfileData();
        else if (isLoaded && !isSignedIn) navigate("/");
    }, [isSignedIn, user, isLoaded, fetchProfileData, navigate]);

    useEffect(() => {
        if (baseRecommendations.length > 0 && user?.id) {
            setStatsLoading(true);
            // Process recommendations directly from backend data - no individual API calls needed
            const enriched = baseRecommendations.map((rec) => ({
                ...rec,
                average_rating: parseFloat(rec.average_rating) || 0,
                total_reviews: parseInt(rec.total_reviews, 10) || 0,
                num_likes: parseInt(rec.num_likes, 10) || 0,
                currentUserLiked: rec.currentUserLiked || false,
                users_who_reviewed: rec.users_who_reviewed || [],
            }));

            setEnrichedRecommendations(enriched);

            const newInitialUserLikes = new Set();
            enriched.forEach((r) => {
                const providerId = r.provider_id || r.id;
                if (r.currentUserLiked && providerId) {
                    newInitialUserLikes.add(providerId);
                }
            });
            setLikedRecommendations(newInitialUserLikes);

            setStatsLoading(false);
        } else {
            setEnrichedRecommendations([]);
            setLikedRecommendations(new Set());
            if (!loading) setStatsLoading(false);
        }
    }, [baseRecommendations, loading, user]);

    // Set current user name when user loads
    useEffect(() => {
        if (isLoaded && isSignedIn && user) {
            setCurrentUserName(user.firstName || user.lastName || "User");
        } else if (isLoaded && !isSignedIn) {
            setCurrentUserName(null);
        }
    }, [isLoaded, isSignedIn, user]);

    useEffect(() => {
        if (user) {
            fetchUserLists();
        }
    }, [user, fetchUserLists]);

    // Fetch comments for recommendations
    useEffect(() => {
        if (!loading && !statsLoading && enrichedRecommendations.length > 0) {
            fetchBatchComments(enrichedRecommendations);
        }
    }, [enrichedRecommendations, loading, statsLoading]);

    const handleProviderLikeFromProfile = async (providerIdToLike) => {
        if (!user?.id || !user.primaryEmailAddress?.emailAddress) {
            alert("Please sign in to like/unlike this provider.");
            return;
        }
        if (!providerIdToLike) {
            console.error("Provider ID is missing for like action.");
            return;
        }

        const originalEnrichedRecommendations = JSON.parse(
            JSON.stringify(enrichedRecommendations)
        );
        const originalBaseRecommendations = JSON.parse(
            JSON.stringify(baseRecommendations)
        );
        const originalLikedRecommendationsSet = new Set(likedRecommendations);

        const isCurrentlyLiked = likedRecommendations.has(providerIdToLike);
        const newCurrentUserLikedState = !isCurrentlyLiked;

        const updateItems = (items) =>
            items.map((item) => {
                const itemProviderId = item.provider_id || item.id;
                if (itemProviderId === providerIdToLike) {
                    const currentItem =
                        originalEnrichedRecommendations.find(
                            (r) => (r.provider_id || r.id) === providerIdToLike
                        ) ||
                        originalBaseRecommendations.find(
                            (r) => (r.provider_id || r.id) === providerIdToLike
                        );
                    const currentItemNumLikes = currentItem
                        ? currentItem.num_likes || 0
                        : 0;

                    return {
                        ...item,
                        currentUserLiked: newCurrentUserLikedState,
                        num_likes: newCurrentUserLikedState
                            ? (parseInt(currentItemNumLikes, 10) || 0) + 1
                            : Math.max(
                                  0,
                                  (parseInt(currentItemNumLikes, 10) || 1) - 1
                              ),
                    };
                }
                return item;
            });

        setEnrichedRecommendations(updateItems(enrichedRecommendations));
        setBaseRecommendations(updateItems(baseRecommendations));

        if (newCurrentUserLikedState) {
            setLikedRecommendations((prev) =>
                new Set(prev).add(providerIdToLike)
            );
        } else {
            setLikedRecommendations((prev) => {
                const newSet = new Set(prev);
                newSet.delete(providerIdToLike);
                return newSet;
            });
        }

        try {
            const response = await fetch(
                `${API_URL}/api/providers/${providerIdToLike}/like`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: user.id,
                        userEmail: user.primaryEmailAddress.emailAddress,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    message: "Server error during like/unlike action.",
                }));
                throw new Error(
                    errorData.message ||
                        `Failed to update like status. Status: ${response.status}`
                );
            }
            const result = await response.json();

            const finalUpdateItems = (items) =>
                items.map((item) => {
                    const itemProviderId = item.provider_id || item.id;
                    if (itemProviderId === providerIdToLike) {
                        return {
                            ...item,
                            num_likes: parseInt(result.num_likes, 10) || 0,
                            currentUserLiked: result.currentUserLiked,
                        };
                    }
                    return item;
                });

            setEnrichedRecommendations((prevEnriched) =>
                finalUpdateItems(prevEnriched)
            );
            setBaseRecommendations((prevBase) => finalUpdateItems(prevBase));

            if (result.currentUserLiked) {
                setLikedRecommendations((prev) =>
                    new Set(prev).add(providerIdToLike)
                );
            } else {
                setLikedRecommendations((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(providerIdToLike);
                    return newSet;
                });
            }
        } catch (error) {
            console.error("Error liking provider from profile:", error.message);
            setEnrichedRecommendations(originalEnrichedRecommendations);
            setBaseRecommendations(originalBaseRecommendations);
            setLikedRecommendations(originalLikedRecommendationsSet);
            alert(`Failed to update like: ${error.message}`);
        }
    };

    const fetchUserTrustCirclesForModal = useCallback(async () => {
        if (!user?.primaryEmailAddress?.emailAddress) return [];
        setTrustCirclesLoading(true);
        setTrustCirclesError("");
        try {
            const email = encodeURIComponent(
                user.primaryEmailAddress.emailAddress
            );
            const res = await fetch(
                `${API_URL}/api/communities/user/${email}/communities`
            );
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(
                    errorData.message || "Failed to fetch user trust circles."
                );
            }
            const data = await res.json();
            const formattedCircles = Array.isArray(data)
                ? data.map((tc) => ({ id: tc.id, name: tc.name }))
                : [];
            setUserTrustCircles(formattedCircles);
            return formattedCircles;
        } catch (err) {
            setTrustCirclesError(
                err.message || "Could not load trust circles."
            );
            setUserTrustCircles([]);
            return [];
        } finally {
            setTrustCirclesLoading(false);
        }
    }, [user]);

    const handleOpenEditModal = (rec) => {
        setCurrentEditingRec(rec);
        setIsEditModalOpen(true);
        if (
            userTrustCircles.length === 0 &&
            !trustCirclesLoading &&
            !trustCirclesError
        )
            fetchUserTrustCirclesForModal();
    };
    const handleUpdateRecommendationSuccess = (responseData) => {
        fetchProfileData();
    };

    // Review modal handlers
    const handleOpenReviewModal = (provider) => {
        setProviderForReview(provider);
        setIsReviewModalOpen(true);
    };

    const handleCloseReviewModal = () => {
        setIsReviewModalOpen(false);
        setProviderForReview(null);
    };

    const handleSubmitReview = async (reviewData) => {
        if (!providerForReview || !user) return;
        const session = window.Clerk.session;
        if (!session) {
            console.error("Clerk session not available");
            return;
        }
        const token = await session.getToken();
        if (!token) {
            console.error("Not authenticated, no token");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/reviews`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    provider_id:
                        providerForReview.provider_id || providerForReview.id,
                    provider_email: providerForReview.email || "",
                    user_id: user.id,
                    email: user.primaryEmailAddress?.emailAddress,
                    rating: reviewData.rating,
                    content: reviewData.review,
                    tags: reviewData.tags,
                }),
            });
            if (!response.ok) throw new Error("Failed to submit review");

            handleCloseReviewModal();
            // Refresh recommendations to show updated stats
            fetchProfileData();
        } catch (error) {
            console.error("Error submitting review:", error);
        }
    };

    // Batch fetch comments for multiple recommendations
    const fetchBatchComments = async (recommendations) => {
        if (!recommendations || recommendations.length === 0) return;

        setIsLoadingComments(true);
        try {
            const serviceIds = recommendations
                .map((rec) => rec.provider_id || rec.id)
                .filter(Boolean);

            if (serviceIds.length === 0) return;

            const response = await fetch(`${API_URL}/api/comments/batch`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ service_ids: serviceIds }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.comments) {
                    const commentsMap = new Map();
                    Object.entries(data.comments).forEach(
                        ([serviceId, comments]) => {
                            commentsMap.set(serviceId, comments || []);
                        }
                    );
                    setCommentsMap(commentsMap);
                }
            }
        } catch (error) {
            console.error("Error fetching batch comments:", error);
        } finally {
            setIsLoadingComments(false);
        }
    };

    // Handle new comment added
    const handleCommentAdded = (serviceId, newComment) => {
        setCommentsMap((prev) => {
            const newMap = new Map(prev);
            const existingComments = newMap.get(serviceId) || [];
            newMap.set(serviceId, [newComment, ...existingComments]);
            return newMap;
        });
    };

    const handleServiceSelection = (service) => {
        setSelectedServices((prev) =>
            prev.includes(service)
                ? prev.filter((s) => s !== service)
                : [...prev, service]
        );
    };

    const handleCitySelection = (city) => {
        setSelectedCities((prev) =>
            prev.includes(city)
                ? prev.filter((c) => c !== city)
                : [...prev, city]
        );
    };

    const sortedRecommendations = React.useMemo(() => {
        let sortableItems = [...enrichedRecommendations];

        // Apply search filter first
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            sortableItems = sortableItems.filter((item) => {
                const businessName = (item.business_name || "").toLowerCase();
                const message = (item.recommender_message || "").toLowerCase();
                const tags = Array.isArray(item.tags)
                    ? item.tags.join(" ").toLowerCase()
                    : "";
                const contactName = (
                    item.provider_contact_name ||
                    item.business_contact ||
                    ""
                ).toLowerCase();

                return (
                    businessName.includes(query) ||
                    message.includes(query) ||
                    tags.includes(query) ||
                    contactName.includes(query)
                );
            });
        }

        // Apply service filter
        if (selectedServices.length > 0) {
            sortableItems = sortableItems.filter((item) => {
                const itemService = item.recommended_service_name || "Other";
                return selectedServices.includes(itemService);
            });
        }

        // Apply city filter
        if (selectedCities.length > 0) {
            sortableItems = sortableItems.filter((item) => {
                const itemCity = item.city || "Other";
                return selectedCities.includes(itemCity);
            });
        }

        // Then apply sorting
        if (
            sortOption === "topRated" &&
            sortableItems.every(
                (item) => typeof item.average_rating === "number"
            )
        )
            sortableItems.sort(
                (a, b) =>
                    (b.average_rating || 0) - (a.average_rating || 0) ||
                    (b.total_reviews || 0) - (a.total_reviews || 0)
            );
        else if (sortOption === "date_of_recommendation")
            sortableItems.sort(
                (a, b) =>
                    new Date(b.date_of_recommendation || b.created_at || 0) -
                    new Date(a.date_of_recommendation || a.created_at || 0)
            );
        return sortableItems;
    }, [
        enrichedRecommendations,
        sortOption,
        searchQuery,
        selectedCities,
        selectedServices,
    ]);

    const availableCities = React.useMemo(() => {
        if (!enrichedRecommendations || enrichedRecommendations.length === 0)
            return [];
        const cityCounts = enrichedRecommendations.reduce((acc, rec) => {
            const city = rec.city || "Other";
            acc[city] = (acc[city] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(cityCounts).sort(
            ([, countA], [, countB]) => countB - countA
        );
    }, [enrichedRecommendations]);

    const availableServices = React.useMemo(() => {
        if (!enrichedRecommendations || enrichedRecommendations.length === 0)
            return [];
        const serviceCounts = enrichedRecommendations.reduce((acc, rec) => {
            const service = rec.recommended_service_name || "Other";
            acc[service] = (acc[service] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(serviceCounts).sort(
            ([, countA], [, countB]) => countB - countA
        );
    }, [enrichedRecommendations]);

    const handleLogout = async () => {
        try {
            await signOut();
            navigate("/");
        } catch (err) {
            console.error("Error signing out:", err);
        }
    };
    const handleEditToggle = () => {
        if (isEditing) {
            setEditingBio(userBio);
            setImgSrcForCropper("");
            setCompletedCrop(null);
            setOriginalFile(null);
            setCrop(undefined);
        } else setEditingBio(userBio || "");
        setIsEditing(!isEditing);
    };
    const onImageLoad = (e) => {
        const { width, height } = e.currentTarget;
        const cropWidthInPercent = (MIN_DIMENSION / width) * 100;
        const cropVal = makeAspectCrop(
            { unit: "%", width: cropWidthInPercent },
            ASPECT_RATIO,
            width,
            height
        );
        const centeredCrop = centerCrop(cropVal, width, height);
        setCrop(centeredCrop);
    };
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setOriginalFile(file);
            setCrop(undefined);
            const reader = new FileReader();
            reader.addEventListener("load", () =>
                setImgSrcForCropper(reader.result?.toString() || "")
            );
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = async () => {
        if (!user) {
            setError("User not found.");
            return;
        }
        setError(null);
        setSaving(true);
        const formData = new FormData();
        formData.append("bio", editingBio);
        formData.append("firstName", user.firstName || "");
        formData.append("lastName", user.lastName || "");
        let fileToUpload = null;
        if (completedCrop && imgRef.current && originalFile) {
            try {
                const croppedImageBlob = await getCroppedImg(
                    imgRef.current,
                    completedCrop,
                    originalFile.name
                );
                fileToUpload = new File([croppedImageBlob], originalFile.name, {
                    type: croppedImageBlob.type,
                });
            } catch (cropError) {
                setError("Failed to crop image.");
                setSaving(false);
                return;
            }
        }
        if (fileToUpload) formData.append("profileImageFile", fileToUpload);
        try {
            const queryParams = getClerkUserQueryParams();
            if (!queryParams)
                throw new Error("User details not available for API query.");
            const response = await fetch(
                `${API_URL}/api/users/me/profile?${queryParams}`,
                { method: "PUT", body: formData }
            );
            const data = await response.json();
            if (!response.ok || !data.success)
                throw new Error(data.message || "Failed to update profile.");
            setUserBio(data.user.bio || "");
            setEditingBio(data.user.bio || "");
            const imageQuery = getClerkUserQueryParams();
            if (imageQuery)
                setProfileImage(
                    `${API_URL}/api/users/me/profile/image?${imageQuery}&timestamp=${new Date().getTime()}`
                );
            setImgSrcForCropper("");
            setCompletedCrop(null);
            setOriginalFile(null);
            setIsEditing(false);
            if (profileUserData)
                setProfileUserData((prev) => ({
                    ...prev,
                    userName: data.user.name,
                    userBio: data.user.bio,
                }));
        } catch (err) {
            setError(`Failed to save profile: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const onAvatarOrPreviewError = (e) => {
        e.target.style.display = "none";
        const fallbackParent =
            e.target.closest(".profile-avatar-display-wrapper") ||
            e.target.closest(".profile-avatar-cropper-wrapper");
        if (fallbackParent) {
            const fallbackIcon = fallbackParent.querySelector(
                ".profile-avatar-icon-fallback, .profile-avatar-icon-editing"
            );
            if (fallbackIcon) fallbackIcon.style.display = "flex";
        }
    };

    const displayOverallLoading =
        loading ||
        (statsLoading &&
            baseRecommendations.length > 0 &&
            enrichedRecommendations.length < baseRecommendations.length);

    if (!isLoaded || (displayOverallLoading && !profileUserData && isSignedIn))
        return (
            <div className="profile-loading-container">
                <div className="profile-spinner"></div>
                <p>Loading Profile...</p>
            </div>
        );
    if (!isSignedIn && isLoaded) return null;
    if (!user && isLoaded && isSignedIn)
        return (
            <div className="profile-page">
                <div
                    className="profile-main-content"
                    style={{ textAlign: "center", paddingTop: "5rem" }}
                >
                    <h1 style={{ color: "var(--profile-primary-color)" }}>
                        Profile Access Denied
                    </h1>
                    <p
                        className="profile-error-banner"
                        style={{ margin: "1rem auto", maxWidth: "600px" }}
                    >
                        User information not available.
                    </p>
                    <button
                        className="profile-primary-action-btn"
                        onClick={() => navigate("/login")}
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );

    return (
        <div className="profile-page-container">
            {error && <div className="profile-error-banner">{error}</div>}
            <header className="profile-hero-header">
                <div className="profile-hero-content">
                    <div className="profile-avatar-wrapper">
                        {isEditing ? (
                            <div className="profile-avatar-cropper-wrapper">
                                <input
                                    type="file"
                                    id="profileImageUploadInput"
                                    style={{ display: "none" }}
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                {!imgSrcForCropper && (
                                    <div
                                        className="profile-avatar-container"
                                        onClick={() =>
                                            document
                                                .getElementById(
                                                    "profileImageUploadInput"
                                                )
                                                ?.click()
                                        }
                                        style={{ cursor: "pointer" }}
                                    >
                                        {profileImage ? (
                                            <img
                                                src={profileImage}
                                                alt="Current profile"
                                                className="profile-avatar-image"
                                                onError={onAvatarOrPreviewError}
                                            />
                                        ) : (
                                            <div className="profile-avatar-initials">
                                                <span>
                                                    {profileUserData?.userName?.[0]?.toUpperCase() ||
                                                        user?.firstName?.[0]?.toUpperCase() ||
                                                        user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() ||
                                                        "U"}
                                                </span>
                                            </div>
                                        )}
                                        <div className="profile-avatar-edit-overlay">
                                            <CameraIcon
                                                style={{
                                                    width: "24px",
                                                    height: "24px",
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                                {imgSrcForCropper && (
                                    <div className="cropper-container">
                                        <ReactCrop
                                            crop={crop}
                                            onChange={(pc, p) => setCrop(p)}
                                            onComplete={(c) =>
                                                setCompletedCrop(c)
                                            }
                                            aspect={ASPECT_RATIO}
                                            minWidth={MIN_DIMENSION}
                                            minHeight={MIN_DIMENSION}
                                            circularCrop={true}
                                        >
                                            <img
                                                ref={imgRef}
                                                src={imgSrcForCropper}
                                                alt="Crop me"
                                                onLoad={onImageLoad}
                                                style={{ maxHeight: "300px" }}
                                            />
                                        </ReactCrop>
                                        <button
                                            className="profile-change-photo-btn-cropper"
                                            onClick={() =>
                                                document
                                                    .getElementById(
                                                        "profileImageUploadInput"
                                                    )
                                                    ?.click()
                                            }
                                        >
                                            <CameraIcon className="btn-icon" />{" "}
                                            Change Photo
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                {profileImage ? (
                                    <img
                                        src={profileImage}
                                        alt={
                                            profileUserData?.userName ||
                                            user?.firstName ||
                                            "User"
                                        }
                                        className="profile-avatar-image"
                                        onError={onAvatarOrPreviewError}
                                    />
                                ) : (
                                    <div className="profile-avatar-initials">
                                        <span>
                                            {profileUserData?.userName?.[0]?.toUpperCase() ||
                                                user?.firstName?.[0]?.toUpperCase() ||
                                                user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() ||
                                                "U"}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <div className="profile-details-wrapper">
                        <div className="profile-header-top">
                            <h1 className="profile-user-name">
                                {profileUserData?.userName ||
                                    `${user?.firstName || ""} ${
                                        user?.lastName || ""
                                    }`.trim() ||
                                    "User"}
                            </h1>
                            <div className="profile-header-actions">
                                {isEditing ? (
                                    <>
                                        <button
                                            className="profile-save-btn"
                                            onClick={handleSaveProfile}
                                            disabled={saving}
                                        >
                                            <CheckCircleIcon className="btn-icon" />{" "}
                                            {saving
                                                ? "Saving..."
                                                : "Save Changes"}
                                        </button>
                                        <button
                                            className="profile-cancel-btn"
                                            onClick={handleEditToggle}
                                            disabled={saving}
                                        >
                                            <XCircleIcon className="btn-icon" />{" "}
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        className="profile-edit-btn"
                                        onClick={handleEditToggle}
                                    >
                                        <PencilSquareIcon className="btn-icon" />{" "}
                                        Edit Profile
                                    </button>
                                )}
                                <button
                                    className="profile-share-btn-header"
                                    onClick={() => setIsShareModalOpen(true)}
                                    disabled={saving || isEditing}
                                >
                                    <ShareIcon className="btn-icon" /> Share
                                    Profile
                                </button>
                            </div>
                        </div>

                        <div className="profile-contact-info">
                            {profileUserData?.userPhone && (
                                <a
                                    href={`sms:${profileUserData.userPhone.replace(
                                        /\D/g,
                                        ""
                                    )}`}
                                    className="profile-contact-link phone"
                                    title="Send a text to this number"
                                >
                                    <svg
                                        className="contact-icon"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                                    </svg>
                                    {profileUserData.userPhone}
                                </a>
                            )}

                            {profileUserData?.userEmail && (
                                <a
                                    href={`mailto:${profileUserData.userEmail}`}
                                    className="profile-contact-link email"
                                    title="Send email to this address"
                                >
                                    <EnvelopeIcon className="contact-icon" />
                                    {profileUserData.userEmail}
                                </a>
                            )}
                        </div>

                        {isEditing ? (
                            <textarea
                                className="profile-bio-textarea"
                                value={editingBio}
                                onChange={(e) => setEditingBio(e.target.value)}
                                placeholder="Tell us about yourself..."
                                rows={3}
                            />
                        ) : (
                            userBio && (
                                <blockquote className="profile-user-bio">
                                    <p>{userBio}</p>
                                </blockquote>
                            )
                        )}
                    </div>
                    <div className="profile-stats-wrapper">
                        <div className="profile-stat-item">
                            <span className="profile-stat-number">
                                {enrichedRecommendations.length}
                            </span>
                            <span className="profile-stat-label">
                                Recommendations
                            </span>
                        </div>
                        <div className="profile-stat-item">
                            <span className="profile-stat-number">
                                {connections.length}
                            </span>
                            <span className="profile-stat-label">
                                Followers
                            </span>
                        </div>
                        <div className="profile-stat-item">
                            <div className="profile-trust-score-wrapper">
                                <TrustScoreWheel
                                    score={userScore}
                                    showDebug={false}
                                />
                            </div>
                        </div>
                        <div
                            className="profile-stat-item profile-achievement-hidden"
                            style={{ display: "none" }}
                        >
                            <div className="profile-stat-achievement">
                                <AchievementBadge
                                    recCount={enrichedRecommendations.length}
                                    onStartRecommending={() =>
                                        navigate("/share-recommendation")
                                    }
                                />
                            </div>
                            <span className="profile-stat-label">
                                {(() => {
                                    const count =
                                        enrichedRecommendations.length;
                                    if (count >= 100)
                                        return "Diamond Recommender";
                                    if (count >= 50)
                                        return "Platinum Recommender";
                                    if (count >= 25) return "Gold Recommender";
                                    if (count >= 10)
                                        return "Silver Recommender";
                                    if (count >= 1) return "Bronze Recommender";
                                    return "Start Your Journey";
                                })()}
                            </span>
                            {(() => {
                                const count = enrichedRecommendations.length;
                                let nextTier, remaining;
                                if (count < 1) {
                                    nextTier = "Bronze";
                                    remaining = 1 - count;
                                } else if (count < 10) {
                                    nextTier = "Silver";
                                    remaining = 10 - count;
                                } else if (count < 25) {
                                    nextTier = "Gold";
                                    remaining = 25 - count;
                                } else if (count < 50) {
                                    nextTier = "Platinum";
                                    remaining = 50 - count;
                                } else if (count < 100) {
                                    nextTier = "Diamond";
                                    remaining = 100 - count;
                                } else {
                                    return null; // Max tier reached
                                }
                                return (
                                    <span className="profile-stat-progress">
                                        {count === 0
                                            ? "Share your first recommendation!"
                                            : `${remaining} more to reach ${nextTier}`}
                                    </span>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </header>
            <main className="profile-content-area">
                <section style={{ marginBottom: "2rem" }}>
                    <div className="profile-recommendations-header">
                        <div className="profile-recommendations-title-section">
                            <h2>My Lists</h2>
                            <div className="profile-recommendations-controls">
                                <button
                                    className="profile-add-new-btn"
                                    onClick={() =>
                                        navigate("/share-recommendation")
                                    }
                                >
                                    <PlusCircleIcon className="btn-icon" /> Add
                                    New
                                </button>
                            </div>
                        </div>
                    </div>
                    {listsLoading ? (
                        <div>Loading lists...</div>
                    ) : listsError ? (
                        <div className="profile-error-banner">{listsError}</div>
                    ) : userLists.length === 0 ? (
                        <div>You haven't created any lists yet.</div>
                    ) : (
                        <div className="profile-list-card-row">
                            {userLists.map((list) => (
                                <ListCard
                                    key={list.id}
                                    list={list}
                                    expanded={expandedListId === list.id}
                                    onExpand={handleExpandList}
                                    recommendations={listRecs[list.id] || []}
                                    loading={!!listRecsLoading[list.id]}
                                />
                            ))}
                        </div>
                    )}
                </section>

                <div className="profile-recommendations-header">
                    <div className="profile-recommendations-title-section">
                        <h2>My Recommendations</h2>
                        <div className="profile-recommendations-controls">
                            <button
                                className="profile-add-new-btn"
                                onClick={() =>
                                    navigate("/share-recommendation")
                                }
                            >
                                <PlusCircleIcon className="btn-icon" /> Add New
                            </button>
                        </div>
                    </div>
                    {enrichedRecommendations.length > 0 && (
                        <div className="profile-search-wrapper">
                            <div className="profile-search-container">
                                <svg
                                    className="profile-search-icon"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search recommendations..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="profile-search-input"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="profile-search-clear"
                                        title="Clear search"
                                    >
                                        <svg
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <div className="filters-container">
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
                                            <ChevronDownIcon
                                                className={`profile-filter-chevron ${
                                                    showServiceFilter
                                                        ? "rotated"
                                                        : ""
                                                }`}
                                            />
                                        </button>
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
                                            <ChevronDownIcon
                                                className={`profile-filter-chevron ${
                                                    showCityFilter
                                                        ? "rotated"
                                                        : ""
                                                }`}
                                            />
                                        </button>
                                    </div>
                                )}
                                {showServiceFilter &&
                                    availableServices.length > 0 && (
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
                                                                id={`service-${service.replace(
                                                                    /\s+/g,
                                                                    "-"
                                                                )}`}
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
                                                                htmlFor={`service-${service.replace(
                                                                    /\s+/g,
                                                                    "-"
                                                                )}`}
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
                                                {selectedServices.length >
                                                    0 && (
                                                    <button
                                                        onClick={() =>
                                                            setSelectedServices(
                                                                []
                                                            )
                                                        }
                                                        className="profile-city-clear-all"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                {showCityFilter &&
                                    availableCities.length > 1 && (
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
                                                                    "-"
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
                                                                    "-"
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
                                                        onClick={() =>
                                                            setSelectedCities(
                                                                []
                                                            )
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
                        </div>
                    )}
                </div>
                {(loading ||
                    (statsLoading &&
                        baseRecommendations.length > 0 &&
                        enrichedRecommendations.length <
                            baseRecommendations.length)) &&
                    sortedRecommendations.length === 0 && (
                        <div className="profile-loading-container small-spinner">
                            <div className="profile-spinner"></div>
                            <p>Loading recommendations...</p>
                        </div>
                    )}
                {!(
                    loading ||
                    (statsLoading &&
                        baseRecommendations.length > 0 &&
                        enrichedRecommendations.length <
                            baseRecommendations.length)
                ) &&
                    sortedRecommendations.length > 0 && (
                        <ul className="provider-list">
                            {sortedRecommendations.map((rec) => (
                                <ProfileRecommendationCard
                                    key={rec.id}
                                    rec={rec}
                                    onEdit={(rec) => {
                                        setCurrentEditingRec(rec);
                                        setIsEditModalOpen(true);
                                    }}
                                    onLikeRecommendation={
                                        handleProviderLikeFromProfile
                                    }
                                    onRefreshList={fetchProfileData}
                                    user={user}
                                    comments={
                                        commentsMap.get(
                                            rec.provider_id || rec.id
                                        ) || []
                                    }
                                    onCommentAdded={handleCommentAdded}
                                    currentUserName={currentUserName}
                                    onWriteReview={handleOpenReviewModal}
                                />
                            ))}
                        </ul>
                    )}
                {!(
                    loading ||
                    (statsLoading &&
                        baseRecommendations.length > 0 &&
                        enrichedRecommendations.length <
                            baseRecommendations.length)
                ) &&
                    sortedRecommendations.length === 0 &&
                    !error &&
                    (searchQuery.trim() ||
                    selectedCities.length > 0 ||
                    selectedServices.length > 0 ? (
                        <div className="profile-empty-state no-search-results">
                            <svg
                                className="no-search-icon"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            <p>
                                No recommendations found
                                {searchQuery.trim() && ` for "${searchQuery}"`}
                                {selectedServices.length > 0 &&
                                    ` for ${selectedServices.join(", ")}`}
                                {selectedCities.length > 0 &&
                                    ` in ${selectedCities.join(", ")}`}
                            </p>
                            <p className="search-suggestions">
                                Try adjusting your search or filters.
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
                                {(searchQuery.trim() ||
                                    selectedCities.length > 0 ||
                                    selectedServices.length > 0) && (
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
                            <p>You haven't made any recommendations yet.</p>
                            <button
                                className="profile-primary-action-btn"
                                onClick={() =>
                                    navigate("/share-recommendation")
                                }
                            >
                                Share Your First Recommendation
                            </button>
                        </div>
                    ))}
                {!(
                    loading ||
                    (statsLoading &&
                        baseRecommendations.length > 0 &&
                        enrichedRecommendations.length <
                            baseRecommendations.length)
                ) &&
                    sortedRecommendations.length === 0 &&
                    error && (
                        <p className="profile-empty-state-error-inline">
                            Could not load recommendations. {error}
                        </p>
                    )}
            </main>
            {isEditModalOpen && currentEditingRec && user && (
                <EditRecommendationModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setCurrentEditingRec(null);
                    }}
                    recommendationToEdit={currentEditingRec}
                    onSaveSuccess={handleUpdateRecommendationSuccess}
                    userEmail={user.primaryEmailAddress?.emailAddress}
                    clerkUserId={user.id}
                    apiBaseUrl={API_URL}
                    userTrustCirclesProp={userTrustCircles}
                    trustCirclesLoadingProp={trustCirclesLoading}
                    trustCirclesErrorProp={trustCirclesError}
                    fetchUserTrustCirclesFunc={fetchUserTrustCirclesForModal}
                />
            )}
            {isShareModalOpen && (
                <ShareProfileModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    profileData={profileUserData}
                    userEmail={user?.primaryEmailAddress?.emailAddress}
                />
            )}
            {isReviewModalOpen && providerForReview && (
                <ReviewModal
                    isOpen={isReviewModalOpen}
                    onClose={handleCloseReviewModal}
                    onSubmit={handleSubmitReview}
                    provider={providerForReview}
                />
            )}
        </div>
    );
};

export default Profile;
