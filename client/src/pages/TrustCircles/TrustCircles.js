import { useUser } from "@clerk/clerk-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    FaCheck,
    FaEye,
    FaHeart,
    FaPlusCircle,
    FaSearch,
    FaStar,
    FaThumbsUp,
    FaUserFriends,
    FaUserPlus,
    FaUsers
} from "react-icons/fa";
import { Link, useLocation, useNavigate } from "react-router-dom";
import MemberCard from "../../components/MemberCard/MemberCard";
import QuoteModal from "../../components/QuoteModal/QuoteModal";
import SuggestedFollowersModal from "../../components/SuggestedFollowersModal/SuggestedFollowersModal";
import "./TrustCircles.css";

const API_URL = "https://api.seanag-recommendations.org:8080";
// const API_URL = "http://localhost:3000";

const PersonAddIcon = () => (
    <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="currentColor"
        style={{ marginRight: "8px" }}
    >
        <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
);
const GroupAddIcon = () => (
    <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="currentColor"
        style={{ marginRight: "8px" }}
    >
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
);
const LaunchIcon = () => (
    <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="currentColor"
        style={{ marginLeft: "6px" }}
    >
        <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
    </svg>
);
const SearchIconSvg = () => (
    <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="currentColor"
        style={{ marginRight: "8px" }}
    >
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
);
const HourglassTopIcon = () => (
    <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="currentColor"
        style={{ marginRight: "8px" }}
    >
        <path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16.01l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zM8 4h8v3.5l-4 4-4-4V4z" />
    </svg>
);

const MyRecStarRating = ({ rating }) => {
    const numRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalf = numRating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    return (
        <div className="star-rating">
            {[...Array(fullStars)].map((_, i) => (
                <FaStar key={`full-${i}`} className="filled" />
            ))}
            {hasHalf && (
                <FaStar key={`half-${Date.now()}-sr`} className="half" />
            )}
            {[...Array(emptyStars)].map((_, i) => (
                <FaStar key={`empty-${i}`} className="empty" />
            ))}
        </div>
    );
};

