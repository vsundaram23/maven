import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useMediaQuery } from "react-responsive";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import AuroraBackground from '../../components/AuroraBackground/AuroraBackground';

import {
    MapPinIcon,
    LockClosedIcon,
    XMarkIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import { FaStar, FaThumbsUp, FaPlusCircle } from 'react-icons/fa';
import "./Home.css";

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = "http://localhost:3000";

const BRAND_PHRASE = "Tried & Trusted.";
const LOCKED_LOCATION = "Greater Seattle Area";

const placeholderPublicRecommendations = [
    { id: 'pub1', provider_id: 'pub1', business_name: "Evergreen Home Services", primary_service: "Landscaping", average_rating: 4.8, total_reviews: 15, recommender_message: "Top-notch local landscapers, great attention to detail and beautiful results every time. Highly recommend for any garden work.", tags: ["landscaping", "reliable", "quality"], num_likes: 22, recommender_name: "Sarah M.", date_of_recommendation: "2024-05-15T10:00:00Z", city: "Bellevue", state: "WA" },
    { id: 'pub2', provider_id: 'pub2', business_name: "Sound Financial Advisors", primary_service: "Financial Planning", average_rating: 5.0, total_reviews: 25, recommender_message: "They provide clear, actionable advice. Helped me set up a solid retirement plan. Client focus is evident.", tags: ["finance", "planning", "expert"], num_likes: 30, recommender_name: "John B.", date_of_recommendation: "2024-04-20T10:00:00Z", city: "Seattle", state: "WA" },
    { id: 'pub3', provider_id: 'pub3', business_name: "Cascade Auto Repair", primary_service: "Auto Maintenance", average_rating: 4.5, total_reviews: 40, recommender_message: "Honest mechanics, fair prices, and quick service. My go-to for car troubles.", tags: ["auto", "repair", "trustworthy"], num_likes: 18, recommender_name: "Alice C.", date_of_recommendation: "2024-03-10T10:00:00Z", city: "Redmond", state: "WA" },
    { id: 'pub4', provider_id: 'pub4', business_name: "Lakeview Bakery", primary_service: "Bakery", average_rating: 4.7, total_reviews: 30, recommender_message: "Best sourdough in town! Their pastries are also divine. Friendly staff.", tags: ["food", "bakery", "fresh"], num_likes: 25, recommender_name: "Emily R.", date_of_recommendation: "2024-05-01T10:00:00Z", city: "Kirkland", state: "WA" },
    { id: 'pub5', provider_id: 'pub5', business_name: "Green Cleaners", primary_service: "House Cleaning", average_rating: 4.9, total_reviews: 20, recommender_message: "Reliable and thorough cleaning service. They use eco-friendly products which is a big plus!", tags: ["cleaning", "eco-friendly", "home"], num_likes: 28, recommender_name: "David K.", date_of_recommendation: "2024-04-10T10:00:00Z", city: "Seattle", state: "WA" },
    { id: 'pub6', provider_id: 'pub6', business_name: "Evergreen Home Repair", primary_service: "Handyman", average_rating: 4.6, total_reviews: 12, recommender_message: "Reliable and quick fixes for everything around the house. A true lifesaver!", tags: ["handyman", "quick", "local"], num_likes: 15, recommender_name: "Mike L.", date_of_recommendation: "2024-05-20T10:00:00Z", city: "Seattle", state: "WA" },
    { id: 'pub7', provider_id: 'pub7', business_name: "Northwest Tech Support", primary_service: "IT Services", average_rating: 4.9, total_reviews: 18, recommender_message: "Fixed my computer issues in no time, very knowledgeable and friendly. Highly recommend for tech support.", tags: ["tech", "support", "expert"], num_likes: 20, recommender_name: "Olivia P.", date_of_recommendation: "2024-05-25T10:00:00Z", city: "Bellevue", state: "WA" },
];

const StarRatingDisplay = ({ rating }) => {
    const numRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalfStar = numRating - fullStars >= 0.25 && numRating - fullStars < 0.75;
    const effectivelyFullStars = numRating - fullStars >= 0.75 ? fullStars + 1 : fullStars;
    const displayFullStars = hasHalfStar ? fullStars : effectivelyFullStars;
    const displayHalfStar = hasHalfStar;
    const emptyStars = 5 - displayFullStars - (displayHalfStar ? 1 : 0);

    return (
        <div className="star-rating-display">
            {[...Array(displayFullStars)].map((_, i) => <FaStar key={`full-${i}`} className="star-filled" />)}
            {displayHalfStar && <FaStar key="half" className="star-half" />}
            {[...Array(emptyStars < 0 ? 0 : emptyStars)].map((_, i) => <FaStar key={`empty-${i}`} className="star-empty" />)}
        </div>
    );
};

const ReviewModal = ({ isOpen, onClose, onSubmit, providerName }) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [reviewText, setReviewText] = useState("");
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen) { setRating(0); setHover(0); setReviewText(""); setTags([]); setTagInput(""); setError(""); }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault(); if (!rating) { setError("Please select a rating."); return; }
        onSubmit({ rating, review: reviewText, tags }); onClose();
    };

    const handleTagKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const trimmed = tagInput.trim().toLowerCase();
            if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
                setTags([...tags, trimmed]);
            }
            setTagInput("");
        }
    };

    const removeTag = (tagToRemove) => setTags(tags.filter((tag) => tag !== tagToRemove));

    if (!isOpen) return null;

    return (
        <div className="modal-overlay review-modal-overlay">
            <div className="modal-content review-modal-content">
                <button className="modal-close-button" onClick={onClose}><XMarkIcon /></button>
                <h2>Review {providerName}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="rating-container">
                        <label>Rate your experience: <span className="required">*</span></label>
                        <div className="stars-interactive">
                            {[...Array(5)].map((_, index) => (
                                <FaStar key={index} className={index < (hover || rating) ? "star-interactive active" : "star-interactive"} onClick={() => setRating(index + 1)} onMouseEnter={() => setHover(index + 1)} onMouseLeave={() => setHover(rating)} />
                            ))}
                        </div>
                        {error && <div className="error-message">{error}</div>}
                    </div>
                    <div className="review-text-input">
                        <label htmlFor="reviewTextArea">Tell us about your experience:</label>
                        <textarea id="reviewTextArea" value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Share your thoughts..." rows={4} />
                    </div>
                    <div className="tag-input-group">
                        <label htmlFor="tagReviewInput">Add tags (up to 5, press Enter):</label>
                        <input id="tagReviewInput" type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="e.g. friendly, affordable" />
                        <div className="tag-container modal-tag-container">{tags.map((tag, idx) => (<span key={idx} className="tag-badge">{tag} <span className="remove-tag" onClick={() => removeTag(tag)}>×</span></span>))}</div>
                    </div>
                    <div className="modal-buttons">
                        <button type="button" onClick={onClose} className="button-cancel">Cancel</button>
                        <button type="submit" className="button-submit">Submit Review</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PublicRecommendationCard = ({ rec, onWriteReview, onLike, isLikedByCurrentUser, loggedInUserId, currentUserName }) => {
    const providerIdForLink = rec.provider_id || rec.id;
    const displayAvgRating = (parseFloat(rec.average_rating) || 0).toFixed(1);
    const displayTotalReviews = parseInt(rec.total_reviews, 10) || 0;
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const dropdownRef = React.useRef(null);

    const shareLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/provider/${providerIdForLink}`);
        setDropdownOpen(false);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);


    return (
        <div className="public-provider-card">
            <div className="public-card-header">
                <h3 className="public-card-title">
                    <Link to={`/provider/${providerIdForLink}`} className="public-provider-name-link" onClick={() => localStorage.setItem("selectedProvider", JSON.stringify(rec))}>
                        {rec.business_name || "Unknown Business"}
                    </Link>
                </h3>
                <div className="public-badge-wrapper-with-menu">
                    {(parseFloat(rec.average_rating) || 0) >= 4.5 && (<span className="public-badge top-rated-badge">Top Rated</span>)}
                    <div className="public-dropdown-wrapper" ref={dropdownRef}>
                        <button className="public-three-dots-button" onClick={() => setDropdownOpen(!dropdownOpen)} title="Options">⋮</button>
                        {dropdownOpen && (
                            <div className="public-dropdown-menu">
                                <button className="public-dropdown-item" onClick={shareLink}>Share this Rec</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="public-review-summary">
                <StarRatingDisplay rating={rec.average_rating || 0} />
                <span className="public-review-score">{displayAvgRating}</span>
                <span className="public-review-count">({displayTotalReviews} {displayTotalReviews === 1 ? "review" : "reviews"})</span>
                {loggedInUserId && (
                    <button className="public-write-review-link" onClick={() => onWriteReview(rec)}>Write a Review</button>
                )}
                <button className={`public-like-button ${isLikedByCurrentUser ? 'liked' : ''}`} onClick={() => onLike(providerIdForLink)} title={isLikedByCurrentUser ? "Unlike" : "Like"} disabled={!loggedInUserId}>
                    <FaThumbsUp /> <span className="public-like-count">{rec.num_likes || 0}</span>
                </button>
            </div>

            <p className="public-card-description">{rec.recommender_message || "No specific message provided for this recommendation."}</p>

            <div className="public-tag-container">
                {Array.isArray(rec.tags) && rec.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="public-tag-badge">{tag}</span>
                ))}
                {loggedInUserId && (
                    <button className="public-add-tag-button" onClick={() => onWriteReview(rec)} aria-label="Add or edit tags">
                        <FaPlusCircle />
                    </button>
                )}
            </div>

            {rec.recommender_name && (
                <div className="public-recommended-row">
                    <span className="public-recommended-label">Recommended by:</span>
                    <Link to={`/profile/${rec.recommender_id || 'user'}`} className="public-recommended-name">{rec.recommender_name}</Link>
                    {rec.date_of_recommendation && (
                        <span className="public-recommendation-date">
                            ({new Date(rec.date_of_recommendation).toLocaleDateString("en-US", { year: "2-digit", month: "numeric", day: "numeric" })})
                        </span>
                    )}
                </div>
            )}

            <div className="public-action-buttons">
                {loggedInUserId && (rec.recommender_phone || rec.recommender_email) && (
                    <button className="button-secondary" onClick={() => {
                        if (rec.recommender_phone) window.location.href = `sms:${rec.recommender_phone.replace(/\D/g, '')}`;
                        else if (rec.recommender_email) window.location.href = `mailto:${rec.recommender_email}`;
                    }}>Connect with Recommender</button>
                )}
            </div>
            {linkCopied && (<div className="public-toast">Link copied to clipboard!</div>)}
        </div>
    );
};

const Home = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const { openSignIn } = useClerk();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useMediaQuery({ maxWidth: 768 });

    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [preferredName, setPreferredName] = useState("");

    const [providerCount, setProviderCount] = useState(0);
    const [connectionCount, setConnectionCount] = useState(0);
    const [communityCount, setCommunityCount] = useState(0);
    const [showStatsLine, setShowStatsLine] = useState(false);

    const [animatedProviders, setAnimatedProviders] = useState([]);
    const [isLoadingAnimatedProviders, setIsLoadingAnimatedProviders] = useState(true);
    const [animatedProvidersError, setAnimatedProvidersError] = useState(null);
    const [currentAnimatedProviderIndex, setCurrentAnimatedProviderIndex] = useState(0);

    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [providerForReview, setProviderForReview] = useState(null);

    const particlesInit = useCallback(async (engine) => {
        await loadFull(engine);
    }, []);

    const particlesOptions = useMemo(() => ({
        background: {
            color: {
                value: "transparent",
            },
        },
        fpsLimit: 60,
        interactivity: {
            events: {
                onHover: {
                    enable: true,
                    mode: "grab",
                },
                onClick: {
                    enable: false,
                    mode: "push",
                },
            },
            modes: {
                grab: {
                    distance: 140,
                    links: {
                        opacity: 0.1,
                    },
                },
                push: {
                    quantity: 1,
                },
            },
        },
        particles: {
            color: {
                value: "#1A365D",
            },
            links: {
                color: "#1A365D",
                distance: 150,
                enable: true,
                opacity: 0.25,
                width: 1,
                triangles: {
                    enable: true,
                    opacity: 0.02,
                    color: { value: "#1A365D" }
                }
            },
            collisions: {
                enable: false,
            },
            move: {
                direction: "none",
                enable: true,
                outModes: {
                    default: "bounce",
                },
                random: true,
                speed: 0.5,
                straight: false,
            },
            number: {
                density: {
                    enable: true,
                    area: 900,
                },
                value: isMobile ? 30 : 60,
            },
            opacity: {
                value: { min: 0.1, max: 0.35 },
                animation: {
                    enable: true,
                    speed: 0.6,
                    minimumValue: 0.05,
                    sync: false
                }
            },
            shape: {
                type: "circle",
            },
            size: {
                value: { min: 1, max: 2.5 },
                animation: {
                    enable: true,
                    speed: 1.5,
                    minimumValue: 0.5,
                    sync: false
                }
            },
        },
        detectRetina: true,
        fullScreen: {
            enable: true,
            zIndex: -1
        }
    }), [isMobile]);


    const handleOpenReviewModal = (provider) => {
        if (!isSignedIn) { openSignIn(); return; }
        setProviderForReview(provider);
        setIsReviewModalOpen(true);
    };
    const handleCloseReviewModal = () => setIsReviewModalOpen(false);
    const handleSubmitReview = async (reviewData) => {
        if (!providerForReview || !user) return;
        const session = window.Clerk.session;
        if (!session) { console.error("Clerk session not available"); return; }
        const token = await session.getToken();
        if (!token) { console.error("Not authenticated, no token"); return; }

        try {
            const response = await fetch(`${API_URL}/api/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    providerId: providerForReview.provider_id || providerForReview.id,
                    userId: user.id,
                    rating: reviewData.rating,
                    reviewText: reviewData.review,
                    tags: reviewData.tags,
                }),
            });
            if (!response.ok) throw new Error('Failed to submit review');

        } catch (error) {
            console.error("Error submitting review:", error);
        }
    };
    const handleLikePlaceholder = (providerId) => {
        console.log("Like toggled for providerId:", providerId);
    };

    useEffect(() => {
        const fetchPreferredName = async () => {
            if (!isLoaded || !isSignedIn || !user?.primaryEmailAddress?.emailAddress) {
                setPreferredName(""); return;
            }
            try {
                const response = await fetch(`${API_URL}/api/users/preferred-name?email=${encodeURIComponent(user.primaryEmailAddress.emailAddress)}`);
                if (response.ok) {
                    const data = await response.json();
                    setPreferredName(data.preferredName || "");
                } else { setPreferredName(""); }
            } catch (error) { console.error("Error fetching preferred name:", error); setPreferredName(""); }
        };
        fetchPreferredName();
    }, [isLoaded, isSignedIn, user]);

    const targetText = useMemo(() => {
        if (!isLoaded) return `Welcome to ${BRAND_PHRASE}`;
        if (!isSignedIn) return `Welcome to ${BRAND_PHRASE}`;
        return preferredName || user?.firstName ? `Welcome back, ${preferredName || user.firstName}.` : `Welcome to ${BRAND_PHRASE}`;
    }, [isLoaded, isSignedIn, preferredName, user?.firstName]);

    const [displayText, setDisplayText] = useState("");
    const [isTyping, setIsTyping] = useState(true);

    useEffect(() => {
        setDisplayText(""); setIsTyping(true); setShowStatsLine(false);
    }, [targetText]);

    useEffect(() => {
        if (!isTyping || !targetText) { if (!targetText) setIsTyping(false); return; }
        if (displayText.length < targetText.length) {
            const next = targetText.substring(0, displayText.length + 1);
            const t = setTimeout(() => setDisplayText(next), 100);
            return () => clearTimeout(t);
        } else { setIsTyping(false); }
    }, [displayText, isTyping, targetText]);

    useEffect(() => {
        if (!isTyping && displayText === targetText && displayText !== "") {
            if (isSignedIn) setShowStatsLine(true);
        } else { setShowStatsLine(false); }
    }, [isTyping, displayText, targetText, isSignedIn]);

    useEffect(() => {
        if (!isLoaded) return;
        const fetchCounts = async () => {
            if (!isSignedIn || !user) {
                setProviderCount(0);
                setConnectionCount(0);
                setCommunityCount(0);
                return;
            }
            try {
                const params = new URLSearchParams({
                    user_id: user.id,
                    email: user.primaryEmailAddress?.emailAddress,
                    firstName: user.firstName || "",
                    lastName: user.lastName || ""
                });
                const providerRes = await fetch(`${API_URL}/api/providers/count?${params.toString()}`);
                if (providerRes.ok) {
                    const d = await providerRes.json();
                    setProviderCount(d.count || 0);
                } else {
                    setProviderCount(0);
                }

                const connRes = await fetch(`${API_URL}/api/connections/check-connections`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: user.primaryEmailAddress.emailAddress }),
                });
                if (connRes.ok) {
                    const d = await connRes.json();
                    const u = Array.isArray(d) ? Array.from(new Set(d.map((x) => x.email))) : [];
                    setConnectionCount(u.length);
                } else {
                    setConnectionCount(0);
                }

                const communityRes = await fetch(`${API_URL}/api/communities/count/communities`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: user.id,
                        email: user.primaryEmailAddress.emailAddress
                    }),
                });
                if (communityRes.ok) {
                    const data = await communityRes.json();
                    setCommunityCount(data.count || 0);
                } else {
                    setCommunityCount(0);
                    console.error("Failed to fetch community count:", communityRes.statusText);
                }

            } catch (err) {
                console.error("Error fetching counts:", err);
                setProviderCount(0);
                setConnectionCount(0);
                setCommunityCount(0);
            }
        };
        fetchCounts();
    }, [isLoaded, isSignedIn, user]);

    useEffect(() => {
        const fetchAnimatedProviders = async () => {
            if (!isLoaded) return;
            if (isSignedIn && user) {
                setIsLoadingAnimatedProviders(true); setAnimatedProvidersError(null);
                try {
                    const params = new URLSearchParams({
                        user_id: user.id,
                        email: user.primaryEmailAddress?.emailAddress,
                        firstName: user.firstName || "",
                        lastName: user.lastName || "",
                        limit: '10',
                        sortBy: 'date_of_recommendation',
                        sortOrder: 'desc'
                    });
                    const response = await fetch(`${API_URL}/api/providers/newest-visible?${params.toString()}`);
                    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
                    const data = await response.json();
                    if (data.success && data.providers) {
                        setAnimatedProviders(data.providers.map(p => ({ ...p, id: p.provider_id || p.id })));
                    } else { setAnimatedProviders([]); }
                } catch (error) {
                    console.error("Error fetching animated providers:", error);
                    setAnimatedProvidersError(error.message);
                    setAnimatedProviders([]);
                } finally {
                    setIsLoadingAnimatedProviders(false);
                }
            } else {
                setAnimatedProviders(placeholderPublicRecommendations.map(p => ({ ...p, id: p.provider_id || p.id })));
                setIsLoadingAnimatedProviders(false); setAnimatedProvidersError(null);
            }
        };
        fetchAnimatedProviders();
    }, [isLoaded, isSignedIn, user]);

    useEffect(() => {
        if (animatedProviders.length === 0 || isLoadingAnimatedProviders) return;

        const interval = setInterval(() => {
            setCurrentAnimatedProviderIndex(prevIndex =>
                (prevIndex + 1) % animatedProviders.length
            );
        }, 8000);

        return () => clearInterval(interval);
    }, [animatedProviders, isLoadingAnimatedProviders]);

    const visibleRecommendation = useMemo(() => {
        if (!animatedProviders || animatedProviders.length === 0) return null;
        return animatedProviders[currentAnimatedProviderIndex];
    }, [animatedProviders, currentAnimatedProviderIndex]);


    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        const q = searchQuery.trim();
        if (!q || !isLoaded) return;
        if (!isSignedIn) { openSignIn(); setIsSearching(false); return; }
        setIsSearching(true);
        try {
            const params = new URLSearchParams({ q: q, user_id: user.id, email: user.primaryEmailAddress?.emailAddress, location: LOCKED_LOCATION });
            const searchUrl = `${API_URL}/api/providers/search?${params.toString()}`;
            const response = await fetch(searchUrl);
            const responseBody = await response.text();
            if (!response.ok) { let errP; try { errP = JSON.parse(responseBody); } catch (pE) { throw new Error(`HTTP error! status: ${response.status}, Non-JSON response: ${responseBody}`); } throw new Error(errP.message || errP.error || `HTTP error! ${response.status}`); }
            const d = JSON.parse(responseBody);
            if (d.success) {
                const base = `/search?q=${encodeURIComponent(q)}&location=${encodeURIComponent(LOCKED_LOCATION)}`; navigate(d.providers?.length > 0 ? base : base + "&noResults=true", { state: { initialProviders: d.providers, currentSearchUserId: user.id }, });
            } else { throw new Error(d.message || d.error || "Search not successful"); }
        } catch (err) { console.error("Search error:", err); }
        finally { setIsSearching(false); }
    };

    const handleLocationClick = () => setShowLocationModal(true);

    if (location.pathname !== "/") return null;

    const highlightTarget = useMemo(() => {
        if (!isLoaded || !isSignedIn) return BRAND_PHRASE;
        return preferredName || user?.firstName || BRAND_PHRASE;
    }, [isLoaded, isSignedIn, preferredName, user?.firstName]);

    if (!isLoaded) {
        return <div className="loading-full-page">Loading Tried & Trusted...</div>;
    }

    return (
        <div className="home">
            <Particles
                id="tsparticles"
                init={particlesInit}
                options={particlesOptions}
            />
            <div className="hero-container">
                <motion.h1 className="main-title" key={targetText} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
                    dangerouslySetInnerHTML={{ __html: displayText && highlightTarget && displayText.includes(highlightTarget) ? displayText.replace(highlightTarget, `<span class="highlight-box">${highlightTarget}</span>`) : displayText, }} />
                <form className="search-form-wrapper" onSubmit={handleSearch}>
                    <div className="search-input-group">
                        <input className="main-search-input" type="text" placeholder={isMobile ? "Search services..." : "Search for home services, financial advisors..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={isSearching} />
                        <div className="location-input-wrapper" onClick={handleLocationClick}>
                            <MapPinIcon className="location-icon" /> <span className="location-text">{LOCKED_LOCATION}</span> <LockClosedIcon className="location-lock-icon" />
                        </div>
                        <button type="submit" className="search-submit-button" disabled={isSearching}> {isSearching ? <span className="search-spinner"></span> : <MagnifyingGlassIcon className="search-button-icon" />} </button>
                    </div>
                </form>
            </div>
            <div className="yc-stats">
                <div
                    className="stat clickable-stat"
                    onClick={() => {
                        if (isSignedIn) {
                            navigate("/trustcircles?tab=myRecommendations");
                        } else {
                            openSignIn();
                        }
                    }}
                    style={{ cursor: "pointer" }}
                >
                    <p className="number">
                        <CountUp
                            end={providerCount || 0}
                            duration={2}
                            separator=","
                        />
                    </p>
                    <p className="label">
                        Recommendations
                        <br />
                        shared with you
                    </p>
                </div>
                <div
                    className="stat clickable-stat"
                    onClick={() => {
                        if (isSignedIn) {
                            navigate("/communities");
                        } else {
                            openSignIn();
                        }
                    }}
                    style={{ cursor: "pointer" }}
                >
                    <p className="number">
                        <CountUp end={communityCount || 0} duration={2} />
                    </p>
                    <p className="label">
                        Communities
                        <br />
                        in your Trust Circle
                    </p>
                </div>
                <div
                    className="stat clickable-stat"
                    onClick={() => {
                        if (isSignedIn) {
                            navigate("/trustcircles?tab=myTrust");
                        } else {
                            openSignIn();
                        }
                    }}
                    style={{ cursor: "pointer" }}
                >
                    <p className="number">
                        <CountUp end={connectionCount || 0} duration={2} />
                    </p>
                    <p className="label">
                        Friends in Your
                        <br />
                        Trust Circle
                    </p>
                </div>
            </div>
            <div className="recommendations-section-wrapper">
                <p className="subtitle">
                    Recent recommendations from &nbsp;
                    <span className="underline-highlight">your Trust Circle.</span>
                </p>
                <div className="flashing-recommendations-grid">
                    {isLoadingAnimatedProviders && <div className="grid-message">Loading recommendations...</div>}
                    {animatedProvidersError && <div className="grid-message grid-error">Could not load recommendations.</div>}
                    {!isLoadingAnimatedProviders && !animatedProvidersError && animatedProviders.length > 0 ? (
                        <AnimatePresence mode="wait" initial={false}>
                            {visibleRecommendation && (
                                <motion.div
                                    key={visibleRecommendation.id}
                                    className="flashing-item-wrapper"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{
                                        duration: 0.8,
                                        ease: "easeOut",
                                    }}
                                >
                                    <PublicRecommendationCard
                                        rec={visibleRecommendation}
                                        onWriteReview={handleOpenReviewModal}
                                        onLike={handleLikePlaceholder}
                                        isLikedByCurrentUser={false}
                                        loggedInUserId={user?.id}
                                        currentUserName={preferredName || user?.firstName}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    ) : (
                        !isLoadingAnimatedProviders && !animatedProvidersError && (
                            <div className="grid-message"> {isSignedIn ? "No recent recommendations for you yet." : "Discover trusted services recommended by your network!"} </div>
                        )
                    )}
                </div>
            </div>
            <ReviewModal
                isOpen={isReviewModalOpen}
                onClose={handleCloseReviewModal}
                onSubmit={handleSubmitReview}
                providerName={providerForReview?.business_name}
            />
            {isSignedIn && (
                <motion.div className="network-cta" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: showStatsLine ? 1.0 : 0.8, duration: 0.6 }}>
                    <p> Want more recommendations?{" "} <span className="cta-link" onClick={() => navigate("/trustcircles")}>Invite friends</span> {" "}to grow your Trust Circle. </p>
                </motion.div>
            )}
            {showLocationModal && (
                <div className="location-modal-overlay">
                    <div className="location-modal-content">
                        <button className="location-modal-close" onClick={() => setShowLocationModal(false)}> <XMarkIcon /> </button>
                        <h3>Expanding Our Horizons!</h3>
                        <p>We're currently focused on serving the <strong>Greater Seattle Area</strong>.</p>
                        <p>We're working hard to expand and will be launching nationally soon. Stay tuned!</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;

// weird looking rec cards, but other stuff looks good
// import React, { useEffect, useState, useMemo } from "react";
// import { useUser, useClerk } from "@clerk/clerk-react";
// import { useNavigate, useLocation, Link } from "react-router-dom";
// import { useMediaQuery } from "react-responsive";
// import { motion } from "framer-motion";
// import CountUp from "react-countup";
// import {
//     MapPinIcon,
//     LockClosedIcon,
//     XMarkIcon,
//     MagnifyingGlassIcon,
// } from "@heroicons/react/24/solid";
// import { FaStar, FaThumbsUp, FaPlusCircle } from 'react-icons/fa';
// import "./Home.css";

// const API_URL = "http://localhost:3000";
// const BRAND_PHRASE = "Tried & Trusted.";
// const LOCKED_LOCATION = "Greater Seattle Area";

// const placeholderPublicRecommendations = [
//     { id: 'pub1', provider_id: 'pub1', business_name: "Evergreen Home Services", primary_service: "Landscaping", average_rating: 4.8, total_reviews: 15, recommender_message: "Top-notch local landscapers, great attention to detail and beautiful results every time. Highly recommend for any garden work.", tags: ["landscaping", "reliable", "quality"], num_likes: 22, recommender_name: "Sarah M.", date_of_recommendation: "2024-05-15T10:00:00Z", city: "Bellevue", state: "WA" },
//     { id: 'pub2', provider_id: 'pub2', business_name: "Sound Financial Advisors", primary_service: "Financial Planning", average_rating: 5.0, total_reviews: 25, recommender_message: "They provide clear, actionable advice. Helped me set up a solid retirement plan. Client focus is evident.", tags: ["finance", "planning", "expert"], num_likes: 30, recommender_name: "John B.", date_of_recommendation: "2024-04-20T10:00:00Z", city: "Seattle", state: "WA" },
//     { id: 'pub3', provider_id: 'pub3', business_name: "Cascade Auto Repair", primary_service: "Auto Maintenance", average_rating: 4.5, total_reviews: 40, recommender_message: "Honest mechanics, fair prices, and quick service. My go-to for car troubles.", tags: ["auto", "repair", "trustworthy"], num_likes: 18, recommender_name: "Alice C.", date_of_recommendation: "2024-03-10T10:00:00Z", city: "Redmond", state: "WA" },
//     { id: 'pub4', provider_id: 'pub4', business_name: "Lakeview Bakery", primary_service: "Bakery", average_rating: 4.7, total_reviews: 30, recommender_message: "Best sourdough in town! Their pastries are also divine. Friendly staff.", tags: ["food", "bakery", "fresh"], num_likes: 25, recommender_name: "Emily R.", date_of_recommendation: "2024-05-01T10:00:00Z", city: "Kirkland", state: "WA" },
//     { id: 'pub5', provider_id: 'pub5', business_name: "Green Cleaners", primary_service: "House Cleaning", average_rating: 4.9, total_reviews: 20, recommender_message: "Reliable and thorough cleaning service. They use eco-friendly products which is a big plus!", tags: ["cleaning", "eco-friendly", "home"], num_likes: 28, recommender_name: "David K.", date_of_recommendation: "2024-04-10T10:00:00Z", city: "Seattle", state: "WA" },
// ];

// const StarRatingDisplay = ({ rating }) => {
//     const numRating = parseFloat(rating) || 0;
//     const fullStars = Math.floor(numRating);
//     const hasHalfStar = numRating - fullStars >= 0.25 && numRating - fullStars < 0.75;
//     const effectivelyFullStars = numRating - fullStars >= 0.75 ? fullStars + 1 : fullStars;
//     const displayFullStars = hasHalfStar ? fullStars : effectivelyFullStars;
//     const displayHalfStar = hasHalfStar;
//     const emptyStars = 5 - displayFullStars - (displayHalfStar ? 1 : 0);

//     return (
//         <div className="star-rating-display">
//             {[...Array(displayFullStars)].map((_, i) => <FaStar key={`full-${i}`} className="star-filled" />)}
//             {displayHalfStar && <FaStar key="half" className="star-half" />}
//             {[...Array(emptyStars < 0 ? 0 : emptyStars)].map((_, i) => <FaStar key={`empty-${i}`} className="star-empty" />)}
//         </div>
//     );
// };

// const ReviewModal = ({ isOpen, onClose, onSubmit, providerName }) => {
//     const [rating, setRating] = useState(0);
//     const [hover, setHover] = useState(0);
//     const [reviewText, setReviewText] = useState("");
//     const [tags, setTags] = useState([]);
//     const [tagInput, setTagInput] = useState("");
//     const [error, setError] = useState("");

//     useEffect(() => {
//         if (isOpen) { setRating(0); setHover(0); setReviewText(""); setTags([]); setTagInput(""); setError(""); }
//     }, [isOpen]);

//     const handleSubmit = (e) => {
//         e.preventDefault(); if (!rating) { setError("Please select a rating."); return; }
//         onSubmit({ rating, review: reviewText, tags }); onClose();
//     };

//     const handleTagKeyDown = (e) => {
//         if (e.key === "Enter") {
//             e.preventDefault();
//             const trimmed = tagInput.trim().toLowerCase();
//             if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
//                 setTags([...tags, trimmed]);
//             }
//             setTagInput("");
//         }
//     };

//     const removeTag = (tagToRemove) => setTags(tags.filter((tag) => tag !== tagToRemove));

//     if (!isOpen) return null;

//     return (
//         <div className="modal-overlay review-modal-overlay">
//             <div className="modal-content review-modal-content">
//                 <button className="modal-close-button" onClick={onClose}><XMarkIcon /></button>
//                 <h2>Review {providerName}</h2>
//                 <form onSubmit={handleSubmit}>
//                     <div className="rating-container">
//                         <label>Rate your experience: <span className="required">*</span></label>
//                         <div className="stars-interactive">
//                             {[...Array(5)].map((_, index) => (
//                                 <FaStar key={index} className={index < (hover || rating) ? "star-interactive active" : "star-interactive"} onClick={() => setRating(index + 1)} onMouseEnter={() => setHover(index + 1)} onMouseLeave={() => setHover(rating)} />
//                             ))}
//                         </div>
//                         {error && <div className="error-message">{error}</div>}
//                     </div>
//                     <div className="review-text-input">
//                         <label htmlFor="reviewTextArea">Tell us about your experience:</label>
//                         <textarea id="reviewTextArea" value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Share your thoughts..." rows={4} />
//                     </div>
//                     <div className="tag-input-group">
//                         <label htmlFor="tagReviewInput">Add tags (up to 5, press Enter):</label>
//                         <input id="tagReviewInput" type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="e.g. friendly, affordable" />
//                         <div className="tag-container modal-tag-container">{tags.map((tag, idx) => (<span key={idx} className="tag-badge">{tag} <span className="remove-tag" onClick={() => removeTag(tag)}>×</span></span>))}</div>
//                     </div>
//                     <div className="modal-buttons">
//                         <button type="button" onClick={onClose} className="button-cancel">Cancel</button>
//                         <button type="submit" className="button-submit">Submit Review</button>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// };

// const PublicRecommendationCard = ({ rec, onWriteReview, onLike, isLikedByCurrentUser, loggedInUserId, currentUserName }) => {
//     const providerIdForLink = rec.provider_id || rec.id;
//     const displayAvgRating = (parseFloat(rec.average_rating) || 0).toFixed(1);
//     const displayTotalReviews = parseInt(rec.total_reviews, 10) || 0;
//     const [dropdownOpen, setDropdownOpen] = useState(false);
//     const [linkCopied, setLinkCopied] = useState(false);
//     const dropdownRef = React.useRef(null);

//     const shareLink = () => {
//         navigator.clipboard.writeText(`${window.location.origin}/provider/${providerIdForLink}`);
//         setDropdownOpen(false);
//         setLinkCopied(true);
//         setTimeout(() => setLinkCopied(false), 2000);
//     };
    
//     useEffect(() => {
//         const handleClickOutside = (event) => {
//             if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//                 setDropdownOpen(false);
//             }
//         };
//         document.addEventListener("mousedown", handleClickOutside);
//         return () => document.removeEventListener("mousedown", handleClickOutside);
//     }, [dropdownRef]);


//     return (
//         <div className="public-provider-card">
//             <div className="public-card-header">
//                 <h3 className="public-card-title">
//                     <Link to={`/provider/${providerIdForLink}`} className="public-provider-name-link" onClick={() => localStorage.setItem("selectedProvider", JSON.stringify(rec))}>
//                         {rec.business_name || "Unknown Business"}
//                     </Link>
//                 </h3>
//                 <div className="public-badge-wrapper-with-menu">
//                     {(parseFloat(rec.average_rating) || 0) >= 4.5 && (<span className="public-badge top-rated-badge">Top Rated</span>)}
//                     <div className="public-dropdown-wrapper" ref={dropdownRef}>
//                         <button className="public-three-dots-button" onClick={() => setDropdownOpen(!dropdownOpen)} title="Options">⋮</button>
//                         {dropdownOpen && (
//                             <div className="public-dropdown-menu">
//                                 <button className="public-dropdown-item" onClick={shareLink}>Share this Rec</button>
//                             </div>
//                         )}
//                     </div>
//                 </div>
//             </div>

//             <div className="public-review-summary">
//                 <StarRatingDisplay rating={rec.average_rating || 0} />
//                 <span className="public-review-score">{displayAvgRating}</span>
//                 <span className="public-review-count">({displayTotalReviews} {displayTotalReviews === 1 ? "review" : "reviews"})</span>
//                 {loggedInUserId && (
//                     <button className="public-write-review-link" onClick={() => onWriteReview(rec)}>Write a Review</button>
//                 )}
//                 <button className={`public-like-button ${isLikedByCurrentUser ? 'liked' : ''}`} onClick={() => onLike(providerIdForLink)} title={isLikedByCurrentUser ? "Unlike" : "Like"} disabled={!loggedInUserId}>
//                     <FaThumbsUp /> <span className="public-like-count">{rec.num_likes || 0}</span>
//                 </button>
//             </div>

//             <p className="public-card-description">{rec.recommender_message || "No specific message provided for this recommendation."}</p>

//             <div className="public-tag-container">
//                 {Array.isArray(rec.tags) && rec.tags.slice(0, 3).map((tag, idx) => (
//                     <span key={idx} className="public-tag-badge">{tag}</span>
//                 ))}
//                 {loggedInUserId && (
//                     <button className="public-add-tag-button" onClick={() => onWriteReview(rec)} aria-label="Add or edit tags">
//                         <FaPlusCircle />
//                     </button>
//                 )}
//             </div>

//             {rec.recommender_name && (
//               <div className="public-recommended-row">
//                   <span className="public-recommended-label">Recommended by:</span>
//                   <Link to={`/profile/${rec.recommender_id || 'user'}`} className="public-recommended-name">{rec.recommender_name}</Link>
//                   {rec.date_of_recommendation && (
//                       <span className="public-recommendation-date">
//                           ({new Date(rec.date_of_recommendation).toLocaleDateString("en-US", { year: "2-digit", month: "numeric", day: "numeric" })})
//                       </span>
//                   )}
//               </div>
//             )}
            
//             <div className="public-action-buttons">
//                 {loggedInUserId && (rec.recommender_phone || rec.recommender_email) && (
//                     <button className="button-secondary" onClick={() => {
//                         if (rec.recommender_phone) window.location.href = `sms:${rec.recommender_phone.replace(/\D/g, '')}`;
//                         else if (rec.recommender_email) window.location.href = `mailto:${rec.recommender_email}`;
//                     }}>Connect with Recommender</button>
//                 )}
//             </div>
//             {linkCopied && (<div className="public-toast">Link copied to clipboard!</div>)}
//         </div>
//     );
// };

// const Home = () => {
//     const { isLoaded, isSignedIn, user } = useUser();
//     const { openSignIn } = useClerk();
//     const navigate = useNavigate();
//     const location = useLocation();
//     const isMobile = useMediaQuery({ maxWidth: 768 });

//     const [isSearching, setIsSearching] = useState(false);
//     const [searchQuery, setSearchQuery] = useState("");
//     const [showLocationModal, setShowLocationModal] = useState(false);
//     const [preferredName, setPreferredName] = useState("");

//     const [providerCount, setProviderCount] = useState(0);
//     const [connectionCount, setConnectionCount] = useState(0);
//     const [showStatsLine, setShowStatsLine] = useState(false);

//     const [animatedProviders, setAnimatedProviders] = useState([]);
//     const [isLoadingAnimatedProviders, setIsLoadingAnimatedProviders] = useState(true);
//     const [animatedProvidersError, setAnimatedProvidersError] = useState(null);
    
//     const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
//     const [providerForReview, setProviderForReview] = useState(null);

//     const handleOpenReviewModal = (provider) => {
//         if (!isSignedIn) { openSignIn(); return; }
//         setProviderForReview(provider);
//         setIsReviewModalOpen(true);
//     };
//     const handleCloseReviewModal = () => setIsReviewModalOpen(false);
//     const handleSubmitReview = async (reviewData) => {
//         if (!providerForReview || !user) return;
//         const session = window.Clerk.session;
//         if (!session) { console.error("Clerk session not available"); return; }
//         const token = await session.getToken();
//         if (!token) { console.error("Not authenticated, no token"); return; }

//         try {
//             const response = await fetch(`${API_URL}/api/reviews`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({
//                     providerId: providerForReview.provider_id || providerForReview.id,
//                     userId: user.id,
//                     rating: reviewData.rating,
//                     reviewText: reviewData.review,
//                     tags: reviewData.tags,
//                 }),
//             });
//             if (!response.ok) throw new Error('Failed to submit review');
            
//         } catch (error) {
//             console.error("Error submitting review:", error);
//         }
//     };
//      const handleLikePlaceholder = (providerId) => {
//         console.log("Like toggled for providerId:", providerId);
//     };

//     useEffect(() => {
//         const fetchPreferredName = async () => {
//             if (!isLoaded || !isSignedIn || !user?.primaryEmailAddress?.emailAddress) {
//                 setPreferredName(""); return;
//             }
//             try {
//                 const response = await fetch(`${API_URL}/api/users/preferred-name?email=${encodeURIComponent(user.primaryEmailAddress.emailAddress)}`);
//                 if (response.ok) {
//                     const data = await response.json();
//                     setPreferredName(data.preferredName || "");
//                 } else { setPreferredName(""); }
//             } catch (error) { console.error("Error fetching preferred name:", error); setPreferredName(""); }
//         };
//         fetchPreferredName();
//     }, [isLoaded, isSignedIn, user]);

//     const targetText = useMemo(() => {
//         if (!isLoaded) return `Welcome to ${BRAND_PHRASE}`;
//         if (!isSignedIn) return `Welcome to ${BRAND_PHRASE}`;
//         return preferredName || user?.firstName ? `Welcome back, ${preferredName || user.firstName}.` : `Welcome to ${BRAND_PHRASE}`;
//     }, [isLoaded, isSignedIn, preferredName, user?.firstName]);

//     const [displayText, setDisplayText] = useState("");
//     const [isTyping, setIsTyping] = useState(true);

//     useEffect(() => {
//         setDisplayText(""); setIsTyping(true); setShowStatsLine(false);
//     }, [targetText]);

//     useEffect(() => {
//         if (!isTyping || !targetText) { if (!targetText) setIsTyping(false); return; }
//         if (displayText.length < targetText.length) {
//             const next = targetText.substring(0, displayText.length + 1);
//             const t = setTimeout(() => setDisplayText(next), 100);
//             return () => clearTimeout(t);
//         } else { setIsTyping(false); }
//     }, [displayText, isTyping, targetText]);

//     useEffect(() => {
//         if (!isTyping && displayText === targetText && displayText !== "") {
//             if (isSignedIn) setShowStatsLine(true);
//         } else { setShowStatsLine(false); }
//     }, [isTyping, displayText, targetText, isSignedIn]);

//     useEffect(() => {
//         if (!isLoaded) return;
//         const fetchCounts = async () => {
//             if (!isSignedIn || !user) { setProviderCount(0); setConnectionCount(0); return; }
//             try {
//                 const params = new URLSearchParams({ user_id: user.id, email: user.primaryEmailAddress?.emailAddress, firstName: user.firstName || "", lastName: user.lastName || "" });
//                 const providerRes = await fetch(`${API_URL}/api/providers/count?${params.toString()}`);
//                 if (providerRes.ok) { const d = await providerRes.json(); setProviderCount(d.count || 0); } else { setProviderCount(0); }
//                 const connRes = await fetch(`${API_URL}/api/connections/check-connections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.primaryEmailAddress.emailAddress }), });
//                 if (connRes.ok) { const d = await connRes.json(); const u = Array.isArray(d) ? Array.from(new Set(d.map((x) => x.email))) : []; setConnectionCount(u.length); } else { setConnectionCount(0); }
//             } catch (err) { console.error("Error fetching counts:", err); setProviderCount(0); setConnectionCount(0); }
//         };
//         fetchCounts();
//     }, [isLoaded, isSignedIn, user]);

//     useEffect(() => {
//         const fetchAnimatedProviders = async () => {
//             if (!isLoaded) return;
//             if (isSignedIn && user) {
//                 setIsLoadingAnimatedProviders(true); setAnimatedProvidersError(null);
//                 try {
//                     const params = new URLSearchParams({ user_id: user.id, email: user.primaryEmailAddress.emailAddress, firstName: user.firstName || "", lastName: user.lastName || "", limit: '7', sortBy: 'date_of_recommendation', sortOrder: 'desc' });
//                     const response = await fetch(`${API_URL}/api/providers/newest-visible?${params.toString()}`);
//                     if (!response.ok) throw new Error(`API error: ${response.statusText}`);
//                     const data = await response.json();
//                     if (data.success && data.providers) {
//                         setAnimatedProviders(data.providers.map(p => ({ ...p, id: p.provider_id })));
//                     } else { setAnimatedProviders([]); }
//                 } catch (error) { console.error("Error fetching animated providers:", error); setAnimatedProvidersError(error.message); setAnimatedProviders([]); }
//                 finally { setIsLoadingAnimatedProviders(false); }
//             } else {
//                 setAnimatedProviders(placeholderPublicRecommendations.map(p => ({ ...p, id: p.provider_id })));
//                 setIsLoadingAnimatedProviders(false); setAnimatedProvidersError(null);
//             }
//         };
//         fetchAnimatedProviders();
//     }, [isLoaded, isSignedIn, user]);

//     const handleSearch = async (e) => {
//         if (e) e.preventDefault();
//         const q = searchQuery.trim();
//         if (!q || !isLoaded) return;
//         if (!isSignedIn) { openSignIn(); setIsSearching(false); return; }
//         setIsSearching(true);
//         try {
//             const params = new URLSearchParams({ q: q, user_id: user.id, email: user.primaryEmailAddress?.emailAddress, location: LOCKED_LOCATION });
//             const searchUrl = `${API_URL}/api/providers/search?${params.toString()}`;
//             const response = await fetch(searchUrl);
//             const responseBody = await response.text();
//             if (!response.ok) { let errP; try { errP = JSON.parse(responseBody); } catch (pE) { throw new Error(`HTTP error! status: ${response.status}, Non-JSON response: ${responseBody}`); } throw new Error(errP.message || errP.error || `HTTP error! ${response.status}`); }
//             const d = JSON.parse(responseBody);
//             if (d.success) { const base = `/search?q=${encodeURIComponent(q)}&location=${encodeURIComponent(LOCKED_LOCATION)}`; navigate(d.providers?.length > 0 ? base : base + "&noResults=true", { state: { initialProviders: d.providers, currentSearchUserId: user.id }, });
//             } else { throw new Error(d.message || d.error || "Search not successful"); }
//         } catch (err) { console.error("Search error:", err); }
//         finally { setIsSearching(false); }
//     };

//     const handleLocationClick = () => setShowLocationModal(true);

//     if (location.pathname !== "/") return null;

//     const highlightTarget = useMemo(() => {
//         if (!isLoaded || !isSignedIn) return BRAND_PHRASE;
//         return preferredName || user?.firstName || BRAND_PHRASE;
//     }, [isLoaded, isSignedIn, preferredName, user?.firstName]);

//     return (
//         <div className="home">
//             <div className="hero-container">
//                 <motion.h1 className="main-title" key={targetText} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
//                     dangerouslySetInnerHTML={{ __html: displayText && highlightTarget && displayText.includes(highlightTarget) ? displayText.replace(highlightTarget, `<span class="highlight-box">${highlightTarget}</span>`) : displayText, }} />
//                 <form className="search-form-wrapper" onSubmit={handleSearch}>
//                     <div className="search-input-group">
//                         <input className="main-search-input" type="text" placeholder={isMobile ? "Search services..." : "Search for home services, financial advisors..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={isSearching} />
//                         <div className="location-input-wrapper" onClick={handleLocationClick}>
//                             <MapPinIcon className="location-icon" /> <span className="location-text">{LOCKED_LOCATION}</span> <LockClosedIcon className="location-lock-icon" />
//                         </div>
//                         <button type="submit" className="search-submit-button" disabled={isSearching}> {isSearching ? <span className="search-spinner"></span> : <MagnifyingGlassIcon className="search-button-icon" />} </button>
//                     </div>
//                 </form>
//             </div>
//             <div className="yc-stats">
//                 <div
//                     className="stat clickable-stat"
//                     onClick={() => {
//                         if (isSignedIn) { 
//                             navigate("/trustcircles?tab=myRecommendations");
//                         } else {
//                             openSignIn(); 
//                         }
//                     }}
//                     style={{ cursor: "pointer" }}
//                 >
//                     <p className="number">
//                         <CountUp
//                             end={providerCount || 0}
//                             duration={2}
//                             separator=","
//                         />
//                     </p>
//                     <p className="label">
//                         Recommendations
//                         <br />
//                         shared with you
//                     </p>
//                 </div>
//                 <div
//                     className="stat clickable-stat"
//                     onClick={() => {
//                         if (isSignedIn) { 
//                              navigate("/trustcircles?tab=myTrust");
//                         } else {
//                             openSignIn(); 
//                         }
//                     }}
//                     style={{ cursor: "pointer" }}
//                 >
//                     <p className="number">
//                         <CountUp end={connectionCount || 0} duration={2} />
//                     </p>
//                     <p className="label">
//                         People in Your
//                         <br />
//                         Trust Circle
//                     </p>
//                 </div>
//             </div>
//             <div className="recommendations-section-wrapper">
//                 <p className="subtitle">
//                     Recent recommendations from &nbsp;
//                     <span className="underline-highlight">your Trust Circle.</span>
//                 </p>
//                 <div className="recommendation-carousel-container">
//                     {isLoadingAnimatedProviders && <div className="carousel-message">Loading recommendations...</div>}
//                     {animatedProvidersError && <div className="carousel-message carousel-error">Could not load recommendations.</div>}
//                     {!isLoadingAnimatedProviders && !animatedProvidersError && animatedProviders.length > 0 && (
//                         animatedProviders.map((provider, index) => (
//                             <div
//                                 key={provider.id || index}
//                                 className="carousel-item-wrapper"
//                             >
//                                 <PublicRecommendationCard
//                                     rec={provider}
//                                     onWriteReview={handleOpenReviewModal}
//                                     onLike={handleLikePlaceholder}
//                                     isLikedByCurrentUser={false} 
//                                     loggedInUserId={user?.id}
//                                     currentUserName={preferredName || user?.firstName}
//                                 />
//                             </div>
//                         ))
//                     )}
//                     {!isLoadingAnimatedProviders && !animatedProvidersError && animatedProviders.length === 0 && (
//                         <div className="carousel-message"> {isSignedIn ? "No recent recommendations for you yet." : "Discover trusted services recommended by your network!"} </div>
//                     )}
//                 </div>
//             </div>
//              <ReviewModal
//                 isOpen={isReviewModalOpen}
//                 onClose={handleCloseReviewModal}
//                 onSubmit={handleSubmitReview}
//                 providerName={providerForReview?.business_name}
//             />
//             {isSignedIn && (
//                 <motion.div className="network-cta" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: showStatsLine ? 1.0 : 0.8, duration: 0.6 }}>
//                     <p> Want more recommendations?{" "} <span className="cta-link" onClick={() => navigate("/trustcircles")}>Invite friends</span> {" "}to grow your Trust Circle. </p>
//                 </motion.div>
//             )}
//             {showLocationModal && (
//                 <div className="location-modal-overlay">
//                     <div className="location-modal-content">
//                         <button className="location-modal-close" onClick={() => setShowLocationModal(false)}> <XMarkIcon /> </button>
//                         <h3>Expanding Our Horizons!</h3>
//                         <p>We're currently focused on serving the <strong>Greater Seattle Area</strong>.</p>
//                         <p>We're working hard to expand and will be launching nationally soon. Stay tuned!</p>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default Home;

// working version 5/31
// import React, { useEffect, useState, useMemo } from "react";
// import { useUser, useClerk } from "@clerk/clerk-react";
// import { useNavigate, useLocation, Link } from "react-router-dom";
// import { useMediaQuery } from "react-responsive";
// import { motion } from "framer-motion";
// import CountUp from "react-countup";
// import {
//     MapPinIcon,
//     LockClosedIcon,
//     XMarkIcon,
//     MagnifyingGlassIcon,
// } from "@heroicons/react/24/solid";
// import { FaStar, FaThumbsUp, FaPlusCircle } from 'react-icons/fa';
// import "./Home.css";

// const API_URL = "http://localhost:3000";
// const BRAND_PHRASE = "Tried & Trusted.";
// const LOCKED_LOCATION = "Greater Seattle Area";

// const placeholderPublicRecommendations = [
//     { id: 'pub1', provider_id: 'pub1', business_name: "Evergreen Home Services", primary_service: "Landscaping", average_rating: 4.8, total_reviews: 15, recommender_message: "Top-notch local landscapers, great attention to detail and beautiful results every time. Highly recommend for any garden work.", tags: ["landscaping", "reliable", "quality"], num_likes: 22, recommender_name: "Sarah M.", date_of_recommendation: "2024-05-15T10:00:00Z", city: "Bellevue", state: "WA" },
//     { id: 'pub2', provider_id: 'pub2', business_name: "Sound Financial Advisors", primary_service: "Financial Planning", average_rating: 5.0, total_reviews: 25, recommender_message: "They provide clear, actionable advice. Helped me set up a solid retirement plan. Client focus is evident.", tags: ["finance", "planning", "expert"], num_likes: 30, recommender_name: "John B.", date_of_recommendation: "2024-04-20T10:00:00Z", city: "Seattle", state: "WA" },
//     { id: 'pub3', provider_id: 'pub3', business_name: "Cascade Auto Repair", primary_service: "Auto Maintenance", average_rating: 4.5, total_reviews: 40, recommender_message: "Honest mechanics, fair prices, and quick service. My go-to for car troubles.", tags: ["auto", "repair", "trustworthy"], num_likes: 18, recommender_name: "Alice C.", date_of_recommendation: "2024-03-10T10:00:00Z", city: "Redmond", state: "WA" },
// ];

// const StarRatingDisplay = ({ rating }) => {
//     const numRating = parseFloat(rating) || 0;
//     const fullStars = Math.floor(numRating);
//     const hasHalfStar = numRating - fullStars >= 0.25 && numRating - fullStars < 0.75;
//     const effectivelyFullStars = numRating - fullStars >= 0.75 ? fullStars + 1 : fullStars;
//     const displayFullStars = hasHalfStar ? fullStars : effectivelyFullStars;
//     const displayHalfStar = hasHalfStar;
//     const emptyStars = 5 - displayFullStars - (displayHalfStar ? 1 : 0);

//     return (
//         <div className="star-rating-display">
//             {[...Array(displayFullStars)].map((_, i) => <FaStar key={`full-${i}`} className="star-filled" />)}
//             {displayHalfStar && <FaStar key="half" className="star-half" />}
//             {[...Array(emptyStars < 0 ? 0 : emptyStars)].map((_, i) => <FaStar key={`empty-${i}`} className="star-empty" />)}
//         </div>
//     );
// };

// const ReviewModal = ({ isOpen, onClose, onSubmit, providerName }) => {
//     const [rating, setRating] = useState(0);
//     const [hover, setHover] = useState(0);
//     const [reviewText, setReviewText] = useState("");
//     const [tags, setTags] = useState([]);
//     const [tagInput, setTagInput] = useState("");
//     const [error, setError] = useState("");

//     useEffect(() => {
//         if (isOpen) { setRating(0); setHover(0); setReviewText(""); setTags([]); setTagInput(""); setError(""); }
//     }, [isOpen]);

//     const handleSubmit = (e) => {
//         e.preventDefault(); if (!rating) { setError("Please select a rating."); return; }
//         onSubmit({ rating, review: reviewText, tags }); onClose();
//     };

//     const handleTagKeyDown = (e) => {
//         if (e.key === "Enter") {
//             e.preventDefault();
//             const trimmed = tagInput.trim().toLowerCase();
//             if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
//                 setTags([...tags, trimmed]);
//             }
//             setTagInput("");
//         }
//     };

//     const removeTag = (tagToRemove) => setTags(tags.filter((tag) => tag !== tagToRemove));

//     if (!isOpen) return null;

//     return (
//         <div className="modal-overlay review-modal-overlay">
//             <div className="modal-content review-modal-content">
//                 <button className="modal-close-button" onClick={onClose}><XMarkIcon /></button>
//                 <h2>Review {providerName}</h2>
//                 <form onSubmit={handleSubmit}>
//                     <div className="rating-container">
//                         <label>Rate your experience: <span className="required">*</span></label>
//                         <div className="stars-interactive">
//                             {[...Array(5)].map((_, index) => (
//                                 <FaStar key={index} className={index < (hover || rating) ? "star-interactive active" : "star-interactive"} onClick={() => setRating(index + 1)} onMouseEnter={() => setHover(index + 1)} onMouseLeave={() => setHover(rating)} />
//                             ))}
//                         </div>
//                         {error && <div className="error-message">{error}</div>}
//                     </div>
//                     <div className="review-text-input">
//                         <label htmlFor="reviewTextArea">Tell us about your experience:</label>
//                         <textarea id="reviewTextArea" value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Share your thoughts..." rows={4} />
//                     </div>
//                     <div className="tag-input-group">
//                         <label htmlFor="tagReviewInput">Add tags (up to 5, press Enter):</label>
//                         <input id="tagReviewInput" type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="e.g. friendly, affordable" />
//                         <div className="tag-container modal-tag-container">{tags.map((tag, idx) => (<span key={idx} className="tag-badge">{tag} <span className="remove-tag" onClick={() => removeTag(tag)}>×</span></span>))}</div>
//                     </div>
//                     <div className="modal-buttons">
//                         <button type="button" onClick={onClose} className="button-cancel">Cancel</button>
//                         <button type="submit" className="button-submit">Submit Review</button>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// };

// const PublicRecommendationCard = ({ rec, onWriteReview, onLike, isLikedByCurrentUser, loggedInUserId, currentUserName }) => {
//     const providerIdForLink = rec.provider_id || rec.id;
//     const displayAvgRating = (parseFloat(rec.average_rating) || 0).toFixed(1);
//     const displayTotalReviews = parseInt(rec.total_reviews, 10) || 0;
//     const [dropdownOpen, setDropdownOpen] = useState(false);
//     const [linkCopied, setLinkCopied] = useState(false);
//     const dropdownRef = React.useRef(null);

//     const shareLink = () => {
//         navigator.clipboard.writeText(`${window.location.origin}/provider/${providerIdForLink}`);
//         setDropdownOpen(false);
//         setLinkCopied(true);
//         setTimeout(() => setLinkCopied(false), 2000);
//     };
    
//     useEffect(() => {
//         const handleClickOutside = (event) => {
//             if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//                 setDropdownOpen(false);
//             }
//         };
//         document.addEventListener("mousedown", handleClickOutside);
//         return () => document.removeEventListener("mousedown", handleClickOutside);
//     }, [dropdownRef]);


//     return (
//         <div className="public-provider-card">
//             <div className="public-card-header">
//                 <h3 className="public-card-title">
//                     <Link to={`/provider/${providerIdForLink}`} className="public-provider-name-link" onClick={() => localStorage.setItem("selectedProvider", JSON.stringify(rec))}>
//                         {rec.business_name || "Unknown Business"}
//                     </Link>
//                 </h3>
//                 <div className="public-badge-wrapper-with-menu">
//                     {(parseFloat(rec.average_rating) || 0) >= 4.5 && (<span className="public-badge top-rated-badge">Top Rated</span>)}
//                     <div className="public-dropdown-wrapper" ref={dropdownRef}>
//                         <button className="public-three-dots-button" onClick={() => setDropdownOpen(!dropdownOpen)} title="Options">⋮</button>
//                         {dropdownOpen && (
//                             <div className="public-dropdown-menu">
//                                 <button className="public-dropdown-item" onClick={shareLink}>Share this Rec</button>
//                             </div>
//                         )}
//                     </div>
//                 </div>
//             </div>

//             <div className="public-review-summary">
//                 <StarRatingDisplay rating={rec.average_rating || 0} />
//                 <span className="public-review-score">{displayAvgRating}</span>
//                 <span className="public-review-count">({displayTotalReviews} {displayTotalReviews === 1 ? "review" : "reviews"})</span>
//                 {loggedInUserId && (
//                     <button className="public-write-review-link" onClick={() => onWriteReview(rec)}>Write a Review</button>
//                 )}
//                 <button className={`public-like-button ${isLikedByCurrentUser ? 'liked' : ''}`} onClick={() => onLike(providerIdForLink)} title={isLikedByCurrentUser ? "Unlike" : "Like"} disabled={!loggedInUserId}>
//                     <FaThumbsUp /> <span className="public-like-count">{rec.num_likes || 0}</span>
//                 </button>
//             </div>

//             <p className="public-card-description">{rec.recommender_message || "No specific message provided for this recommendation."}</p>

//             <div className="public-tag-container">
//                 {Array.isArray(rec.tags) && rec.tags.slice(0, 3).map((tag, idx) => (
//                     <span key={idx} className="public-tag-badge">{tag}</span>
//                 ))}
//                 {loggedInUserId && (
//                     <button className="public-add-tag-button" onClick={() => onWriteReview(rec)} aria-label="Add or edit tags">
//                         <FaPlusCircle />
//                     </button>
//                 )}
//             </div>

//             {rec.recommender_name && (
//               <div className="public-recommended-row">
//                   <span className="public-recommended-label">Recommended by:</span>
//                   <Link to={`/profile/${rec.recommender_id || 'user'}`} className="public-recommended-name">{rec.recommender_name}</Link>
//                   {rec.date_of_recommendation && (
//                       <span className="public-recommendation-date">
//                           ({new Date(rec.date_of_recommendation).toLocaleDateString("en-US", { year: "2-digit", month: "numeric", day: "numeric" })})
//                       </span>
//                   )}
//               </div>
//             )}
            
//             <div className="public-action-buttons">
//                 {loggedInUserId && (rec.recommender_phone || rec.recommender_email) && (
//                     <button className="button-secondary" onClick={() => {
//                         if (rec.recommender_phone) window.location.href = `sms:${rec.recommender_phone.replace(/\D/g, '')}`;
//                         else if (rec.recommender_email) window.location.href = `mailto:${rec.recommender_email}`;
//                     }}>Connect with Recommender</button>
//                 )}
//             </div>
//             {linkCopied && (<div className="public-toast">Link copied to clipboard!</div>)}
//         </div>
//     );
// };

// const Home = () => {
//     const { isLoaded, isSignedIn, user } = useUser();
//     const { openSignIn } = useClerk();
//     const navigate = useNavigate();
//     const location = useLocation();
//     const isMobile = useMediaQuery({ maxWidth: 768 });

//     const [isSearching, setIsSearching] = useState(false);
//     const [searchQuery, setSearchQuery] = useState("");
//     const [showLocationModal, setShowLocationModal] = useState(false);
//     const [preferredName, setPreferredName] = useState("");

//     const [providerCount, setProviderCount] = useState(0);
//     const [connectionCount, setConnectionCount] = useState(0);
//     const [showStatsLine, setShowStatsLine] = useState(false);

//     const [animatedProviders, setAnimatedProviders] = useState([]);
//     const [isLoadingAnimatedProviders, setIsLoadingAnimatedProviders] = useState(false);
//     const [animatedProvidersError, setAnimatedProvidersError] = useState(null);
//     const [currentAnimatedProviderIndex, setCurrentAnimatedProviderIndex] = useState(0);

//     const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
//     const [providerForReview, setProviderForReview] = useState(null);

//     const handleOpenReviewModal = (provider) => {
//         if (!isSignedIn) { openSignIn(); return; }
//         setProviderForReview(provider);
//         setIsReviewModalOpen(true);
//     };
//     const handleCloseReviewModal = () => setIsReviewModalOpen(false);
//     const handleSubmitReview = async (reviewData) => {
//         console.log("Review submitted:", reviewData, "for", providerForReview);
        
//         if (!providerForReview || !user) return;
//         const session = window.Clerk.session;
//         if (!session) { console.error("Clerk session not available"); return; }
//         const token = await session.getToken();
//         if (!token) { console.error("Not authenticated, no token"); return; }

//         try {
//             const response = await fetch(`${API_URL}/api/reviews`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({
//                     providerId: providerForReview.provider_id || providerForReview.id,
//                     userId: user.id,
//                     rating: reviewData.rating,
//                     reviewText: reviewData.review,
//                     tags: reviewData.tags,
//                 }),
//             });
//             if (!response.ok) throw new Error('Failed to submit review');
            
//         } catch (error) {
//             console.error("Error submitting review:", error);
//         }
//     };
//      const handleLikePlaceholder = (providerId) => {
//         console.log("Like toggled for providerId:", providerId);
//     };

//     useEffect(() => {
//         const fetchPreferredName = async () => {
//             if (!isLoaded || !isSignedIn || !user?.primaryEmailAddress?.emailAddress) {
//                 setPreferredName(""); return;
//             }
//             try {
//                 const response = await fetch(`${API_URL}/api/users/preferred-name?email=${encodeURIComponent(user.primaryEmailAddress.emailAddress)}`);
//                 if (response.ok) {
//                     const data = await response.json();
//                     setPreferredName(data.preferredName || "");
//                 } else { setPreferredName(""); }
//             } catch (error) { console.error("Error fetching preferred name:", error); setPreferredName(""); }
//         };
//         fetchPreferredName();
//     }, [isLoaded, isSignedIn, user]);

//     const targetText = useMemo(() => {
//         if (!isLoaded) return `Welcome to ${BRAND_PHRASE}`;
//         if (!isSignedIn) return `Welcome to ${BRAND_PHRASE}`;
//         return preferredName || user?.firstName ? `Welcome back, ${preferredName || user.firstName}.` : `Welcome to ${BRAND_PHRASE}`;
//     }, [isLoaded, isSignedIn, preferredName, user?.firstName]);

//     const [displayText, setDisplayText] = useState("");
//     const [isTyping, setIsTyping] = useState(true);

//     useEffect(() => {
//         setDisplayText(""); setIsTyping(true); setShowStatsLine(false);
//     }, [targetText]);

//     useEffect(() => {
//         if (!isTyping || !targetText) { if (!targetText) setIsTyping(false); return; }
//         if (displayText.length < targetText.length) {
//             const next = targetText.substring(0, displayText.length + 1);
//             const t = setTimeout(() => setDisplayText(next), 100);
//             return () => clearTimeout(t);
//         } else { setIsTyping(false); }
//     }, [displayText, isTyping, targetText]);

//     useEffect(() => {
//         if (!isTyping && displayText === targetText && displayText !== "") {
//             if (isSignedIn) setShowStatsLine(true);
//         } else { setShowStatsLine(false); }
//     }, [isTyping, displayText, targetText, isSignedIn]);

//     useEffect(() => {
//         if (!isLoaded) return;
//         const fetchCounts = async () => {
//             if (!isSignedIn || !user) { setProviderCount(0); setConnectionCount(0); return; }
//             try {
//                 const params = new URLSearchParams({ user_id: user.id, email: user.primaryEmailAddress?.emailAddress, firstName: user.firstName || "", lastName: user.lastName || "" });
//                 const providerRes = await fetch(`${API_URL}/api/providers/count?${params.toString()}`);
//                 if (providerRes.ok) { const d = await providerRes.json(); setProviderCount(d.count || 0); } else { setProviderCount(0); }
//                 const connRes = await fetch(`${API_URL}/api/connections/check-connections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.primaryEmailAddress.emailAddress }), });
//                 if (connRes.ok) { const d = await connRes.json(); const u = Array.isArray(d) ? Array.from(new Set(d.map((x) => x.email))) : []; setConnectionCount(u.length); } else { setConnectionCount(0); }
//             } catch (err) { console.error("Error fetching counts:", err); setProviderCount(0); setConnectionCount(0); }
//         };
//         fetchCounts();
//     }, [isLoaded, isSignedIn, user]);

//     useEffect(() => {
//         const fetchAnimatedProviders = async () => {
//             if (!isLoaded) return;
//             if (isSignedIn && user) {
//                 setIsLoadingAnimatedProviders(true); setAnimatedProvidersError(null);
//                 try {
//                     const params = new URLSearchParams({ user_id: user.id, email: user.primaryEmailAddress.emailAddress, firstName: user.firstName || "", lastName: user.lastName || "", limit: '7', sortBy: 'date_of_recommendation', sortOrder: 'desc' });
//                     const response = await fetch(`${API_URL}/api/providers/newest-visible?${params.toString()}`);
//                     if (!response.ok) throw new Error(`API error: ${response.statusText}`);
//                     const data = await response.json();
//                     if (data.success && data.providers) {
//                         setAnimatedProviders(data.providers.map(p => ({ ...p, id: p.provider_id })));
//                     } else { setAnimatedProviders([]); }
//                 } catch (error) { console.error("Error fetching animated providers:", error); setAnimatedProvidersError(error.message); setAnimatedProviders([]); }
//                 finally { setIsLoadingAnimatedProviders(false); }
//             } else {
//                 setAnimatedProviders(placeholderPublicRecommendations.map(p => ({ ...p, id: p.provider_id })));
//                 setIsLoadingAnimatedProviders(false); setAnimatedProvidersError(null);
//             }
//         };
//         fetchAnimatedProviders();
//     }, [isLoaded, isSignedIn, user]);

//     useEffect(() => {
//         if (animatedProviders.length > 1) {
//             const timer = setTimeout(() => setCurrentAnimatedProviderIndex((prevIndex) => (prevIndex + 1) % animatedProviders.length), 7000);
//             return () => clearTimeout(timer);
//         }
//     }, [currentAnimatedProviderIndex, animatedProviders.length]);

//     const handleSearch = async (e) => {
//         if (e) e.preventDefault();
//         const q = searchQuery.trim();
//         if (!q || !isLoaded) return;
//         if (!isSignedIn) { openSignIn(); setIsSearching(false); return; }
//         setIsSearching(true);
//         try {
//             const params = new URLSearchParams({ q: q, user_id: user.id, email: user.primaryEmailAddress?.emailAddress, location: LOCKED_LOCATION });
//             const searchUrl = `${API_URL}/api/providers/search?${params.toString()}`;
//             const response = await fetch(searchUrl);
//             const responseBody = await response.text();
//             if (!response.ok) { let errP; try { errP = JSON.parse(responseBody); } catch (pE) { throw new Error(`HTTP error! status: ${response.status}, Non-JSON response: ${responseBody}`); } throw new Error(errP.message || errP.error || `HTTP error! ${response.status}`); }
//             const d = JSON.parse(responseBody);
//             if (d.success) { const base = `/search?q=${encodeURIComponent(q)}&location=${encodeURIComponent(LOCKED_LOCATION)}`; navigate(d.providers?.length > 0 ? base : base + "&noResults=true", { state: { initialProviders: d.providers, currentSearchUserId: user.id }, });
//             } else { throw new Error(d.message || d.error || "Search not successful"); }
//         } catch (err) { console.error("Search error:", err); }
//         finally { setIsSearching(false); }
//     };

//     const handleLocationClick = () => setShowLocationModal(true);

//     if (location.pathname !== "/") return null;

//     const highlightTarget = useMemo(() => {
//         if (!isLoaded || !isSignedIn) return BRAND_PHRASE;
//         return preferredName || user?.firstName || BRAND_PHRASE;
//     }, [isLoaded, isSignedIn, preferredName, user?.firstName]);

//     const currentProviderToDisplay = animatedProviders[currentAnimatedProviderIndex];

//     return (
//         <div className="home">
//             <div className="hero-container">
//                 <motion.h1 className="main-title" key={targetText} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
//                     dangerouslySetInnerHTML={{ __html: displayText && highlightTarget && displayText.includes(highlightTarget) ? displayText.replace(highlightTarget, `<span class="highlight-box">${highlightTarget}</span>`) : displayText, }} />
//                 <form className="search-form-wrapper" onSubmit={handleSearch}>
//                     <div className="search-input-group">
//                         <input className="main-search-input" type="text" placeholder={isMobile ? "Search services..." : "Search for home services, financial advisors..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={isSearching} />
//                         <div className="location-input-wrapper" onClick={handleLocationClick}>
//                             <MapPinIcon className="location-icon" /> <span className="location-text">{LOCKED_LOCATION}</span> <LockClosedIcon className="location-lock-icon" />
//                         </div>
//                         <button type="submit" className="search-submit-button" disabled={isSearching}> {isSearching ? <span className="search-spinner"></span> : <MagnifyingGlassIcon className="search-button-icon" />} </button>
//                     </div>
//                 </form>
//             </div>
//             <div className="yc-stats">
//                 {/* MODIFICATION START: Make this stat block clickable */}
//                 <div
//                     className="stat clickable-stat" // Added a class for potential styling
//                     onClick={() => {
//                         if (isSignedIn) { // Optional: only navigate if signed in
//                             navigate("/trustcircles?tab=myRecommendations");
//                         } else {
//                             openSignIn(); // Or prompt to sign in
//                         }
//                     }}
//                     style={{ cursor: "pointer" }} // Added inline style for cursor
//                 >
//                     <p className="number">
//                         <CountUp
//                             end={providerCount || 0}
//                             duration={2}
//                             separator=","
//                         />
//                     </p>
//                     <p className="label">
//                         Recommendations
//                         <br />
//                         shared with you
//                     </p>
//                 </div>
//                 {/* MODIFICATION END */}

//                 {/* <div className="stat">
//                     <p className="number">{recommenderRankDisplay}</p>
//                     <p className="label">
//                         Your Recommender
//                         <br />
//                         Rank
//                     </p>
//                 </div> */}

//                 {/* MODIFICATION START: Make this stat block clickable */}
//                 <div
//                     className="stat clickable-stat" // Added a class for potential styling
//                     onClick={() => {
//                         if (isSignedIn) { // Optional: only navigate if signed in
//                              navigate("/trustcircles?tab=myTrust");
//                         } else {
//                             openSignIn(); // Or prompt to sign in
//                         }
//                     }}
//                     style={{ cursor: "pointer" }} // Added inline style for cursor
//                 >
//                     <p className="number">
//                         <CountUp end={connectionCount || 0} duration={2} />
//                     </p>
//                     <p className="label">
//                         People in Your
//                         <br />
//                         Trust Circle
//                     </p>
//                 </div>
//                 {/* MODIFICATION END */}
//             </div>
//             {/* {isSignedIn && (
//                 <p className="stats-line">
//                     {showStatsLine ? (<> You have{" "} <span className="linked-stat-phrase" onClick={() => navigate("/trustcircles?tab=myRecommendations")}> {providerCount} recommendations </span> {" "}shared with you and{" "} <span className="linked-stat-phrase" onClick={() => navigate("/trustcircles?tab=myTrust")}> {connectionCount} individual connections </span>.</>) : ( <>&nbsp;</> )}
//                 </p>
//             )} */}
//             {/* {isSignedIn && !isLoadingAnimatedProviders && !animatedProvidersError && animatedProviders.length > 0 && (
//                 <h2 className="carousel-section-title">Recent Recommendations from Your Trust Circle</h2>
//             )} */}
//             <p className="subtitle">
//                 Recent recommendations from &nbsp;
//                 <span className="underline-highlight">your Trust Circle.</span>
//             </p>
//             <div className="recommendation-carousel-container">
//                 {isLoadingAnimatedProviders && <div className="carousel-message">Loading recommendations...</div>}
//                 {animatedProvidersError && <div className="carousel-message carousel-error">Could not load recommendations.</div>}
//                 {!isLoadingAnimatedProviders && !animatedProvidersError && animatedProviders.length > 0 && currentProviderToDisplay && (
//                      <div
//                         key={currentProviderToDisplay.id || currentAnimatedProviderIndex}
//                         className="carousel-item-wrapper"
//                     >
//                         <PublicRecommendationCard
//                             rec={currentProviderToDisplay}
//                             onWriteReview={handleOpenReviewModal}
//                             onLike={handleLikePlaceholder}
//                             isLikedByCurrentUser={false}
//                             loggedInUserId={user?.id}
//                             currentUserName={preferredName || user?.firstName}
//                         />
//                     </div>
//                 )}
//                 {!isLoadingAnimatedProviders && !animatedProvidersError && animatedProviders.length === 0 && (
//                     <div className="carousel-message"> {isSignedIn ? "No recent recommendations for you yet." : "Discover trusted services recommended by your network!"} </div>
//                 )}
//             </div>
//              <ReviewModal
//                 isOpen={isReviewModalOpen}
//                 onClose={handleCloseReviewModal}
//                 onSubmit={handleSubmitReview}
//                 providerName={providerForReview?.business_name}
//             />
//             {isSignedIn && (
//                 <motion.div className="network-cta" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: showStatsLine ? 1.0 : 0.8, duration: 0.6 }}>
//                     <p> Want more recommendations?{" "} <span className="cta-link" onClick={() => navigate("/trustcircles")}>Invite friends</span> {" "}to grow your Trust Circle. </p>
//                 </motion.div>
//             )}
//             {showLocationModal && (
//                 <div className="location-modal-overlay">
//                     <div className="location-modal-content">
//                         <button className="location-modal-close" onClick={() => setShowLocationModal(false)}> <XMarkIcon /> </button>
//                         <h3>Expanding Our Horizons!</h3>
//                         <p>We're currently focused on serving the <strong>Greater Seattle Area</strong>.</p>
//                         <p>We're working hard to expand and will be launching nationally soon. Stay tuned!</p>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default Home;

// good 5/26
// import React, { useEffect, useState, useMemo } from "react";
// import { useUser, useClerk } from "@clerk/clerk-react";
// import { useNavigate, useLocation } from "react-router-dom";
// import { useMediaQuery } from "react-responsive";
// import { motion } from "framer-motion";
// import CountUp from "react-countup";
// import {
//     MapPinIcon,
//     LockClosedIcon,
//     XMarkIcon,
//     MagnifyingGlassIcon,
// } from "@heroicons/react/24/solid";
// import "./Home.css";

// const API_URL = 'https://api.seanag-recommendations.org:8080';
// // const API_URL = "http://localhost:5000";
// // const API_URL = "http://localhost:3000";

// const BRAND_PHRASE = "Tried & Trusted.";
// const LOCKED_LOCATION = "Greater Seattle Area";

// const Home = () => {
//     const { isLoaded, isSignedIn, user } = useUser();
//     const { openSignIn, openSignUp } = useClerk();
//     const navigate = useNavigate(); // Already imported, great!
//     const location = useLocation();
//     const isMobile = useMediaQuery({ maxWidth: 768 });

//     const [name, setName] = useState("");
//     const [isSearching, setIsSearching] = useState(false);
//     const [searchQuery, setSearchQuery] = useState("");
//     const [showLocationModal, setShowLocationModal] = useState(false);

//     const targetText = useMemo(() => {
//         if (!isLoaded) return `Welcome to ${BRAND_PHRASE}`;
//         if (!isSignedIn) return `Welcome to ${BRAND_PHRASE}`;
//         return user?.firstName
//             ? `Welcome back, ${user.firstName}.`
//             : `Welcome to ${BRAND_PHRASE}`;
//     }, [isLoaded, isSignedIn, user?.firstName]);

//     const [displayText, setDisplayText] = useState("");
//     const [isTyping, setIsTyping] = useState(true);

//     useEffect(() => {
//         setDisplayText("");
//         setIsTyping(true);
//     }, [targetText]);

//     useEffect(() => {
//         if (!isTyping || !targetText) {
//             setIsTyping(false);
//             return;
//         }
//         if (displayText.length < targetText.length) {
//             const next = targetText.substring(0, displayText.length + 1);
//             const t = setTimeout(() => {
//                 setDisplayText(next);
//             }, 100);
//             return () => clearTimeout(t);
//         } else {
//             setIsTyping(false);
//         }
//     }, [displayText, isTyping, targetText]);

//     const [providerCount, setProviderCount] = useState(0);
//     const [connectionCount, setConnectionCount] = useState(0);
//     const recommenderRankDisplay = "N/A";

//     useEffect(() => {
//         if (!isLoaded) return;

//         const fetchCounts = async () => {
//             if (!isSignedIn || !user) {
//                 setProviderCount(0);
//                 setConnectionCount(0);
//                 return;
//             }

//             // Fetch provider count
//             try {
//                 const params = new URLSearchParams({
//                     user_id: user.id,
//                     email: user.primaryEmailAddress?.emailAddress,
//                     firstName: user.firstName || "",
//                     lastName: user.lastName || "",
//                 });

//                 const providerRes = await fetch(
//                     `${API_URL}/api/providers/count?${params.toString()}`
//                 );
//                 if (providerRes.ok) {
//                     const providerData = await providerRes.json();
//                     setProviderCount(providerData.count || 0);
//                 } else {
//                     setProviderCount(0);
//                 }
//             } catch (err) {
//                 console.error("Error fetching provider count:", err);
//                 setProviderCount(0);
//             }

//             // Fetch connection count
//             if (user.primaryEmailAddress?.emailAddress) {
//                 try {
//                     const connectionsResponse = await fetch(
//                         `${API_URL}/api/connections/check-connections`,
//                         {
//                             method: "POST",
//                             headers: { "Content-Type": "application/json" },
//                             body: JSON.stringify({
//                                 email: user.primaryEmailAddress.emailAddress,
//                                 user_id: user.id,
//                             }),
//                         }
//                     );
//                     if (connectionsResponse.ok) {
//                         const connectionsData =
//                             await connectionsResponse.json();
//                         const uniqueConnections = Array.isArray(connectionsData)
//                             ? Array.from(
//                                   new Set(connectionsData.map((u) => u.email))
//                               )
//                             : [];
//                         setConnectionCount(uniqueConnections.length);
//                     } else {
//                         setConnectionCount(0);
//                     }
//                 } catch (err) {
//                     console.error("Error fetching connections:", err);
//                     setConnectionCount(0);
//                 }
//             }
//         };

//         fetchCounts();
//     }, [isLoaded, isSignedIn, user]);

//     const handleSearch = async (e) => {
//         if (e) e.preventDefault();
//         const q = searchQuery.trim();
//         if (!q) return;

//         if (!isLoaded) {
//             alert("Session still loading, please try again in a moment.");
//             return;
//         }

//         if (!isSignedIn) {
//             openSignIn();
//             setIsSearching(false);
//             return;
//         }

//         setIsSearching(true);

//         try {
//             const params = new URLSearchParams({
//                 q: q,
//                 user_id: user.id,
//                 email: user.primaryEmailAddress?.emailAddress,
//                 location: LOCKED_LOCATION,
//             });
//             const searchUrl = `${API_URL}/api/providers/search?${params.toString()}`;
//             const response = await fetch(searchUrl);
//             const responseBody = await response.text();

//             if (!response.ok) {
//                 let errorPayload;
//                 try {
//                     errorPayload = JSON.parse(responseBody);
//                 } catch (parseError) {
//                     throw new Error(
//                         `HTTP error! status: ${response.status}, Non-JSON response: ${responseBody}`
//                     );
//                 }
//                 throw new Error(
//                     errorPayload.message ||
//                         errorPayload.error ||
//                         `HTTP error! status: ${response.status}`
//                 );
//             }

//             const d = JSON.parse(responseBody);

//             if (d.success) {
//                 const base = `/search?q=${encodeURIComponent(
//                     q
//                 )}&location=${encodeURIComponent(LOCKED_LOCATION)}`;
//                 navigate(
//                     d.providers?.length > 0 ? base : base + "&noResults=true",
//                     {
//                         state: {
//                             initialProviders: d.providers,
//                             currentSearchUserId: user.id,
//                         },
//                     }
//                 );
//             } else {
//                 throw new Error(
//                     d.message ||
//                         d.error ||
//                         "Search was not successful according to API response"
//                 );
//             }
//         } catch (err) {
//             console.error("Search error:", err);
//             alert(
//                 `Search failed: ${err.message}. Please check the console for more details.`
//             );
//         } finally {
//             setIsSearching(false);
//         }
//     };

//     const triggerLoginModal = () => {
//         openSignIn();
//     };

//     const triggerSignUpModal = () => {
//         openSignUp();
//     };

//     const handleLocationClick = () => {
//         setShowLocationModal(true);
//     };

//     if (location.pathname !== "/") return null;

//     const highlightTarget = name || BRAND_PHRASE;

//     return (
//         <div className="home">
//             <div className="hero-container">
//                 <motion.h1
//                     className="main-title"
//                     key={targetText}
//                     initial={{ opacity: 0, y: 20 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     transition={{ delay: 0.4, duration: 0.6 }}
//                     dangerouslySetInnerHTML={{
//                         __html:
//                             displayText &&
//                             highlightTarget &&
//                             displayText.includes(highlightTarget)
//                                 ? displayText.replace(
//                                       highlightTarget,
//                                       `<span class="highlight-box">${highlightTarget}</span>`
//                                   )
//                                 : displayText,
//                     }}
//                 />

//                 <form className="search-form-wrapper" onSubmit={handleSearch}>
//                     <div className="search-input-group">
//                         <input
//                             className="main-search-input"
//                             type="text"
//                             placeholder={
//                                 isMobile
//                                     ? "Search services..."
//                                     : "Search for home services, financial advisors..."
//                             }
//                             value={searchQuery}
//                             onChange={(e) => setSearchQuery(e.target.value)}
//                             disabled={isSearching}
//                         />
//                         <div
//                             className="location-input-wrapper"
//                             onClick={handleLocationClick}
//                         >
//                             <MapPinIcon className="location-icon" />
//                             <span className="location-text">
//                                 {LOCKED_LOCATION}
//                             </span>
//                             <LockClosedIcon className="location-lock-icon" />
//                         </div>
//                         <button
//                             type="submit"
//                             className="search-submit-button"
//                             disabled={isSearching}
//                         >
//                             {isSearching ? (
//                                 <span className="search-spinner"></span>
//                             ) : (
//                                 <MagnifyingGlassIcon className="search-button-icon" />
//                             )}
//                         </button>
//                     </div>
//                 </form>
//                 <motion.div
//                     className="recommender-banner"
//                     initial={{ opacity: 0, y: 10 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     transition={{ delay: 1.2, duration: 0.6 }}
//                 >
//                     {isSignedIn ? (
//                         providerCount > 0 ? (
//                             <span
//                                 className="auth-link"
//                                 onClick={() => navigate("/trustcircles?tab=myRecommendations")}
//                             >
//                                 View the recommendations shared with you! →
//                             </span>
//                         ) : (
//                             <>
//                                 Add your first recommendation to unlock your Trust Circle rank!
//                             </>
//                         )
//                     ) : (
//                         <>
//                             Unlock trusted recommendations.&nbsp;
//                             <span onClick={triggerSignUpModal} className="auth-link">
//                                 Sign Up
//                             </span>
//                             &nbsp;or&nbsp;
//                             <span onClick={triggerLoginModal} className="auth-link">
//                                 Log In
//                             </span>
//                             .
//                         </>
//                     )}
//                 </motion.div>
//             </div>
//             {isSignedIn && (
//                 <motion.div
//                     className="network-cta"
//                     initial={{ opacity: 0, y: 20 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     transition={{ delay: 2.2, duration: 0.6 }}
//                 >
//                     <p>
//                         Want even more recommendations? Invite friends to unlock
//                         new insights!
//                     </p>
//                     <button
//                         onClick={() => navigate("/trustcircles")}
//                         className="primary-button"
//                     >
//                         Grow Your Trust Circle
//                     </button>
//                 </motion.div>
//             )}

//             {showLocationModal && (
//                 <div className="location-modal-overlay">
//                     <div className="location-modal-content">
//                         <button
//                             className="location-modal-close"
//                             onClick={() => setShowLocationModal(false)}
//                         >
//                             <XMarkIcon />
//                         </button>
//                         <h3>Expanding Our Horizons!</h3>
//                         <p>
//                             We're currently focused on serving the{" "}
//                             <strong>Greater Seattle Area</strong>.
//                         </p>
//                         <p>
//                             We're working hard to expand and will be launching
//                             nationally soon. Stay tuned!
//                         </p>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default Home;
