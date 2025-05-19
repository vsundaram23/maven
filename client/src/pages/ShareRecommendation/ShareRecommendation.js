import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
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
} from "@heroicons/react/24/outline";
import { StarIcon as SolidStarIcon } from "@heroicons/react/24/solid";
import "./ShareRecommendation.css";

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = "http://localhost:5000";

const INTRO_TEXT =
    "Share trusted recommendations with your circle. Let's add one now...";
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

const StarDisplay = ({ active, onClick, onMouseEnter, onMouseLeave }) => {
    if (active) {
        return (
            <SolidStarIcon
                className="star-icon filled"
                onClick={onClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                aria-hidden="true"
            />
        );
    }
    return (
        <OutlineStarIcon
            className="star-icon"
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
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
            // Use the correct API endpoint structure
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
            console.error("Error loading user trust circles:", err);
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

        const payload = {
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
        try {
            const res = await fetch(`${API_URL}/api/recommendations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
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
            setMessage(
                "success:Recommendation submitted successfully! Redirecting..."
            );
            setTimeout(() => navigate("/"), 2500);
        } catch (error) {
            console.error("Submission Error:", error);
            setMessage(`error:${error.message}`);
        } finally {
            setIsSubmitting(false);
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
                        Recommendation
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
                                required
                                className={businessName ? "has-value" : ""}
                            />
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
                                required
                                rows={5}
                                className={
                                    recommendationBlurb ? "has-value" : ""
                                }
                            />
                        </div>
                        <div className="form-group span-2 rating-group">
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
                    <section className="form-section publish-section">
                        <h2 className="section-title">
                            <span className="section-number">3</span>Share With
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
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Sharing..." : "Share Recommendation"}
                        <CheckCircleIcon />
                    </button>
                </div>
                {message && (
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
                This feature is coming soon! Prepare your CSV file with columns
                like:{" "}
            </p>{" "}
            <code>
                Business Name, Your Experience, Rating (1-5), Provider Contact
                Name (Optional), Website (Optional), Phone (Optional), Tags
                (comma-separated, Optional), Publish Scope (Public/Specific
                Trust Circles/Entire Trust Circle, Optional), Trust Circle IDs
                (comma-separated if Specific Trust Circles, Optional)
            </code>{" "}
            <div className="form-group">
                <label htmlFor="csvFile" className="btn btn-secondary">
                    Choose CSV File (Coming Soon)
                </label>
                <input
                    type="file"
                    id="csvFile"
                    accept=".csv"
                    disabled
                    style={{ display: "none" }}
                />
            </div>{" "}
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
        </div>
    );
}
