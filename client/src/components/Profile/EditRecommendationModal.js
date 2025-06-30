import React, { useState, useEffect } from "react";
import {
    UsersIcon as UsersIconSolid,
    UserCircleIcon,
    GlobeAltIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
    TagIcon,
    PhotoIcon,
    XMarkIcon,
    PhoneIcon,
} from "@heroicons/react/24/outline";

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

const EditModalStarDisplay = ({
    active,
    onClick,
    onMouseEnter,
    onMouseLeave,
}) => {
    if (active) {
        return (
            <svg
                className="profile-edit-modal-star-icon filled"
                onClick={onClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="currentColor"
                width={24}
                height={24}
            >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.388 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.388-2.46a1 1 0 00-1.176 0l-3.388 2.46c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118l-3.388-2.46c-.783-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.967z" />
            </svg>
        );
    }
    return (
        <svg
            className="profile-edit-modal-star-icon"
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            width={24}
            height={24}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.388 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.388-2.46a1 1 0 00-1.176 0l-3.388 2.46c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118l-3.388-2.46c-.783-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.967z"
            />
        </svg>
    );
};

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
            setRatingState(
                recommendationToEdit.initial_rating ||
                    recommendationToEdit.rating ||
                    0
            );
            setTags(recommendationToEdit.tags || []);
            setProviderContactName(
                recommendationToEdit.provider_contact_name ||
                    recommendationToEdit.business_contact ||
                    ""
            );
            setWebsite(recommendationToEdit.website || "");
            setPhoneNumber(recommendationToEdit.phone_number || "");
            let initialPublishScope = "Full Trust Circle";
            let initialSelectedCircles = [];

            switch (recommendationToEdit.visibility) {
                case "public":
                    initialPublishScope = "Public";
                    break;
                case "connections":
                    initialPublishScope = "Full Trust Circle";
                    break;
                case "communities":
                    initialPublishScope = "Specific Trust Circles";
                    if (Array.isArray(recommendationToEdit.trust_circle_ids)) {
                        initialSelectedCircles =
                            recommendationToEdit.trust_circle_ids;
                    }
                    break;
                default:
                    if (recommendationToEdit.publish_scope) {
                        initialPublishScope =
                            recommendationToEdit.publish_scope;
                        if (
                            initialPublishScope === "Specific Trust Circles" &&
                            Array.isArray(recommendationToEdit.trust_circle_ids)
                        ) {
                            initialSelectedCircles =
                                recommendationToEdit.trust_circle_ids;
                        }
                    } else if (
                        recommendationToEdit.visibility === "connections" &&
                        Array.isArray(recommendationToEdit.trust_circle_ids) &&
                        recommendationToEdit.trust_circle_ids.length > 0
                    ) {
                        initialPublishScope = "Specific Trust Circles";
                        initialSelectedCircles =
                            recommendationToEdit.trust_circle_ids;
                    }
                    break;
            }

            setPublishScope(initialPublishScope);
            setSelectedTrustCircles(initialSelectedCircles);

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
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            processTagInput();
        }
    };

    const processTagInput = () => {
        if (!tagInput.trim()) return;
        const newTags = tagInput
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag && !tags.includes(tag));
        if (newTags.length > 0) {
            setTags([...tags, ...newTags]);
        }
        setTagInput("");
    };

    const handleTagInputBlur = () => {
        if (tagInput.includes(",")) {
            processTagInput();
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
                                        onBlur={handleTagInputBlur}
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

export default EditRecommendationModal;
