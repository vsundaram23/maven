// src/components/ShareRecommendation/ListRecommendationForm.jsx

import React, { useState, useRef, useEffect } from "react";
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

const processTags = (tagString) => {
    if (!tagString) return [];
    const processedTags = tagString
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0);
    return [...new Set(processedTags)];
};

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
            images: [],
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

    const [uploadedFile, setUploadedFile] = useState(null);
    const [filePreviewRecs, setFilePreviewRecs] = useState(null);
    const [filePreviewFilename, setFilePreviewFilename] = useState("");

    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewEdits, setPreviewEdits] = useState([]);
    const [modalListTitle, setModalListTitle] = useState("");
    const [modalListDescription, setModalListDescription] = useState("");

    const [isExtracting, setIsExtracting] = useState(false);
    const [coverImage, setCoverImage] = useState(null);
    const [coverImagePreview, setCoverImagePreview] = useState(null);
    const coverImageInputRef = useRef(null);

    const fileInputRef = useRef(null);

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

    // File selection handler (does NOT extract yet)
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadedFile(file);
        setFilePreviewRecs(null);
        setFilePreviewFilename(file.name);
        setMessage("");
    };

    // Remove file handler
    const handleRemoveFile = () => {
        setUploadedFile(null);
        setFilePreviewRecs(null);
        setFilePreviewFilename("");
        setMessage("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // File upload handler
    const handleListFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFilePreviewFilename(file.name);
        setMessage("Processing file...");
        const allowedTypes = [
            "text/plain",
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
            "text/csv",
            ".csv",
            ".pdf",
            ".docx",
            ".txt",
        ];
        // Optionally check file.type or extension here

        const formData = new FormData();
        formData.append("file", file);
        formData.append("user_id", userId);
        formData.append("email", userEmail);

        try {
            const res = await fetch(
                `${API_URL}/api/recommendations/list-file-upload`,
                {
                    method: "POST",
                    body: formData,
                }
            );
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to process file.");
            }
            setFilePreviewRecs(data.recommendations.slice(0, 10));
            setMessage("");
        } catch (err) {
            setMessage("error:" + (err.message || "Could not process file."));
            setFilePreviewRecs(null);
        }
    };

    const handleExtractRecommendations = async () => {
        if (!uploadedFile) return;
        setIsExtracting(true);
        setMessage("Processing file...");
        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append("user_id", userId);
        formData.append("email", userEmail);
        try {
            const res = await fetch(
                `${API_URL}/api/recommendations/list-file-upload`,
                {
                    method: "POST",
                    body: formData,
                }
            );
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to process file.");
            }
            setFilePreviewRecs(data.recommendations.slice(0, 10));
            setPreviewEdits(
                data.recommendations.slice(0, 10).map((rec) => ({
                    businessName: rec.businessName || "",
                    recommendationBlurb: rec.recommendationBlurb || "",
                    rating: rec.rating || 0,
                    providerContactName: rec.providerContactName || "",
                    website: rec.website || "",
                    phoneNumber: rec.phoneNumber || "",
                    tagInput: "",
                    tags: rec.tags || [],
                    showOptional: false,
                    images: [],
                }))
            );
            setShowPreviewModal(true);
            setMessage("");
        } catch (err) {
            setMessage("error:" + (err.message || "Could not process file."));
            setFilePreviewRecs(null);
        } finally {
            setIsExtracting(false);
        }
    };

    // Accept previewed recommendations
    const handleAcceptPreview = () => {
        if (filePreviewRecs && filePreviewRecs.length > 0) {
            setListRecommendations(
                filePreviewRecs.map((rec) => ({
                    businessName: rec.businessName || "",
                    recommendationBlurb: rec.recommendationBlurb || "",
                    rating: rec.rating || 0,
                    providerContactName: rec.providerContactName || "",
                    website: rec.website || "",
                    phoneNumber: rec.phoneNumber || "",
                    tagInput: "",
                    tags: rec.tags || [],
                    showOptional: false,
                    images: [],
                }))
            );
            setFilePreviewRecs(null);
            setFilePreviewFilename("");
        }
    };

    // Remove preview and let user try again
    const handleRemovePreview = () => {
        setFilePreviewRecs(null);
        setFilePreviewFilename("");
    };

    // Drag & drop handler
    const handleListDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleListFile({ target: { files: e.dataTransfer.files } });
        }
    };

    const handleListDragOver = (e) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleListDragLeave = (e) => {
        e.preventDefault();
        setDragActive(false);
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

    const handleCoverImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            setMessage("error:Only JPG, PNG, or WebP images allowed for cover image.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setMessage("error:Cover image must be under 5MB.");
            return;
        }
        setCoverImage(file);
        const reader = new FileReader();
        reader.onloadend = () => setCoverImagePreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleRemoveCoverImage = () => {
        setCoverImage(null);
        setCoverImagePreview(null);
        if (coverImageInputRef.current) coverImageInputRef.current.value = "";
    };

    const handleListImageSelect = (idx, event) => {
        const files = Array.from(event.target.files);

        // Check for image count limit before reading files
        if ((listRecommendations[idx].images?.length || 0) + files.length > 5) {
            setMessage("error:Maximum 5 images allowed per recommendation");
            return;
        }

        files.forEach((file) => {
            if (file.size > 5 * 1024 * 1024) {
                setMessage("error:Images must be under 5MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setListRecommendations((prev) =>
                    prev.map((rec, i) =>
                        i === idx
                            ? {
                                  ...rec,
                                  images: [
                                      ...(rec.images || []),
                                      {
                                          id: Date.now() + Math.random(),
                                          preview: reader.result,
                                          file: file,
                                      },
                                  ],
                              }
                            : rec
                    )
                );
            };
            reader.readAsDataURL(file);
        });
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

    const handleSubmitList = async (e) => {
        e.preventDefault();

        if (isSubmitting) return;

        if (
            publishScope === "Specific Trust Circles" &&
            selectedTrustCircles.length === 0
        ) {
            setMessage(
                "error:Please select at least one trust circle to share this list."
            );
            return;
        }

        setIsSubmitting(true);
        setMessage("");
        setShowSuccessModal(true);

        try {
            // 1. Create each recommendation and collect provider IDs
            const providerIds = [];
            for (const rec of listRecommendations) {
                if (
                    !rec.businessName ||
                    !rec.recommendationBlurb ||
                    !rec.rating
                ) {
                    throw new Error(
                        "Each recommendation in the list must have a Recommendation Name, Your Experience, and Your Rating."
                    );
                }
                const formData = new FormData();
                formData.append(
                    "data",
                    JSON.stringify({
                        business_name: rec.businessName,
                        recommender_message: rec.recommendationBlurb,
                        rating: rec.rating,
                        user_email: userEmail,
                        provider_contact_name: rec.providerContactName,
                        website: rec.website,
                        phone_number: rec.phoneNumber,
                        tags: rec.tags,
                        publish_scope: publishScope,
                        ...(publishScope === "Specific Trust Circles" && {
                            trust_circle_ids: selectedTrustCircles,
                        }),
                    })
                );
                // Attach images if any
                if (rec.images && rec.images.length > 0) {
                    rec.images.forEach((img) => {
                        if (img.file) {
                            formData.append("images", img.file, img.file.name);
                        }
                    });
                }

                const res = await fetch(`${API_URL}/api/recommendations`, {
                    method: "POST",
                    body: formData,
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(
                        data.message || "Failed to create recommendation"
                    );
                }
                providerIds.push(data.providerId); // returned from backend
            }

            // 2. Create the list and link providers
            const listFormData = new FormData();
            listFormData.append("title", listTitle);
            listFormData.append("description", listDescription);
            listFormData.append("user_id", userId);
            listFormData.append("email", userEmail);
            providerIds.forEach((id) => listFormData.append("providerIds[]", id));
            if (coverImage) {
                listFormData.append("coverImage", coverImage, coverImage.name);
            }

            const listRes = await fetch(
                `${API_URL}/api/recommendations/lists`,
                {
                    method: "POST",
                    body: listFormData,
                }
            );
            const listData = await listRes.json();
            if (!listRes.ok || !listData.success) {
                throw new Error(listData.message || "Failed to create list");
            }

            setIsSubmitting(false);
            setMessage("success:List created successfully!");
        } catch (err) {
            setMessage("error:" + err.message);
            setShowSuccessModal(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (showPreviewModal) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [showPreviewModal]);

    useEffect(() => {
        if (showPreviewModal) {
            setModalListTitle(listTitle);
            setModalListDescription(listDescription);
        }
        // eslint-disable-next-line
    }, [showPreviewModal]);

    return (
        <form onSubmit={handleSubmitList}>
            <div className="list-form">
                <h2>Share Recommendations as a List</h2>
                <h3>Upload a Document</h3>
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
                    onClick={() =>
                        !uploadedFile &&
                        fileInputRef.current &&
                        fileInputRef.current.click()
                    }
                    tabIndex={0}
                    style={{ cursor: uploadedFile ? "default" : "pointer" }}
                >
                    <DocumentTextIcon className="csv-icon" />
                    {!uploadedFile ? (
                        <span>
                            Drag &amp; drop your document here, or{" "}
                            <label
                                htmlFor="listFile"
                                className="file-upload-label"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <span className="file-upload-link">
                                    choose a file
                                </span>
                                <input
                                    type="file"
                                    id="listFile"
                                    ref={fileInputRef}
                                    accept=".csv,.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/csv,text/plain"
                                    style={{ display: "none" }}
                                    onChange={handleFileSelect}
                                />
                            </label>
                        </span>
                    ) : (
                        <div className="file-actions">
                            <span className="file-name">
                                <DocumentTextIcon
                                    style={{
                                        width: 18,
                                        height: 18,
                                        marginRight: 6,
                                    }}
                                />
                                {uploadedFile.name}
                            </span>
                            <button
                                type="button"
                                className="btn btn-danger"
                                style={{
                                    marginLeft: 12,
                                    padding: "0.4rem 1rem",
                                }}
                                onClick={handleRemoveFile}
                            >
                                Remove file
                            </button>
                        </div>
                    )}
                </div>
                {uploadedFile && !filePreviewRecs && (
                    <div style={{ margin: "1rem 0" }}>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleExtractRecommendations}
                            disabled={isExtracting}
                        >
                            {isExtracting ? (
                                <>
                                    <ArrowPathIcon className="animate-spin h-5 w-5 inline mr-2" />
                                    Extracting...
                                </>
                            ) : (
                                "Extract recommendations"
                            )}
                        </button>
                    </div>
                )}

                <div className="list-divider">
                    <span>OR</span>
                </div>

                {/* Manual List Creation */}
                <div className="manual-list-section">
                    <h3>Create a List Manually</h3>
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

                    {/* Cover Image Dropzone */}
                    <div className="cover-image-upload-section">
                        <label className="cover-image-label">
                            Cover Image (optional)
                            <div
                                className="cover-image-dropzone"
                                onClick={() =>
                                    coverImageInputRef.current &&
                                    coverImageInputRef.current.click()
                                }
                                tabIndex={0}
                                style={{
                                    cursor: "pointer",
                                    border: "2px dashed #b3b3b3",
                                    borderRadius: "8px",
                                    padding: "1.5rem",
                                    textAlign: "center",
                                    background: "#fafbfc",
                                    marginBottom: "1rem",
                                    marginTop: "1rem",
                                }}
                            >
                                {coverImagePreview ? (
                                    <div style={{ position: "relative", display: "inline-block" }}>
                                        <img
                                            src={coverImagePreview}
                                            alt="Cover preview"
                                            style={{
                                                maxWidth: 220,
                                                maxHeight: 140,
                                                borderRadius: "0.5rem",
                                                boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                                                objectFit: "cover",
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="image-preview-remove"
                                            style={{
                                                position: "absolute",
                                                top: 8,
                                                right: 8,
                                                background: "rgba(0,0,0,0.5)",
                                                border: "none",
                                                borderRadius: "50%",
                                                width: 28,
                                                height: 28,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: "white",
                                                cursor: "pointer",
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveCoverImage();
                                            }}
                                        >
                                            <XCircleIcon className="w-6 h-6" />
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                                        <PhotoIcon className="image-dropzone-icon" />
                                        <span className="image-dropzone-text">
                                            Click to upload a cover image
                                        </span>
                                        <span className="image-dropzone-text secondary">
                                            JPG, PNG or WebP (max. 5MB)
                                        </span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    style={{ display: "none" }}
                                    ref={coverImageInputRef}
                                    onChange={handleCoverImageChange}
                                />
                            </div>
                        </label>
                    </div>

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
                <h2 className="section-title">Share With</h2>
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
            {showPreviewModal && (
                <div className="modal-overlay">
                    <div
                        className="csv-preview-modal"
                        style={{
                            maxWidth: 900,
                            width: "98%",
                            maxHeight: "90vh",
                            overflowY: "auto",
                        }}
                    >
                        <div className="modal-header">
                            <h3>Edit Extracted Recommendations</h3>
                            <button
                                className="close-button"
                                onClick={() => setShowPreviewModal(false)}
                            >
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div
                            className="modal-info"
                            style={{ padding: "1.5rem" }}
                        >
                            {previewEdits.length === 0 && (
                                <div
                                    style={{
                                        textAlign: "center",
                                        color: "#888",
                                    }}
                                >
                                    No recommendations extracted.
                                </div>
                            )}
                            <div
                                className="modal-list-fields"
                                style={{ marginBottom: "2rem" }}
                            >
                                <label
                                    style={{
                                        display: "block",
                                        marginBottom: "1rem",
                                    }}
                                >
                                    <span style={{ fontWeight: 600 }}>
                                        List Title *
                                    </span>
                                    <input
                                        type="text"
                                        value={modalListTitle}
                                        onChange={(e) =>
                                            setModalListTitle(e.target.value)
                                        }
                                        placeholder="e.g., My Favorite Home Pros"
                                        required
                                        style={{
                                            width: "100%",
                                            padding: "0.5rem",
                                            borderRadius: "0.4rem",
                                            border: "1px solid #cbd5e1",
                                            marginTop: "0.3rem",
                                        }}
                                    />
                                </label>
                                <label style={{ display: "block" }}>
                                    <span style={{ fontWeight: 600 }}>
                                        List Description (optional)
                                    </span>
                                    <textarea
                                        value={modalListDescription}
                                        onChange={(e) =>
                                            setModalListDescription(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Describe this list (optional)"
                                        rows={2}
                                        style={{
                                            width: "100%",
                                            padding: "0.5rem",
                                            borderRadius: "0.4rem",
                                            border: "1px solid #cbd5e1",
                                            marginTop: "0.3rem",
                                        }}
                                    />
                                </label>
                            </div>
                            {previewEdits.map((rec, idx) => {
                                const requiredComplete =
                                    rec.businessName.trim() &&
                                    rec.recommendationBlurb.trim() &&
                                    rec.rating > 0;
                                return (
                                    <div
                                        className="list-recommendation-card"
                                        key={idx}
                                        style={{ marginBottom: "2rem" }}
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
                                                            setPreviewEdits(
                                                                (prev) =>
                                                                    prev.map(
                                                                        (
                                                                            r,
                                                                            i
                                                                        ) =>
                                                                            i ===
                                                                            idx
                                                                                ? {
                                                                                      ...r,
                                                                                      businessName:
                                                                                          e
                                                                                              .target
                                                                                              .value,
                                                                                  }
                                                                                : r
                                                                    )
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
                                                    {[1, 2, 3, 4, 5].map(
                                                        (n) => (
                                                            <StarDisplay
                                                                key={n}
                                                                active={
                                                                    n <=
                                                                    rec.rating
                                                                }
                                                                onClick={() =>
                                                                    setPreviewEdits(
                                                                        (
                                                                            prev
                                                                        ) =>
                                                                            prev.map(
                                                                                (
                                                                                    r,
                                                                                    i
                                                                                ) =>
                                                                                    i ===
                                                                                    idx
                                                                                        ? {
                                                                                              ...r,
                                                                                              rating: n,
                                                                                          }
                                                                                        : r
                                                                            )
                                                                    )
                                                                }
                                                            />
                                                        )
                                                    )}
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
                                                            setPreviewEdits(
                                                                (prev) =>
                                                                    prev.map(
                                                                        (
                                                                            r,
                                                                            i
                                                                        ) =>
                                                                            i ===
                                                                            idx
                                                                                ? {
                                                                                      ...r,
                                                                                      recommendationBlurb:
                                                                                          e
                                                                                              .target
                                                                                              .value,
                                                                                  }
                                                                                : r
                                                                    )
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
                                                requiredComplete
                                                    ? "visible"
                                                    : ""
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
                                                            Provider Contact
                                                            Name
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={
                                                                rec.providerContactName
                                                            }
                                                            onChange={(e) =>
                                                                setPreviewEdits(
                                                                    (prev) =>
                                                                        prev.map(
                                                                            (
                                                                                r,
                                                                                i
                                                                            ) =>
                                                                                i ===
                                                                                idx
                                                                                    ? {
                                                                                          ...r,
                                                                                          providerContactName:
                                                                                              e
                                                                                                  .target
                                                                                                  .value,
                                                                                      }
                                                                                    : r
                                                                        )
                                                                )
                                                            }
                                                            placeholder="e.g., Jane Doe"
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>
                                                            <GlobeAltIcon />{" "}
                                                            Website
                                                        </label>
                                                        <input
                                                            type="url"
                                                            value={rec.website}
                                                            onChange={(e) =>
                                                                setPreviewEdits(
                                                                    (prev) =>
                                                                        prev.map(
                                                                            (
                                                                                r,
                                                                                i
                                                                            ) =>
                                                                                i ===
                                                                                idx
                                                                                    ? {
                                                                                          ...r,
                                                                                          website:
                                                                                              e
                                                                                                  .target
                                                                                                  .value,
                                                                                      }
                                                                                    : r
                                                                        )
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
                                                            value={
                                                                rec.phoneNumber
                                                            }
                                                            onChange={(e) =>
                                                                setPreviewEdits(
                                                                    (prev) =>
                                                                        prev.map(
                                                                            (
                                                                                r,
                                                                                i
                                                                            ) =>
                                                                                i ===
                                                                                idx
                                                                                    ? {
                                                                                          ...r,
                                                                                          phoneNumber:
                                                                                              e
                                                                                                  .target
                                                                                                  .value,
                                                                                      }
                                                                                    : r
                                                                        )
                                                                )
                                                            }
                                                            placeholder="(555) 123-4567"
                                                        />
                                                    </div>
                                                    <div className="form-group span-2 tag-input-group">
                                                        <label>
                                                            <TagIcon /> Tags
                                                            (Press Enter)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={
                                                                rec.tagInput ||
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                setPreviewEdits(
                                                                    (prev) =>
                                                                        prev.map(
                                                                            (
                                                                                r,
                                                                                i
                                                                            ) =>
                                                                                i ===
                                                                                idx
                                                                                    ? {
                                                                                          ...r,
                                                                                          tagInput:
                                                                                              e
                                                                                                  .target
                                                                                                  .value,
                                                                                      }
                                                                                    : r
                                                                        )
                                                                )
                                                            }
                                                            onKeyDown={(e) => {
                                                                if (
                                                                    e.key ===
                                                                    "Enter"
                                                                ) {
                                                                    e.preventDefault();
                                                                    const newTags =
                                                                        (
                                                                            rec.tagInput ||
                                                                            ""
                                                                        )
                                                                            .split(
                                                                                ","
                                                                            )
                                                                            .map(
                                                                                (
                                                                                    tag
                                                                                ) =>
                                                                                    tag
                                                                                        .trim()
                                                                                        .toLowerCase()
                                                                            )
                                                                            .filter(
                                                                                (
                                                                                    tag
                                                                                ) =>
                                                                                    tag &&
                                                                                    !rec.tags.includes(
                                                                                        tag
                                                                                    )
                                                                            );
                                                                    setPreviewEdits(
                                                                        (
                                                                            prev
                                                                        ) =>
                                                                            prev.map(
                                                                                (
                                                                                    r,
                                                                                    i
                                                                                ) =>
                                                                                    i ===
                                                                                    idx
                                                                                        ? {
                                                                                              ...r,
                                                                                              tags: [
                                                                                                  ...r.tags,
                                                                                                  ...newTags,
                                                                                              ],
                                                                                              tagInput:
                                                                                                  "",
                                                                                          }
                                                                                        : r
                                                                            )
                                                                    );
                                                                }
                                                            }}
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
                                                                                setPreviewEdits(
                                                                                    (
                                                                                        prev
                                                                                    ) =>
                                                                                        prev.map(
                                                                                            (
                                                                                                r,
                                                                                                j
                                                                                            ) =>
                                                                                                j ===
                                                                                                idx
                                                                                                    ? {
                                                                                                          ...r,
                                                                                                          tags: r.tags.filter(
                                                                                                              (
                                                                                                                  t
                                                                                                              ) =>
                                                                                                                  t !==
                                                                                                                  tag
                                                                                                          ),
                                                                                                      }
                                                                                                    : r
                                                                                        )
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
                                        {previewEdits.length > 1 && (
                                            <button
                                                type="button"
                                                className="remove-list-rec-btn"
                                                style={{
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
                                                    setPreviewEdits((prev) =>
                                                        prev.filter(
                                                            (_, i) => i !== idx
                                                        )
                                                    )
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
                        <div className="modal-footer">
                            {previewEdits.length > 0 && (
                                <div
                                    style={{
                                        color: "#dc2626",
                                        background: "#fef2f2",
                                        border: "1px solid #fecaca",
                                        borderRadius: "0.5rem",
                                        padding: "0.7rem 1rem",
                                        marginBottom: "1rem",
                                        fontWeight: 500,
                                        fontSize: "0.96rem",
                                        display:
                                            !modalListTitle.trim() ||
                                            previewEdits.some(
                                                (rec) =>
                                                    !rec.businessName.trim() ||
                                                    !rec.recommendationBlurb.trim() ||
                                                    !rec.rating
                                            )
                                                ? "block"
                                                : "none",
                                    }}
                                >
                                    Please complete all required fields (list
                                    title, recommendation name, experience, and
                                    rating) before continuing.
                                </div>
                            )}
                            <button
                                className="modal-btn primary"
                                type="button"
                                disabled={
                                    previewEdits.length === 0 ||
                                    !modalListTitle.trim() ||
                                    previewEdits.some(
                                        (rec) =>
                                            !rec.businessName.trim() ||
                                            !rec.recommendationBlurb.trim() ||
                                            !rec.rating
                                    )
                                }
                                onClick={async () => {
                                    // Validate all required fields
                                    if (!modalListTitle.trim()) {
                                        setMessage(
                                            "error:Please provide a name for your list."
                                        );
                                        return;
                                    }
                                    for (const rec of previewEdits) {
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
                                    // Set main form state and close modal
                                    setListTitle(modalListTitle);
                                    setListDescription(modalListDescription);
                                    setListRecommendations(previewEdits);
                                    setShowPreviewModal(false);
                                    setFilePreviewRecs(null);
                                    setFilePreviewFilename("");
                                    setMessage("");
                                }}
                            >
                                Use These Recommendations
                            </button>
                            <button
                                className="modal-btn secondary"
                                type="button"
                                onClick={() => {
                                    setShowPreviewModal(false);
                                    setFilePreviewRecs(null);
                                    setFilePreviewFilename("");
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}