const MyRecReviewModal = ({ isOpen, onClose, onSubmit, provider }) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [review, setReview] = useState("");
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen) {
            setRating(0);
            setHover(0);
            setReview("");
            setTags([]);
            setTagInput("");
            setError("");
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!rating) {
            setError("Please select a rating");
            return;
        }
        onSubmit({ rating, review, tags });
        onClose();
    };

    const handleTagKeyDown = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            processTagInput();
        }
    };

    const processTagInput = () => {
        if (!tagInput.trim()) return;
        
        // Split by comma and process each tag
        const newTags = tagInput
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag && !tags.includes(tag));
        
        if (newTags.length > 0) {
            setTags([...tags, ...newTags]);
        }
        setTagInput("");
    };

    // Handle blur event to process comma-separated tags when user leaves input
    const handleTagInputBlur = () => {
        if (tagInput.includes(',')) {
            processTagInput();
        }
    };

    const removeTag = (tagToRemove) =>
        setTags(tags.filter((tag) => tag !== tagToRemove));
    if (!isOpen || !provider) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content review-modal-content">
                <h2>Review {provider?.business_name}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="rating-container">
                        <label>
                            Rate your experience:{" "}
                            <span className="required">*</span>
                        </label>
                        <div className="stars">
                            {[...Array(5)].map((_, index) => (
                                <FaStar
                                    key={index}
                                    className={
                                        index < (hover || rating)
                                            ? "star active"
                                            : "star"
                                    }
                                    onClick={() => setRating(index + 1)}
                                    onMouseEnter={() => setHover(index + 1)}
                                    onMouseLeave={() => setHover(rating)}
                                />
                            ))}
                        </div>
                        {error && <div className="error-message">{error}</div>}
                    </div>
                    <div className="review-input">
                        <label>Tell us about your experience:</label>
                        <textarea
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            placeholder="Optional: Share your thoughts..."
                            rows={4}
                        />
                    </div>
                    <div className="tag-input-group">
                        <label>Add tags (press Enter or comma to add):</label>
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            onBlur={handleTagInputBlur}
                            placeholder="e.g. friendly, affordable"
                        />
                        <div className="tag-container modal-tag-container">
                            {tags.map((tag, idx) => (
                                <span key={idx} className="tag-badge">
                                    {tag}{" "}
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
                    <div className="modal-buttons">
                        <button
                            type="button"
                            onClick={onClose}
                            className="cancel-button"
                        >
                            Cancel
                        </button>
                        <button type="submit" className="submit-button">
                            Submit Review
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const TrustCircles = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const navigate = useNavigate();
    const location = useLocation();

    const [currentUser, setCurrentUser] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserEmail, setCurrentUserEmail] = useState(null);

    const [individualConnections, setIndividualConnections] = useState([]);
    const [myCommunities, setMyCommunities] = useState([]);
    const [availableCommunities, setAvailableCommunities] = useState([]);
    const [joinRequests, setJoinRequests] = useState({});
    const [loadingTrustCircle, setLoadingTrustCircle] = useState(true);
    const [trustCircleError, setTrustCircleError] = useState("");

    const [myRecProviders, setMyRecProviders] = useState([]);
    const [myRecRawProviders, setMyRecRawProviders] = useState([]);
    const [myRecReviewMap, setMyRecReviewMap] = useState({});
    const [loadingMyRecommendations, setLoadingMyRecommendations] =
        useState(true);
    const [myRecError, setMyRecError] = useState(null);
    const [myRecIsReviewModalOpen, setMyRecIsReviewModalOpen] = useState(false);
    const [myRecSelectedProvider, setMyRecSelectedProvider] = useState(null);
    const [myRecSortOption, setMyRecSortOption] = useState("recommended");
    const [myRecDropdownOpenForId, setMyRecDropdownOpenForId] = useState(null);
    const [myRecShowLinkCopied, setMyRecShowLinkCopied] = useState(false);
    const [myRecIsQuoteModalOpen, setMyRecIsQuoteModalOpen] = useState(false);
    const [myRecLikedRecommendations, setMyRecLikedRecommendations] = useState(
        new Set()
    );
    const [myRecClickedRecommender, setMyRecClickedRecommender] =
        useState(null);
    const [myRecShowFeatureComingModal, setMyRecShowFeatureComingModal] =
        useState(false);

    const [showAddPersonModal, setShowAddPersonModal] = useState(false);
    const [newPersonPhone, setNewPersonPhone] = useState("");
    const [showProfileConfirmation, setShowProfileConfirmation] = useState(false);
    const [profileToNavigate, setProfileToNavigate] = useState(null);
    const [showCreateCommunityModal, setShowCreateCommunityModal] =
        useState(false);
    const [newCommunityName, setNewCommunityName] = useState("");
    const [newCommunityDescription, setNewCommunityDescription] = useState("");
    const [activeTab, setActiveTab] = useState("network");
    const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
    const [showDiscoverModal, setShowDiscoverModal] = useState(false);
    const [discoverSearchTerm, setDiscoverSearchTerm] = useState('');

    // Add search state for followers
    const [followersSearch, setFollowersSearch] = useState("");

    const [followingConnections, setFollowingConnections] = useState([]);
    const [followersTabActiveList, setFollowersTabActiveList] =
        useState("followers");
    const [loadingFollowing, setLoadingFollowing] = useState(false);
    const [suggestedFollows, setSuggestedFollows] = useState([]);
    const [loadingSuggestedFollows, setLoadingSuggestedFollows] = useState(false);
    const [userSearchResults, setUserSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (isLoaded && isSignedIn && user) {
            setCurrentUserId(user.id);
            setCurrentUserEmail(user.primaryEmailAddress?.emailAddress);
        } else if (isLoaded && !isSignedIn) {
            setCurrentUserId(null);
            setCurrentUserEmail(null);
        }
    }, [isLoaded, isSignedIn, user]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tabParam = params.get("tab");
        if (tabParam === "for-you") setActiveTab("for-you");
        else if (tabParam === "communities") setActiveTab("communities");
        else setActiveTab("network");
    }, [location.search]);

    const fetchMyTrustCircleData = useCallback(async () => {
        if (!currentUserId || !currentUserEmail) return;
        setLoadingTrustCircle(true);
        setTrustCircleError("");
        try {
            const params = new URLSearchParams({
                user_id: currentUserId,
                email: currentUserEmail,
            });
            const userRes = await fetch(
                `${API_URL}/api/communities/user/email/${currentUserEmail}?${params.toString()}`
            );
            if (!userRes.ok)
                throw new Error(
                    "Failed to fetch user details for Trust Circle."
                );
            const userData = await userRes.json();
            setCurrentUser({
                ...userData,
                state: userData.state || null
            });

            const followersRes = await fetch(
                `${API_URL}/api/connections/followers?user_id=${currentUserId}`
            );
            if (!followersRes.ok)
                throw new Error("Failed to fetch followers.");
            const followersData = await followersRes.json();
            setIndividualConnections(
                Array.from(new Set(followersData.map((u) => u.email))).map((email) =>
                    followersData.find((u) => u.email === email)
                )
            );

            const myCommRes = await fetch(
                `${API_URL}/api/communities/user/${currentUserEmail}/communities`
            );
            if (!myCommRes.ok)
                throw new Error("Failed to fetch your communities.");
            let myCommData = await myCommRes.json();
            myCommData = Array.isArray(myCommData)
                ? myCommData
                      .filter((c) => c && c.id)
                      .reduce(
                          (acc, curr) =>
                              acc.find((item) => item.id === curr.id)
                                  ? acc
                                  : [...acc, curr],
                          []
                      )
                : [];
            setMyCommunities(
                myCommData.map((c) => ({
                    ...c,
                    recommendations:
                        c.recommendation_count ||
                        Math.floor(Math.random() * 25),
                }))
            );

            const allCommRes = await fetch(
                `${API_URL}/api/communities/all${
                    userData && userData.id ? `?user_id=${userData.id}` : ""
                }`
            );
            if (!allCommRes.ok)
                throw new Error("Failed to fetch available communities.");
            let allCommData = await allCommRes.json();
            setAvailableCommunities(
                Array.isArray(allCommData)
                    ? allCommData.map((c) => ({
                          ...c,
                          memberCount:
                              c.member_count ||
                              Math.floor(Math.random() * 100) + 5,
                      }))
                    : []
            );

            if (userData && userData.id) {
                const ownedIds = myCommData
                    .filter((c) => c.created_by === userData.id)
                    .map((c) => c.id);
                const reqs = {};
                for (const commId of ownedIds) {
                    const userIdForRequest = userData.id;
                    if (!userIdForRequest) {
                        reqs[commId] = [];
                        continue;
                    }
                    const requestUrl = `${API_URL}/api/communities/${commId}/requests/internal?user_id=${userIdForRequest}`;
                    try {
                        const rRes = await fetch(requestUrl);
                        if (!rRes.ok) {
                            const errorText = await rRes.text();
                            throw new Error(
                                `HTTP Error ${rRes.status}: ${errorText}`
                            );
                        }
                        const allRequests = await rRes.json();
                        reqs[commId] = allRequests.filter(
                            (req) => req.status === "requested"
                        );
                    } catch (error) {
                        reqs[commId] = [];
                    }
                }
                setJoinRequests(reqs);
            }
        } catch (err) {
            setTrustCircleError(
                err.message || "Could not load Trust Circle data."
            );
        } finally {
            setLoadingTrustCircle(false);
        }
    }, [currentUserId, currentUserEmail]);

    const fetchMyVisibleRecommendations = useCallback(async () => {
        if (!currentUserId || !currentUserEmail) {
            if (isLoaded && !isSignedIn) navigate("/");
            return;
        }
        setLoadingMyRecommendations(true);
        setMyRecError(null);
        try {
            const params = new URLSearchParams({
                user_id: currentUserId,
                email: currentUserEmail,
            });
            const response = await fetch(
                `${API_URL}/api/providers/visible?${params.toString()}`
            );
            if (!response.ok) {
                const eData = await response.json().catch(() => ({}));
                throw new Error(
                    eData.message || `HTTP error ${response.status}`
                );
            }
            const data = await response.json();
            if (!data.success)
                throw new Error(
                    data.message || "Failed to fetch recommendations."
                );
            let fetchedProviders = data.providers || [];
            const statsMap = {};
            const allReviewsMap = {};
            if (fetchedProviders.length > 0) {
                await Promise.all(
                    fetchedProviders.map(async (p) => {
                        try {
                            const statsRes = await fetch(
                                `${API_URL}/api/reviews/stats/${p.id}`
                            );
                            statsMap[p.id] = statsRes.ok
                                ? await statsRes.json()
                                : { average_rating: 0, total_reviews: 0 };
                        } catch (err) {
                            statsMap[p.id] = {
                                average_rating: p.average_rating || 0,
                                total_reviews: p.total_reviews || 0,
                            };
                        }
                        try {
                            const reviewsRes = await fetch(
                                `${API_URL}/api/reviews/${p.id}`
                            );
                            allReviewsMap[p.id] = reviewsRes.ok
                                ? await reviewsRes.json()
                                : [];
                        } catch (err) {
                            allReviewsMap[p.id] = [];
                        }
                    })
                );
            }
            setMyRecReviewMap(allReviewsMap);
            const enriched = fetchedProviders.map((p, idx) => ({
                ...p,
                originalIndex: idx,
                average_rating:
                    statsMap[p.id]?.average_rating || p.average_rating || 0,
                total_reviews:
                    statsMap[p.id]?.total_reviews || p.total_reviews || 0,
                currentUserLiked: p.currentUserLiked || false,
                num_likes: parseInt(p.num_likes, 10) || 0,
            }));
            const initialLikes = new Set();
            enriched.forEach((p) => {
                if (p.currentUserLiked) initialLikes.add(p.id);
            });
            setMyRecLikedRecommendations(initialLikes);
            setMyRecRawProviders(enriched);
        } catch (err) {
            setMyRecError(err.message);
            setMyRecProviders([]);
            setMyRecRawProviders([]);
        } finally {
            setLoadingMyRecommendations(false);
        }
    }, [currentUserId, currentUserEmail, isLoaded, isSignedIn, navigate]);

    const fetchFollowingData = useCallback(async () => {
        if (!currentUserId || !currentUserEmail) return;
        setLoadingFollowing(true);
        try {
            const params = new URLSearchParams({
                user_id: currentUserId,
                email: currentUserEmail,
            });
            const res = await fetch(
                `${API_URL}/api/connections/following?${params.toString()}`
            );
            if (!res.ok) throw new Error("Failed to fetch following list.");
            const data = await res.json();
            // Assuming data is an array of users
            setFollowingConnections(Array.isArray(data) ? data : []);
        } catch (err) {
            // Handle error - maybe show a message
            console.error(err);
            setFollowingConnections([]);
        } finally {
            setLoadingFollowing(false);
        }
    }, [currentUserId, currentUserEmail]);

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            if (activeTab === "communities") {
                fetchMyTrustCircleData();
            } else if (activeTab === "network") {
                fetchMyTrustCircleData();
                fetchFollowingData();
            } else if (activeTab === "for-you") {
                fetchMyVisibleRecommendations();
            }
        } else if (isLoaded && !isSignedIn) navigate("/");
    }, [
        fetchMyTrustCircleData,
        fetchMyVisibleRecommendations,
        fetchFollowingData,
        activeTab,
        isLoaded,
        isSignedIn,
        navigate,
    ]);

    const fetchSuggestedFollows = useCallback(async () => {
        if (!currentUser?.state || !currentUserId) return;
        setLoadingSuggestedFollows(true);
        try {
            const res = await fetch(`${API_URL}/api/connections/top-recommenders?state=${encodeURIComponent(currentUser.state)}&userId=${currentUserId}`);
            if (res.ok) {
                const data = await res.json();
                setSuggestedFollows(data);
            }
        } catch (err) {
            console.error("Error fetching suggested follows", err);
        } finally {
            setLoadingSuggestedFollows(false);
        }
    }, [currentUserId, currentUser?.state]);

    useEffect(() => {
        if (activeTab === 'network' && currentUser?.state && suggestedFollows.length === 0) {
            fetchSuggestedFollows();
        }
    }, [activeTab, currentUser, suggestedFollows.length, fetchSuggestedFollows]);

    const sortedMyRecProviders = useMemo(() => {
        if (!myRecRawProviders) return [];
        const getBand = (r) => {
            if (r >= 4) return 0;
            if (r >= 3) return 1;
            if (r >= 2) return 2;
            if (r >= 1) return 3;
            return 4;
        };
        let list = [...myRecRawProviders];
        if (myRecSortOption === "topRated") {
            return list
                .filter((p) => p.average_rating >= 4.5)
                .sort((a, b) =>
                    b.average_rating !== a.average_rating
                        ? b.average_rating - a.average_rating
                        : (b.total_reviews || 0) - (a.total_reviews || 0)
                );
        }
        return list.sort((a, b) => {
            const bA = getBand(a.average_rating);
            const bB = getBand(b.average_rating);
            if (bA !== bB) return bA - bB;
            const sA = (a.average_rating || 0) * (a.total_reviews || 0);
            const sB = (b.average_rating || 0) * (b.total_reviews || 0);
            if (sB !== sA) return sB - sA;
            if (b.average_rating !== a.average_rating)
                return b.average_rating - a.average_rating;
            if ((b.total_reviews || 0) !== (a.total_reviews || 0))
                return (b.total_reviews || 0) - (a.total_reviews || 0);
            return (a.originalIndex || 0) - (b.originalIndex || 0);
        });
    }, [myRecRawProviders, myRecSortOption]);

    // Sort communities by recommendation count (descending)
    const sortedMyCommunities = useMemo(() => {
        return [...myCommunities].sort((a, b) => (b.recommendations || 0) - (a.recommendations || 0));
    }, [myCommunities]);

    // Filter and sort followers by search term and Trust Points
    const filteredFollowers = useMemo(() => {
        let followers = individualConnections;
        
        // Filter by search term if provided
        if (followersSearch.trim()) {
            followers = followers.filter(conn => {
                const name = conn.name || '';
                const email = conn.email || '';
                const searchTerm = followersSearch.toLowerCase();
                
                return name.toLowerCase().includes(searchTerm) || 
                       email.toLowerCase().includes(searchTerm);
            });
        }
        
        // Sort by Trust Points (user_score) in descending order
        return followers.sort((a, b) => {
            const scoreA = a.user_score || a.trust_points || 0;
            const scoreB = b.user_score || b.trust_points || 0;
            return scoreB - scoreA;
        });
    }, [individualConnections, followersSearch]);

    const filteredFollowing = useMemo(() => {
        let following = followingConnections;
        if (followersSearch.trim()) {
            following = following.filter((conn) => {
                const name = conn.name || "";
                const email = conn.email || "";
                const searchTerm = followersSearch.toLowerCase();
                return (
                    name.toLowerCase().includes(searchTerm) ||
                    email.toLowerCase().includes(searchTerm)
                );
            });
        }
        return following.sort((a, b) => {
            const scoreA = a.user_score || a.trust_points || 0;
            const scoreB = b.user_score || b.trust_points || 0;
            return scoreB - scoreA;
        });
    }, [followingConnections, followersSearch]);

    const discoverableCommunities = useMemo(() => {
        return availableCommunities
            .filter(c => c.user_membership_status !== 'approved' && c.created_by !== currentUser?.id)
            .filter(c => 
                c.name.toLowerCase().includes(discoverSearchTerm.toLowerCase()) ||
                (c.description && c.description.toLowerCase().includes(discoverSearchTerm.toLowerCase()))
            );
    }, [availableCommunities, discoverSearchTerm, currentUser]);

    const handleMyRecReviewSubmit = async (reviewData) => {
        if (
            !isSignedIn ||
            !myRecSelectedProvider ||
            !currentUserId ||
            !currentUserEmail
        ) {
            alert("Please sign in to submit a review");
            return;
        }
        try {
            const response = await fetch(`${API_URL}/api/reviews`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider_id: myRecSelectedProvider.id,
                    provider_email: myRecSelectedProvider.email || "",
                    user_id: currentUserId,
                    email: currentUserEmail,
                    rating: reviewData.rating,
                    content: reviewData.review,
                    tags: reviewData.tags,
                }),
            });
            if (!response.ok) {
                const errTxt = await response.text();
                throw new Error(errTxt || "Failed to submit review");
            }
            fetchMyVisibleRecommendations();
        } catch (err) {
            alert(`Error submitting review: ${err.message}`);
        }
    };

    const handleMyRecLike = async (providerId) => {
        if (!currentUserId || !currentUserEmail) {
            alert("Please log in to like/unlike.");
            return;
        }
        const provToUpdate = myRecRawProviders.find((p) => p.id === providerId);
        if (!provToUpdate) return;
        const newLikedState = !provToUpdate.currentUserLiked;
        const newNumLikes = newLikedState
            ? (provToUpdate.num_likes || 0) + 1
            : Math.max(0, (provToUpdate.num_likes || 1) - 1);

        const optimisticUpdateList = (list) =>
            list.map((p) =>
                p.id === providerId
                    ? {
                          ...p,
                          num_likes: newNumLikes,
                          currentUserLiked: newLikedState,
                      }
                    : p
            );
        setMyRecRawProviders(optimisticUpdateList(myRecRawProviders));

        const newLikedSet = new Set(myRecLikedRecommendations);
        if (newLikedState) newLikedSet.add(providerId);
        else newLikedSet.delete(providerId);
        setMyRecLikedRecommendations(newLikedSet);

        try {
            const response = await fetch(
                `${API_URL}/api/providers/${providerId}/like`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: currentUserId,
                        userEmail: currentUserEmail,
                    }),
                }
            );
            if (!response.ok) {
                const eData = await response.json().catch(() => ({}));
                throw new Error(
                    eData.message || `Like error ${response.status}`
                );
            }
            const result = await response.json();

            const serverUpdateList = (list) =>
                list.map((p) =>
                    p.id === providerId
                        ? {
                              ...p,
                              num_likes: parseInt(result.num_likes, 10) || 0,
                              currentUserLiked: result.currentUserLiked,
                          }
                        : p
                );
            setMyRecRawProviders(serverUpdateList(myRecRawProviders));

            const finalLikedSet = new Set(myRecLikedRecommendations);
            if (result.currentUserLiked) finalLikedSet.add(providerId);
            else finalLikedSet.delete(providerId);
            setMyRecLikedRecommendations(finalLikedSet);
        } catch (error) {
            setMyRecRawProviders((prev) =>
                prev.map((p) => (p.id === providerId ? provToUpdate : p))
            );
            setMyRecLikedRecommendations((prev) => {
                const revertedSet = new Set(prev);
                if (provToUpdate.currentUserLiked) revertedSet.add(providerId);
                else revertedSet.delete(providerId);
                return revertedSet;
            });
            alert(`Failed to update like: ${error.message}`);
        }
    };

    const handleInviteFriend = async (e) => {
        e.preventDefault();
        if (!newPersonPhone.trim()) return;

        try {
            const res = await fetch(`${API_URL}/api/communities/user/check-phone`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: newPersonPhone })
            });
            
            const data = await res.json();

            setShowAddPersonModal(false);

            if (res.ok && data.exists) {
                if (data.username) {
                    setProfileToNavigate(data.username);
                    setShowProfileConfirmation(true);
                } else {
                    alert("This user is already on Tried & Trusted, but their profile could not be found.");
                }
            } else if (res.ok && !data.exists) {
                const message = `Hey! I've started sharing my Recs on Tried & Trusted and would love for you to join. You can join here: https://triedandtrusted.ai/`;
                window.location.href = `sms:${newPersonPhone}?&body=${encodeURIComponent(message)}`;
                setNewPersonPhone("");
            } else {
                throw new Error(data.error || 'Failed to check phone number.');
            }
        } catch (err) {
            alert(`An error occurred: ${err.message}`);
        }
    };

    const handleCreateCommunity = async (e) => {
        e.preventDefault();
        if (!newCommunityName.trim() || !user?.id) return;
        try {
            const res = await fetch(`${API_URL}/api/communities/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newCommunityName,
                    description: newCommunityDescription,
                    created_by_clerk_id: user.id,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create community.");
            }
            alert("Community created!");
            setNewCommunityName("");
            setNewCommunityDescription("");
            setShowCreateCommunityModal(false);
            fetchMyTrustCircleData();
        } catch (err) {
            alert(`Error creating community: ${err.message}`);
        }
    };
    const handleRequestToJoinCommunity = async (commId) => {
        if (!user?.id) return;
        try {
            const res = await fetch(
                `${API_URL}/api/communities/request`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_id: user.id,
                        community_id: commId,
                    }),
                }
            );
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to request join.");
            }
            alert("Request to join sent!");
            fetchMyTrustCircleData();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };
    const handleApproveMembership = async (commId, targetUId) => {
        if (!user?.id) return;
        try {
            const res = await fetch(`${API_URL}/api/communities/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    communityId: commId,
                    userClerkId: targetUId,
                    approverClerkId: user.id,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to approve.");
            }
            alert("Membership approved!");
            fetchMyTrustCircleData();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };
    const navigateToCommunity = (commId) => navigate(`/community/${commId}`);
    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
        navigate(`/trustcircles?tab=${tabName}`, { replace: true });
    };

    const handleFollowersTabChange = (listType) => {
        setFollowersTabActiveList(listType);
        if (listType === "following" && followingConnections.length === 0) {
            fetchFollowingData();
        }
    };

    const handleFollowUser = async (toUserId) => {
        if (!currentUserId) {
            alert("You must be logged in to follow users.");
            return;
        }

        const userToFollow = suggestedFollows.find(u => u.id === toUserId);
        
        // Optimistic update: remove from suggestions
        setSuggestedFollows(prev => prev.filter(u => u.id !== toUserId));
        
        // Optimistic update: add to following list if not already there
        if (userToFollow && !followingConnections.find(f => f.id === toUserId)) {
            setFollowingConnections(prev => [...prev, userToFollow]);
        }

        try {
            const res = await fetch(`${API_URL}/api/connections/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromUserId: currentUserId, toUserId: toUserId })
            });

            if (!res.ok) throw new Error('Failed to follow user');
            
            // Re-fetch following data for consistency
            fetchFollowingData();

        } catch (err) {
            console.error(err);
            // Revert optimistic updates on failure
            if (userToFollow) {
                if (!suggestedFollows.find(s => s.id === toUserId)) {
                     setSuggestedFollows(prev => [...prev, userToFollow]);
                }
                setFollowingConnections(prev => prev.filter(f => f.id !== toUserId));
            }
            alert('An error occurred while trying to follow the user. Please try again.');
        }
    };

    const handleSearchChange = useCallback(async (e) => {
        const term = e.target.value;
        setFollowersSearch(term);

        if (followersTabActiveList === 'following' && term.trim() !== '') {
            setIsSearching(true);
            try {
                const params = new URLSearchParams({ userId: currentUserId, term });
                const res = await fetch(`${API_URL}/api/connections/search-users?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setUserSearchResults(data);
                } else {
                    setUserSearchResults([]);
                }
            } catch (err) {
                console.error("Error searching users:", err);
                setUserSearchResults([]);
            }
        } else {
            setIsSearching(false);
            setUserSearchResults([]);
        }
    }, [followersTabActiveList, currentUserId]);

    if (
        !isLoaded ||
        (loadingTrustCircle &&
            (activeTab === "communities" || activeTab === "network"))
    )
        return (
            <div className="loading-message">Loading your Trust Circle...</div>
        );
    if (isLoaded && !isSignedIn) {
        navigate("/");
        return null;
    }

    return (
        <div className="trust-circles-page-container">
            <header>
                <h1 className="trust-circles-main-header">
                    Your Trust Network
                </h1>
                <p className="trust-circles-sub-header">
                    Connect, discover communities, and build meaningful
                    relationships through trusted recommendations.
                </p>
            </header>
            <div style={{ textAlign: "center" }}>
                <div className="tabs">
                    <button
                        className={`tab-button ${
                            activeTab === "network" ? "active" : ""
                        }`}
                        onClick={() => handleTabChange("network")}
                    >
                        <FaHeart style={{ marginRight: "8px" }} />
                        Network
                    </button>
                    <button
                        className={`tab-button ${
                            activeTab === "for-you" ? "active" : ""
                        }`}
                        onClick={() => handleTabChange("for-you")}
                    >
                        <FaStar style={{ marginRight: "8px" }} />
                        Recs For You
                    </button>
                    <button
                        className={`tab-button ${
                            activeTab === "communities" ? "active" : ""
                        }`}
                        onClick={() => handleTabChange("communities")}
                    >
                        <FaUsers style={{ marginRight: "8px" }} />
                        Communities
                    </button>
                </div>
            </div>

            {activeTab === "communities" && !loadingTrustCircle && (
                <div className="tab-content">
                    {trustCircleError && (
                        <div className="empty-message error-text">
                            {trustCircleError}
                        </div>
                    )}
                    <section className="section-container">
                        <div className="section-title-container">
                            <h2 className="section-title">My Communities</h2>
                            <div className="section-actions">
                                <button
                                    className="button button-primary icon-button"
                                    onClick={() => setShowDiscoverModal(true)}
                                >
                                    <FaSearch style={{ marginRight: "8px" }} /> Discover Communities
                                </button>
                                <button
                                    className="button button-primary icon-button"
                                    onClick={() =>
                                        setShowCreateCommunityModal(true)
                                    }
                                >
                                    <GroupAddIcon /> Create Community
                                </button>
                            </div>
                        </div>
                        {myCommunities.length === 0 && !trustCircleError ? (
                            <p className="empty-message">
                                Not part of any communities.{" "}
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setShowCreateCommunityModal(true);
                                    }}
                                >
                                    Create one
                                </a>
                                .
                            </p>
                        ) : null}
                        {sortedMyCommunities.length > 0 && (
                            <div className="grid-layout">
                                {sortedMyCommunities.map((comm) => (
                                    <div className="card" key={comm.id}>
                                        <div className="card-content">
                                            {comm.created_by ===
                                            currentUser?.id ? (
                                                <span className="status-badge status-owner">
                                                    Owner
                                                </span>
                                            ) : (
                                                <span className="status-badge status-member">
                                                    Member
                                                </span>
                                            )}
                                            <h3 className="card-title">
                                                {comm.name}
                                            </h3>
                                            <p className="card-description">
                                                {comm.description}
                                            </p>
                                            <p className="card-info">
                                                {comm.recommendations} Recs
                                            </p>
                                        </div>
                                        <div className="card-actions">
                                            <button
                                                className="button button-outline"
                                                onClick={() =>
                                                    navigateToCommunity(comm.id)
                                                }
                                            >
                                                View <LaunchIcon />
                                            </button>
                                            {comm.created_by ===
                                                currentUser?.id &&
                                                joinRequests[comm.id]?.length >
                                                    0 && (
                                                    <div className="pending-requests-section">
                                                        <h4 className="pending-requests-title">
                                                            Pending (
                                                            {
                                                                joinRequests[
                                                                    comm.id
                                                                ].length
                                                            }
                                                            ):
                                                        </h4>
                                                        <div className="members-list members-list-pending">
                                                            {joinRequests[
                                                                comm.id
                                                            ]
                                                                .slice(0, 2)
                                                                .map((req) => (
                                                                    <div
                                                                        key={
                                                                            req.user_id
                                                                        }
                                                                        className="request-item-card-like"
                                                                    >
                                                                        <MemberCard
                                                                            member={
                                                                                req
                                                                            }
                                                                        />
                                                                        <button
                                                                            className="button button-success button-small"
                                                                            onClick={() =>
                                                                                handleApproveMembership(
                                                                                    comm.id,
                                                                                    req.user_id
                                                                                )
                                                                            }
                                                                        >
                                                                            Approve
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            {joinRequests[
                                                                comm.id
                                                            ].length > 2 && (
                                                                <p className="more-requests-text">
                                                                    +{" "}
                                                                    {joinRequests[
                                                                        comm.id
                                                                    ].length -
                                                                        2}{" "}
                                                                    more...
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {activeTab === "network" && !loadingTrustCircle && (
                <div className="tab-content">
                    <div className="connections-header">
                        <div className="followers-toggle-container">
                            <button
                                className={`toggle-button ${
                                    followersTabActiveList === "followers"
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() =>
                                    handleFollowersTabChange("followers")
                                }
                            >
                                <FaUserFriends style={{ marginRight: "8px" }} />
                                Followers ({individualConnections.length})
                            </button>
                            <button
                                className={`toggle-button ${
                                    followersTabActiveList === "following"
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() =>
                                    handleFollowersTabChange("following")
                                }
                            >
                                <FaUserPlus style={{ marginRight: "8px" }} />
                                Following ({followingConnections.length})
                            </button>
                        </div>
                        <div className="search-filter-container">
                            <div className="search-input-wrapper">
                                <SearchIconSvg />
                                <input
                                    type="text"
                                    placeholder={
                                        followersTabActiveList === "followers"
                                            ? "Search followers..."
                                            : "Look for accounts"
                                    }
                                    value={followersSearch}
                                    onChange={handleSearchChange}
                                    className="followers-search-input"
                                />
                            </div>
                        </div>
                    </div>
                    {trustCircleError && (
                        <div className="empty-message error-text">
                            {trustCircleError}
                        </div>
                    )}

                    {followersTabActiveList === "followers" && (
                        <section className="list-section-container">
                            <div className="list-header">
                                <div className="list-title-group">
                                    <h3 className="list-title">
                                        Your Followers
                                    </h3>
                                    <span className="count-badge">
                                        {individualConnections.length} people
                                    </span>
                                </div>
                                <div className="section-actions">
                                    <button
                                        className="button button-primary button-small icon-button"
                                        onClick={() =>
                                            setShowAddPersonModal(true)
                                        }
                                    >
                                        <FaUserPlus
                                            style={{ marginRight: "8px" }}
                                        />{" "}
                                        Invite Friends
                                    </button>
                                </div>
                            </div>

                            {individualConnections.length === 0 &&
                            !trustCircleError ? (
                                <p className="empty-message">
                                    No followers yet. Invite friends to connect!
                                </p>
                            ) : null}

                            {filteredFollowers.length === 0 &&
                            individualConnections.length > 0 &&
                            followersSearch ? (
                                <p className="empty-message">
                                    No followers found matching "
                                    {followersSearch}".
                                </p>
                            ) : null}

                            {filteredFollowers.length > 0 && (
                                <div className="followers-list-vertical">
                                    {filteredFollowers.map((conn) => (
                                        <MemberCard
                                            key={conn.email}
                                            member={conn}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {followersTabActiveList === "following" && (
                        <>
                            {isSearching ? (
                                <section className="list-section-container">
                                    <div className="list-header">
                                        <h3 className="list-title">Search Results</h3>
                                    </div>
                                    {userSearchResults.length > 0 ? (
                                        <div className="followers-list-vertical">
                                            {userSearchResults.map((user) => {
                                                const isFollowing = followingConnections.some(c => c.id === user.id);
                                                return (
                                                    <div key={user.id} className="user-search-result-item">
                                                        <MemberCard member={user} hideContactActions={true} />
                                                        {isFollowing ? (
                                                            <button className="button button-small status-following" disabled>
                                                                <FaCheck style={{ marginRight: '6px' }} /> Following
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                className="button button-primary button-small"
                                                                onClick={() => handleFollowUser(user.id)}
                                                            >
                                                                <FaUserPlus style={{ marginRight: '6px' }} />
                                                                Follow
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="empty-message">No users found.</p>
                                    )}
                                </section>
                            ) : (
                                <section className="list-section-container">
                                    <div className="list-header">
                                        <div className="list-title-group">
                                            <h3 className="list-title">People You Follow</h3>
                                            <span className="count-badge">
                                                {followingConnections.length} people
                                            </span>
                                        </div>
                                        <div className="section-actions">
                                            <a
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setShowSuggestionsModal(true);
                                                }}
                                                style={{ cursor: 'pointer', textDecoration: 'underline', color: '#0056b3' }}
                                            >
                                                Suggested Recommenders For You...
                                            </a>
                                        </div>
                                    </div>
                                    {loadingFollowing ? (
                                        <div className="loading-message">Loading...</div>
                                    ) : filteredFollowing.length > 0 ? (
                                        <div className="followers-list-vertical">
                                            {filteredFollowing.map((conn) => (
                                                <MemberCard key={conn.id} member={conn} />
                                            ))}
                                        </div>
                                    ) : followersSearch ? (
                                        <p className="empty-message">
                                            No one found matching "{followersSearch}".
                                        </p>
                                    ) : (
                                        <p className="empty-message">
                                            You are not following anyone yet.
                                        </p>
                                    )}
                                </section>
                            )}
                        </>
                    )}
                </div>
            )}

            {activeTab === "for-you" && (
                <div className="tab-content appliance-services-container my-recommendations-tab-content">
                    <h1 className="section-heading">
                        Recommendations Shared With You
                    </h1>
                    <div className="sort-bar">
                        Sort by:
                        <select
                            className="sort-dropdown"
                            value={
                                myRecSortOption.startsWith("force-refresh-")
                                    ? "recommended"
                                    : myRecSortOption
                            }
                            onChange={(e) => setMyRecSortOption(e.target.value)}
                        >
                            <option value="recommended">Recommended</option>
                            <option value="topRated">Top Rated</option>
                        </select>
                    </div>
                    {loadingMyRecommendations && (
                        <div className="loading-spinner">
                            Loading your recommendations...
                        </div>
                    )}
                    {!loadingMyRecommendations &&
                        myRecError &&
                        sortedMyRecProviders.length === 0 && (
                            <div className="error-message full-width-error">
                                {myRecError}
                            </div>
                        )}
                    {!loadingMyRecommendations &&
                        !myRecError &&
                        sortedMyRecProviders.length === 0 && (
                            <div className="no-providers-message">
                                <FaUsers className="no-providers-icon" />
                                <h2>No Recommendations Found</h2>
                                <p>
                                    We couldn't find any recommendations visible
                                    to you right now.
                                </p>
                                <div className="no-providers-actions">
                                    <button
                                        onClick={() =>
                                            handleTabChange("communities")
                                        }
                                        className="primary-button"
                                    >
                                        <FaUsers
                                            style={{ marginRight: "8px" }}
                                        />{" "}
                                        Discover Communities
                                    </button>
                                    <button
                                        onClick={() =>
                                            navigate("/share-recommendation")
                                        }
                                        className="secondary-button"
                                    >
                                        <FaPlusCircle
                                            style={{ marginRight: "8px" }}
                                        />{" "}
                                        Recommend a Provider
                                    </button>
                                </div>
                            </div>
                        )}
                    {sortedMyRecProviders.length > 0 && (
                        <ul className="provider-list">
                            {sortedMyRecProviders.map((provider) => {
                                const currentReviews =
                                    myRecReviewMap[provider.id] || [];
                                const displayAvgRating = (
                                    parseFloat(provider.average_rating) || 0
                                ).toFixed(1);
                                const displayTotalReviews =
                                    parseInt(provider.total_reviews, 10) || 0;
                                return (
                                    <li
                                        key={provider.id}
                                        className="provider-card"
                                    >
                                        <div className="card-header">
                                            <h2 className="card-title">
                                                <Link
                                                    to={`/provider/${provider.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="clickable provider-name-link"
                                                    onClick={() =>
                                                        localStorage.setItem(
                                                            "selectedProvider",
                                                            JSON.stringify(
                                                                provider
                                                            )
                                                        )
                                                    }
                                                >
                                                    {provider.business_name}
                                                </Link>
                                            </h2>
                                            <div className="badge-wrapper-with-menu">
                                                <div className="badge-group">
                                                    {(parseFloat(
                                                        provider.average_rating
                                                    ) || 0) >= 4.5 && (
                                                        <span className="top-rated-badge">
                                                            Top Rated
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="right-actions">
                                                    <div className="dropdown-wrapper">
                                                        <button
                                                            className="three-dots-button"
                                                            onClick={() =>
                                                                setMyRecDropdownOpenForId(
                                                                    myRecDropdownOpenForId ===
                                                                        provider.id
                                                                        ? null
                                                                        : provider.id
                                                                )
                                                            }
                                                            title="Options"
                                                        >
                                                            ⋮
                                                        </button>
                                                        {myRecDropdownOpenForId ===
                                                            provider.id && (
                                                            <div className="dropdown-menu">
                                                                <button
                                                                    className="dropdown-item"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(
                                                                            `${window.location.origin}/provider/${provider.id}`
                                                                        );
                                                                        setMyRecDropdownOpenForId(
                                                                            null
                                                                        );
                                                                        setMyRecShowLinkCopied(
                                                                            true
                                                                        );
                                                                        setTimeout(
                                                                            () =>
                                                                                setMyRecShowLinkCopied(
                                                                                    false
                                                                                ),
                                                                            2000
                                                                        );
                                                                    }}
                                                                >
                                                                    Share this
                                                                    Rec
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {myRecShowLinkCopied &&
                                                        myRecDropdownOpenForId !==
                                                            provider.id && (
                                                            <div className="toast">
                                                                Link copied!
                                                            </div>
                                                        )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="review-summary">
                                            <span className="stars-and-score">
                                                <MyRecStarRating
                                                    rating={
                                                        parseFloat(
                                                            provider.average_rating
                                                        ) || 0
                                                    }
                                                />{" "}
                                                {displayAvgRating} (
                                                {displayTotalReviews})
                                            </span>
                                            <button
                                                className="see-all-button"
                                                onClick={() => {
                                                    setMyRecSelectedProvider(
                                                        provider
                                                    );
                                                    setMyRecIsReviewModalOpen(
                                                        true
                                                    );
                                                }}
                                            >
                                                Write a Review
                                            </button>
                                            <button
                                                className={`like-button ${
                                                    myRecLikedRecommendations.has(
                                                        provider.id
                                                    )
                                                        ? "liked"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    handleMyRecLike(provider.id)
                                                }
                                                title={
                                                    myRecLikedRecommendations.has(
                                                        provider.id
                                                    )
                                                        ? "Unlike"
                                                        : "Like"
                                                }
                                            >
                                                <FaThumbsUp />{" "}
                                                <span className="like-count">
                                                    {provider.num_likes || 0}
                                                </span>
                                            </button>
                                        </div>
                                        <p className="card-description">
                                            {provider.description ||
                                                provider.recommender_message ||
                                                "No description available"}
                                        </p>
                                        {Array.isArray(provider.tags) &&
                                            provider.tags.length > 0 && (
                                                <div className="tag-container">
                                                    {provider.tags.map(
                                                        (tag, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="tag-badge"
                                                            >
                                                                {tag}
                                                            </span>
                                                        )
                                                    )}
                                                    <button
                                                        className="add-tag-button"
                                                        onClick={() => {
                                                            setMyRecSelectedProvider(
                                                                provider
                                                            );
                                                            setMyRecIsReviewModalOpen(
                                                                true
                                                            );
                                                        }}
                                                        aria-label="Add a tag"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            )}
                                        {provider.recommender_name && (
                                            <>
                                                <div className="recommended-row">
                                                    <span className="recommended-label">
                                                        Recommended by:
                                                    </span>
                                                    {provider.recommender_user_id ? (
                                                        <Link
                                                            to={`/pro/${provider.recommender_username}`}
                                                            className="recommended-name clickable"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            {
                                                                provider.recommender_name
                                                            }
                                                        </Link>
                                                    ) : (
                                                        <span className="recommended-name">
                                                            {
                                                                provider.recommender_name
                                                            }
                                                        </span>
                                                    )}
                                                    {provider.date_of_recommendation && (
                                                        <span className="recommendation-date">
                                                            {" "}
                                                            (
                                                            {new Date(
                                                                provider.date_of_recommendation
                                                            ).toLocaleDateString(
                                                                "en-US",
                                                                {
                                                                    year: "2-digit",
                                                                    month: "numeric",
                                                                    day: "numeric",
                                                                }
                                                            )}
                                                            )
                                                        </span>
                                                    )}
                                                </div>
                                                {currentReviews.length > 0 &&
                                                    [
                                                        ...new Set(
                                                            currentReviews
                                                                .map(
                                                                    (r) =>
                                                                        r.user_name
                                                                )
                                                                .filter(
                                                                    (name) =>
                                                                        name &&
                                                                        name !==
                                                                            provider.recommender_name
                                                                )
                                                        ),
                                                    ].filter((name) => name)
                                                        .length > 0 && (
                                                        <div className="recommended-row">
                                                            <span className="recommended-label">
                                                                Also used by:
                                                            </span>
                                                            <span className="used-by-names">
                                                                {[
                                                                    ...new Set(
                                                                        currentReviews
                                                                            .map(
                                                                                (
                                                                                    r
                                                                                ) =>
                                                                                    r.user_name
                                                                            )
                                                                            .filter(
                                                                                (
                                                                                    name
                                                                                ) =>
                                                                                    name &&
                                                                                    name !==
                                                                                        provider.recommender_name
                                                                            )
                                                                    ),
                                                                ]
                                                                    .filter(
                                                                        (
                                                                            name
                                                                        ) =>
                                                                            name
                                                                    )
                                                                    .join(", ")}
                                                            </span>
                                                        </div>
                                                    )}
                                            </>
                                        )}
                                        <div className="action-buttons">
                                            <button
                                                className="primary-button"
                                                onClick={() => {
                                                    setMyRecSelectedProvider(
                                                        provider
                                                    );
                                                    setMyRecIsQuoteModalOpen(
                                                        true
                                                    );
                                                }}
                                            >
                                                Request a Quote
                                            </button>
                                            <button
                                                className="secondary-button"
                                                onClick={() => {
                                                    if (
                                                        provider.recommender_phone
                                                    )
                                                        window.location.href = `sms:${provider.recommender_phone}`;
                                                    else if (
                                                        provider.recommender_email
                                                    )
                                                        window.location.href = `mailto:${provider.recommender_email}`;
                                                    else
                                                        alert(
                                                            "Recommender contact info not available."
                                                        );
                                                }}
                                            >
                                                Connect with Recommender
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}

            {showAddPersonModal && (
                <div
                    className="modal-backdrop"
                    onClick={() => setShowAddPersonModal(false)}
                >
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="modal-header">Invite Friends</h3>
                        <form onSubmit={handleInviteFriend}>
                            <input
                                type="tel"
                                className="form-input"
                                placeholder="Enter friend's phone number"
                                value={newPersonPhone}
                                onChange={(e) =>
                                    setNewPersonPhone(e.target.value)
                                }
                                required
                            />
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="button button-secondary"
                                    onClick={() => setShowAddPersonModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="button button-primary"
                                >
                                    Send Invite
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showCreateCommunityModal && (
                <div
                    className="modal-backdrop"
                    onClick={() => setShowCreateCommunityModal(false)}
                >
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="modal-header">Create New Community</h3>
                        <form onSubmit={handleCreateCommunity}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Community Name"
                                value={newCommunityName}
                                onChange={(e) =>
                                    setNewCommunityName(e.target.value)
                                }
                                required
                            />
                            <textarea
                                className="form-textarea"
                                placeholder="Description (optional)"
                                value={newCommunityDescription}
                                onChange={(e) =>
                                    setNewCommunityDescription(e.target.value)
                                }
                            />
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="button button-secondary"
                                    onClick={() =>
                                        setShowCreateCommunityModal(false)
                                    }
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="button button-success"
                                >
                                    Create Community
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {myRecIsReviewModalOpen && myRecSelectedProvider && (
                <MyRecReviewModal
                    isOpen={myRecIsReviewModalOpen}
                    onClose={() => setMyRecIsReviewModalOpen(false)}
                    onSubmit={handleMyRecReviewSubmit}
                    provider={myRecSelectedProvider}
                />
            )}
            {myRecClickedRecommender && (
                <div className="modal-overlay">
                    <div className="simple-modal">
                        <button
                            className="modal-close-x"
                            onClick={() => setMyRecClickedRecommender(null)}
                        >
                            ×
                        </button>
                        <h3 className="modal-title">
                            Want to connect with{" "}
                            <span className="highlight">
                                {myRecClickedRecommender}
                            </span>
                            ?
                        </h3>
                        <div className="modal-buttons-vertical">
                            <button
                                className="secondary-button"
                                onClick={() => {
                                    setMyRecClickedRecommender(null);
                                    setMyRecShowFeatureComingModal(true);
                                }}
                            >
                                Thank {myRecClickedRecommender}
                            </button>
                            <button
                                className="secondary-button"
                                onClick={() => {
                                    setMyRecClickedRecommender(null);
                                    setMyRecShowFeatureComingModal(true);
                                }}
                            >
                                Ask {myRecClickedRecommender} a question
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {myRecShowFeatureComingModal && (
                <div className="modal-overlay">
                    <div className="modal-content review-modal-content">
                        <button
                            className="modal-close-x"
                            onClick={() =>
                                setMyRecShowFeatureComingModal(false)
                            }
                        >
                            ×
                        </button>
                        <p>
                            Feature coming soon!{" "}
                            <FaEye style={{ marginLeft: "5px" }} />
                        </p>
                        <div className="modal-buttons">
                            <button
                                className="primary-button"
                                onClick={() =>
                                    setMyRecShowFeatureComingModal(false)
                                }
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {myRecIsQuoteModalOpen && myRecSelectedProvider && (
                <QuoteModal
                    isOpen={myRecIsQuoteModalOpen}
                    providerName={myRecSelectedProvider.business_name}
                    providerEmail={myRecSelectedProvider.email}
                    providerPhotoUrl={myRecSelectedProvider.profile_image}
                    onClose={() => setMyRecIsQuoteModalOpen(false)}
                />
            )}
            {showProfileConfirmation && (
                <div className="modal-backdrop" onClick={() => setShowProfileConfirmation(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-header">User Exists</h3>
                        <p style={{marginBottom: "24px"}}>That user is already on Tried & Trusted! Want to see their profile?</p>
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="button button-secondary"
                                onClick={() => {
                                    setShowProfileConfirmation(false);
                                    setProfileToNavigate(null);
                                    setNewPersonPhone("");
                                }}
                            >
                                No
                            </button>
                            <button
                                type="button"
                                className="button button-primary"
                                onClick={() => {
                                    navigate(`/pro/${profileToNavigate}`);
                                    setShowProfileConfirmation(false);
                                    setProfileToNavigate(null);
                                    setNewPersonPhone("");
                                }}
                            >
                                Yes
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <SuggestedFollowersModal
                isOpen={showSuggestionsModal}
                onClose={() => setShowSuggestionsModal(false)}
                suggestedFollows={suggestedFollows}
                loading={loadingSuggestedFollows}
                onFollow={handleFollowUser}
            />
            {showDiscoverModal && (
                 <div className="modal-backdrop" onClick={() => setShowDiscoverModal(false)}>
                    <div className="modal-content discover-communities-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-header">Discover Communities</h3>
                        <div className="search-bar-sfm" style={{marginBottom: '24px'}}>
                            <FaSearch className="search-icon-sfm" />
                            <input
                                type="text"
                                className="followers-search-input"
                                placeholder="Search by name or description..."
                                value={discoverSearchTerm}
                                onChange={(e) => setDiscoverSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        <div className="grid-layout modal-grid-layout">
                            {discoverableCommunities.length > 0 ? discoverableCommunities.map((comm) => (
                                <div className="card" key={comm.id}>
                                    <div className="card-content">
                                        <h3 className="card-title">{comm.name}</h3>
                                        <p className="card-description">{comm.description}</p>
                                        <p className="card-info">{comm.memberCount} members</p>
                                    </div>
                                    <div className="card-actions">
                                        {comm.user_membership_status === "requested" ? (
                                            <button className="button button-small icon-button status-requested" disabled>
                                                <HourglassTopIcon /> Request Sent
                                            </button>
                                        ) : (
                                            <button
                                                className="button button-primary"
                                                onClick={() => handleRequestToJoinCommunity(comm.id)}
                                                disabled={!currentUser}
                                            >
                                                Request to Join
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <p className="empty-message">No communities found matching your search.</p>
                            )}
                        </div>
                         <div className="modal-actions">
                            <button
                                type="button"
                                className="button button-secondary"
                                onClick={() => setShowDiscoverModal(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrustCircles;