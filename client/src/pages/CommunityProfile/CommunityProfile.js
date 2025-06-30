import { useUser } from "@clerk/clerk-react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    FaCalendarAlt,
    FaConciergeBell,
    FaEnvelope,
    FaEye,
    FaHourglassHalf,
    FaMapMarkerAlt,
    FaPlusCircle,
    FaSignInAlt,
    FaSms,
    FaStar,
    FaThumbsUp,
    FaTools,
    FaUserCheck,
    FaUserPlus,
    FaUsers,
    FaUserTie
} from "react-icons/fa";
import { Link, useNavigate, useParams } from "react-router-dom";
import InviteMembersModal from "../../components/InviteModal/InviteModal";
import ListCard from "../../components/Profile/ListCard"; // adjust path if needed
import QuoteModal from "../../components/QuoteModal/QuoteModal";
import { API_URL } from "../../utils/constants";
import "./CommunityProfile.css";

const IconText = ({ icon, text, className = "" }) => (
    <div className={`icon-text-item ${className}`}>
        {" "}
        {icon} <span>{text}</span>{" "}
    </div>
);

const MemberCard = ({ member }) => {
    const [imageFailed, setImageFailed] = useState(false);
    const primarySrc = member.profile_image_url || member.avatarUrl;
    const fallbackUiAvatarSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        member.name || member.email || "NA"
    )}&background=random&color=fff&size=60&font-size=0.33`;

    const handleImageError = (e) => {
        if (e.target.src === primarySrc && primarySrc !== fallbackUiAvatarSrc) {
            e.target.src = fallbackUiAvatarSrc;
        } else {
            setImageFailed(true);
        }
    };

    const getInitials = (name, email) => {
        if (name) {
            const names = name.split(" ").filter((n) => n);
            if (names.length > 1) {
                return (names[0][0] + names[names.length - 1][0]).toUpperCase();
            } else if (names.length === 1 && names[0].length > 1) {
                return names[0].substring(0, 2).toUpperCase();
            } else if (names.length === 1 && names[0].length) {
                return names[0][0].toUpperCase();
            }
        }
        if (email && email.length > 0) return email[0].toUpperCase();
        return "U";
    };

    const cleanAltText = (name, email) => {
        const text = name || email || "Community Member";
        return text.replace(/(\r\n|\n|\r)/gm, " ");
    };

    let avatarContent;
    if (imageFailed) {
        avatarContent = (
            <div className="member-avatar member-avatar-initials-fallback">
                <span>{getInitials(member.name, member.email)}</span>
            </div>
        );
    } else {
        avatarContent = (
            <img
                src={primarySrc || fallbackUiAvatarSrc}
                alt={cleanAltText(member.name, member.email)}
                className="member-avatar"
                onError={handleImageError}
            />
        );
    }

    const displayName = member.name || member.email || "";
    let nameParts = [];
    if (member.name) {
        nameParts = member.name.split(" ").filter((n) => n);
    }

    return (
        <div className="member-item-card">
            {avatarContent}
            <div className="member-name-container">
                {member.username ? (
                    <Link
                        to={`/pro/${member.username}`}
                        className="member-name-link"
                        style={{ color: "inherit", cursor: "pointer" }}
                    >
                        {nameParts.length > 1 ? (
                            <>
                                {nameParts.slice(0, -1).join(" ")}{" "}
                                <span className="member-last-name">
                                    {nameParts.slice(-1)[0]}
                                </span>
                            </>
                        ) : (
                            displayName
                        )}
                    </Link>
                ) : nameParts.length > 1 ? (
                    <>
                        {nameParts.slice(0, -1).join(" ")}{" "}
                        <span className="member-last-name">
                            {nameParts.slice(-1)[0]}
                        </span>
                    </>
                ) : (
                    displayName
                )}
            </div>
            <div className="member-actions">
                {member.phone_number && (
                    <a
                        href={`sms:${member.phone_number.replace(/\D/g, "")}`}
                        className="member-action-icon"
                        title="Send SMS"
                    >
                        <FaSms />
                    </a>
                )}
                {member.email && (
                    <a
                        href={`mailto:${member.email}`}
                        className="member-action-icon"
                        title="Send Email"
                    >
                        <FaEnvelope />
                    </a>
                )}
            </div>
        </div>
    );
};

const CommunityRecStarRating = ({ rating }) => {
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

const CommunityRecReviewModal = ({ isOpen, onClose, onSubmit, provider }) => {
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
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag && !tags.includes(tag));

        if (newTags.length > 0) {
            setTags([...tags, ...newTags]);
        }
        setTagInput("");
    };

    // Handle blur event to process comma-separated tags when user leaves input
    const handleTagInputBlur = () => {
        if (tagInput.includes(",")) {
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

const CommunityProfile = () => {
    const { communityId } = useParams();
    const navigate = useNavigate();
    const { isLoaded, isSignedIn, user } = useUser();

    const [communityDetails, setCommunityDetails] = useState(null);
    const [communityMembers, setCommunityMembers] = useState([]);
    const [loadingCommunityDetails, setLoadingCommunityDetails] =
        useState(true);
    const [loadingCommunityMembers, setLoadingCommunityMembers] =
        useState(false);
    const [communityError, setCommunityError] = useState("");

    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserEmail, setCurrentUserEmail] = useState(null);
    const [isRequestingJoin, setIsRequestingJoin] = useState(false);
    const [activeTab, setActiveTab] = useState("recommendations");

    const [commRecsRaw, setCommRecsRaw] = useState([]);
    const [commRecsReviewMap, setCommRecsReviewMap] = useState({});
    const [loadingCommRecs, setLoadingCommRecs] = useState(true);
    const [commRecsError, setCommRecsError] = useState(null);
    const [commRecsIsReviewModalOpen, setCommRecsIsReviewModalOpen] =
        useState(false);
    const [commRecsSelectedProvider, setCommRecsSelectedProvider] =
        useState(null);
    const [commRecsDropdownOpenForId, setCommRecsDropdownOpenForId] =
        useState(null);
    const [commRecsShowLinkCopied, setCommRecsShowLinkCopied] = useState(false);
    const [commRecsIsQuoteModalOpen, setCommRecsIsQuoteModalOpen] =
        useState(false);
    const [commRecsLikedMap, setCommRecsLikedMap] = useState(new Map());
    const [commRecsClickedRecommender, setCommRecsClickedRecommender] =
        useState(null);
    const [commRecsShowFeatureComingModal, setCommRecsShowFeatureComingModal] =
        useState(false);

    const [selectedServices, setSelectedServices] = useState([]);
    const [showServiceFilter, setShowServiceFilter] = useState(false);

    const [selectedCities, setSelectedCities] = useState([]);
    const [showCityFilter, setShowCityFilter] = useState(false);

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteExpiresAt, setInviteExpiresAt] = useState("");
    const [inviteMaxUses, setInviteMaxUses] = useState("");
    const [generatedInviteLink, setGeneratedInviteLink] = useState("");
    const [inviteGenerationError, setInviteGenerationError] = useState("");
    const [inviteGenerationLoading, setInviteGenerationLoading] =
        useState(false);

    const [communityLists, setCommunityLists] = useState([]);
    const [loadingCommunityLists, setLoadingCommunityLists] = useState(false);
    const [communityListsError, setCommunityListsError] = useState("");

    useEffect(() => {
        if (isLoaded && user) {
            setCurrentUserId(user.id);
            setCurrentUserEmail(user.primaryEmailAddress?.emailAddress);
        } else if (isLoaded && !isSignedIn) {
            setCurrentUserId(null);
            setCurrentUserEmail(null);
        }
    }, [isLoaded, isSignedIn, user]);

    const fetchCommunityDetails = useCallback(async () => {
        setLoadingCommunityDetails(true);
        setCommunityError("");
        try {
            let url = `${API_URL}/api/communities/${communityId}/details`;
            if (currentUserId) url += `?user_id=${currentUserId}`;
            const response = await fetch(url);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(
                    errData.error ||
                        `Failed to fetch community details (status: ${response.status})`
                );
            }
            const data = await response.json();
            setCommunityDetails(data);
        } catch (err) {
            setCommunityError(err.message);
        } finally {
            setLoadingCommunityDetails(false);
        }
    }, [communityId, currentUserId]);

    const handleCommRecsReviewSubmit = async (reviewData) => {
        if (
            !isSignedIn ||
            !commRecsSelectedProvider ||
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
                    provider_id: commRecsSelectedProvider.id,
                    provider_email: commRecsSelectedProvider.email || "",
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
            fetchCommunityRecommendations();
            setCommRecsIsReviewModalOpen(false);
        } catch (err) {
            alert(`Error submitting review: ${err.message}`);
        }
    };

    const fetchCommunityMembers = useCallback(async () => {
        setLoadingCommunityMembers(true);
        setCommunityError("");
        try {
            const response = await fetch(
                `${API_URL}/api/communities/${communityId}/members`
            );
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(
                    errData.message ||
                        `Failed to fetch members (status: ${response.status})`
                );
            }
            const data = await response.json();
            if (!data.success)
                throw new Error(data.message || "Failed to fetch members");
            setCommunityMembers(data.members || []);
        } catch (err) {
            setCommunityError(err.message);
            setCommunityMembers([]);
        } finally {
            setLoadingCommunityMembers(false);
        }
    }, [communityId]);

    const handleGenerateInviteLink = async (inviteOptions) => {
        if (!currentUserId || !communityId) {
            setInviteGenerationError(
                "User or community information is missing."
            );
            return;
        }
        setInviteGenerationLoading(true);
        setInviteGenerationError("");
        setGeneratedInviteLink("");

        try {
            const response = await fetch(
                `${API_URL}/api/invites/communities/${communityId}/invites`,
                {
                    // Corrected template literal
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        // 'Authorization': `Bearer ${YOUR_CLERK_SESSION_TOKEN_OR_JWT}`,
                    },
                    body: JSON.stringify({
                        actingUserClerkId: currentUserId,
                        emailAddresses: [{ emailAddress: currentUserEmail }],
                        firstName: user?.firstName || "",
                        lastName: user?.lastName || "",
                        phoneNumbers: user?.phoneNumbers || [],
                        expires_at: inviteOptions.expires_at,
                        max_uses: inviteOptions.max_uses,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.error ||
                        `Failed to generate invite link (status: ${response.status})`
                );
            }

            // Ensure the backend returns 'invite_url' or construct it if it returns 'token_string'
            setGeneratedInviteLink(
                data.invite_url ||
                    `<span class="math-inline">\{window\.location\.origin\}/invite/</span>{data.token_string}`
            );
        } catch (err) {
            setInviteGenerationError(err.message);
        } finally {
            setInviteGenerationLoading(false);
        }
    };

    const fetchCommunityRecommendations = useCallback(async () => {
        if (!communityId || !currentUserId || !currentUserEmail) return;
        setLoadingCommRecs(true);
        setCommRecsError(null);
        try {
            const params = new URLSearchParams({
                user_id: currentUserId,
                email: currentUserEmail,
            });
            const response = await fetch(
                `${API_URL}/api/communities/${communityId}/recommendations?${params.toString()}`
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
            let fetchedProviders = data.recommendations || data.providers || [];
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
            setCommRecsReviewMap(allReviewsMap);

            const enriched = fetchedProviders.map((p, idx) => ({
                ...p,
                originalIndex: idx,
                average_rating:
                    parseFloat(statsMap[p.id]?.average_rating) ||
                    parseFloat(p.average_rating) ||
                    0,
                total_reviews:
                    parseInt(statsMap[p.id]?.total_reviews, 10) ||
                    parseInt(p.total_reviews, 10) ||
                    0,
                currentUserLiked: p.currentUserLiked || false,
                num_likes: parseInt(p.num_likes, 10) || 0,
            }));
            const initialLikes = new Map();
            enriched.forEach((p) => {
                if (p.currentUserLiked) initialLikes.set(p.id, true);
            });
            setCommRecsLikedMap(initialLikes);
            setCommRecsRaw(enriched);
        } catch (err) {
            setCommRecsError(err.message);
            setCommRecsRaw([]);
        } finally {
            setLoadingCommRecs(false);
        }
    }, [communityId, currentUserId, currentUserEmail]);

    const fetchCommunityLists = useCallback(async () => {
        setLoadingCommunityLists(true);
        setCommunityListsError("");
        try {
            const response = await fetch(
                `${API_URL}/api/communities/${communityId}/lists`
            );
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(
                    errData.message || "Failed to fetch community lists"
                );
            }
            const data = await response.json();
            setCommunityLists(data.lists || []);
        } catch (err) {
            setCommunityListsError(err.message);
            setCommunityLists([]);
        } finally {
            setLoadingCommunityLists(false);
        }
    }, [communityId]);

    useEffect(() => {
        if (communityId && (currentUserId || !isSignedIn))
            fetchCommunityDetails();
    }, [communityId, currentUserId, isSignedIn, fetchCommunityDetails]);
    useEffect(() => {
        if (activeTab === "members" && communityId) fetchCommunityMembers();
    }, [activeTab, communityId, fetchCommunityMembers]);
    useEffect(() => {
        if (
            activeTab === "recommendations" &&
            communityId &&
            currentUserId &&
            currentUserEmail
        )
            fetchCommunityRecommendations();
    }, [
        activeTab,
        communityId,
        currentUserId,
        currentUserEmail,
        fetchCommunityRecommendations,
    ]);
    useEffect(() => {
        if (activeTab === "recommendations" && communityId) {
            fetchCommunityLists();
        }
    }, [activeTab, communityId, fetchCommunityLists]);

    const availableCities = useMemo(() => {
        if (!commRecsRaw || commRecsRaw.length === 0) return [];
        const cityCounts = commRecsRaw.reduce((acc, rec) => {
            const city = rec.city || "Other";
            acc[city] = (acc[city] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(cityCounts).sort(
            ([, countA], [, countB]) => countB - countA
        );
    }, [commRecsRaw]);

    const availableServices = useMemo(() => {
        if (!commRecsRaw || commRecsRaw.length === 0) return [];
        const serviceCounts = commRecsRaw.reduce((acc, rec) => {
            const service = rec.recommended_service_name;
            if (service) {
                acc[service] = (acc[service] || 0) + 1;
            }
            return acc;
        }, {});

        return Object.entries(serviceCounts).sort(
            ([, countA], [, countB]) => countB - countA
        );
    }, [commRecsRaw]);

    const sortedAndFilteredCommRecs = useMemo(() => {
        if (!commRecsRaw) return [];

        let list = [...commRecsRaw];

        if (selectedServices.length > 0) {
            list = list.filter(
                (p) =>
                    p.recommended_service_name &&
                    selectedServices.includes(p.recommended_service_name)
            );
        }

        if (selectedCities.length > 0) {
            list = list.filter((p) => {
                const city = p.city || "Other";
                return selectedCities.includes(city);
            });
        }

        return list.sort((a, b) => {
            const dateA = a.date_of_recommendation;
            const dateB = b.date_of_recommendation;

            if (dateA && dateB) return new Date(dateB) - new Date(dateA);
            if (dateA && !dateB) return -1;
            if (!dateA && dateB) return 1;
            return (a.originalIndex || 0) - (b.originalIndex || 0);
        });
    }, [commRecsRaw, selectedServices, selectedCities]);

    const handleServiceSelection = (serviceName) => {
        setSelectedServices((prev) =>
            prev.includes(serviceName)
                ? prev.filter((s) => s !== serviceName)
                : [...prev, serviceName]
        );
    };

    const handleCitySelection = (cityName) => {
        setSelectedCities((prev) =>
            prev.includes(cityName)
                ? prev.filter((c) => c !== cityName)
                : [...prev, cityName]
        );
    };

    const handleCommRecsLike = async (providerId) => {
        if (!currentUserId || !currentUserEmail) {
            alert("Please log in to like/unlike.");
            return;
        }
        const provToUpdate = commRecsRaw.find((p) => p.id === providerId);
        if (!provToUpdate) return;

        const originalProviderState = { ...provToUpdate };
        const originalLikedState = commRecsLikedMap.get(providerId) || false;

        const newLikedState = !originalLikedState;
        const newNumLikes = newLikedState
            ? (originalProviderState.num_likes || 0) + 1
            : Math.max(0, (originalProviderState.num_likes || 1) - 1);

        setCommRecsRaw((prev) =>
            prev.map((p) =>
                p.id === providerId
                    ? {
                          ...p,
                          num_likes: newNumLikes,
                          currentUserLiked: newLikedState,
                      }
                    : p
            )
        );
        setCommRecsLikedMap((prev) => {
            const newMap = new Map(prev);
            newMap.set(providerId, newLikedState);
            return newMap;
        });
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
            setCommRecsRaw((prev) =>
                prev.map((p) =>
                    p.id === providerId
                        ? {
                              ...p,
                              num_likes: parseInt(result.num_likes, 10) || 0,
                              currentUserLiked: result.currentUserLiked,
                          }
                        : p
                )
            );
            setCommRecsLikedMap((prev) => {
                const newMap = new Map(prev);
                newMap.set(providerId, result.currentUserLiked);
                return newMap;
            });
        } catch (error) {
            setCommRecsRaw((prev) =>
                prev.map((p) =>
                    p.id === providerId ? originalProviderState : p
                )
            );
            setCommRecsLikedMap((prev) => {
                const newMap = new Map(prev);
                newMap.set(providerId, originalLikedState);
                return newMap;
            });
            alert(`Failed to update like: ${error.message}`);
        }
    };

    const handleRequestToJoin = async () => {
        if (!currentUserId) {
            navigate("/sign-in", { state: { from: location.pathname } });
            return;
        }
        if (!communityDetails) return;
        setIsRequestingJoin(true);
        setCommunityError("");
        try {
            const response = await fetch(`${API_URL}/api/communities/request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: currentUserId,
                    community_id: communityDetails.id,
                }),
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(
                    errData.error || "Failed to send join request."
                );
            }
            fetchCommunityDetails();
        } catch (err) {
            setCommunityError(err.message);
        } finally {
            setIsRequestingJoin(false);
        }
    };

    if (loadingCommunityDetails && !communityDetails)
        return (
            <div className="page-loading-state">
                <div className="profile-spinner"></div>Loading community...
            </div>
        );
    if (
        communityError &&
        !communityDetails &&
        activeTab !== "recommendations" &&
        activeTab !== "members"
    )
        return <div className="page-error-state">Error: {communityError}</div>;
    if (!isLoaded)
        return (
            <div className="page-loading-state">
                <div className="profile-spinner"></div>
            </div>
        );
    if (!communityDetails && !loadingCommunityDetails)
        return (
            <div className="page-empty-state">
                Community not found or error loading details.
            </div>
        );

    const {
        name,
        description,
        creator_name,
        created_at,
        member_count,
        recommendation_count,
        isOwner,
        currentUserStatus,
    } = communityDetails || {};
    const canRequestToJoin = isSignedIn && currentUserStatus === "none";
    const isMember = isSignedIn && currentUserStatus === "approved";
    const hasRequested = isSignedIn && currentUserStatus === "requested";

    const renderActionButtons = () => {
        if (!isLoaded) return null;

        if (!isSignedIn) {
            return (
                <button
                    className="btn btn-primary-outline"
                    onClick={() =>
                        navigate("/sign-in", { state: { from: location } })
                    }
                >
                    <FaSignInAlt style={{ marginRight: "8px" }} /> Sign in to
                    Interact
                </button>
            );
        }

        if (isOwner) {
            return (
                <div className="community-owner-actions">
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setGeneratedInviteLink("");
                            setInviteGenerationError("");
                            setInviteExpiresAt("");
                            setInviteMaxUses("");
                            setIsInviteModalOpen(true);
                        }}
                    >
                        <FaUserPlus style={{ marginRight: "8px" }} /> Invite
                        Members
                    </button>
                </div>
            );
        }

        if (isMember) {
            return (
                <span className="status-chip member">
                    <FaUserCheck style={{ marginRight: "5px" }} /> Member
                </span>
            );
        }

        if (hasRequested) {
            return (
                <span className="status-chip pending">
                    <FaHourglassHalf style={{ marginRight: "5px" }} /> Request
                    Pending
                </span>
            );
        }

        if (canRequestToJoin) {
            return (
                <button
                    className="btn btn-primary"
                    onClick={handleRequestToJoin}
                    disabled={isRequestingJoin}
                >
                    <FaUserPlus style={{ marginRight: "8px" }} />{" "}
                    {isRequestingJoin
                        ? "Sending Request..."
                        : "Request to Join"}
                </button>
            );
        }

        return null;
    };

    return (
        <div className="community-profile-page-wrapper">
            {communityDetails && (
                <div className="community-info-card">
                    <div className="info-card-header">
                        {" "}
                        <h1 className="community-title">{name}</h1>{" "}
                        <div className="info-card-actions">
                            {renderActionButtons()}
                        </div>
                    </div>
                    <p className="community-description-card">
                        {description || "No description provided."}
                    </p>
                    <div className="community-stats-grid">
                        <IconText
                            icon={<FaUserTie size={18} />}
                            text={`Managed by ${creator_name || "N/A"}`}
                        />
                        <IconText
                            icon={<FaCalendarAlt size={16} />}
                            text={`Since ${
                                created_at
                                    ? new Date(created_at).toLocaleDateString()
                                    : "N/A"
                            }`}
                        />
                        <IconText
                            icon={<FaUsers size={18} />}
                            text={`${member_count || 0} Members`}
                        />
                        <IconText
                            icon={<FaStar size={18} />}
                            text={`${
                                recommendation_count || 0
                            } Shared Recommendations`}
                        />
                    </div>
                </div>
            )}

            <div className="community-content-area">
                <div className="tabs">
                    <button
                        className={`tab-button ${
                            activeTab === "recommendations" ? "active" : ""
                        }`}
                        onClick={() => setActiveTab("recommendations")}
                    >
                        Recommendations ({commRecsRaw.length})
                    </button>
                    <button
                        className={`tab-button ${
                            activeTab === "members" ? "active" : ""
                        }`}
                        onClick={() => setActiveTab("members")}
                    >
                        Members (
                        {activeTab === "members" && communityMembers.length > 0
                            ? communityMembers.length
                            : communityDetails?.member_count || 0}
                        )
                    </button>
                </div>

                {activeTab === "recommendations" && (
                    <div className="recommendations-section appliance-services-container">
                        {/* --- LISTS SECTION --- */}
                        <div
                            className="community-lists-section"
                            style={{ marginBottom: "2.5rem" }}
                        >
                            <h2
                                style={{
                                    fontSize: "1.5rem",
                                    fontWeight: 700,
                                    color: "#1a365d",
                                    marginBottom: "1rem",
                                }}
                            >
                                Lists Shared With This Community
                            </h2>
                            {loadingCommunityLists ? (
                                <div>Loading lists...</div>
                            ) : communityListsError ? (
                                <div className="profile-error-banner">
                                    {communityListsError}
                                </div>
                            ) : communityLists.length === 0 ? (
                                <div>
                                    No lists have been shared with this
                                    community yet.
                                </div>
                            ) : (
                                <div className="profile-list-card-row">
                                    {communityLists.map((list) => (
                                        <ListCard
                                            key={list.id}
                                            list={list}
                                            showOwner // Pass this prop to show owner info
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* --- FILTERS AND INDIVIDUAL RECOMMENDATIONS BELOW --- */}
                        <h2
                                style={{
                                    fontSize: "1.5rem",
                                    fontWeight: 700,
                                    color: "#1a365d",
                                    marginBottom: "1rem",
                                }}
                            >
                                Recommendations
                            </h2>
                        <div className="filters-container">
                            
                            <div className="profile-city-filter-toggle-section">
                                <button
                                    className="profile-city-filter-toggle"
                                    onClick={() =>
                                        setShowCityFilter(!showCityFilter)
                                    }
                                >
                                    <FaMapMarkerAlt className="profile-filter-icon" />
                                    <span className="filter-button-text">
                                        <span className="filter-button-text-long">
                                            Filter by{" "}
                                        </span>
                                        <span>City</span>
                                    </span>
                                    {selectedCities.length > 0 && (
                                        <span className="profile-active-filters-badge">
                                            {selectedCities.length}
                                        </span>
                                    )}
                                    <ChevronDownIcon
                                        className={`profile-filter-chevron ${
                                            showCityFilter ? "rotated" : ""
                                        }`}
                                    />
                                </button>
                            </div>
                            {availableServices.length > 0 && (
                                <div className="profile-city-filter-toggle-section">
                                    <button
                                        className="profile-city-filter-toggle"
                                        onClick={() =>
                                            setShowServiceFilter(
                                                !showServiceFilter
                                            )
                                        }
                                    >
                                        <FaConciergeBell className="profile-filter-icon" />
                                        <span className="filter-button-text">
                                            <span className="filter-button-text-long">
                                                Filter by{" "}
                                            </span>
                                            <span>Service</span>
                                        </span>
                                        {selectedServices.length > 0 && (
                                            <span className="profile-active-filters-badge">
                                                {selectedServices.length}
                                            </span>
                                        )}
                                        <ChevronDownIcon
                                            className={`profile-filter-chevron ${
                                                showServiceFilter
                                                    ? "rotated"
                                                    : ""
                                            }`}
                                        />
                                    </button>
                                </div>
                            )}

                            {showCityFilter && (
                                <div className="profile-city-filter-wrapper">
                                    <div className="profile-city-filter-checkboxes">
                                        {availableCities.map(
                                            ([cityName, count]) => (
                                                <div
                                                    key={cityName}
                                                    className="profile-city-checkbox-item"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        id={`city-${cityName.replace(
                                                            /\s+/g,
                                                            "-"
                                                        )}`}
                                                        name={cityName}
                                                        checked={selectedCities.includes(
                                                            cityName
                                                        )}
                                                        onChange={() =>
                                                            handleCitySelection(
                                                                cityName
                                                            )
                                                        }
                                                    />
                                                    <label
                                                        htmlFor={`city-${cityName.replace(
                                                            /\s+/g,
                                                            "-"
                                                        )}`}
                                                        className="profile-city-checkbox-label"
                                                    >
                                                        {cityName}
                                                    </label>
                                                    <span className="profile-city-count">
                                                        ({count})
                                                    </span>
                                                </div>
                                            )
                                        )}
                                        {selectedCities.length > 0 && (
                                            <button
                                                onClick={() =>
                                                    setSelectedCities([])
                                                }
                                                className="profile-city-clear-all"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                            {showServiceFilter &&
                                availableServices.length > 0 && (
                                    <div className="profile-city-filter-wrapper">
                                        <div className="profile-city-filter-checkboxes">
                                            {availableServices.map(
                                                ([serviceName, count]) => (
                                                    <div
                                                        key={serviceName}
                                                        className="profile-city-checkbox-item"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            id={`service-${serviceName.replace(
                                                                /\s+/g,
                                                                "-"
                                                            )}`}
                                                            name={serviceName}
                                                            checked={selectedServices.includes(
                                                                serviceName
                                                            )}
                                                            onChange={() =>
                                                                handleServiceSelection(
                                                                    serviceName
                                                                )
                                                            }
                                                        />
                                                        <label
                                                            htmlFor={`service-${serviceName.replace(
                                                                /\s+/g,
                                                                "-"
                                                            )}`}
                                                            className="profile-city-checkbox-label"
                                                        >
                                                            {serviceName}
                                                        </label>
                                                        <span className="profile-city-count">
                                                            ({count})
                                                        </span>
                                                    </div>
                                                )
                                            )}
                                            {selectedServices.length > 0 && (
                                                <button
                                                    onClick={() =>
                                                        setSelectedServices([])
                                                    }
                                                    className="profile-city-clear-all"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                        </div>
                        {loadingCommRecs && (
                            <div className="loading-spinner">
                                Loading recommendations...
                            </div>
                        )}
                        {!loadingCommRecs &&
                            commRecsError &&
                            sortedAndFilteredCommRecs.length === 0 && (
                                <div className="error-message full-width-error">
                                    {commRecsError}
                                </div>
                            )}
                        {!loadingCommRecs &&
                            !commRecsError &&
                            sortedAndFilteredCommRecs.length === 0 && (
                                <div className="no-providers-message">
                                    <FaTools className="no-providers-icon" />
                                    <h2>No Recommendations Yet</h2>
                                    <p>
                                        This community doesn't have any shared
                                        recommendations yet.{" "}
                                        {isMember
                                            ? "Be the first to add one!"
                                            : ""}
                                    </p>
                                    {isMember && (
                                        <div className="no-providers-actions">
                                            <button
                                                onClick={() =>
                                                    navigate(
                                                        "/share-recommendation",
                                                        {
                                                            state: {
                                                                communityId:
                                                                    communityId,
                                                                communityName:
                                                                    name,
                                                            },
                                                        }
                                                    )
                                                }
                                                className="primary-button"
                                            >
                                                <FaPlusCircle
                                                    style={{
                                                        marginRight: "8px",
                                                    }}
                                                />{" "}
                                                Share a Recommendation
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        {sortedAndFilteredCommRecs.length > 0 && (
                            <ul className="provider-list">
                                {sortedAndFilteredCommRecs.map((provider) => {
                                    const currentReviews =
                                        commRecsReviewMap[provider.id] || [];
                                    const displayAvgRating = (
                                        parseFloat(provider.average_rating) || 0
                                    ).toFixed(1);
                                    const displayTotalReviews =
                                        parseInt(provider.total_reviews, 10) ||
                                        0;
                                    const isLiked = commRecsLikedMap.get(
                                        provider.id
                                    );
                                    return (
                                        <li
                                            key={provider.id}
                                            className="provider-card"
                                        >
                                            <div className="card-header">
                                                <h3 className="card-title">
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
                                                </h3>
                                                <div className="badge-wrapper-with-menu">
                                                    {(parseFloat(
                                                        provider.average_rating
                                                    ) || 0) >= 4.5 && (
                                                        <span className="badge top-rated-badge">
                                                            Top Rated
                                                        </span>
                                                    )}
                                                    <div className="dropdown-wrapper">
                                                        <button
                                                            className="three-dots-button"
                                                            onClick={() =>
                                                                setCommRecsDropdownOpenForId(
                                                                    commRecsDropdownOpenForId ===
                                                                        provider.id
                                                                        ? null
                                                                        : provider.id
                                                                )
                                                            }
                                                            title="Options"
                                                        >
                                                            ⋮
                                                        </button>
                                                        {commRecsDropdownOpenForId ===
                                                            provider.id && (
                                                            <div className="dropdown-menu">
                                                                <button
                                                                    className="dropdown-item"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(
                                                                            `${window.location.origin}/provider/${provider.id}`
                                                                        );
                                                                        setCommRecsDropdownOpenForId(
                                                                            null
                                                                        );
                                                                        setCommRecsShowLinkCopied(
                                                                            true
                                                                        );
                                                                        setTimeout(
                                                                            () =>
                                                                                setCommRecsShowLinkCopied(
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
                                                </div>
                                            </div>

                                            <div className="review-summary">
                                                <CommunityRecStarRating
                                                    rating={
                                                        parseFloat(
                                                            provider.average_rating
                                                        ) || 0
                                                    }
                                                />
                                                <span className="review-score">
                                                    {displayAvgRating}
                                                </span>
                                                <span className="review-count">
                                                    ({displayTotalReviews}{" "}
                                                    {displayTotalReviews === 1
                                                        ? "review"
                                                        : "reviews"}
                                                    )
                                                </span>
                                                {isSignedIn && (
                                                    <button
                                                        className="write-review-link"
                                                        onClick={() => {
                                                            setCommRecsSelectedProvider(
                                                                provider
                                                            );
                                                            setCommRecsIsReviewModalOpen(
                                                                true
                                                            );
                                                        }}
                                                    >
                                                        Write a Review
                                                    </button>
                                                )}
                                                <button
                                                    className={`like-button ${
                                                        isLiked ? "liked" : ""
                                                    }`}
                                                    onClick={() =>
                                                        handleCommRecsLike(
                                                            provider.id
                                                        )
                                                    }
                                                    title={
                                                        isLiked
                                                            ? "Unlike"
                                                            : "Like"
                                                    }
                                                    disabled={!isSignedIn}
                                                >
                                                    <FaThumbsUp />{" "}
                                                    <span className="like-count">
                                                        {provider.num_likes ||
                                                            0}
                                                    </span>
                                                </button>
                                            </div>

                                            <p className="card-description">
                                                {provider.description ||
                                                    provider.recommender_message ||
                                                    "No description available"}
                                            </p>

                                            <div className="tag-container">
                                                {Array.isArray(provider.tags) &&
                                                    provider.tags.map(
                                                        (tag, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="tag-badge"
                                                            >
                                                                {tag}
                                                            </span>
                                                        )
                                                    )}
                                                {isSignedIn && (
                                                    <button
                                                        className="add-tag-button"
                                                        onClick={() => {
                                                            setCommRecsSelectedProvider(
                                                                provider
                                                            );
                                                            setCommRecsIsReviewModalOpen(
                                                                true
                                                            );
                                                        }}
                                                        aria-label="Add or edit tags"
                                                    >
                                                        <FaPlusCircle />
                                                    </button>
                                                )}
                                            </div>

                                            {provider.recommender_name && (
                                                <div className="recommended-row">
                                                    <span className="recommended-label">
                                                        Recommended by:
                                                    </span>
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
                                                    {provider.date_of_recommendation && (
                                                        <span className="recommendation-date">
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
                                            )}

                                            {currentReviews.length > 0 &&
                                                currentReviews
                                                    .map((r) => r.user_name)
                                                    .filter(
                                                        (n) =>
                                                            n &&
                                                            n.trim() &&
                                                            n !==
                                                                provider.recommender_name
                                                    )
                                                    .filter(
                                                        (v, i, a) =>
                                                            a.indexOf(v) === i
                                                    ).length > 0 && (
                                                    <div className="recommended-row also-used-by">
                                                        <span className="recommended-label">
                                                            Also used by:
                                                        </span>
                                                        <span className="used-by-names">
                                                            {currentReviews
                                                                .map(
                                                                    (r) =>
                                                                        r.user_name
                                                                )
                                                                .filter(
                                                                    (n) =>
                                                                        n &&
                                                                        n.trim() &&
                                                                        n !==
                                                                            provider.recommender_name
                                                                )
                                                                .filter(
                                                                    (v, i, a) =>
                                                                        a.indexOf(
                                                                            v
                                                                        ) === i
                                                                )
                                                                .join(", ")}
                                                        </span>
                                                    </div>
                                                )}

                                            <div className="action-buttons">
                                                {isSignedIn &&
                                                    (provider.recommender_phone ||
                                                        provider.recommender_email) && (
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
                                                            }}
                                                        >
                                                            Connect with
                                                            Recommender
                                                        </button>
                                                    )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        {commRecsShowLinkCopied && (
                            <div className="toast">Link copied!</div>
                        )}
                    </div>
                )}
                {activeTab === "members" && (
                    <div className="members-section">
                        {loadingCommunityMembers && (
                            <div className="loading-spinner">
                                Loading members...
                            </div>
                        )}
                        {!loadingCommunityMembers &&
                            communityError &&
                            communityMembers.length === 0 && (
                                <div className="error-message full-width-error">
                                    {communityError}
                                </div>
                            )}
                        {!loadingCommunityMembers &&
                            !communityError &&
                            communityMembers.length === 0 && (
                                <p className="no-results-message">
                                    No members to display in this community yet.
                                </p>
                            )}
                        {communityMembers.length > 0 && (
                            <div className="members-list">
                                {communityMembers.map((member) => (
                                    <MemberCard
                                        key={
                                            member.id ||
                                            member.clerk_id ||
                                            member.email
                                        }
                                        member={member}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {commRecsIsReviewModalOpen && commRecsSelectedProvider && (
                <CommunityRecReviewModal
                    isOpen={commRecsIsReviewModalOpen}
                    onClose={() => setCommRecsIsReviewModalOpen(false)}
                    onSubmit={handleCommRecsReviewSubmit}
                    provider={commRecsSelectedProvider}
                />
            )}
            {commRecsClickedRecommender && (
                <div className="modal-overlay">
                    <div className="simple-modal">
                        <button
                            className="modal-close-x"
                            onClick={() => setCommRecsClickedRecommender(null)}
                        >
                            ×
                        </button>
                        <h3 className="modal-title">
                            Want to connect with{" "}
                            <span className="highlight">
                                {commRecsClickedRecommender}
                            </span>
                            ?
                        </h3>
                        <div className="modal-buttons-vertical">
                            <button
                                className="secondary-button"
                                onClick={() => {
                                    setCommRecsClickedRecommender(null);
                                    setCommRecsShowFeatureComingModal(true);
                                }}
                            >
                                Thank {commRecsClickedRecommender}
                            </button>
                            <button
                                className="secondary-button"
                                onClick={() => {
                                    setCommRecsClickedRecommender(null);
                                    setCommRecsShowFeatureComingModal(true);
                                }}
                            >
                                Ask {commRecsClickedRecommender} a question
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {commRecsShowFeatureComingModal && (
                <div className="modal-overlay">
                    <div className="modal-content review-modal-content">
                        <button
                            className="modal-close-x"
                            onClick={() =>
                                setCommRecsShowFeatureComingModal(false)
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
                                    setCommRecsShowFeatureComingModal(false)
                                }
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {commRecsIsQuoteModalOpen && commRecsSelectedProvider && (
                <QuoteModal
                    isOpen={commRecsIsQuoteModalOpen}
                    providerName={commRecsSelectedProvider.business_name}
                    providerEmail={commRecsSelectedProvider.email}
                    providerPhotoUrl={commRecsSelectedProvider.profile_image}
                    onClose={() => setCommRecsIsQuoteModalOpen(false)}
                />
            )}
            <InviteMembersModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onSubmit={handleGenerateInviteLink}
                communityName={communityDetails?.name || "this community"}
                generatedLink={generatedInviteLink}
                error={inviteGenerationError}
                loading={inviteGenerationLoading}
            />
        </div>
    );
};

export default CommunityProfile;
