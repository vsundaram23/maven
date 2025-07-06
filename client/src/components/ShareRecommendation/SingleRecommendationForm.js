// src/components/ShareRecommendation/SingleRecommendationForm.jsx

import React, { useState, useEffect, useCallback } from "react";
import {
    ArrowPathIcon,
    CheckCircleIcon,
    GlobeAltIcon,
    PhoneIcon,
    PhotoIcon,
    SparklesIcon,
    TagIcon,
    UserCircleIcon,
    UsersIcon,
    XCircleIcon,
    XMarkIcon,
    StarIcon as OutlineStarIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as SolidStarIcon } from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";
import {
    API_URL,
    INTRO_TEXT,
    TYPEWRITER_SPEED,
    PUBLISH_OPTIONS,
} from "../../utils/constants";
import PlaceAutocompleteInput from "../PlacesAutocomplete/PlacesAutocomplete";

// Helper function (moved here as per your request not to create separate utils/helpers.js)
const processTags = (tagString) => {
    if (!tagString) return [];
    const processedTags = tagString
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0);
    return [...new Set(processedTags)];
};

// StarDisplay component (moved here as per your request not to create separate components/Common/StarDisplay.jsx)
const StarDisplay = ({ active, onClick }) => {
    const eventHandlers = {
        onClick: onClick,
        onTouchEnd: (e) => {
            e.preventDefault();
            onClick();
        },
    };

    if (active) {
        return (
            <SolidStarIcon
                className="star-icon filled"
                {...eventHandlers}
                aria-hidden="true"
            />
        );
    }
    return (
        <OutlineStarIcon
            className="star-icon"
            {...eventHandlers}
            aria-hidden="true"
        />
    );
};

// MessageDisplay component (moved here as per your request not to create separate components/Common/MessageDisplay.jsx)
const MessageDisplay = ({ message }) => {
    if (!message) return null;

    const isError = message.startsWith("error:");
    const displayMessage = message.substring(message.indexOf(":") + 1);

    return (
        <div className={`message ${isError ? "error" : "success"} visible`}>
            {isError ? <XCircleIcon /> : <CheckCircleIcon />}
            <span>{displayMessage}</span>
        </div>
    );
};

