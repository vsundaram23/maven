import { useClerk, useUser } from "@clerk/clerk-react";
import {
    ChevronLeftIcon,
    ChevronRightIcon, StarIcon as OutlineStarIcon, TrashIcon, XMarkIcon
} from "@heroicons/react/24/outline";
import {
    ArrowPathIcon,
    CalendarDaysIcon,
    CameraIcon,
    ChatBubbleLeftEllipsisIcon,
    CheckCircleIcon,
    EnvelopeIcon,
    ExclamationTriangleIcon,
    GlobeAltIcon,
    PencilSquareIcon,
    PhoneIcon,
    PhotoIcon,
    PlusCircleIcon,
    ShareIcon,
    StarIcon as SolidStarIcon,
    TagIcon,
    UserCircleIcon,
    UsersIcon as UsersIconSolid,
    XCircleIcon
} from "@heroicons/react/24/solid";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FaStar, FaStarHalfAlt } from "react-icons/fa";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Link, useNavigate } from "react-router-dom";
import ShareProfileModal from "../../components/ShareProfileModal/ShareProfileModal";
import TrustScoreWheel from "../../components/TrustScoreWheel/TrustScoreWheel";
import "./Profile.css";

const API_URL = 'https://api.seanag-recommendations.org:8080';
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

const EditRecommendationModal = ({
    isOpen,
    onClose,
    recommendationToEdit,
    onSaveSuccess,
    userEmail,
    clerkUserId,
    apiBaseUrl,
    userTrustCirclesProp,
    trustCirclesLoadingProp,
    trustCirclesErrorProp,
    fetchUserTrustCirclesFunc,
}) => {
    const [businessName, setBusinessName] = useState("");
    const [recommenderMessage, setRecommenderMessage] = useState("");
    const [rating, setRatingState] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState("");
    const [providerContactName, setProviderContactName] = useState("");
    const [website, setWebsite] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [publishScope, setPublishScope] = useState("Full Trust Circle");
    const [selectedTrustCircles, setSelectedTrustCircles] = useState([]);
    const [internalUserTrustCircles, setInternalUserTrustCircles] = useState(
        []
    );
    const [internalTrustCirclesLoading, setInternalTrustCirclesLoading] =
        useState(false);
    const [internalTrustCirclesError, setInternalTrustCirclesError] =
        useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [images, setImages] = useState([]);
    const [existingImages, setExistingImages] = useState([]);

    // Add getImageSrc function
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

    useEffect(() => {
        if (recommendationToEdit) {
            setBusinessName(recommendationToEdit.business_name || "");
            setRecommenderMessage(
                recommendationToEdit.recommender_message || ""
            );
            setRatingState(recommendationToEdit.rating || 0);
            setTags(recommendationToEdit.tags || []);
            setProviderContactName(
                recommendationToEdit.provider_contact_name ||
                    recommendationToEdit.business_contact ||
                    ""
            );
            setWebsite(recommendationToEdit.website || "");
            setPhoneNumber(recommendationToEdit.phone_number || "");
            let initialPublishScope = "Full Trust Circle";
            if (recommendationToEdit.visibility === "public")
                initialPublishScope = "Public";
            else if (recommendationToEdit.visibility === "connections") {
                initialPublishScope =
                    Array.isArray(recommendationToEdit.trust_circle_ids) &&
                    recommendationToEdit.trust_circle_ids.length > 0
                        ? "Specific Trust Circles"
                        : "Full Trust Circle";
            } else if (recommendationToEdit.publish_scope)
                initialPublishScope = recommendationToEdit.publish_scope;
            setPublishScope(initialPublishScope);
            setSelectedTrustCircles(
                recommendationToEdit.trust_circle_ids || []
            );
            setMessage("");
            setHoverRating(0);
            setTagInput("");
            setExistingImages(recommendationToEdit.images || []);
        }
    }, [recommendationToEdit]);

    useEffect(() => {
        setInternalUserTrustCircles(userTrustCirclesProp || []);
        setInternalTrustCirclesLoading(trustCirclesLoadingProp || false);
        setInternalTrustCirclesError(trustCirclesErrorProp || "");
    }, [userTrustCirclesProp, trustCirclesLoadingProp, trustCirclesErrorProp]);

    useEffect(() => {
        if (
            publishScope === "Specific Trust Circles" &&
            internalUserTrustCircles.length === 0 &&
            !internalTrustCirclesLoading &&
            !internalTrustCirclesError &&
            fetchUserTrustCirclesFunc
        ) {
            (async () => {
                setInternalTrustCirclesLoading(true);
                setInternalTrustCirclesError("");
                try {
                    const circles = await fetchUserTrustCirclesFunc();
                    setInternalUserTrustCircles(circles || []);
                } catch (err) {
                    setInternalTrustCirclesError(
                        err.message || "Could not load trust circles."
                    );
                    setInternalUserTrustCircles([]);
                } finally {
                    setInternalTrustCirclesLoading(false);
                }
            })();
        }
    }, [
        publishScope,
        internalUserTrustCircles,
        internalTrustCirclesLoading,
        internalTrustCirclesError,
        fetchUserTrustCirclesFunc,
    ]);

    const handleStarClick = (n) => setRatingState(n);
    const handleTagKeyDown = (e) => {
        if (e.key === "Enter" && tagInput.trim()) {
            e.preventDefault();
            const newTag = tagInput.trim().toLowerCase();
            if (newTag && !tags.includes(newTag))
                setTags((prevTags) => [...prevTags, newTag]);
            setTagInput("");
        }
    };
    const removeTag = (tagToRemove) =>
        setTags((prevTags) => prevTags.filter((tag) => tag !== tagToRemove));
    const handlePublishScopeChange = (e) => {
        const newScope = e.target.value;
        setPublishScope(newScope);
        if (newScope !== "Specific Trust Circles") setSelectedTrustCircles([]);
    };
    const handleTrustCircleToggle = (circleId) =>
        setSelectedTrustCircles((prev) =>
            prev.includes(circleId)
                ? prev.filter((id) => id !== circleId)
                : [...prev, circleId]
        );

    const handleImageSelect = (event) => {
        const files = Array.from(event.target.files);

        if (existingImages.length + files.length > 5) {
            setMessage("error:Maximum 5 images allowed");
            return;
        }

        files.forEach((file) => {
            if (file.size > 5 * 1024 * 1024) {
                setMessage("error:Images must be under 5MB");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setImages((prev) => [
                    ...prev,
                    {
                        id: Date.now() + Math.random(),
                        preview: reader.result,
                        file: file,
                    },
                ]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (imageId, isExisting = false) => {
        if (isExisting) {
            setExistingImages((prev) =>
                prev.filter((img) => img.id !== imageId)
            );
        } else {
            setImages((prev) => prev.filter((img) => img.id !== imageId));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (
            !businessName.trim() ||
            !recommenderMessage.trim() ||
            rating === 0
        ) {
            setMessage(
                "error:Provider Name, Your Experience, and Rating are required."
            );
            return;
        }
        if (
            publishScope === "Specific Trust Circles" &&
            selectedTrustCircles.length === 0
        ) {
            setMessage("error:Select trust circles or change publish scope.");
            return;
        }
        setIsSubmitting(true);
        setMessage("");
        const formData = new FormData();

        const jsonData = {
            business_name: businessName.trim(),
            recommender_message: recommenderMessage.trim(),
            rating: rating,
            tags: tags,
            provider_contact_name: providerContactName.trim() || null,
            website: website.trim() || null,
            phone_number: phoneNumber.trim() || null,
            publish_scope: publishScope,
            ...(publishScope === "Specific Trust Circles" && {
                trust_circle_ids: selectedTrustCircles,
            }),
            existingImages: existingImages,
        };

        formData.append("data", JSON.stringify(jsonData));

        // Append new images
        images.forEach((image) => {
            formData.append("images", image.file);
        });

        try {
            const res = await fetch(
                `${apiBaseUrl}/api/recommendations/${recommendationToEdit.id}?user_id=${clerkUserId}&email=${userEmail}`,
                {
                    method: "PUT",
                    body: formData,
                }
            );
            const responseData = await res.json();
            if (!res.ok || !responseData.success)
                throw new Error(
                    responseData.message ||
                        responseData.error ||
                        `Failed to update. Status: ${res.status}`
                );
            setMessage("success:Recommendation updated successfully!");
            if (onSaveSuccess) onSaveSuccess(responseData);
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error) {
            setMessage(`error:${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;
    const requiredFieldsComplete =
        businessName.trim() && recommenderMessage.trim() && rating > 0;

    return (
        <div className="profile-edit-modal-overlay">
            <div className="profile-edit-modal-content">
                <button
                    onClick={onClose}
                    className="profile-edit-modal-close-btn"
                >
                    &times;
                </button>
                <h2 className="profile-edit-modal-title">
                    Edit Your Recommendation
                </h2>
                <form
                    onSubmit={handleSubmit}
                    className="profile-edit-modal-form"
                >
                    <section className="profile-edit-modal-form-section">
                        <h3 className="profile-edit-modal-section-title">
                            <span className="profile-edit-modal-section-number">
                                1
                            </span>
                            Core Details
                        </h3>
                        <div className="profile-edit-modal-form-grid">
                            <div className="profile-edit-modal-form-group span-2">
                                <label htmlFor="editBusinessName">
                                    Service Provider Name *
                                </label>
                                <input
                                    id="editBusinessName"
                                    type="text"
                                    value={businessName}
                                    onChange={(e) =>
                                        setBusinessName(e.target.value)
                                    }
                                    required
                                />
                            </div>
                            <div className="profile-edit-modal-form-group span-2">
                                <label htmlFor="editRecommendationBlurb">
                                    Your Experience *
                                </label>
                                <textarea
                                    id="editRecommendationBlurb"
                                    value={recommenderMessage}
                                    onChange={(e) =>
                                        setRecommenderMessage(e.target.value)
                                    }
                                    required
                                    rows={4}
                                />
                            </div>
                            <div className="profile-edit-modal-form-group span-2 rating-group">
                                <label>Your Rating *</label>
                                <div className="profile-edit-modal-star-rating">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <EditModalStarDisplay
                                            key={n}
                                            active={
                                                n <= (hoverRating || rating)
                                            }
                                            onClick={() => handleStarClick(n)}
                                            onMouseEnter={() =>
                                                setHoverRating(n)
                                            }
                                            onMouseLeave={() =>
                                                setHoverRating(0)
                                            }
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                    <div className="profile-edit-modal-optional-section-wrapper visible">
                        <section className="profile-edit-modal-form-section">
                            <h3 className="profile-edit-modal-section-title">
                                <span className="profile-edit-modal-section-number">
                                    2
                                </span>
                                Additional Info
                            </h3>
                            <div className="profile-edit-modal-form-grid">
                                <div className="profile-edit-modal-form-group">
                                    <label htmlFor="editProviderContactName">
                                        <UserCircleIcon /> Provider Contact
                                    </label>
                                    <input
                                        id="editProviderContactName"
                                        type="text"
                                        value={providerContactName}
                                        onChange={(e) =>
                                            setProviderContactName(
                                                e.target.value
                                            )
                                        }
                                        placeholder="e.g., Jane Doe"
                                    />
                                </div>
                                <div className="profile-edit-modal-form-group">
                                    <label htmlFor="editWebsite">
                                        <GlobeAltIcon /> Website
                                    </label>
                                    <input
                                        id="editWebsite"
                                        type="url"
                                        value={website}
                                        onChange={(e) =>
                                            setWebsite(e.target.value)
                                        }
                                        placeholder="https://provider.com"
                                    />
                                </div>
                                <div className="profile-edit-modal-form-group span-2">
                                    <label htmlFor="editPhoneNumber">
                                        <PhoneIcon /> Phone Number
                                    </label>
                                    <input
                                        id="editPhoneNumber"
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) =>
                                            setPhoneNumber(e.target.value)
                                        }
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                                <div className="profile-edit-modal-form-group span-2 tag-input-group">
                                    <label htmlFor="editTags">
                                        <TagIcon /> Tags (Press Enter)
                                    </label>
                                    <input
                                        id="editTags"
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) =>
                                            setTagInput(e.target.value)
                                        }
                                        onKeyDown={handleTagKeyDown}
                                        placeholder="e.g., reliable, fast"
                                    />
                                    <div className="profile-edit-modal-tag-container">
                                        {tags.map((tag, i) => (
                                            <span
                                                key={i}
                                                className="profile-edit-modal-tag-pill"
                                            >
                                                {tag}
                                                <span
                                                    className="remove-tag"
                                                    onClick={() =>
                                                        removeTag(tag)
                                                    }
                                                >
                                                    ×
                                                </span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>
                        <section className="profile-edit-modal-form-section">
                            <h3 className="profile-edit-modal-section-title">
                                <span className="profile-edit-modal-section-number">
                                    3
                                </span>
                                Share With
                            </h3>
                            <div className="profile-edit-modal-publish-options-grid">
                                {EDIT_MODAL_PUBLISH_OPTIONS.map((option) => (
                                    <label
                                        key={option.value}
                                        className={`profile-edit-modal-publish-option ${
                                            publishScope === option.value
                                                ? "selected"
                                                : ""
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="editPublishScope"
                                            value={option.value}
                                            checked={
                                                publishScope === option.value
                                            }
                                            onChange={handlePublishScopeChange}
                                            className="sr-only"
                                        />
                                        <option.icon className="publish-icon" />
                                        <span>{option.label}</span>
                                        {publishScope === option.value && (
                                            <CheckCircleIcon className="selected-check" />
                                        )}
                                    </label>
                                ))}
                            </div>
                            {publishScope === "Specific Trust Circles" && (
                                <div className="profile-edit-modal-trust-circle-select-wrapper">
                                    <label className="trust-circle-label">
                                        Select specific circles:
                                    </label>
                                    {internalTrustCirclesLoading && (
                                        <div className="loading-trust-circles">
                                            <ArrowPathIcon className="animate-spin h-5 w-5 mr-2 inline" />{" "}
                                            Loading...
                                        </div>
                                    )}
                                    {internalTrustCirclesError &&
                                        !internalTrustCirclesLoading && (
                                            <div className="error-trust-circles">
                                                <XCircleIcon className="h-5 w-5 mr-2 inline text-red-500" />{" "}
                                                {internalTrustCirclesError}{" "}
                                                <button
                                                    type="button"
                                                    onClick={
                                                        fetchUserTrustCirclesFunc
                                                    }
                                                    className="retry-button ml-2"
                                                >
                                                    Retry
                                                </button>
                                            </div>
                                        )}
                                    {!internalTrustCirclesLoading &&
                                        !internalTrustCirclesError &&
                                        internalUserTrustCircles.length > 0 && (
                                            <div className="profile-edit-modal-trust-circle-checkbox-group">
                                                {internalUserTrustCircles.map(
                                                    (circle) => (
                                                        <label
                                                            key={circle.id}
                                                            className="trust-circle-checkbox-item"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                value={
                                                                    circle.id
                                                                }
                                                                checked={selectedTrustCircles.includes(
                                                                    circle.id
                                                                )}
                                                                onChange={() =>
                                                                    handleTrustCircleToggle(
                                                                        circle.id
                                                                    )
                                                                }
                                                            />
                                                            <span>
                                                                {circle.name}
                                                            </span>
                                                        </label>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    {!internalTrustCirclesLoading &&
                                        !internalTrustCirclesError &&
                                        internalUserTrustCircles.length ===
                                            0 && (
                                            <p className="no-trust-circles-message">
                                                No communities found or could
                                                not load.
                                            </p>
                                        )}
                                </div>
                            )}
                        </section>
                    </div>
                    <section className="profile-edit-modal-form-section">
                        <h3 className="profile-edit-modal-section-title">
                            <span className="profile-edit-modal-section-number">
                                4
                            </span>
                            Images
                        </h3>
                        <div className="profile-edit-modal-image-upload-section">
                            <div
                                className="profile-edit-modal-image-dropzone"
                                onClick={() =>
                                    document
                                        .getElementById("edit-image-upload")
                                        .click()
                                }
                            >
                                <PhotoIcon className="profile-edit-modal-image-dropzone-icon" />
                                <span>Click to upload images (up to 5)</span>
                                <input
                                    type="file"
                                    id="edit-image-upload"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    multiple
                                    style={{ display: "none" }}
                                />
                            </div>

                            {(existingImages.length > 0 ||
                                images.length > 0) && (
                                <div className="profile-edit-modal-image-preview-grid">
                                    {existingImages.map((image) => (
                                        <div
                                            key={image.id}
                                            className="profile-edit-modal-image-preview-item"
                                        >
                                            <img
                                                src={getImageSrc(image)}
                                                alt="Preview"
                                            />
                                            <button
                                                type="button"
                                                className="profile-edit-modal-image-preview-remove"
                                                onClick={() =>
                                                    removeImage(image.id, true)
                                                }
                                            >
                                                <XMarkIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {images.map((image) => (
                                        <div
                                            key={image.id}
                                            className="profile-edit-modal-image-preview-item"
                                        >
                                            <img
                                                src={image.preview}
                                                alt="Preview"
                                            />
                                            <button
                                                type="button"
                                                className="profile-edit-modal-image-preview-remove"
                                                onClick={() =>
                                                    removeImage(image.id)
                                                }
                                            >
                                                <XMarkIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <p className="profile-edit-modal-upload-limit-text">
                                {5 - (existingImages.length + images.length)}{" "}
                                more images allowed
                            </p>
                        </div>
                    </section>
                    <div className="profile-edit-modal-button-row">
                        <button
                            type="button"
                            className="profile-edit-modal-btn cancel-btn"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="profile-edit-modal-btn save-btn"
                            disabled={isSubmitting || !requiredFieldsComplete}
                        >
                            {isSubmitting ? "Saving..." : "Save Changes"}{" "}
                            <CheckCircleIcon />
                        </button>
                    </div>
                    {message && (
                        <div
                            className={`profile-edit-modal-message ${
                                message.startsWith("error:")
                                    ? "error"
                                    : "success"
                            }`}
                        >
                            {message.startsWith("error:") ? (
                                <XCircleIcon />
                            ) : (
                                <CheckCircleIcon />
                            )}
                            <span>
                                {message.substring(message.indexOf(":") + 1)}
                            </span>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

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
    const handleShare = () => {
        alert(
            "Share functionality for individual recommendations coming soon!"
        );
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
                    <Link to={`/provider/${providerIdForLink}`} target="_blank" rel="noopener noreferrer" className="clickable provider-name-link" onClick={() => localStorage.setItem("selectedProvider", JSON.stringify(rec))}>
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
        <div className={`achievement-badge-circular ${badge.className}`} title={badge.description}>
            <div className="achievement-badge-icon">{badge.icon}</div>
        </div>
    );
};

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
    const [userScore, setUserScore] = useState(0);
    const ASPECT_RATIO = 1;
    const MIN_DIMENSION = 150;

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
                `${API_URL}/api/connections/check-connections?${queryParams}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: user.primaryEmailAddress?.emailAddress,
                        // user_id: user.id,
                    }),
                }
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
                const scoreResponse = await fetch(`${API_URL}/api/users/preferred-name?email=${encodeURIComponent(user.primaryEmailAddress.emailAddress)}`);
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

    useEffect(() => {
        if (isSignedIn && user) fetchProfileData();
        else if (isLoaded && !isSignedIn) navigate("/");
    }, [isSignedIn, user, isLoaded, fetchProfileData, navigate]);

    useEffect(() => {
        if (baseRecommendations.length > 0 && user?.id) {
            setStatsLoading(true);
            const enrichAndSetRecommendations = async () => {
                const enriched = await Promise.all(
                    baseRecommendations.map(async (rec) => {
                        let communityStats = {
                            average_rating: 0,
                            total_reviews: 0,
                        };
                        const providerIdForData = rec.provider_id || rec.id;

                        if (providerIdForData) {
                            try {
                                const statsRes = await fetch(
                                    `${API_URL}/api/reviews/stats/${providerIdForData}`
                                );
                                if (statsRes.ok) {
                                    const statsData = await statsRes.json();
                                    communityStats.average_rating =
                                        parseFloat(statsData.average_rating) ||
                                        0;
                                    communityStats.total_reviews =
                                        parseInt(statsData.total_reviews, 10) ||
                                        0;
                                }
                            } catch (err) {}
                        }
                        return {
                            ...rec,
                            average_rating: communityStats.average_rating,
                            total_reviews: communityStats.total_reviews,
                            num_likes: parseInt(rec.num_likes, 10) || 0,
                            currentUserLiked: rec.currentUserLiked || false,
                        };
                    })
                );
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
            };
            enrichAndSetRecommendations();
        } else {
            setEnrichedRecommendations([]);
            setLikedRecommendations(new Set());
            if (!loading) setStatsLoading(false);
        }
    }, [baseRecommendations, loading, user]);

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

    const sortedRecommendations = React.useMemo(() => {
        let sortableItems = [...enrichedRecommendations];
        
        // Apply search filter first
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
        
        // Apply city filter
        if (selectedCities.length > 0) {
            sortableItems = sortableItems.filter(item => {
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
    }, [enrichedRecommendations, sortOption, searchQuery, selectedCities]);

    const availableCities = React.useMemo(() => {
        if (!enrichedRecommendations || enrichedRecommendations.length === 0) return [];
        const cities = enrichedRecommendations.map((rec) => rec.city || "Other");
        return Array.from(new Set(cities)).sort((a, b) => a.localeCompare(b));
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
                                            onComplete={(c) => setCompletedCrop(c)}
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
                                            {saving ? "Saving..." : "Save Changes"}
                                        </button>
                                        <button
                                            className="profile-cancel-btn"
                                            onClick={handleEditToggle}
                                            disabled={saving}
                                        >
                                            <XCircleIcon className="btn-icon" /> Cancel
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        className="profile-edit-btn"
                                        onClick={handleEditToggle}
                                    >
                                        <PencilSquareIcon className="btn-icon" /> Edit
                                        Profile
                                    </button>
                                )}
                                <button
                                    className="profile-share-btn-header"
                                    onClick={() => setIsShareModalOpen(true)}
                                    disabled={saving || isEditing}
                                >
                                    <ShareIcon className="btn-icon" />{" "}
                                    Share Profile
                                </button>
                            </div>
                        </div>
                        
                        <div className="profile-contact-info">
                            {profileUserData?.userPhone && (
                                <a 
                                    href={`sms:${profileUserData.userPhone.replace(/\D/g, '')}`} 
                                    className="profile-contact-link phone"
                                    title="Send a text to this number"
                                >
                                    <svg className="contact-icon" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
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
                            <span className="profile-stat-number">{enrichedRecommendations.length}</span>
                            <span className="profile-stat-label">Recommendations</span>
                        </div>
                        <div className="profile-stat-item">
                            <span className="profile-stat-number">{connections.length}</span>
                            <span className="profile-stat-label">Followers</span>
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
                                <AchievementBadge 
                                    recCount={enrichedRecommendations.length} 
                                    onStartRecommending={() => navigate("/share-recommendation")}
                                />
                            </div>
                            <span className="profile-stat-label">
                                {(() => {
                                    const count = enrichedRecommendations.length;
                                    if (count >= 100) return 'Diamond Recommender';
                                    if (count >= 50) return 'Platinum Recommender';
                                    if (count >= 25) return 'Gold Recommender';
                                    if (count >= 10) return 'Silver Recommender';
                                    if (count >= 1) return 'Bronze Recommender';
                                    return 'Start Your Journey';
                                })()}
                            </span>
                            {(() => {
                                const count = enrichedRecommendations.length;
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
                                        {count === 0 ? 'Share your first recommendation!' : `${remaining} more to reach ${nextTier}`}
                                    </span>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </header>
            <main className="profile-content-area">
                <div className="profile-recommendations-header">
                    <div className="profile-recommendations-title-section">
                        <h2>My Recommendations</h2>
                        <div className="profile-recommendations-controls">
                            <button
                                className="profile-add-new-btn"
                                onClick={() => navigate("/share-recommendation")}
                            >
                                <PlusCircleIcon className="btn-icon" /> Add New
                            </button>
                        </div>
                    </div>
                    {enrichedRecommendations.length > 0 && (
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
                            {availableCities.length > 1 && (
                                <div className="profile-city-filter-toggle-section">
                                    <button
                                        className="profile-city-filter-toggle"
                                        onClick={() => setShowCityFilter(!showCityFilter)}
                                    >
                                        <svg className="profile-filter-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                        </svg>
                                        Filter by City
                                        {selectedCities.length > 0 && (
                                            <span className="profile-active-filters-badge">
                                                {selectedCities.length}
                                            </span>
                                        )}
                                        <svg 
                                            className={`profile-filter-chevron ${showCityFilter ? 'rotated' : ''}`} 
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    
                                    {showCityFilter && (
                                        <div className="profile-city-filter-wrapper">
                                            <div className="profile-city-filter-checkboxes">
                                                {availableCities.map((city) => (
                                                    <label key={city} className="profile-city-checkbox-item">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedCities.includes(city)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedCities(prev => [...prev, city]);
                                                                } else {
                                                                    setSelectedCities(prev => prev.filter(c => c !== city));
                                                                }
                                                            }}
                                                        />
                                                        <span className="profile-city-checkbox-label">{city}</span>
                                                        <span className="profile-city-count">
                                                            ({enrichedRecommendations.filter(rec => (rec.city || "Other") === city).length})
                                                        </span>
                                                    </label>
                                                ))}
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
                            {sortedRecommendations.length > 0 && (
                                <span className="profile-recommendations-count">
                                    {searchQuery.trim() || selectedCities.length > 0 ? `${sortedRecommendations.length} of ${enrichedRecommendations.length} recommendations` : `${sortedRecommendations.length} recommendations`}
                                </span>
                            )}
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
                                <MyRecommendationCard
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
                    !error && (
                        (searchQuery.trim() || selectedCities.length > 0) ? (
                            <div className="profile-empty-state no-search-results">
                                <svg className="no-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <p>
                                    No recommendations found
                                    {searchQuery.trim() && ` for "${searchQuery}"`}
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
                                    {selectedCities.length > 0 && (
                                        <button
                                            className="profile-secondary-action-btn"
                                            onClick={() => setSelectedCities([])}
                                        >
                                            Clear City Filters
                                        </button>
                                    )}
                                    {(searchQuery.trim() || selectedCities.length > 0) && (
                                        <button
                                            className="profile-secondary-action-btn"
                                            onClick={() => {
                                                setSearchQuery("");
                                                setSelectedCities([]);
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
                        )
                    )}
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
        </div>
    );
};

export default Profile;
