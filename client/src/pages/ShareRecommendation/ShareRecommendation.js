import React, { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import {
    StarIcon as OutlineStarIcon,
    TagIcon,
    GlobeAltIcon,
    PhoneIcon,
    UsersIcon,
    UserCircleIcon,
    SparklesIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    XCircleIcon,
    ChevronDownIcon,
    ArrowPathIcon,
    PhotoIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as SolidStarIcon } from "@heroicons/react/24/solid";
import "./ShareRecommendation.css";

const API_URL = "https://api.seanag-recommendations.org:8080";
// const API_URL = "http://localhost:3000";

const INTRO_TEXT =
    "Share recommendations with your Trust Circle. Let's add one now...";
const TYPEWRITER_SPEED = 40;

const PUBLISH_OPTIONS = [
    {
        value: "Full Trust Circle",
        label: "Entire Trust Circle",
        icon: UsersIcon,
    },
    {
        value: "Specific Trust Circles",
        label: "Specific Trust Circles",
        icon: UserCircleIcon,
    },
    { value: "Public", label: "Public", icon: GlobeAltIcon },
];

const processTags = (tagString) => {
    if (!tagString) return [];

    // Split by comma, clean up each tag, and filter out empty ones
    const processedTags = tagString
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0);

    // Remove duplicates
    return [...new Set(processedTags)];
};

// const StarDisplay = ({ active, onClick, onMouseEnter, onMouseLeave }) => {
//     if (active) {
//         return (
//             <SolidStarIcon
//                 className="star-icon filled"
//                 onClick={onClick}
//                 onMouseEnter={onMouseEnter}
//                 onMouseLeave={onMouseLeave}
//                 aria-hidden="true"
//             />
//         );
//     }
//     return (
//         <OutlineStarIcon
//             className="star-icon"
//             onClick={onClick}
//             onMouseEnter={onMouseEnter}
//             onMouseLeave={onMouseLeave}
//             aria-hidden="true"
//         />
//     );
// };
// const StarDisplay = ({ active, onClick }) => {
//     if (active) {
//         return (
//             <SolidStarIcon
//                 className="star-icon filled"
//                 onClick={onClick}
//                 aria-hidden="true"
//             />
//         );
//     }
//     return (
//         <OutlineStarIcon
//             className="star-icon"
//             onClick={onClick}
//             aria-hidden="true"
//         />
//     );
// };
const StarDisplay = ({ active, onClick }) => {
    // The event handler will be passed in via the 'onClick' prop
    const eventHandlers = {
        onClick: onClick,       // For desktop clicks and accessibility
        onTouchEnd: (e) => {    // For mobile taps
            // We prevent the default action to avoid a "ghost click"
            // where BOTH onTouchEnd and onClick fire.
            e.preventDefault();
            onClick();
        },
    };

    if (active) {
        return (
            <SolidStarIcon
                className="star-icon filled"
                {...eventHandlers} // Spread the handlers onto the icon
                aria-hidden="true"
            />
        );
    }
    return (
        <OutlineStarIcon
            className="star-icon"
            {...eventHandlers} // Spread the handlers here too
            aria-hidden="true"
        />
    );
};