export default function SingleRecommendationForm({ userEmail, navigate }) {
    const google_api_key = "AIzaSyBxRfRgSI7wTeLc4LuBIWSlbv7wpOe49Pc";

    const [typewriterText, setTypewriterText] = useState("");
    const [typewriterIndex, setTypewriterIndex] = useState(0);

    const [businessName, setBusinessName] = useState("");
    const [providerContactName, setProviderContactName] = useState("");
    const [recommendationBlurb, setRecommendationBlurb] = useState("");
    const [rating, setRating] = useState(0);
    const [website, setWebsite] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [tagInput, setTagInput] = useState("");
    const [tags, setTags] = useState([]);
    const [publishScope, setPublishScope] = useState("Full Trust Circle");
    const [selectedTrustCircles, setSelectedTrustCircles] = useState([]);
    const [userTrustCircles, setUserTrustCircles] = useState([]);
    const [trustCirclesLoading, setTrustCirclesLoading] = useState(false);
    const [trustCirclesError, setTrustCirclesError] = useState("");

    const [selectedPlace, setSelectedPlace] = useState(null);

    // Function to handle when a place is selected from the autocomplete suggestions
    const handlePlaceSelect = (place) => {
        setSelectedPlace(place);
        console.log("Selected Place:", place);
        // You can add further logic here, e.g., display the place on a map
    };

    // Function to handle business name changes (both from autocomplete and custom input)
    const handleBusinessNameChange = (value) => {
        setBusinessName(value);
    };

    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const [images, setImages] = useState([]);

    const [uploadState, setUploadState] = useState({
        isUploading: false,
        progress: 0,
    });

    useEffect(() => {
        setTypewriterIndex(0);
        setTypewriterText("");
    }, []); // Only run on mount for typewriter effect on single form

    useEffect(() => {
        if (typewriterIndex < INTRO_TEXT.length) {
            const timeoutId = setTimeout(() => {
                setTypewriterText(
                    (prev) => prev + INTRO_TEXT.charAt(typewriterIndex)
                );
                setTypewriterIndex((prev) => prev + 1);
            }, TYPEWRITER_SPEED);
            return () => clearTimeout(timeoutId);
        }
        if (typewriterIndex >= INTRO_TEXT.length) {
            const cursor = document.querySelector(
                "#share-recommendation-page .intro-typewriter .cursor"
            );
            if (cursor) cursor.style.animation = "none";
        }
    }, [typewriterIndex]);

    const fetchUserTrustCircles = useCallback(async () => {
        if (!userEmail) return;
        setTrustCirclesLoading(true);
        setTrustCirclesError("");
        try {
            const email = encodeURIComponent(userEmail);
            const myCommRes = await fetch(
                `${API_URL}/api/communities/user/${email}/communities`
            );
            if (!myCommRes.ok) {
                const errorData = await myCommRes.json().catch(() => ({
                    message: "Failed to fetch your trust circles.",
                }));
                throw new Error(
                    errorData.message || "Failed to fetch your trust circles."
                );
            }
            const myCommData = await myCommRes.json();
            if (Array.isArray(myCommData)) {
                const uniqueMyComms = [];
                const seenIds = new Set();
                for (const community of myCommData) {
                    if (
                        community &&
                        community.id &&
                        !seenIds.has(community.id)
                    ) {
                        uniqueMyComms.push({
                            id: community.id,
                            name: community.name,
                        });
                        seenIds.add(community.id);
                    }
                }
                setUserTrustCircles(uniqueMyComms);
            } else {
                setUserTrustCircles([]);
            }
        } catch (err) {
            setTrustCirclesError(
                err.message || "Could not load your trust circles."
            );
            setUserTrustCircles([]);
        } finally {
            setTrustCirclesLoading(false);
        }
    }, [userEmail]);

    useEffect(() => {
        fetchUserTrustCircles();
    }, [fetchUserTrustCircles]);

    const resetForm = () => {
        setBusinessName("");
        setProviderContactName("");
        setRecommendationBlurb("");
        setRating(0);
        setWebsite("");
        setPhoneNumber("");
        setTagInput("");
        setTags([]);
        setPublishScope("Full Trust Circle");
        setSelectedTrustCircles([]);
        setMessage("");
        setTypewriterIndex(0); // Reset typewriter
        setTypewriterText("");
        setImages([]);
    };

    const requiredFieldsComplete =
        businessName.trim() && recommendationBlurb.trim() && rating > 0;

    const handleStarClick = (n) => setRating(n);

    const handleTagInputChange = (e) => {
        const value = e.target.value;
        if (value.includes(",")) {
            const parts = value.split(",");
            const lastPart = parts.pop();
            const tagsToAdd = parts
                .map((tag) => tag.trim().toLowerCase())
                .filter((tag) => tag && !tags.includes(tag));
            if (tagsToAdd.length > 0) {
                setTags([...tags, ...tagsToAdd]);
            }
            setTagInput(lastPart);
        } else {
            setTagInput(value);
        }
    };

    const handleTagKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (!tagInput.trim()) return;
            const newTags = tagInput
                .split(",")
                .map((tag) => tag.trim().toLowerCase())
                .filter((tag) => tag && !tags.includes(tag));
            if (newTags.length > 0) {
                setTags([...tags, ...newTags]);
            }
            setTagInput("");
        }
    };

    const removeTag = (tagToRemove) => {
        setTags((prevTags) => prevTags.filter((tag) => tag !== tagToRemove));
    };

    const handlePublishScopeChange = (e) => {
        const newScope = e.target.value;
        setPublishScope(newScope);
        if (newScope !== "Specific Trust Circles") {
            setSelectedTrustCircles([]);
        } else {
            if (
                userTrustCircles.length === 0 &&
                !trustCirclesLoading &&
                !trustCirclesError
            ) {
                fetchUserTrustCircles();
            }
        }
    };

    const handleTrustCircleToggle = (circleId) => {
        setSelectedTrustCircles((prev) =>
            prev.includes(circleId)
                ? prev.filter((id) => id !== circleId)
                : [...prev, circleId]
        );
    };

    const handleImageSelect = (event) => {
        const files = Array.from(event.target.files);

        if (images.length + files.length > 5) {
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

    const removeImage = (imageId) => {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!requiredFieldsComplete) {
            setMessage(
                "error:Please fill out all required fields: Recommendation Name, Your Experience, and Your Rating."
            );
            return;
        }

        if (
            publishScope === "Specific Trust Circles" &&
            selectedTrustCircles.length === 0
        ) {
            setMessage(
                "error:Please select at least one specific trust circle to share with, or choose a different publish scope."
            );
            return;
        }

        setIsSubmitting(true);
        setMessage("");
        setUploadState({ isUploading: true, progress: 0 });
        setShowSuccessModal(true);

        const formData = new FormData();

        // Add all JSON data as a single stringified field
        const jsonData = {
            user_email: userEmail,
            business_name: businessName.trim(),
            provider_contact_name: providerContactName.trim() || null,
            recommender_message: recommendationBlurb,
            rating: rating,
            website: website.trim() || null,
            phone_number: phoneNumber.trim() || null,
            tags: tags,
            publish_scope: publishScope,
            ...(publishScope === "Specific Trust Circles" && {
                trust_circle_ids: selectedTrustCircles,
            }),
        };

        formData.append("data", JSON.stringify(jsonData));

        images.forEach((image) => {
            formData.append("images", image.file);
        });

        try {
            const res = await fetch(`${API_URL}/api/recommendations`, {
                method: "POST",
                body: formData, // Don't set Content-Type header, let browser handle it for multipart/form-data
            });

            if (!res.ok) {
                const errorData = await res
                    .json()
                    .catch(() => ({ message: "Network or server error" }));
                throw new Error(
                    errorData.message ||
                        `Request failed with status ${res.status}`
                );
            }

            // Just set isUploading to false on success
            setUploadState((prev) => ({ ...prev, isUploading: false }));
        } catch (error) {
            setMessage(`error:${error.message}`);
            setShowSuccessModal(false);
            setUploadState({ isUploading: false, progress: 0 });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddAnother = () => {
        setShowSuccessModal(false);
        resetForm();
    };

    const handleGoHome = () => {
        setShowSuccessModal(false);
        navigate("/");
    };

    return (
        <>
            <div className="intro-typewriter">
                <SparklesIcon className="intro-icon" />
                <p>
                    {typewriterText}
                    <span className="cursor"></span>
                </p>
            </div>
            <form onSubmit={handleSubmit} className="recommendation-form">
                <section className="form-section required-section">
                    <h2 className="section-title">
                        <span className="section-number">1</span>Core Details
                    </h2>
                    <div className="form-grid">
                        <div className="form-group span-2">
                            <label htmlFor="businessName">
                                Recommendation Name *
                            </label>
                            <PlaceAutocompleteInput
                                value={businessName}
                                onChange={handleBusinessNameChange}
                                onPlaceSelect={handlePlaceSelect}
                                placeholder="e.g., Stellar Plumbing Co. or 'The Great Gatsby' book"
                                allowCustomInput={true}
                                className={businessName ? "has-value" : ""}
                            />
                        </div>
                        <div className="form-group span-2 rating-group">
                            <label>Your Rating *</label>
                            <div className="star-rating">
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <StarDisplay
                                        key={n}
                                        active={n <= rating}
                                        onClick={() => handleStarClick(n)}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="form-group span-2">
                            <label htmlFor="recommendationBlurb">
                                Your Experience *
                            </label>
                            <textarea
                                id="recommendationBlurb"
                                placeholder="What made them great? (Service used, timing, price thoughts, etc.)"
                                value={recommendationBlurb}
                                onChange={(e) =>
                                    setRecommendationBlurb(e.target.value)
                                }
                                onBlur={(e) =>
                                    setRecommendationBlurb(e.target.value)
                                }
                                required
                                rows={5}
                                className={
                                    recommendationBlurb ? "has-value" : ""
                                }
                            />
                        </div>
                    </div>
                </section>
                <div
                    className={`optional-section-wrapper ${
                        requiredFieldsComplete ? "visible" : ""
                    }`}
                >
                    <div className="optional-section-intro">
                        <SparklesIcon className="intro-icon mini" /> Nicely
                        done! Add extra details? (Optional)
                    </div>
                    <section className="form-section optional-section">
                        <h2 className="section-title">
                            <span className="section-number">2</span>Additional
                            Info
                        </h2>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="providerContactName">
                                    <UserCircleIcon /> Provider Contact Name
                                </label>
                                <input
                                    id="providerContactName"
                                    type="text"
                                    placeholder="e.g., Jane Doe"
                                    value={providerContactName}
                                    onChange={(e) =>
                                        setProviderContactName(e.target.value)
                                    }
                                    className={
                                        providerContactName ? "has-value" : ""
                                    }
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="website">
                                    <GlobeAltIcon /> Website
                                </label>
                                <input
                                    id="website"
                                    type="url"
                                    placeholder="https://provider.com"
                                    value={website}
                                    onChange={(e) => setWebsite(e.target.value)}
                                    className={website ? "has-value" : ""}
                                />
                            </div>
                            <div className="form-group span-2">
                                <label htmlFor="phoneNumber">
                                    <PhoneIcon /> Phone Number
                                </label>
                                <input
                                    id="phoneNumber"
                                    type="tel"
                                    placeholder="(555) 123-4567"
                                    value={phoneNumber}
                                    onChange={(e) =>
                                        setPhoneNumber(e.target.value)
                                    }
                                    className={phoneNumber ? "has-value" : ""}
                                />
                            </div>
                            <div className="form-group span-2 tag-input-group">
                                <label htmlFor="tags">
                                    <TagIcon /> Tags (Press Enter)
                                </label>
                                <input
                                    id="tags"
                                    type="text"
                                    value={tagInput}
                                    onChange={handleTagInputChange}
                                    onKeyDown={handleTagKeyDown}
                                    placeholder="e.g., reliable, fast, good value"
                                />
                                <div className="tag-container">
                                    {tags.map((tag, i) => (
                                        <span key={i} className="tag-pill">
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
                        </div>
                    </section>
                    <section className="form-section optional-section">
                        <h2 className="section-title">
                            <span className="section-number">3</span>Upload
                            Images
                        </h2>
                        <div className="image-upload-section">
                            <div
                                className="image-dropzone"
                                onClick={() =>
                                    document
                                        .getElementById("image-upload")
                                        .click()
                                }
                            >
                                <div className="image-dropzone-content">
                                    <PhotoIcon className="image-dropzone-icon" />
                                    <span className="image-dropzone-text">
                                        Click to upload images (up to 5)
                                    </span>
                                    <span className="image-dropzone-text secondary">
                                        JPG, PNG or WebP (max. 5MB each)
                                    </span>
                                </div>
                                <input
                                    type="file"
                                    id="image-upload"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleImageSelect}
                                    multiple
                                    style={{ display: "none" }}
                                />
                            </div>

                            {images.length > 0 && (
                                <div className="image-preview-grid">
                                    {images.map((image) => (
                                        <div
                                            key={image.id}
                                            className="image-preview-item"
                                        >
                                            <img
                                                src={image.preview}
                                                alt="Upload preview"
                                            />
                                            <button
                                                className="image-preview-remove"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    removeImage(image.id);
                                                }}
                                                type="button"
                                            >
                                                <XMarkIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {images.length > 0 && (
                                <p className="upload-limit-text">
                                    {5 - images.length} more image
                                    {5 - images.length !== 1 ? "s" : ""} allowed
                                </p>
                            )}
                        </div>
                    </section>
                    <section className="form-section publish-section">
                        <h2 className="section-title">
                            <span className="section-number">4</span>Share With
                        </h2>
                        <div className="publish-options-grid">
                            {PUBLISH_OPTIONS.map((option) => (
                                <label
                                    key={option.value}
                                    className={`publish-option ${
                                        publishScope === option.value
                                            ? "selected"
                                            : ""
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="publishScope"
                                        value={option.value}
                                        checked={publishScope === option.value}
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
                            <div className="trust-circle-select-wrapper">
                                <label
                                    htmlFor="trustCircleSelect"
                                    className="trust-circle-label"
                                >
                                    Select specific circles:
                                </label>
                                {trustCirclesLoading && (
                                    <div className="loading-trust-circles">
                                        <ArrowPathIcon className="animate-spin h-5 w-5 mr-2 inline" />{" "}
                                        Loading your communities...
                                    </div>
                                )}
                                {trustCirclesError && !trustCirclesLoading && (
                                    <div className="error-trust-circles">
                                        <XCircleIcon className="h-5 w-5 mr-2 inline text-red-500" />{" "}
                                        {trustCirclesError}
                                        <button
                                            onClick={fetchUserTrustCircles}
                                            className="retry-button ml-2"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                )}
                                {!trustCirclesLoading &&
                                    !trustCirclesError &&
                                    userTrustCircles.length > 0 && (
                                        <div className="trust-circle-checkbox-group">
                                            {userTrustCircles.map((circle) => (
                                                <label
                                                    key={circle.id}
                                                    className="trust-circle-checkbox-item"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        value={circle.id}
                                                        checked={selectedTrustCircles.includes(
                                                            circle.id
                                                        )}
                                                        onChange={() =>
                                                            handleTrustCircleToggle(
                                                                circle.id
                                                            )
                                                        }
                                                    />
                                                    <span>{circle.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                {!trustCirclesLoading &&
                                    !trustCirclesError &&
                                    userTrustCircles.length === 0 && (
                                        <p className="no-trust-circles-message">
                                            You are not part of any communities,
                                            or we couldn't load them.{" "}
                                            <a
                                                href="/trustcircles"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    navigate("/trustcircles");
                                                }}
                                                className="text-blue-600 hover:underline"
                                            >
                                                Manage your Trust Circles
                                            </a>{" "}
                                            or try again.
                                        </p>
                                    )}
                            </div>
                        )}
                    </section>
                </div>
                <div className="button-row">
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting || showSuccessModal}
                    >
                        {isSubmitting ? "Sharing..." : "Share Recommendation"}
                        <CheckCircleIcon />
                    </button>
                </div>
                {message && !showSuccessModal && (
                    <MessageDisplay message={message} />
                )}
            </form>

            {showSuccessModal && (
                <div className="success-modal-overlay">
                    <div className="success-modal">
                        {uploadState.isUploading ? (
                            <>
                                <div className="loading-spinner">
                                    <ArrowPathIcon className="animate-spin h-12 w-12" />
                                </div>
                                <h3>Uploading Recommendation...</h3>
                                <p>
                                    Please wait while we process your
                                    submission.
                                </p>
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon className="success-modal-icon" />
                                <h3>Recommendation Submitted!</h3>
                                <p>
                                    Your recommendation has been shared
                                    successfully.
                                </p>
                                <p className="modal-question">
                                    Would you like to submit another one?
                                </p>
                                <div className="success-modal-actions">
                                    <button
                                        onClick={handleAddAnother}
                                        className="btn btn-secondary modal-btn"
                                    >
                                        Yes, Add Another
                                    </button>
                                    <button
                                        onClick={handleGoHome}
                                        className="btn btn-primary modal-btn"
                                    >
                                        No
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
