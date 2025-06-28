// src/components/ShareRecommendation/ListRecommendationForm.jsx

import React, { useState } from "react";
import {
    ArrowPathIcon,
    CheckCircleIcon,
    DocumentTextIcon,
    GlobeAltIcon,
    PhoneIcon,
    PhotoIcon,
    PlusCircleIcon,
    SparklesIcon,
    TagIcon,
    UserCircleIcon,
    XCircleIcon,
    StarIcon as OutlineStarIcon,
    UsersIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as SolidStarIcon } from "@heroicons/react/24/solid";
import { API_URL } from "../../utils/constants";
import { useNavigate } from "react-router-dom";

// Helper function (moved here as per your request)
const processTags = (tagString) => {
    if (!tagString) return [];
    const processedTags = tagString
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0);
    return [...new Set(processedTags)];
};

// StarDisplay component (moved here as per your request)
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

// MessageDisplay component (moved here as per your request)
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

export default function ListRecommendationForm({
    userEmail,
    userId,
    navigate,
}) {
    const [listTitle, setListTitle] = useState("");
    const [listDescription, setListDescription] = useState("");
    const [listRecommendations, setListRecommendations] = useState([
        {
            businessName: "",
            recommendationBlurb: "",
            rating: 0,
            providerContactName: "",
            website: "",
            phoneNumber: "",
            tagInput: "",
            tags: [],
            showOptional: false,
            images: [], // Images not supported for list items in original code
        },
    ]);
    const [dragActive, setDragActive] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [publishScope, setPublishScope] = useState("Entire Trust Circle");
    const [selectedTrustCircles, setSelectedTrustCircles] = useState([]);
    const [userTrustCircles, setUserTrustCircles] = useState([]);
    const [trustCirclesLoading, setTrustCirclesLoading] = useState(false);
    const [trustCirclesError, setTrustCirclesError] = useState("");

    const handleListRecChange = (idx, field, value) => {
        setListRecommendations((prev) =>
            prev.map((rec, i) => (i === idx ? { ...rec, [field]: value } : rec))
        );
    };

    const handleListTagInputChange = (idx, e) => {
        const value = e.target.value;
        if (value.includes(",")) {
            const parts = value.split(",");
            const lastPart = parts.pop();
            const tagsToAdd = parts
                .map((tag) => tag.trim().toLowerCase())
                .filter(
                    (tag) => tag && !listRecommendations[idx].tags.includes(tag)
                );
            setListRecommendations((prev) =>
                prev.map((rec, i) =>
                    i === idx
                        ? {
                              ...rec,
                              tags: [...rec.tags, ...tagsToAdd],
                              tagInput: lastPart,
                          }
                        : rec
                )
            );
        } else {
            setListRecommendations((prev) =>
                prev.map((rec, i) =>
                    i === idx ? { ...rec, tagInput: value } : rec
                )
            );
        }
    };

    const handleListTagKeyDown = (idx, e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (!listRecommendations[idx].tagInput.trim()) return;
            const newTags = listRecommendations[idx].tagInput
                .split(",")
                .map((tag) => tag.trim().toLowerCase())
                .filter(
                    (tag) => tag && !listRecommendations[idx].tags.includes(tag)
                );
            setListRecommendations((prev) =>
                prev.map((rec, i) =>
                    i === idx
                        ? {
                              ...rec,
                              tags: [...rec.tags, ...newTags],
                              tagInput: "",
                          }
                        : rec
                )
            );
        }
    };

    const removeListTag = (idx, tagToRemove) => {
        setListRecommendations((prev) =>
            prev.map((rec, i) =>
                i === idx
                    ? {
                          ...rec,
                          tags: rec.tags.filter((tag) => tag !== tagToRemove),
                      }
                    : rec
            )
        );
    };

    const addListRecommendation = () => {
        setListRecommendations((prev) => [
            ...prev,
            {
                businessName: "",
                recommendationBlurb: "",
                rating: 0,
                providerContactName: "",
                website: "",
                phoneNumber: "",
                tagInput: "",
                tags: [],
                showOptional: false,
                images: [],
            },
        ]);
    };

    const removeListRecommendation = (idx) => {
        setListRecommendations((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleListDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        setMessage(
            "info:CSV import for lists is not yet implemented. Please use the CSV Import tab."
        );
    };

    const handleListDragOver = (e) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleListDragLeave = (e) => {
        e.preventDefault();
        setDragActive(false);
    };

    const handleSubmitList = async (e) => {
        e.preventDefault();
        if (!listTitle.trim()) {
            setMessage("error:Please provide a name for your list.");
            return;
        }
        for (const rec of listRecommendations) {
            if (
                !rec.businessName.trim() ||
                !rec.recommendationBlurb.trim() ||
                !rec.rating
            ) {
                setMessage(
                    "error:Please fill out all required fields for each recommendation."
                );
                return;
            }
        }
        setIsSubmitting(true);
        setMessage("");
        setShowSuccessModal(true); // Show modal immediately

        try {
            // 1. Create each review (recommendation) and collect their IDs
            const reviewIds = [];
            for (const rec of listRecommendations) {
                const mappedPublishScope =
                    publishScope === "Entire Trust Circle"
                        ? "Full Trust Circle"
                        : publishScope;

                const reviewData = {
                    user_email: userEmail,
                    business_name: rec.businessName.trim(),
                    provider_contact_name:
                        rec.providerContactName.trim() || null,
                    recommender_message: rec.recommendationBlurb,
                    rating: rec.rating,
                    website: rec.website.trim() || null,
                    phone_number: rec.phoneNumber.trim() || null,
                    tags: rec.tags,
                    publish_scope: publishScope,
                    ...(mappedPublishScope === "Specific Trust Circles" && {
                        trust_circle_ids: selectedTrustCircles,
                    }),
                };
                const formData = new FormData();
                formData.append("data", JSON.stringify(reviewData));
                // Append images if they exist
                if (rec.images && rec.images.length > 0) {
                    rec.images.forEach((image) => {
                        formData.append("images", image.file);
                    });
                }

                const res = await fetch(`${API_URL}/api/recommendations`, {
                    method: "POST",
                    body: formData,
                });
                const data = await res.json();
                if (!res.ok || !data.reviewId) {
                    throw new Error(data.message || "Failed to create review");
                }
                reviewIds.push(data.reviewId); // <-- use reviewId, not providerId
            }

            // 2. Create the list with the collected review IDs
            const listRes = await fetch(
                `${API_URL}/api/recommendations/lists`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: listTitle,
                        description: listDescription,
                        reviewIds,
                        user_id: userId,
                        email: userEmail,
                    }),
                }
            );
            const listData = await listRes.json();
            if (!listRes.ok || !listData.success) {
                throw new Error(listData.message || "Failed to create list");
            }

            setIsSubmitting(false); // Stop submitting state
            // setShowSuccessModal(true); // Already true
            setMessage("success:List created successfully!");
        } catch (err) {
            setIsSubmitting(false);
            setMessage("error:" + err.message);
            setShowSuccessModal(false); // Hide modal on error
        }
    };

    const handleAddAnother = () => {
        setShowSuccessModal(false);
        setListTitle("");
        setListDescription("");
        setListRecommendations([
            {
                businessName: "",
                recommendationBlurb: "",
                rating: 0,
                providerContactName: "",
                website: "",
                phoneNumber: "",
                tagInput: "",
                tags: [],
                showOptional: false,
                images: [],
            },
        ]);
        setPublishScope("Entire Trust Circle");
        setSelectedTrustCircles([]);
        setMessage("");
    };

    const handleGoHome = () => {
        setShowSuccessModal(false);
        navigate("/");
    };

    const fetchUserTrustCircles = async () => {
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

    const handleListImageSelect = (idx, event) => {
        const files = Array.from(event.target.files);

        setListRecommendations((prev) =>
            prev.map((rec, i) => {
                if (i !== idx) return rec;
                if ((rec.images?.length || 0) + files.length > 5) {
                    setMessage(
                        "error:Maximum 5 images allowed per recommendation"
                    );
                    return rec;
                }
                const newImages = [];
                files.forEach((file) => {
                    if (file.size > 5 * 1024 * 1024) {
                        setMessage("error:Images must be under 5MB");
                        return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setListRecommendations((prev2) =>
                            prev2.map((r2, j) =>
                                j === idx
                                    ? {
                                          ...r2,
                                          images: [
                                              ...(r2.images || []),
                                              {
                                                  id:
                                                      Date.now() +
                                                      Math.random(),
                                                  preview: reader.result,
                                                  file: file,
                                              },
                                          ],
                                      }
                                    : r2
                            )
                        );
                    };
                    reader.readAsDataURL(file);
                });
                return rec;
            })
        );
    };

    const removeListImage = (idx, imageId) => {
        setListRecommendations((prev) =>
            prev.map((rec, i) =>
                i === idx
                    ? {
                          ...rec,
                          images: rec.images.filter(
                              (img) => img.id !== imageId
                          ),
                      }
                    : rec
            )
        );
    };

    return (
        <form onSubmit={handleSubmitList}>
            <div className="list-form">
                <h2>Share Recommendations as a List</h2>
                <p>
                    You can upload a document or create a list manually. Each
                    list can contain up to 10 recommendations.
                </p>

                {/* Drag & Drop Area */}
                <div
                    className={`list-dropzone${dragActive ? " active" : ""}`}
                    onDrop={handleListDrop}
                    onDragOver={handleListDragOver}
                    onDragLeave={handleListDragLeave}
                    tabIndex={0}
                >
                    <DocumentTextIcon className="csv-icon" />
                    <span>
                        Drag &amp; drop your document here, or{" "}
                        <label htmlFor="listFile" className="file-upload-label">
                            <span className="file-upload-link">
                                choose a file
                            </span>
                            <input
                                type="file"
                                id="listFile"
                                style={{ display: "none" }}
                                // onChange={handleListFile}
                            />
                        </label>
                    </span>
                </div>

                <div className="list-divider">
                    <span>OR</span>
                </div>

                {/* Manual List Creation */}
                <div className="manual-list-section">
                    <label className="list-title-label">
                        List Title *
                        <input
                            type="text"
                            className="list-title-input"
                            placeholder="e.g., My Favorite Home Pros"
                            value={listTitle}
                            onChange={(e) => setListTitle(e.target.value)}
                            required
                        />
                    </label>
                    <label className="list-description-label">
                        List Description (optional)
                        <textarea
                            className="list-description-input"
                            placeholder="Describe this list (optional)"
                            value={listDescription}
                            onChange={(e) => setListDescription(e.target.value)}
                            rows={2}
                            style={{ marginBottom: "1rem" }}
                        />
                    </label>

                    <div className="list-recommendations-list">
                        {listRecommendations.map((rec, idx) => {
                            const requiredComplete =
                                rec.businessName.trim() &&
                                rec.recommendationBlurb.trim() &&
                                rec.rating > 0;
                            return (
                                <div
                                    className="list-recommendation-card"
                                    key={idx}
                                >
                                    <div
                                        className="form-section required-section"
                                        style={{
                                            padding: 0,
                                            boxShadow: "none",
                                            border: "none",
                                            background: "none",
                                        }}
                                    >
                                        <div className="form-group">
                                            <label>
                                                Recommendation Name *
                                                <input
                                                    type="text"
                                                    value={rec.businessName}
                                                    onChange={(e) =>
                                                        handleListRecChange(
                                                            idx,
                                                            "businessName",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="e.g., Stellar Plumbing Co."
                                                    required
                                                />
                                            </label>
                                        </div>
                                        <div className="form-group rating-group">
                                            <label>Your Rating *</label>
                                            <div className="star-rating">
                                                {[1, 2, 3, 4, 5].map((n) => (
                                                    <StarDisplay
                                                        key={n}
                                                        active={n <= rec.rating}
                                                        onClick={() =>
                                                            handleListRecChange(
                                                                idx,
                                                                "rating",
                                                                n
                                                            )
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>
                                                Your Experience *
                                                <textarea
                                                    value={
                                                        rec.recommendationBlurb
                                                    }
                                                    onChange={(e) =>
                                                        handleListRecChange(
                                                            idx,
                                                            "recommendationBlurb",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="What made them great?"
                                                    required
                                                    rows={3}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                    <div
                                        className={`optional-section-wrapper ${
                                            requiredComplete ? "visible" : ""
                                        }`}
                                    >
                                        <div className="optional-section-intro">
                                            <SparklesIcon className="intro-icon mini" />{" "}
                                            Nicely done! Add extra details?
                                            (Optional)
                                        </div>
                                        <section
                                            className="form-section optional-section"
                                            style={{
                                                padding: 0,
                                                boxShadow: "none",
                                                border: "none",
                                                background: "none",
                                            }}
                                        >
                                            <div className="form-grid">
                                                <div className="form-group">
                                                    <label>
                                                        <UserCircleIcon />{" "}
                                                        Provider Contact Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={
                                                            rec.providerContactName
                                                        }
                                                        onChange={(e) =>
                                                            handleListRecChange(
                                                                idx,
                                                                "providerContactName",
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="e.g., Jane Doe"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>
                                                        <GlobeAltIcon /> Website
                                                    </label>
                                                    <input
                                                        type="url"
                                                        value={rec.website}
                                                        onChange={(e) =>
                                                            handleListRecChange(
                                                                idx,
                                                                "website",
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="https://provider.com"
                                                    />
                                                </div>
                                                <div className="form-group span-2">
                                                    <label>
                                                        <PhoneIcon /> Phone
                                                        Number
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        value={rec.phoneNumber}
                                                        onChange={(e) =>
                                                            handleListRecChange(
                                                                idx,
                                                                "phoneNumber",
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="(555) 123-4567"
                                                    />
                                                </div>
                                                <div className="form-group span-2 tag-input-group">
                                                    <label>
                                                        <TagIcon /> Tags (Press
                                                        Enter)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={
                                                            rec.tagInput || ""
                                                        }
                                                        onChange={(e) =>
                                                            handleListTagInputChange(
                                                                idx,
                                                                e
                                                            )
                                                        }
                                                        onKeyDown={(e) =>
                                                            handleListTagKeyDown(
                                                                idx,
                                                                e
                                                            )
                                                        }
                                                        placeholder="e.g., reliable, fast, good value"
                                                    />
                                                    <div className="tag-container">
                                                        {rec.tags.map(
                                                            (tag, i) => (
                                                                <span
                                                                    key={i}
                                                                    className="tag-pill"
                                                                >
                                                                    {tag}
                                                                    <span
                                                                        className="remove-tag"
                                                                        onClick={() =>
                                                                            removeListTag(
                                                                                idx,
                                                                                tag
                                                                            )
                                                                        }
                                                                    >
                                                                        ×
                                                                    </span>
                                                                </span>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                    {requiredComplete && (
                                        <section className="form-section optional-section">
                                            <h2 className="section-title">
                                                
                                                Upload Images
                                            </h2>
                                            <div className="image-upload-section">
                                                <div
                                                    className="image-dropzone"
                                                    onClick={() =>
                                                        document
                                                            .getElementById(
                                                                `image-upload-list-${idx}`
                                                            )
                                                            .click()
                                                    }
                                                >
                                                    <div className="image-dropzone-content">
                                                        <PhotoIcon className="image-dropzone-icon" />
                                                        <span className="image-dropzone-text">
                                                            Click to upload
                                                            images (up to 5)
                                                        </span>
                                                        <span className="image-dropzone-text secondary">
                                                            JPG, PNG or WebP
                                                            (max. 5MB each)
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        id={`image-upload-list-${idx}`}
                                                        accept="image/jpeg,image/png,image/webp"
                                                        onChange={(e) =>
                                                            handleListImageSelect(
                                                                idx,
                                                                e
                                                            )
                                                        }
                                                        multiple
                                                        style={{
                                                            display: "none",
                                                        }}
                                                    />
                                                </div>
                                                {rec.images &&
                                                    rec.images.length > 0 && (
                                                        <div className="image-preview-grid">
                                                            {rec.images.map(
                                                                (image) => (
                                                                    <div
                                                                        key={
                                                                            image.id
                                                                        }
                                                                        className="image-preview-item"
                                                                    >
                                                                        <img
                                                                            src={
                                                                                image.preview
                                                                            }
                                                                            alt="Upload preview"
                                                                        />
                                                                        <button
                                                                            className="image-preview-remove"
                                                                            onClick={(
                                                                                e
                                                                            ) => {
                                                                                e.preventDefault();
                                                                                removeListImage(
                                                                                    idx,
                                                                                    image.id
                                                                                );
                                                                            }}
                                                                            type="button"
                                                                        >
                                                                            <XCircleIcon className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    )}
                                                {rec.images &&
                                                    rec.images.length > 0 && (
                                                        <p className="upload-limit-text">
                                                            {5 -
                                                                rec.images
                                                                    .length}{" "}
                                                            more image
                                                            {5 -
                                                                rec.images
                                                                    .length !==
                                                            1
                                                                ? "s"
                                                                : ""}{" "}
                                                            allowed
                                                        </p>
                                                    )}
                                            </div>
                                        </section>
                                    )}
                                    {listRecommendations.length > 1 && (
                                        <button
                                            type="button"
                                            className="remove-list-rec-btn"
                                            style={{
                                                // position: "absolute",
                                                // bottom: "0rem",
                                                // right: "1rem",
                                                background: "none",
                                                border: "none",
                                                color: "#e11d48",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.25rem",
                                                zIndex: 2,
                                                marginTop: "1.5rem",
                                                marginLeft: "auto",
                                            }}
                                            onClick={() =>
                                                removeListRecommendation(idx)
                                            }
                                            aria-label="Remove Recommendation"
                                        >
                                            <XCircleIcon className="w-5 h-5" />{" "}
                                            Remove
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {listRecommendations.length < 10 && (
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                            }}
                        >
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{
                                    marginTop: "0.1rem",
                                    marginBottom: "2rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    maxWidth: 350,
                                }}
                                onClick={addListRecommendation}
                            >
                                <PlusCircleIcon
                                    style={{ width: 20, height: 20 }}
                                />
                                Add Another Recommendation
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showSuccessModal && (
                <div className="success-modal-overlay">
                    <div className="success-modal">
                        {isSubmitting ? (
                            <>
                                <div className="loading-spinner">
                                    <ArrowPathIcon className="animate-spin h-12 w-12" />
                                </div>
                                <h3>Creating List...</h3>
                                <p>
                                    Please wait while we process your list
                                    submission.
                                </p>
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon className="success-modal-icon" />
                                <h3>List Submitted!</h3>
                                <p>
                                    Your list of recommendations has been shared
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

            {/* Publish Scope Section */}
            <section className="form-section publish-section">
                <h2 className="section-title">
                    Share With
                </h2>
                <div className="publish-options-grid">
                    {[
                        "Entire Trust Circle",
                        "Specific Trust Circles",
                        "Public",
                    ].map((option) => (
                        <label
                            key={option}
                            className={`publish-option ${
                                publishScope === option ? "selected" : ""
                            }`}
                        >
                            <input
                                type="radio"
                                name="publishScope"
                                value={option}
                                checked={publishScope === option}
                                onChange={handlePublishScopeChange}
                                className="sr-only"
                            />
                            {/* You can use the same icons as in SingleRecommendationForm */}
                            {option === "Entire Trust Circle" && (
                                <UsersIcon className="publish-icon" />
                            )}
                            {option === "Specific Trust Circles" && (
                                <UserCircleIcon className="publish-icon" />
                            )}
                            {option === "Public" && (
                                <GlobeAltIcon className="publish-icon" />
                            )}
                            <span>{option}</span>
                            {publishScope === option && (
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
                                    You are not part of any communities, or we
                                    couldn't load them.{" "}
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
            <div className="button-row">
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting || showSuccessModal}
                >
                    {isSubmitting ? "Sharing..." : "Share List"}
                    <CheckCircleIcon />
                </button>
            </div>
            {message && !showSuccessModal && (
                <MessageDisplay message={message} />
            )}
        </form>
    );
}
