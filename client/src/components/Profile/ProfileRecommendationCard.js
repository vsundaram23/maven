import {
    ArrowPathIcon,
    CalendarDaysIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ExclamationTriangleIcon,
    PencilSquareIcon,
    ShareIcon,
    TrashIcon,
    XCircleIcon
} from "@heroicons/react/24/outline";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaStar, FaStarHalfAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import RecommendationCard from "../RecommendationCard/RecommendationCard";
import "./ProfileRecommendationCard.css";

// Helper: StarRatingDisplay
const StarRatingDisplay = ({ rating, isProfileCard }) => {
    const numRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalf = isProfileCard
        ? numRating - fullStars >= 0.4
        : numRating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    const starClass = isProfileCard ? "profile-star-icon" : "as-star-icon";

    return (
        <div className={isProfileCard ? "profile-star-display" : "as-star-rating"}>
            {[...Array(fullStars)].map((_, i) => (
                <FaStar key={`full-${i}`} className={`${starClass} filled`} />
            ))}
            {hasHalf &&
                (isProfileCard ? (
                    <FaStarHalfAlt key="half" className={`${starClass} filled`} />
                ) : (
                    <FaStar key={`half-${Date.now()}-srd`} className={`${starClass} half`} />
                ))}
            {[...Array(emptyStars)].map((_, i) => (
                <FaStar key={`empty-${i}`} className={`${starClass} empty`} />
            ))}
        </div>
    );
};

// Helper: ImageCarousel
const ImageCarousel = ({ images, onImageClick }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!images || !Array.isArray(images) || images.length === 0) return null;

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
                                        (prev - 1 + images.length) % images.length
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
                            className={`profile-carousel-dot ${idx === currentIndex ? "active" : ""}`}
                            onClick={() => setCurrentIndex(idx)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Helper: ImageModal
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
        <div className="profile-image-modal-overlay" onClick={onClose}>
            <div
                className="profile-image-modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                <button className="profile-image-modal-close" onClick={onClose}>
                    <XCircleIcon />
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

import { API_URL } from "../../utils/constants";

const ProfileRecommendationCard = ({
    rec,
    onEdit,
    onLikeRecommendation,
    onRefreshList,
    user,
    comments = [],
    onCommentAdded,
    currentUserName,
    onWriteReview,
}) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const dropdownRef = useRef(null);

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

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
        setDropdownOpen(false);
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
                onRefreshList && onRefreshList();
            }, 500);
        } catch (error) {
            setDeleteError(
                "Failed to delete recommendation. Please try again."
            );
            setIsDeleting(false);
        }
    };

    // Handle click outside dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Parse images if they're stored as a string
    const parsedImages = useMemo(() => {
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
        <li className="profile-recommendation-card-wrapper">
            <div className="profile-my-rec-card">
                <div className="profile-my-rec-card-header">
                    <h2 className="profile-my-rec-card-title">
                        <Link
                            to={`/provider/${rec.provider_id || rec.id}`}
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
                                    provider_contact_name: rec.provider_contact_name,
                                    website: rec.website,
                                    phone_number: rec.phone_number,
                                    city: rec.city,
                                    recommended_service_name: rec.recommended_service_name,
                                    date_of_recommendation: rec.date_of_recommendation,
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
                            <div
                                className="profile-my-rec-dropdown-wrapper"
                                ref={dropdownRef}
                            >
                                <button
                                    className="profile-my-rec-three-dots-button"
                                    onClick={() =>
                                        setDropdownOpen(!dropdownOpen)
                                    }
                                    title="Options"
                                >
                                    ⋮
                                </button>
                                {dropdownOpen && (
                                    <div className="profile-my-rec-dropdown-menu">
                                        <button
                                            className="profile-my-rec-dropdown-item"
                                            onClick={() => {
                                                onEdit && onEdit(rec);
                                                setDropdownOpen(false);
                                            }}
                                        >
                                            <PencilSquareIcon /> Edit
                                            Recommendation
                                        </button>
                                        <button
                                            className="profile-my-rec-dropdown-item"
                                            onClick={handleShare}
                                        >
                                            <ShareIcon /> Share Recommendation
                                        </button>
                                        <button
                                            className="profile-my-rec-dropdown-item delete-action"
                                            onClick={handleDeleteClick}
                                        >
                                            <TrashIcon />
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

                <div className="profile-recommendation-content">
                    <RecommendationCard
                        rec={rec}
                        onWriteReview={onWriteReview}
                        onLike={onLikeRecommendation}
                        isLikedByCurrentUser={rec.currentUserLiked}
                        loggedInUserId={user?.id}
                        currentUserName={currentUserName}
                        comments={comments}
                        onCommentAdded={onCommentAdded}
                        hidePhotoPreview={true}
                    />
                </div>

                {parsedImages.length > 0 && (
                    <div className="profile-my-rec-images">
                        <ImageCarousel
                            images={parsedImages}
                            onImageClick={(image) => setSelectedImage(image)}
                        />
                    </div>
                )}

                <div className="profile-my-rec-card-footer">
                    <div className="profile-my-rec-date">
                        <CalendarDaysIcon className="inline-icon" />
                        Recommended on:{" "}
                        {formatDate(
                            rec.date_of_recommendation || rec.created_at
                        )}
                    </div>
                    <div className="profile-my-rec-action-buttons">
                        <button
                            className="profile-my-rec-primary-action-button"
                            onClick={() => onEdit && onEdit(rec)}
                        >
                            <PencilSquareIcon className="btn-icon" /> Edit My
                            Rec
                        </button>
                    </div>
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

export default ProfileRecommendationCard;