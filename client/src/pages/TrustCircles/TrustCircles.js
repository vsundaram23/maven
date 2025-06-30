import { useUser } from "@clerk/clerk-react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    FaCheck,
    FaConciergeBell,
    FaEye,
    FaHeart,
    FaMapMarkerAlt,
    FaPlusCircle,
    FaSearch,
    FaStar,
    FaUserFriends,
    FaUserPlus,
    FaUsers
} from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import MemberCard from "../../components/MemberCard/MemberCard";
import QuoteModal from "../../components/QuoteModal/QuoteModal";
import RecommendationCard from "../../components/RecommendationCard/RecommendationCard";
import ReviewModal from "../../components/ReviewModal/ReviewModal";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
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

    const [myRecRawProviders, setMyRecRawProviders] = useState([]);
    const [loadingMyRecommendations, setLoadingMyRecommendations] =
        useState(true);
    const [myRecError, setMyRecError] = useState(null);
    const [myRecIsReviewModalOpen, setMyRecIsReviewModalOpen] = useState(false);
    const [myRecSelectedProvider, setMyRecSelectedProvider] = useState(null);
    const [myRecIsQuoteModalOpen, setMyRecIsQuoteModalOpen] = useState(false);
    const [myRecLikedRecommendations, setMyRecLikedRecommendations] = useState(
        new Set()
    );
    const [myRecClickedRecommender, setMyRecClickedRecommender] =
        useState(null);
    const [myRecShowFeatureComingModal, setMyRecShowFeatureComingModal] =
        useState(false);

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

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

    const [isServiceFilterVisible, setIsServiceFilterVisible] = useState(false);
    const [selectedServices, setSelectedServices] = useState([]);
    const [isCityFilterVisible, setIsCityFilterVisible] = useState(false);
    const [selectedCities, setSelectedCities] = useState([]);

    const [followingConnections, setFollowingConnections] = useState([]);
    const [followersTabActiveList, setFollowersTabActiveList] =
        useState("followers");
    const [loadingFollowing, setLoadingFollowing] = useState(false);
    const [suggestedFollows, setSuggestedFollows] = useState([]);
    const [loadingSuggestedFollows, setLoadingSuggestedFollows] = useState(false);
    const [userSearchResults, setUserSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Comment system state
    const [commentsMap, setCommentsMap] = useState(new Map());
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [currentUserName, setCurrentUserName] = useState(null);

    useEffect(() => {
        if (isLoaded && isSignedIn && user) {
            setCurrentUserId(user.id);
            setCurrentUserEmail(user.primaryEmailAddress?.emailAddress);
            setCurrentUserName(user.firstName || user.lastName || "User");
        } else if (isLoaded && !isSignedIn) {
            setCurrentUserId(null);
            setCurrentUserEmail(null);
            setCurrentUserName(null);
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
            
            // Data now comes directly from the backend, no need for individual API calls
            const enriched = fetchedProviders.map((p, idx) => ({
                ...p,
                originalIndex: idx,
                average_rating: parseFloat(p.average_rating) || 0,
                total_reviews: parseInt(p.total_reviews, 10) || 0,
                currentUserLiked: p.currentUserLiked || false,
                num_likes: parseInt(p.num_likes, 10) || 0,
                users_who_reviewed: p.users_who_reviewed || [],
            }));
            
            const initialLikes = new Set();
            enriched.forEach((p) => {
                if (p.currentUserLiked) initialLikes.add(p.id);
            });
            setMyRecLikedRecommendations(initialLikes);
            setMyRecRawProviders(enriched);
        } catch (err) {
            setMyRecError(err.message);
            setMyRecRawProviders([]);
        } finally {
            setLoadingMyRecommendations(false);
        }
    }, [currentUserId, currentUserEmail, isLoaded, isSignedIn, navigate]);

    const fetchSingleMyRecProvider = useCallback(async (providerId) => {
        if (!currentUserId || !currentUserEmail) return;
        try {
            const params = new URLSearchParams({ 
                user_id: currentUserId,
                email: currentUserEmail 
            });
            const response = await fetch(`${API_URL}/api/providers/${providerId}?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch provider update.');
            const data = await response.json();
            
            if (data.success && data.provider) {
                const updatedProvider = data.provider;
                setMyRecRawProviders(prevProviders => {
                    return prevProviders.map(p => {
                        if (p.id === providerId) {
                            return {
                                ...p,
                                ...updatedProvider,
                                average_rating: parseFloat(updatedProvider.average_rating) || 0,
                                total_reviews: parseInt(updatedProvider.total_reviews, 10) || 0,
                                users_who_reviewed: updatedProvider.users_who_reviewed || [],
                            };
                        }
                        return p;
                    });
                });
            }
        } catch (error) {
            console.error("Failed to refresh recommendation:", error);
            fetchMyVisibleRecommendations();
        }
    }, [currentUserId, currentUserEmail, fetchMyVisibleRecommendations]);

    // Batch fetch comments for multiple recommendations
    const fetchBatchComments = useCallback(async (recommendations) => {
        if (!recommendations || recommendations.length === 0) return;
        
        setIsLoadingComments(true);
        try {
            const serviceIds = recommendations.map(rec => rec.provider_id || rec.id).filter(Boolean);
            
            if (serviceIds.length === 0) return;

            const response = await fetch(`${API_URL}/api/comments/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ service_ids: serviceIds }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.comments) {
                    const newCommentsMap = new Map();
                    Object.entries(data.comments).forEach(([serviceId, comments]) => {
                        newCommentsMap.set(String(serviceId), comments || []);
                    });
                    setCommentsMap(newCommentsMap);
                }
            }
        } catch (error) {
            console.error('Error fetching batch comments:', error);
        } finally {
            setIsLoadingComments(false);
        }
    }, []);

    // Handle comment added callback
    const handleCommentAdded = useCallback((serviceId, newComment) => {
        setCommentsMap(prevMap => {
            const newMap = new Map(prevMap);
            const existingComments = newMap.get(String(serviceId)) || [];
            newMap.set(String(serviceId), [newComment, ...existingComments]);
            return newMap;
        });
    }, []);

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

    // Fetch batch comments when raw providers are available
    useEffect(() => {
        if (!loadingMyRecommendations && myRecRawProviders.length > 0) {
            fetchBatchComments(myRecRawProviders);
        }
    }, [myRecRawProviders, loadingMyRecommendations, fetchBatchComments]);

    const availableCities = useMemo(() => {
        const cityMap = new Map();
        myRecRawProviders.forEach((rec) => {
            const city = rec.city || "Other";
            if (city) {
                cityMap.set(city, (cityMap.get(city) || 0) + 1);
            }
        });
        return Array.from(cityMap.entries()).sort((a, b) => b[1] - a[1]);
    }, [myRecRawProviders]);

    const availableServices = useMemo(() => {
        const serviceMap = new Map();
        myRecRawProviders.forEach((rec) => {
            if (rec.recommended_service_id && rec.recommended_service_name) {
                serviceMap.set(rec.recommended_service_id, {
                    id: rec.recommended_service_id,
                    name: rec.recommended_service_name,
                });
            }
        });
        return Array.from(serviceMap.values());
    }, [myRecRawProviders]);

    const serviceIdCounts = useMemo(() => {
        return myRecRawProviders.reduce((acc, rec) => {
            const serviceId = rec.recommended_service_id;
            if (serviceId) {
                acc[serviceId] = (acc[serviceId] || 0) + 1;
            }
            return acc;
        }, {});
    }, [myRecRawProviders]);

    const sortedMyRecProviders = useMemo(() => {
        if (!myRecRawProviders) return [];
        let list = [...myRecRawProviders];

        if (selectedServices.length > 0) {
            list = list.filter(
                (p) =>
                    p.recommended_service_id &&
                    selectedServices.includes(p.recommended_service_id)
            );
        }

        if (selectedCities.length > 0) {
            list = list.filter((p) => {
                const city = p.city || "Other";
                return selectedCities.includes(city);
            });
        }

        // Default sort by most recent recommendation date
        return list.sort((a, b) => {
            const dateA = a.date_of_recommendation
                ? new Date(a.date_of_recommendation)
                : null;
            const dateB = b.date_of_recommendation
                ? new Date(b.date_of_recommendation)
                : null;

            if (dateB && dateA) return dateB - dateA; // Most recent first
            if (dateB) return 1; // B has a date, A does not, so B comes first
            if (dateA) return -1; // A has a date, B does not, so A comes first

            return (a.originalIndex || 0) - (b.originalIndex || 0); // Fallback for items without dates
        });
    }, [myRecRawProviders, selectedServices, selectedCities]);

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

    const handleReviewSubmit = async (reviewData) => {
        if (
            !isSignedIn ||
            !myRecSelectedProvider ||
            !currentUserId ||
            !currentUserEmail
        ) {
            console.warn("Please sign in to submit a review");
            return;
        }
        setMyRecIsReviewModalOpen(false);
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
            fetchSingleMyRecProvider(myRecSelectedProvider.id);
            setSuccessMessage("Your review has been submitted successfully. Thank you!");
            setShowSuccessModal(true);
        } catch (err) {
            console.error(`Error submitting review: ${err.message}`);
        }
    };

    const handleMyRecLike = async (providerId) => {
        if (!currentUserId || !currentUserEmail) {
            console.warn("Please log in to like/unlike.");
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
            console.error(`Failed to update like: ${error.message}`);
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
                    console.warn("This user is already on Tried & Trusted, but their profile could not be found.");
                }
            } else if (res.ok && !data.exists) {
                const message = `Hey! I've started sharing my Recs on Tried & Trusted and would love for you to join. You can join here: https://triedandtrusted.ai/`;
                window.location.href = `sms:${newPersonPhone}?&body=${encodeURIComponent(message)}`;
                setNewPersonPhone("");
            } else {
                throw new Error(data.error || 'Failed to check phone number.');
            }
        } catch (err) {
            console.error(`An error occurred: ${err.message}`);
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
            console.log("Community created!");
            setNewCommunityName("");
            setNewCommunityDescription("");
            setShowCreateCommunityModal(false);
            fetchMyTrustCircleData();
        } catch (err) {
            console.error(`Error creating community: ${err.message}`);
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
            console.log("Request to join sent!");
            fetchMyTrustCircleData();
        } catch (err) {
            console.error(`Error: ${err.message}`);
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
            console.log("Membership approved!");
            fetchMyTrustCircleData();
        } catch (err) {
            console.error(`Error: ${err.message}`);
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

    const handleCitySelection = (cityName) => {
        setSelectedCities((prev) =>
            prev.includes(cityName)
                ? prev.filter((c) => c !== cityName)
                : [...prev, cityName]
        );
    };

    const handleServiceSelection = (serviceId) => {
        setSelectedServices((prev) =>
            prev.includes(serviceId)
                ? prev.filter((id) => id !== serviceId)
                : [...prev, serviceId]
        );
    };

    const handleFollowUser = async (toUserId) => {
        if (!currentUserId) {
            console.warn("You must be logged in to follow users.");
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
            console.error('An error occurred while trying to follow the user. Please try again.');
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
                        <div className="section-actions communities-mobile-actions">
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
                        <div className="section-title-container">
                            <h2 className="section-title">My Communities</h2>
                            <div className="section-actions communities-desktop-actions">
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
                                Followers{individualConnections.length > 0 ? ` (${individualConnections.length})` : ""}
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
                                Following{followingConnections.length > 0 ? ` (${followingConnections.length})` : ""}
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
                        <>
                            <div className="connections-header-mobile-search">
                                <div className="section-actions" style={{ width: '100%' }}>
                                    <button
                                        className="button button-primary icon-button"
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
                                    <div className="section-actions section-actions-followers">
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
                                <div className="connections-header-mobile-search">
                                     <div className="search-input-wrapper">
                                        <SearchIconSvg />
                                        <input
                                            type="text"
                                            placeholder="Search followers..."
                                            value={followersSearch}
                                            onChange={handleSearchChange}
                                            className="followers-search-input"
                                        />
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
                                                hideThreeDots={true}
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>
                        </>
                    )}

                    {followersTabActiveList === "following" && (
                        <>
                            <div className="connections-header-mobile-search">
                                <div className="search-input-wrapper">
                                    <SearchIconSvg />
                                    <input
                                        type="text"
                                        placeholder="Look for accounts"
                                        value={followersSearch}
                                        onChange={handleSearchChange}
                                        className="followers-search-input"
                                    />
                                </div>
                            </div>
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
                                                <MemberCard key={conn.id} member={conn} hideThreeDots={true} />
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
                        Recommendations For You
                    </h1>
                    {(availableServices.length > 0 || availableCities.length > 0) && (
                        <div className="filters-container">
                            <div className="profile-city-filter-toggle-section">
                                <button
                                    onClick={() =>
                                        setIsServiceFilterVisible((prev) => !prev)
                                    }
                                    className="profile-city-filter-toggle"
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
                                            isServiceFilterVisible ? "rotated" : ""
                                        }`}
                                    />
                                </button>
                            </div>
                            {availableCities.length > 0 && (
                                <div className="profile-city-filter-toggle-section">
                                    <button
                                        onClick={() =>
                                            setIsCityFilterVisible((prev) => !prev)
                                        }
                                        className="profile-city-filter-toggle"
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
                                                isCityFilterVisible ? "rotated" : ""
                                            }`}
                                        />
                                    </button>
                                </div>
                            )}

                            {isServiceFilterVisible && (
                                <div className="profile-city-filter-wrapper">
                                    <div className="profile-city-filter-checkboxes">
                                        {availableServices
                                            .sort(
                                                (a, b) =>
                                                    (serviceIdCounts[b.id] || 0) -
                                                    (serviceIdCounts[a.id] || 0)
                                            )
                                            .map((service) => (
                                                <div
                                                    key={service.id}
                                                    className="profile-city-checkbox-item"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        id={`service-${service.id}`}
                                                        checked={selectedServices.includes(
                                                            service.id
                                                        )}
                                                        onChange={() =>
                                                            handleServiceSelection(
                                                                service.id
                                                            )
                                                        }
                                                    />
                                                    <label
                                                        htmlFor={`service-${service.id}`}
                                                        className="profile-city-checkbox-label"
                                                    >
                                                        {service.name}
                                                    </label>
                                                    <span className="profile-city-count">
                                                        (
                                                        {serviceIdCounts[
                                                            service.id
                                                        ] || 0}
                                                        )
                                                    </span>
                                                </div>
                                            ))}
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
                            {isCityFilterVisible && availableCities.length > 0 && (
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
                                                        id={`city-${cityName.replace(/\s+/g, '-')}`}
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
                                                        htmlFor={`city-${cityName.replace(/\s+/g, '-')}`}
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
                        </div>
                    )}
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
                        <div className="provider-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                            {sortedMyRecProviders.map((provider) => (
                                <RecommendationCard
                                    key={provider.id}
                                    rec={provider}
                                    onWriteReview={(rec) => {
                                        setMyRecSelectedProvider(rec);
                                        setMyRecIsReviewModalOpen(true);
                                    }}
                                    onLike={handleMyRecLike}
                                    isLikedByCurrentUser={myRecLikedRecommendations.has(provider.id)}
                                    loggedInUserId={currentUserId}
                                    currentUserName={currentUserName}
                                    comments={commentsMap.get(String(provider.provider_id || provider.id)) || []}
                                    onCommentAdded={handleCommentAdded}
                                />
                            ))}
                        </div>
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
                <ReviewModal
                    isOpen={myRecIsReviewModalOpen}
                    onClose={() => setMyRecIsReviewModalOpen(false)}
                    onSubmit={handleReviewSubmit}
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
            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    if (myRecSelectedProvider) {
                        fetchSingleMyRecProvider(myRecSelectedProvider.id);
                    }
                }}
                message={successMessage}
            />
        </div>
    );
};

export default TrustCircles;