export default function ShareRecommendation() {
    const navigate = useNavigate();
    const { isLoaded, isSignedIn, user } = useUser();

    const [mode, setMode] = useState("single");
    const [typewriterText, setTypewriterText] = useState("");
    const [typewriterIndex, setTypewriterIndex] = useState(0);

    const [categoryState, setCategoryState] = useState("");
    const [subcategoryState, setSubcategoryState] = useState("");

    const [businessName, setBusinessName] = useState("");
    const [providerContactName, setProviderContactName] = useState("");
    const [recommendationBlurb, setRecommendationBlurb] = useState("");
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [website, setWebsite] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [tagInput, setTagInput] = useState("");
    const [tags, setTags] = useState([]);
    const [publishScope, setPublishScope] = useState("Full Trust Circle");
    const [selectedTrustCircles, setSelectedTrustCircles] = useState([]);
    const [userTrustCircles, setUserTrustCircles] = useState([]);
    const [trustCirclesLoading, setTrustCirclesLoading] = useState(false);
    const [trustCirclesError, setTrustCirclesError] = useState("");

    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const [csvData, setCsvData] = useState([]);
    const [csvHeaders, setCsvHeaders] = useState([]);
    const [csvFileName, setCsvFileName] = useState("");
    const [csvError, setCsvError] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);

    const [showPreviewModal, setShowPreviewModal] = useState(false);

    const [uploadStatus, setUploadStatus] = useState({
        isUploading: false,
        success: 0,
        failed: 0,
        errors: [],
    });

    const [images, setImages] = useState([]);

    // Add new state for tracking upload progress
    const [uploadState, setUploadState] = useState({
        isUploading: false,
        progress: 0,
    });

    useEffect(() => {
        if (!isLoaded) return;
        if (!isSignedIn) {
            navigate("/");
            return;
        }
    }, [isLoaded, isSignedIn, navigate]);

    useEffect(() => {
        setTypewriterIndex(0);
        setTypewriterText("");
    }, [mode]);

    useEffect(() => {
        if (mode === "single" && typewriterIndex < INTRO_TEXT.length) {
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
    }, [typewriterIndex, mode]);

    const fetchUserTrustCircles = useCallback(async () => {
        if (!user?.primaryEmailAddress?.emailAddress) return;
        setTrustCirclesLoading(true);
        setTrustCirclesError("");
        try {
            const email = encodeURIComponent(
                user.primaryEmailAddress.emailAddress
            );
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
    }, [user]);

    useEffect(() => {
        fetchUserTrustCircles();
    }, [fetchUserTrustCircles]);

    const resetForm = () => {
        setImages([]);
        setBusinessName("");
        setProviderContactName("");
        setRecommendationBlurb("");
        setRating(0);
        setHoverRating(0);
        setWebsite("");
        setPhoneNumber("");
        setTagInput("");
        setTags([]);
        setPublishScope("Full Trust Circle");
        setSelectedTrustCircles([]);
        setCategoryState("");
        setSubcategoryState("");
        setMessage("");
        setTypewriterIndex(0);
        setTypewriterText("");
    };

    const requiredFieldsComplete =
        businessName.trim() && recommendationBlurb.trim() && rating > 0;

    const handleStarClick = (n) => setRating(n);

    const handleTagKeyDown = (e) => {
        if (e.key === "Enter" && tagInput.trim()) {
            e.preventDefault();
            const newTag = tagInput.trim().toLowerCase();
            if (newTag && !tags.includes(newTag)) {
                setTags((prevTags) => [...prevTags, newTag]);
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
                "error:Please fill out all required fields: Service Provider Name, Your Experience, and Your Rating."
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
            user_email: user.primaryEmailAddress?.emailAddress,
            business_name: businessName.trim(),
            provider_contact_name: providerContactName.trim() || null,
            recommender_message: recommendationBlurb,
            rating: rating,
            category: categoryState || null,
            subcategory: subcategoryState || null,
            website: website.trim() || null,
            phone_number: phoneNumber.trim() || null,
            tags: tags,
            publish_scope: publishScope,
            email: null,
            ...(publishScope === "Specific Trust Circles" && {
                trust_circle_ids: selectedTrustCircles,
            }),
        };

        formData.append("data", JSON.stringify(jsonData));

        // Append images if they exist
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
        navigate("/share-recommendation");
    };

    const handleGoHome = () => {
        setShowSuccessModal(false);
        navigate("/");
    };

    const validateRecommendation = (row) => {
        const errors = [];

        // Required fields
        if (!row.business_name?.trim()) {
            errors.push("Business Name is required");
        }
        if (!row.recommender_message?.trim()) {
            errors.push("Experience description is required");
        }
        if (!row.rating) {
            errors.push("Rating is required");
        }

        // Type validations
        const rating = parseInt(row.rating);
        if (isNaN(rating) || rating < 1 || rating > 5) {
            errors.push("Rating must be a number between 1 and 5");
        }

        // Phone number validation (if provided)
        if (row.phone_number) {
            const digitsOnly = row.phone_number.replace(/\D/g, "");
            if (digitsOnly.length !== 10) {
                errors.push("Phone number must be 10 digits");
            }
        }

        // Website validation (if provided)
        // if (row.website && !row.website.match(/^https?:\/\/.+\..+$/)) {
        //     errors.push(
        //         "Website must be a valid URL starting with http:// or https://"
        //     );
        // }

        return errors;
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            setCsvFileName(file.name);
            setCsvError("");
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors.length) {
                        setCsvError(
                            `CSV Parsing Error: ${results.errors[0].message}`
                        );
                        setCsvData([]);
                        setCsvHeaders([]);
                    } else {
                        if (results.data.length > 0) {
                            setCsvHeaders(Object.keys(results.data[0]));
                            setCsvData(results.data);
                            setShowPreviewModal(true);
                        } else {
                            setCsvError(
                                "CSV file is empty or has no valid data."
                            );
                            setCsvData([]);
                            setCsvHeaders([]);
                        }
                    }
                },
                error: (err) => {
                    setCsvError(`Error reading file: ${err.message}`);
                    setCsvData([]);
                    setCsvHeaders([]);
                },
            });
        } else {
            setCsvFileName("");
            setCsvError("");
            setCsvData([]);
            setCsvHeaders([]);
        }
    };

    const handleCellChange = (rowIndex, columnKey, value) => {
        setCsvData((prevData) => {
            const newData = [...prevData];
            newData[rowIndex] = {
                ...newData[rowIndex],
                [columnKey]: value,
            };
            return newData;
        });
    };

    const handleUploadCsvData = async () => {
        if (!csvData.length) {
            setCsvError("No data to upload");
            return;
        }

        setUploadStatus({
            isUploading: true,
            success: 0,
            failed: 0,
            errors: [],
        });

        const results = [];

        for (let i = 0; i < csvData.length; i++) {
            const row = csvData[i];

            // Transform CSV columns to API fields
            const transformedData = {
                user_email: user.primaryEmailAddress?.emailAddress,
                business_name: row["Business Name"]?.trim(),
                recommender_message: row["Your Experience"]?.trim(),
                rating: parseInt(row["Rating (1-5)"]),
                provider_contact_name:
                    row["Provider Contact Name (Optional)"]?.trim() || null,
                website: row["Website (Optional)"]?.trim() || null,
                phone_number: row["Phone (Optional)"]?.trim() || null,
                tags: processTags(row["Tags (comma-separated, Optional)"]),
                publish_scope:
                    row[
                        "Publish Scope (Public/Specific Trust Circles/Entire Trust Circle, Optional)"
                    ] || "Full Trust Circle",
                trust_circle_ids:
                    row[
                        "Trust Circle IDs (comma-separated if Specific Trust Circles, Optional)"
                    ]
                        ?.split(",")
                        .map((id) => id.trim())
                        .filter((id) => id) || [],
                email: null, // We don't use this field as we're using Clerk
            };

            // Validate the row
            const validationErrors = validateRecommendation(transformedData);

            if (validationErrors.length > 0) {
                results.push({
                    success: false,
                    rowIndex: i + 1,
                    errors: validationErrors,
                });
                setUploadStatus((prev) => ({
                    ...prev,
                    failed: prev.failed + 1,
                    errors: [
                        ...prev.errors,
                        `Row ${i + 1}: ${validationErrors.join(", ")}`,
                    ],
                }));
                continue;
            }

            try {
                const response = await fetch(`${API_URL}/api/recommendations`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(transformedData),
                });

                if (!response.ok) {
                    const errorData = await response
                        .json()
                        .catch(() => ({ message: "Network or server error" }));
                    throw new Error(
                        errorData.message ||
                            `Request failed with status ${response.status}`
                    );
                }

                results.push({
                    success: true,
                    rowIndex: i + 1,
                });

                setUploadStatus((prev) => ({
                    ...prev,
                    success: prev.success + 1,
                }));
            } catch (error) {
                results.push({
                    success: false,
                    rowIndex: i + 1,
                    errors: [error.message],
                });

                setUploadStatus((prev) => ({
                    ...prev,
                    failed: prev.failed + 1,
                    errors: [...prev.errors, `Row ${i + 1}: ${error.message}`],
                }));
            }
        }

        // Final status update
        setUploadStatus((prev) => ({ ...prev, isUploading: false }));

        // Handle completion
        if (results.every((r) => r.success)) {
            // All successful
            setMessage("success:All recommendations uploaded successfully");
            setShowPreviewModal(false);
            setCsvData([]);
            setCsvHeaders([]);
            setCsvFileName("");
            setSelectedFile(null);

            // Redirect after a delay
            setTimeout(() => navigate("/"), 2500);
        } else if (results.some((r) => r.success)) {
            // Partial success
            setMessage(
                `warning:${uploadStatus.success} recommendations uploaded, ${uploadStatus.failed} failed`
            );
        } else {
            // All failed
            setMessage(
                "error:Failed to upload any recommendations. Please check the errors and try again."
            );
        }
    };

    const renderSingleForm = () => (
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
                        <span className="section-number">1</span>Core
                        Details
                    </h2>
                    <div className="form-grid">
                        <div className="form-group span-2">
                            <label htmlFor="businessName">
                                Service Provider Name *
                            </label>
                            <input
                                id="businessName"
                                type="text"
                                placeholder="e.g., Stellar Plumbing Co."
                                value={businessName}
                                onChange={(e) =>
                                    setBusinessName(e.target.value)
                                }
                                onBlur={(e) => setBusinessName(e.target.value)}
                                required
                                className={businessName ? "has-value" : ""}
                            />
                        </div>
                        {/* <div className="form-group span-2 rating-group">
                            <label>Your Rating *</label>
                            <div className="star-rating">
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <StarDisplay
                                        key={n}
                                        active={n <= (hoverRating || rating)}
                                        onClick={() => handleStarClick(n)}
                                        onMouseEnter={() => setHoverRating(n)}
                                        onMouseLeave={() => setHoverRating(0)}
                                    />
                                ))}
                            </div>
                        </div> */}
                        <div className="form-group span-2 rating-group">
                            <label>Your Rating *</label>
                            <div className="star-rating">
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <StarDisplay
                                        key={n}
                                        // The logic is now much simpler: is the star's number less than or equal to the selected rating?
                                        active={n <= rating}
                                        onClick={() => handleStarClick(n)}
                                        // onMouseEnter={() => setHoverRating(n)} // <--- DELETE THIS
                                        // onMouseLeave={() => setHoverRating(0)} // <--- DELETE THIS
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
                                onBlur={(e) => setRecommendationBlurb(e.target.value)}
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
                                    onChange={(e) =>
                                        setTagInput(e.target.value)
                                    }
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
                    <div
                        className={`message ${
                            message.startsWith("error") ? "error" : "success"
                        } ${message ? "visible" : ""}`}
                    >
                        {message.startsWith("error") ? (
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
        </>
    );

    const renderCsvImport = () => (
        <div className="csv-import-section">
            {" "}
            <DocumentTextIcon className="csv-icon" />{" "}
            <h2>Import Recommendations via CSV</h2>{" "}
            <p>
                Prepare your CSV file with columns following the exact naming
                schema below:{" "}
            </p>{" "}
            <code>
                Business Name, Your Experience, Rating (1-5), Provider Contact
                Name (Optional), Website (Optional), Phone (Optional), Tags
                (comma-separated, Optional), Publish Scope (Public/Specific
                Trust Circles/Entire Trust Circle, Optional), Trust Circle IDs
                (comma-separated if Specific Trust Circles, Optional)
            </code>{" "}
            <div className="form-group file-upload-group">
                <label htmlFor="csvFile" className="btn btn-secondary">
                    Choose CSV File
                </label>
                <input
                    type="file"
                    id="csvFile"
                    accept=".csv"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                />
                {csvFileName && (
                    <span className="file-name">
                        <DocumentTextIcon className="h-4 w-4 inline mr-1" />
                        {csvFileName}
                    </span>
                )}
            </div>
            {csvError && (
                <div className="error-message">
                    <XCircleIcon className="h-5 w-5" />
                    {csvError}
                </div>
            )}
            {/* CSV Preview Modal */}
            {showPreviewModal && (
                <div
                    className="modal-overlay"
                    onClick={() => setShowPreviewModal(false)}
                >
                    <div
                        className="csv-preview-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3>Preview Recommendations</h3>
                            <button
                                className="close-button"
                                onClick={() => setShowPreviewModal(false)}
                            >
                                <XCircleIcon />
                            </button>
                        </div>

                        <div className="modal-info">
                            <div className="preview-info">
                                <p className="preview-title">
                                    Review and edit your recommendations before
                                    uploading
                                </p>
                                <p className="preview-count">
                                    {csvData.length} recommendations found
                                </p>
                            </div>

                            <div className="table-container">
                                <table className="csv-preview-table">
                                    <thead>
                                        <tr>
                                            {csvHeaders.map((header) => (
                                                <th key={header}>{header}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {csvData.map((row, rowIndex) => (
                                            <tr key={rowIndex}>
                                                {csvHeaders.map((header) => (
                                                    <td
                                                        key={`${rowIndex}-${header}`}
                                                    >
                                                        <input
                                                            type="text"
                                                            value={
                                                                row[header] ||
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                handleCellChange(
                                                                    rowIndex,
                                                                    header,
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="csv-table-input"
                                                            placeholder={`Enter ${header}`}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <div className="upload-status">
                                {uploadStatus.isUploading && (
                                    <p className="uploading-message">
                                        <ArrowPathIcon className="animate-spin" />
                                        Uploading... ({uploadStatus.success}{" "}
                                        successful, {uploadStatus.failed}{" "}
                                        failed)
                                    </p>
                                )}
                                {uploadStatus.errors.length > 0 && (
                                    <div className="upload-errors">
                                        {uploadStatus.errors.map(
                                            (error, index) => (
                                                <p
                                                    key={index}
                                                    className="error-message"
                                                >
                                                    {error}
                                                </p>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="modal-actions">
                                <button
                                    className="modal-btn secondary"
                                    onClick={() => setShowPreviewModal(false)}
                                    disabled={uploadStatus.isUploading}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="modal-btn primary"
                                    onClick={handleUploadCsvData}
                                    disabled={
                                        csvData.length === 0 ||
                                        uploadStatus.isUploading
                                    }
                                >
                                    <CheckCircleIcon className="icon" />
                                    {uploadStatus.isUploading
                                        ? `Uploading (${uploadStatus.success}/${csvData.length})`
                                        : `Upload ${csvData.length} Recommendations`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div id="share-recommendation-page">
            <div className="recommendation-wrapper modern-ui">
                <div className="recommendation-container">
                    <div className="mode-switcher">
                        <button
                            className={`mode-button ${
                                mode === "single" ? "active" : ""
                            }`}
                            onClick={() => setMode("single")}
                        >
                            <SparklesIcon /> Add Single
                        </button>
                        <button
                            className={`mode-button ${
                                mode === "csv" ? "active" : ""
                            }`}
                            onClick={() => setMode("csv")}
                        >
                            <DocumentTextIcon /> Import CSV
                        </button>
                    </div>
                    {mode === "single" ? renderSingleForm() : renderCsvImport()}
                </div>
            </div>

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
        </div>
    );
}
