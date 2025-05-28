import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { FaStar, FaUsers, FaPlusCircle, FaThumbsUp, FaEye, FaPhoneAlt, FaEnvelope, FaSms} from "react-icons/fa";
import QuoteModal from "../../components/QuoteModal/QuoteModal";
import "./TrustCircles.css";

const API_URL = "https://api.seanag-recommendations.org:8080";
// const API_URL = "http://localhost:3000";

const PersonAddIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ marginRight: "8px" }}>
        <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
);
const GroupAddIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ marginRight: "8px" }}>
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
);
const LaunchIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ marginLeft: "6px" }}>
        <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
    </svg>
);
const SearchIconSvg = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ marginRight: "8px" }}>
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
);
const HourglassTopIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ marginRight: "8px" }}>
        <path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16.01l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zM8 4h8v3.5l-4 4-4-4V4z" />
    </svg>
);

// const MemberCard = ({ member }) => {
//   const [imageFailed, setImageFailed] = useState(false);
//   const primarySrc = member.profile_image_url || member.avatarUrl;
//   const fallbackUiAvatarSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || member.email || 'NA')}&background=random&color=fff&size=60&font-size=0.33`;

//   const handleImageError = (e) => {
//     if (e.target.src === primarySrc && primarySrc !== fallbackUiAvatarSrc) {
//       e.target.src = fallbackUiAvatarSrc;
//     } else {
//       setImageFailed(true);
//     }
//   };

//   const getInitials = (name, email) => {
//     if (name) {
//       const names = name.split(' ').filter(n => n);
//       if (names.length > 1) { return (names[0][0] + names[names.length - 1][0]).toUpperCase(); }
//       else if (names.length === 1 && names[0].length > 1) { return names[0].substring(0, 2).toUpperCase(); }
//       else if (names.length === 1 && names[0].length) { return names[0][0].toUpperCase(); }
//     }
//     if (email && email.length > 0) return email[0].toUpperCase();
//     return "U";
//   };

//   const cleanAltText = (name, email) => {
//     const text = name || email || "Community Member";
//     return text.replace(/(\r\n|\n|\r)/gm, " ");
//   };

//   let avatarContent;
//   if (imageFailed) {
//     avatarContent = (
//       <div className="member-avatar member-avatar-initials-fallback">
//         <span>{getInitials(member.name, member.email)}</span>
//       </div>
//     );
//   } else {
//     avatarContent = (
//       <img
//         src={primarySrc || fallbackUiAvatarSrc}
//         alt={cleanAltText(member.name, member.email)}
//         className="member-avatar"
//         onError={handleImageError}
//       />
//     );
//   }

//   const displayName = member.name || member.email || "";
//   let nameParts = [];
//   if (member.name) {
//       nameParts = member.name.split(' ').filter(n => n);
//   }

//   return (
//     <div className="member-item-card">
//       {avatarContent}
//       <div className="member-name-container">
//         {nameParts.length > 1 ? (
//           <>
//             {nameParts.slice(0, -1).join(' ')}
//             {' '} {/* This adds the crucial space */}
//             <span className="member-last-name">{nameParts.slice(-1)[0]}</span>
//           </>
//         ) : (
//           displayName // This will be a single name or an email
//         )}
//       </div>
//     </div>
//   );
// };

const MemberCard = ({ member }) => {
    const [imageFailed, setImageFailed] = useState(false);
    // Assuming member object can have: profile_image_url, avatarUrl, name, email, phone_number
    const primarySrc = member.profile_image_url || member.avatarUrl;
    const fallbackUiAvatarSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || member.email || 'NA')}&background=random&color=fff&size=60&font-size=0.33`;
  
    const handleImageError = (e) => {
      if (e.target.src === primarySrc && primarySrc !== fallbackUiAvatarSrc) {
        e.target.src = fallbackUiAvatarSrc;
      } else {
        setImageFailed(true);
      }
    };
  
    const getInitials = (name, email) => {
      if (name) {
        const names = name.split(' ').filter(n => n);
        if (names.length > 1) { return (names[0][0] + names[names.length - 1][0]).toUpperCase(); }
        else if (names.length === 1 && names[0].length > 1) { return names[0].substring(0, 2).toUpperCase(); }
        else if (names.length === 1 && names[0].length) { return names[0][0].toUpperCase(); }
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
        nameParts = member.name.split(' ').filter(n => n);
    }
  
    return (
      <div className="member-item-card">
        {avatarContent}
        <div className="member-name-container">
          {nameParts.length > 1 ? (
            <>
              {nameParts.slice(0, -1).join(' ')}
              {' '}
              <span className="member-last-name">{nameParts.slice(-1)[0]}</span>
            </>
          ) : (
            displayName
          )}
        </div>
        {/* NEW: Communication Icons Section */}
        <div className="member-actions">
          {member.phone_number && (
            <a href={`sms:${member.phone_number.replace(/\D/g, '')}`} className="member-action-icon" title="Send SMS">
              <FaSms />
            </a>
          )}
          {member.email && (
            <a href={`mailto:${member.email}`} className="member-action-icon" title="Send Email">
              <FaEnvelope />
            </a>
          )}
        </div>
      </div>
    );
  };

const MyRecStarRating = ({ rating }) => {
    const numRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalf = numRating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    return (
        <div className="star-rating">
            {[...Array(fullStars)].map((_, i) => (<FaStar key={`full-${i}`} className="filled" />))}
            {hasHalf && (<FaStar key={`half-${Date.now()}-sr`} className="half" />)}
            {[...Array(emptyStars)].map((_, i) => (<FaStar key={`empty-${i}`} className="empty" />))}
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
            setRating(0); setHover(0); setReview(""); setTags([]); setTagInput(""); setError("");
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!rating) { setError("Please select a rating"); return; }
        onSubmit({ rating, review, tags });
        onClose();
    };

    const handleTagKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const trimmed = tagInput.trim();
            if (trimmed && !tags.includes(trimmed)) { setTags([...tags, trimmed]); }
            setTagInput("");
        }
    };
    const removeTag = (tagToRemove) => setTags(tags.filter((tag) => tag !== tagToRemove));
    if (!isOpen || !provider) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content review-modal-content">
                <h2>Review {provider?.business_name}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="rating-container">
                        <label>Rate your experience: <span className="required">*</span></label>
                        <div className="stars">
                            {[...Array(5)].map((_, index) => (
                                <FaStar key={index} className={index < (hover || rating) ? "star active" : "star"}
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
                        <textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder="Optional: Share your thoughts..." rows={4}/>
                    </div>
                    <div className="tag-input-group">
                        <label>Add tags (press Enter to add):</label>
                        <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="e.g. friendly, affordable"/>
                        <div className="tag-container modal-tag-container">
                            {tags.map((tag, idx) => (
                                <span key={idx} className="tag-badge">
                                    {tag} <span className="remove-tag" onClick={() => removeTag(tag)}>×</span>
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="modal-buttons">
                        <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
                        <button type="submit" className="submit-button">Submit Review</button>
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
    const [loadingMyRecommendations, setLoadingMyRecommendations] = useState(true);
    const [myRecError, setMyRecError] = useState(null);
    const [myRecIsReviewModalOpen, setMyRecIsReviewModalOpen] = useState(false);
    const [myRecSelectedProvider, setMyRecSelectedProvider] = useState(null);
    const [myRecSortOption, setMyRecSortOption] = useState("recommended");
    const [myRecDropdownOpenForId, setMyRecDropdownOpenForId] = useState(null);
    const [myRecShowLinkCopied, setMyRecShowLinkCopied] = useState(false);
    const [myRecIsQuoteModalOpen, setMyRecIsQuoteModalOpen] = useState(false);
    const [myRecLikedRecommendations, setMyRecLikedRecommendations] = useState(new Set());
    const [myRecClickedRecommender, setMyRecClickedRecommender] = useState(null);
    const [myRecShowFeatureComingModal, setMyRecShowFeatureComingModal] = useState(false);
    
    const [showAddPersonModal, setShowAddPersonModal] = useState(false);
    const [newPersonEmail, setNewPersonEmail] = useState("");
    const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
    const [newCommunityName, setNewCommunityName] = useState("");
    const [newCommunityDescription, setNewCommunityDescription] = useState("");
    const [activeTab, setActiveTab] = useState("myTrust");

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
        const tabParam = params.get('tab');
        if (tabParam === 'myRecommendations') setActiveTab('myRecommendations');
        else if (tabParam === 'discover') setActiveTab('discover');
        else setActiveTab('myTrust');
    }, [location.search]);

    const fetchMyTrustCircleData = useCallback(async () => {
        if (!currentUserId || !currentUserEmail) return;
        setLoadingTrustCircle(true); setTrustCircleError("");
        try {
            const params = new URLSearchParams({ user_id: currentUserId, email: currentUserEmail });
            const userRes = await fetch(`${API_URL}/api/communities/user/email/${currentUserEmail}?${params.toString()}`);
            if (!userRes.ok) throw new Error("Failed to fetch user details for Trust Circle.");
            const userData = await userRes.json();
            setCurrentUser(userData);
    
            const conRes = await fetch(`${API_URL}/api/connections/check-connections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: currentUserEmail }), });
            if (!conRes.ok) throw new Error("Failed to fetch individual connections.");
            const conData = await conRes.json(); setIndividualConnections(Array.from(new Set(conData.map(u => u.email))).map(email => conData.find(u => u.email === email)));
            
            const myCommRes = await fetch(`${API_URL}/api/communities/user/${currentUserEmail}/communities`);
            if (!myCommRes.ok) throw new Error("Failed to fetch your communities.");
            let myCommData = await myCommRes.json();
            myCommData = Array.isArray(myCommData) ? myCommData.filter(c => c && c.id).reduce((acc,curr) => acc.find(item=>item.id===curr.id)?acc:[...acc,curr],[]) : [];
            setMyCommunities(myCommData.map(c => ({ ...c, recommendations: c.recommendation_count || Math.floor(Math.random() * 25) })));
            
            const allCommRes = await fetch(`${API_URL}/api/communities/all${userData && userData.id ? `?user_id=${userData.id}` : ""}`);
            if (!allCommRes.ok) throw new Error("Failed to fetch available communities.");
            let allCommData = await allCommRes.json();
            setAvailableCommunities(Array.isArray(allCommData) ? allCommData.map(c => ({ ...c, memberCount: c.member_count || Math.floor(Math.random() * 100) + 5 })) : []);
            
            if (userData && userData.id) {
                const ownedIds = myCommData.filter(c => c.created_by === userData.id).map(c => c.id);
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
                            throw new Error(`HTTP Error ${rRes.status}: ${errorText}`);
                        }
                        const allRequests = await rRes.json();
                        reqs[commId] = allRequests.filter(req => req.status === 'requested'); 
                    } catch (error) {
                        reqs[commId] = [];
                    }
                }
                setJoinRequests(reqs);
            }
        } catch (err) { 
            setTrustCircleError(err.message || "Could not load Trust Circle data.");
        } finally { setLoadingTrustCircle(false); }
    }, [currentUserId, currentUserEmail]);

    const fetchMyVisibleRecommendations = useCallback(async () => {
        if (!currentUserId || !currentUserEmail) {
            if (isLoaded && !isSignedIn) navigate("/"); return;
        }
        setLoadingMyRecommendations(true); setMyRecError(null);
        try {
            const params = new URLSearchParams({ user_id: currentUserId, email: currentUserEmail });
            const response = await fetch(`${API_URL}/api/providers/visible?${params.toString()}`);
            if (!response.ok) { const eData = await response.json().catch(() => ({})); throw new Error(eData.message || `HTTP error ${response.status}`);}
            const data = await response.json();
            if (!data.success) throw new Error(data.message || "Failed to fetch recommendations.");
            let fetchedProviders = data.providers || [];
            const statsMap = {}; const allReviewsMap = {};
            if (fetchedProviders.length > 0) {
                await Promise.all(fetchedProviders.map(async p => {
                    try {
                        const statsRes = await fetch(`${API_URL}/api/reviews/stats/${p.id}`);
                        statsMap[p.id] = statsRes.ok ? await statsRes.json() : { average_rating: 0, total_reviews: 0 };
                    } catch (err) { statsMap[p.id] = { average_rating: p.average_rating || 0, total_reviews: p.total_reviews || 0 }; }
                    try {
                        const reviewsRes = await fetch(`${API_URL}/api/reviews/${p.id}`);
                        allReviewsMap[p.id] = reviewsRes.ok ? await reviewsRes.json() : [];
                    } catch (err) { allReviewsMap[p.id] = []; }
                }));
            }
            setMyRecReviewMap(allReviewsMap);
            const enriched = fetchedProviders.map((p, idx) => ({
                ...p, originalIndex: idx,
                average_rating: statsMap[p.id]?.average_rating || p.average_rating || 0,
                total_reviews: statsMap[p.id]?.total_reviews || p.total_reviews || 0,
                currentUserLiked: p.currentUserLiked || false,
                num_likes: parseInt(p.num_likes, 10) || 0,
            }));
            const initialLikes = new Set(); enriched.forEach(p => { if (p.currentUserLiked) initialLikes.add(p.id); });
            setMyRecLikedRecommendations(initialLikes);
            setMyRecRawProviders(enriched);
        } catch (err) { setMyRecError(err.message); setMyRecProviders([]); setMyRecRawProviders([]);
        } finally { setLoadingMyRecommendations(false); }
    }, [currentUserId, currentUserEmail, isLoaded, isSignedIn, navigate]);

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            if (activeTab === "myTrust" || activeTab === "discover") fetchMyTrustCircleData();
            else if (activeTab === "myRecommendations") fetchMyVisibleRecommendations();
        } else if (isLoaded && !isSignedIn) navigate("/");
    }, [fetchMyTrustCircleData, fetchMyVisibleRecommendations, activeTab, isLoaded, isSignedIn, navigate]);
    
    const sortedMyRecProviders = useMemo(() => {
        if (!myRecRawProviders) return [];
        const getBand = r => { if (r >= 4) return 0; if (r >= 3) return 1; if (r >= 2) return 2; if (r >= 1) return 3; return 4; };
        let list = [...myRecRawProviders];
        if (myRecSortOption === "topRated") {
            return list.filter(p => p.average_rating >= 4.5).sort((a, b) => (b.average_rating !== a.average_rating) ? b.average_rating - a.average_rating : (b.total_reviews || 0) - (a.total_reviews || 0));
        }
        return list.sort((a, b) => {
            const bA = getBand(a.average_rating); const bB = getBand(b.average_rating); if (bA !== bB) return bA - bB;
            const sA = (a.average_rating || 0) * (a.total_reviews || 0); const sB = (b.average_rating || 0) * (b.total_reviews || 0); if (sB !== sA) return sB - sA;
            if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating;
            if ((b.total_reviews || 0) !== (a.total_reviews || 0)) return (b.total_reviews || 0) - (a.total_reviews || 0);
            return (a.originalIndex || 0) - (b.originalIndex || 0);
        });
    }, [myRecRawProviders, myRecSortOption]);


    const handleMyRecReviewSubmit = async (reviewData) => {
        if (!isSignedIn || !myRecSelectedProvider || !currentUserId || !currentUserEmail) { alert("Please sign in to submit a review"); return; }
        try {
            const response = await fetch(`${API_URL}/api/reviews`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider_id: myRecSelectedProvider.id, provider_email: myRecSelectedProvider.email || "",
                    user_id: currentUserId, email: currentUserEmail, rating: reviewData.rating,
                    content: reviewData.review, tags: reviewData.tags,
                }),
            });
            if (!response.ok) { const errTxt = await response.text(); throw new Error(errTxt || "Failed to submit review"); }
            fetchMyVisibleRecommendations(); 
        } catch (err) { alert(`Error submitting review: ${err.message}`); }
    };

    const handleMyRecLike = async (providerId) => {
        if (!currentUserId || !currentUserEmail) { alert("Please log in to like/unlike."); return; }
        const provToUpdate = myRecRawProviders.find(p => p.id === providerId); if (!provToUpdate) return;
        const newLikedState = !provToUpdate.currentUserLiked;
        const newNumLikes = newLikedState ? (provToUpdate.num_likes || 0) + 1 : Math.max(0, (provToUpdate.num_likes || 1) - 1);
        
        const optimisticUpdateList = (list) => list.map(p => p.id === providerId ? { ...p, num_likes: newNumLikes, currentUserLiked: newLikedState } : p);
        setMyRecRawProviders(optimisticUpdateList(myRecRawProviders));
        
        const newLikedSet = new Set(myRecLikedRecommendations);
        if (newLikedState) newLikedSet.add(providerId); else newLikedSet.delete(providerId);
        setMyRecLikedRecommendations(newLikedSet);

        try {
            const response = await fetch(`${API_URL}/api/providers/${providerId}/like`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId, userEmail: currentUserEmail })
            });
            if (!response.ok) { const eData = await response.json().catch(() => ({})); throw new Error(eData.message || `Like error ${response.status}`); }
            const result = await response.json();
            
            const serverUpdateList = (list) => list.map(p => p.id === providerId ? { ...p, num_likes: parseInt(result.num_likes, 10) || 0, currentUserLiked: result.currentUserLiked } : p );
            setMyRecRawProviders(serverUpdateList(myRecRawProviders));

            const finalLikedSet = new Set(myRecLikedRecommendations);
            if (result.currentUserLiked) finalLikedSet.add(providerId); else finalLikedSet.delete(providerId);
            setMyRecLikedRecommendations(finalLikedSet);

        } catch (error) {
            setMyRecRawProviders(prev => prev.map(p => p.id === providerId ? provToUpdate : p));
            setMyRecLikedRecommendations(prev => {
                const revertedSet = new Set(prev);
                if (provToUpdate.currentUserLiked) revertedSet.add(providerId); else revertedSet.delete(providerId);
                return revertedSet;
            });
            alert(`Failed to update like: ${error.message}`);
        }
    };

    const handleAddIndividualConnection = async (e) => { e.preventDefault(); if (!newPersonEmail.trim() || !currentUser) return; alert(`Simulated: Connection request to ${newPersonEmail}.`); setNewPersonEmail(""); setShowAddPersonModal(false); };
    const handleCreateCommunity = async (e) => {
        e.preventDefault(); if (!newCommunityName.trim() || !currentUser) return;
        try {
            const res = await fetch(`${API_URL}/api/communities/create`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCommunityName, description: newCommunityDescription, created_by: currentUser.id }), });
            if (!res.ok) { const eD = await res.json(); throw new Error(eD.error || "Failed to create community."); }
            alert("Community created!"); setNewCommunityName(""); setNewCommunityDescription(""); setShowCreateCommunityModal(false); fetchMyTrustCircleData();
        } catch (err) { alert(`Error creating community: ${err.message}`); }
    };
    const handleRequestToJoinCommunity = async (commId) => {
        if (!currentUser) return;
        try {
            const res = await fetch(`${API_URL}/api/communities/request/internal`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: currentUser.id, community_id: commId }), });
            if (!res.ok) { const eD = await res.json(); throw new Error(eD.error || "Failed to request join."); }
            alert("Request to join sent!"); fetchMyTrustCircleData();
        } catch (err) { alert(`Error: ${err.message}`); }
    };
    const handleApproveMembership = async (commId, targetUId) => {
        if (!currentUser) return;
        try {
            const res = await fetch(`${API_URL}/api/communities/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ community_id: commId, user_id: targetUId, approver_id: currentUser.id }), });
            if (!res.ok) { const eD = await res.json(); throw new Error(eD.error || "Failed to approve."); }
            alert("Membership approved!"); fetchMyTrustCircleData();
        } catch (err) { alert(`Error: ${err.message}`); }
    };
    const navigateToCommunity = (commId) => navigate(`/community/${commId}`);
    const handleTabChange = (tabName) => { setActiveTab(tabName); navigate(`/trustcircles?tab=${tabName}`, { replace: true }); };
    
    if (!isLoaded || (loadingTrustCircle && (activeTab === "myTrust" || activeTab === "discover"))) return <div className="loading-message">Loading your Trust Circle...</div>;
    if (isLoaded && !isSignedIn) { navigate("/"); return null; }

    return (
        <div className="trust-circles-page-container">
            <header>
                <h1 className="trust-circles-main-header">Manage Your Trust Network</h1>
                <p className="trust-circles-sub-header">Connect, discover communities, and view your recommendations.</p>
            </header>
            <div className="tabs">
                <button className={`tab-button ${activeTab === "myTrust" ? "active" : ""}`} onClick={() => handleTabChange("myTrust")}>My Trust Circle</button>
                <button className={`tab-button ${activeTab === "myRecommendations" ? "active" : ""}`} onClick={() => handleTabChange("myRecommendations")}>Recommendations For You</button>
                <button className={`tab-button ${activeTab === "discover" ? "active" : ""}`} onClick={() => handleTabChange("discover")}>Discover Communities</button>
            </div>

            {activeTab === "myTrust" && !loadingTrustCircle && (
                <div className="tab-content">
                    {trustCircleError && <div className="empty-message error-text">{trustCircleError}</div>}
                    <section className="section-container">
                        <div className="section-title-container"><h2 className="section-title">My Communities</h2>
                            <div className="section-actions">
                                <button className="button button-success button-small icon-button" onClick={() => setShowCreateCommunityModal(true)}><GroupAddIcon /> Create Community</button>
                                <button className="button button-outline button-small icon-button" onClick={() => handleTabChange("discover")}><SearchIconSvg /> Discover More</button>
                            </div>
                        </div>
                        {myCommunities.length === 0 && !trustCircleError ? <p className="empty-message">Not part of any communities. <a href="#" onClick={(e)=>{e.preventDefault();handleTabChange("discover");}}>Discover</a> or <a href="#" onClick={(e)=>{e.preventDefault();setShowCreateCommunityModal(true);}}>create one</a>.</p> : null}
                        {myCommunities.length > 0 && <div className="grid-layout">{myCommunities.map(comm => (<div className="card" key={comm.id}><div className="card-content">{comm.created_by === currentUser?.id ? <span className="status-badge status-owner">Owner</span> : <span className="status-badge status-member">Member</span>}<h3 className="card-title">{comm.name}</h3><p className="card-description">{comm.description}</p><p className="card-info">{comm.recommendations} Recs</p></div><div className="card-actions"><button className="button button-outline" onClick={() => navigateToCommunity(comm.id)}>View <LaunchIcon /></button>{comm.created_by === currentUser?.id && joinRequests[comm.id]?.length > 0 && (<div className="pending-requests-section"><h4 className="pending-requests-title">Pending ({joinRequests[comm.id].length}):</h4><div className="members-list members-list-pending">{joinRequests[comm.id].slice(0,2).map(req => (<div key={req.user_id} className="request-item-card-like"><MemberCard member={req} /><button className="button button-success button-small" onClick={() => handleApproveMembership(comm.id, req.user_id)}>Approve</button></div>))}{joinRequests[comm.id].length > 2 && <p className="more-requests-text">+ {joinRequests[comm.id].length - 2} more...</p>}</div></div>)}</div></div>))}</div>}
                    </section>
                    <section className="section-container">
                        <div className="section-title-container"><h2 className="section-title">Individual Connections</h2>
                            <div className="section-actions"><button className="button button-primary button-small icon-button" onClick={() => setShowAddPersonModal(true)}><PersonAddIcon /> Add Connection</button></div>
                        </div>
                        {individualConnections.length === 0 && !trustCircleError? <p className="empty-message">No individual connections yet. <a href="#" onClick={(e) => { e.preventDefault(); setShowAddPersonModal(true); }}>Add one</a>.</p> : null}
                        {individualConnections.length > 0 && <div className="members-list">{individualConnections.map(conn => (<MemberCard key={conn.email} member={conn} />))}</div>}
                    </section>
                </div>
            )}

            {activeTab === "myRecommendations" && (
                 <div className="tab-content appliance-services-container my-recommendations-tab-content">
                    <h1 className="section-heading">Recommendations Shared With You</h1>
                    <div className="sort-bar">Sort by:
                        <select className="sort-dropdown" value={myRecSortOption.startsWith("force-refresh-") ? "recommended" : myRecSortOption} onChange={(e) => setMyRecSortOption(e.target.value)}>
                            <option value="recommended">Recommended</option><option value="topRated">Top Rated</option>
                        </select>
                    </div>
                    {loadingMyRecommendations && <div className="loading-spinner">Loading your recommendations...</div>}
                    {!loadingMyRecommendations && myRecError && sortedMyRecProviders.length === 0 && <div className="error-message full-width-error">{myRecError}</div>}
                    {!loadingMyRecommendations && !myRecError && sortedMyRecProviders.length === 0 && (
                        <div className="no-providers-message">
                            <FaUsers className="no-providers-icon" /><h2>No Recommendations Found</h2>
                            <p>We couldn't find any recommendations visible to you right now.</p>
                            <div className="no-providers-actions">
                                <button onClick={() => handleTabChange("discover")} className="primary-button"><FaUsers style={{ marginRight: "8px" }} /> Discover Communities</button>
                                <button onClick={() => navigate("/share-recommendation")} className="secondary-button"><FaPlusCircle style={{ marginRight: "8px" }} /> Recommend a Provider</button>
                            </div>
                        </div>
                    )}
                    {sortedMyRecProviders.length > 0 && (
                        <ul className="provider-list">
                            {sortedMyRecProviders.map((provider) => {
                                const currentReviews = myRecReviewMap[provider.id] || [];
                                const displayAvgRating = (parseFloat(provider.average_rating) || 0).toFixed(1);
                                const displayTotalReviews = parseInt(provider.total_reviews, 10) || 0;
                                return (
                                    <li key={provider.id} className="provider-card">
                                        <div className="card-header">
                                            <h2 className="card-title">
                                                <Link to={`/provider/${provider.id}`} target="_blank" rel="noopener noreferrer" className="clickable provider-name-link" onClick={() => localStorage.setItem("selectedProvider",JSON.stringify(provider))}>
                                                    {provider.business_name}
                                                </Link>
                                            </h2>
                                            <div className="badge-wrapper-with-menu">
                                                <div className="badge-group">{(parseFloat(provider.average_rating) || 0) >= 4.5 && (<span className="top-rated-badge">Top Rated</span>)}</div>
                                                <div className="right-actions">
                                                    <div className="dropdown-wrapper">
                                                        <button className="three-dots-button" onClick={() => setMyRecDropdownOpenForId(myRecDropdownOpenForId === provider.id ? null : provider.id)} title="Options">⋮</button>
                                                        {myRecDropdownOpenForId === provider.id && (
                                                        <div className="dropdown-menu">
                                                            <button className="dropdown-item" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/provider/${provider.id}`); setMyRecDropdownOpenForId(null); setMyRecShowLinkCopied(true); setTimeout(() => setMyRecShowLinkCopied(false), 2000);}}>Share this Rec</button>
                                                        </div>)}
                                                    </div>
                                                    {myRecShowLinkCopied && myRecDropdownOpenForId !== provider.id && (<div className="toast">Link copied!</div>)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="review-summary">
                                            <span className="stars-and-score"><MyRecStarRating rating={parseFloat(provider.average_rating) || 0} /> {displayAvgRating} ({displayTotalReviews})</span>
                                            <button className="see-all-button" onClick={() => { setMyRecSelectedProvider(provider); setMyRecIsReviewModalOpen(true); }}>Write a Review</button>
                                            <button className={`like-button ${myRecLikedRecommendations.has(provider.id) ? 'liked' : ''}`} onClick={() => handleMyRecLike(provider.id)} title={myRecLikedRecommendations.has(provider.id) ? "Unlike" : "Like"}>
                                                <FaThumbsUp /> <span className="like-count">{provider.num_likes || 0}</span>
                                            </button>
                                        </div>
                                        <p className="card-description">{provider.description || provider.recommender_message || "No description available"}</p>
                                        {Array.isArray(provider.tags) && provider.tags.length > 0 && (
                                        <div className="tag-container">
                                            {provider.tags.map((tag, idx) => (<span key={idx} className="tag-badge">{tag}</span>))}
                                            <button className="add-tag-button" onClick={() => { setMyRecSelectedProvider(provider); setMyRecIsReviewModalOpen(true);}} aria-label="Add a tag">+</button>
                                        </div>)}
                                        {provider.recommender_name && (
                                        <>
                                            <div className="recommended-row">
                                                <span className="recommended-label">Recommended by:</span>
                                                {/* {provider.recommender_user_id ? (<Link to={`/user/${provider.recommender_clerk_id || provider.recommender_user_id}/recommendations`} className="recommended-name clickable" target="_blank" rel="noopener noreferrer">{provider.recommender_name}</Link>) : (<span className="recommended-name">{provider.recommender_name}</span>)} */}
                                                {provider.recommender_user_id ? (<Link to={`/profile/${provider.recommender_user_id}`} className="recommended-name clickable" target="_blank" rel="noopener noreferrer">{provider.recommender_name}</Link>) : (<span className="recommended-name">{provider.recommender_name}</span>)}
                                                {provider.date_of_recommendation && (<span className="recommendation-date"> ({new Date(provider.date_of_recommendation).toLocaleDateString("en-US", {year:"2-digit",month:"numeric",day:"numeric"})})</span>)}
                                            </div>
                                            {currentReviews.length > 0 && [...new Set(currentReviews.map(r => r.user_name).filter(name => (name && name !== provider.recommender_name)))].filter(name => name).length > 0 && (
                                            <div className="recommended-row">
                                                <span className="recommended-label">Also used by:</span>
                                                <span className="used-by-names">{[...new Set(currentReviews.map(r => r.user_name).filter(name => (name && name !== provider.recommender_name)))].filter(name => name).join(", ")}</span>
                                            </div>)}
                                        </>)}
                                        <div className="action-buttons">
                                            <button className="primary-button" onClick={() => { setMyRecSelectedProvider(provider); setMyRecIsQuoteModalOpen(true);}}>Request a Quote</button>
                                            <button className="secondary-button" onClick={() => { if (provider.recommender_phone) window.location.href = `sms:${provider.recommender_phone}`; else if (provider.recommender_email) window.location.href = `mailto:${provider.recommender_email}`; else alert("Recommender contact info not available.");}}>Connect with Recommender</button>
                                        </div>
                                    </li>);
                            })}
                        </ul>
                    )}
                 </div>
            )}

            {activeTab === "discover" && !loadingTrustCircle && (
                 <div className="tab-content">
                    {trustCircleError && <div className="empty-message error-text">{trustCircleError}</div>}
                    <section className="section-container">
                        <div className="section-title-container"><h2 className="section-title">Discover & Join Communities</h2>
                            <div className="section-actions"><button className="button button-success button-small icon-button" onClick={() => setShowCreateCommunityModal(true)}><GroupAddIcon /> Create New Community</button></div>
                        </div>
                        {availableCommunities.filter(c => c.user_membership_status !== "approved" && c.created_by !== currentUser?.id).length === 0 && !trustCircleError ? <p className="empty-message">No new communities to discover.</p> : null}
                        {availableCommunities.filter(c => c.user_membership_status !== "approved" && c.created_by !== currentUser?.id).length > 0 && <div className="grid-layout">{availableCommunities.filter(c => c.user_membership_status !== "approved" && c.created_by !== currentUser?.id).map(comm => (<div className="card" key={comm.id}><div className="card-content"><h3 className="card-title">{comm.name}</h3><p className="card-description">{comm.description}</p><p className="card-info">{comm.memberCount} members</p></div><div className="card-actions">{comm.user_membership_status === "requested" ? <button className="button button-small icon-button status-requested" disabled><HourglassTopIcon /> Request Sent</button> : <button className="button button-primary" onClick={() => handleRequestToJoinCommunity(comm.id)} disabled={!currentUser}>Request to Join</button>}</div></div>))}</div>}
                    </section>
                </div>
            )}

            {showAddPersonModal && (<div className="modal-backdrop" onClick={() => setShowAddPersonModal(false)}><div className="modal-content" onClick={(e) => e.stopPropagation()}><h3 className="modal-header">Add Individual Connection</h3><form onSubmit={handleAddIndividualConnection}><input type="email" className="form-input" placeholder="Enter email" value={newPersonEmail} onChange={(e) => setNewPersonEmail(e.target.value)} required /><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setShowAddPersonModal(false)}>Cancel</button><button type="submit" className="button button-primary">Send Request</button></div></form></div></div>)}
            {showCreateCommunityModal && (<div className="modal-backdrop" onClick={() => setShowCreateCommunityModal(false)}><div className="modal-content" onClick={(e) => e.stopPropagation()}><h3 className="modal-header">Create New Community</h3><form onSubmit={handleCreateCommunity}><input type="text" className="form-input" placeholder="Community Name" value={newCommunityName} onChange={(e) => setNewCommunityName(e.target.value)} required /><textarea className="form-textarea" placeholder="Description (optional)" value={newCommunityDescription} onChange={(e) => setNewCommunityDescription(e.target.value)} /><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setShowCreateCommunityModal(false)}>Cancel</button><button type="submit" className="button button-success">Create Community</button></div></form></div></div>)}
        
            {myRecIsReviewModalOpen && myRecSelectedProvider && <MyRecReviewModal isOpen={myRecIsReviewModalOpen} onClose={() => setMyRecIsReviewModalOpen(false)} onSubmit={handleMyRecReviewSubmit} provider={myRecSelectedProvider} />}
            {myRecClickedRecommender && (<div className="modal-overlay"><div className="simple-modal"><button className="modal-close-x" onClick={() => setMyRecClickedRecommender(null)}>×</button><h3 className="modal-title">Want to connect with <span className="highlight">{myRecClickedRecommender}</span>?</h3><div className="modal-buttons-vertical"><button className="secondary-button" onClick={() => { setMyRecClickedRecommender(null); setMyRecShowFeatureComingModal(true); }}>Thank {myRecClickedRecommender}</button><button className="secondary-button" onClick={() => { setMyRecClickedRecommender(null); setMyRecShowFeatureComingModal(true); }}>Ask {myRecClickedRecommender} a question</button></div></div></div>)}
            {myRecShowFeatureComingModal && (<div className="modal-overlay"><div className="modal-content review-modal-content"><button className="modal-close-x" onClick={() => setMyRecShowFeatureComingModal(false)}>×</button><p>Feature coming soon! <FaEye style={{ marginLeft: '5px' }} /></p><div className="modal-buttons"><button className="primary-button" onClick={() => setMyRecShowFeatureComingModal(false)}>OK</button></div></div></div>)}
            {myRecIsQuoteModalOpen && myRecSelectedProvider && <QuoteModal isOpen={myRecIsQuoteModalOpen} providerName={myRecSelectedProvider.business_name} providerEmail={myRecSelectedProvider.email} providerPhotoUrl={myRecSelectedProvider.profile_image} onClose={() => setMyRecIsQuoteModalOpen(false)} />}
        </div>
    );
};

export default TrustCircles;

// working on 5/26 (before profile image switch)
// import React, { useEffect, useState, useCallback, useMemo } from "react";
// import { useUser } from "@clerk/clerk-react";
// import { useNavigate, useLocation, Link } from "react-router-dom";
// import { FaStar, FaPhone, FaEnvelope, FaUsers, FaPlusCircle, FaThumbsUp, FaEye } from "react-icons/fa";
// import QuoteModal from "../../components/QuoteModal/QuoteModal"; 
// import "./TrustCircles.css";

// const API_URL = "https://api.seanag-recommendations.org:8080";
// // const API_URL = "http://localhost:3000";

// const PersonAddIcon = () => (
//     <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ marginRight: "8px" }}>
//         <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
//     </svg>
// );
// const GroupAddIcon = () => (
//     <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ marginRight: "8px" }}>
//         <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
//     </svg>
// );
// const LaunchIcon = () => (
//     <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ marginLeft: "6px" }}>
//         <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
//     </svg>
// );
// const SearchIconSvg = () => (
//     <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ marginRight: "8px" }}>
//         <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
//     </svg>
// );
// const HourglassTopIcon = () => (
//     <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ marginRight: "8px" }}>
//         <path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16.01l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zM8 4h8v3.5l-4 4-4-4V4z" />
//     </svg>
// );

// const MyRecStarRating = ({ rating }) => {
//     const numRating = parseFloat(rating) || 0;
//     const fullStars = Math.floor(numRating);
//     const hasHalf = numRating - fullStars >= 0.5;
//     const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
//     return (
//         <div className="star-rating">
//             {[...Array(fullStars)].map((_, i) => (<FaStar key={`full-${i}`} className="filled" />))}
//             {hasHalf && (<FaStar key={`half-${Date.now()}-sr`} className="half" />)}
//             {[...Array(emptyStars)].map((_, i) => (<FaStar key={`empty-${i}`} className="empty" />))}
//         </div>
//     );
// };

// const MyRecReviewModal = ({ isOpen, onClose, onSubmit, provider }) => {
//     const [rating, setRating] = useState(0);
//     const [hover, setHover] = useState(0);
//     const [review, setReview] = useState("");
//     const [tags, setTags] = useState([]);
//     const [tagInput, setTagInput] = useState("");
//     const [error, setError] = useState("");

//     useEffect(() => {
//         if (isOpen) {
//             setRating(0); setHover(0); setReview(""); setTags([]); setTagInput(""); setError("");
//         }
//     }, [isOpen]);

//     const handleSubmit = (e) => {
//         e.preventDefault();
//         if (!rating) { setError("Please select a rating"); return; }
//         onSubmit({ rating, review, tags });
//         onClose();
//     };

//     const handleTagKeyDown = (e) => {
//         if (e.key === "Enter") {
//             e.preventDefault();
//             const trimmed = tagInput.trim();
//             if (trimmed && !tags.includes(trimmed)) { setTags([...tags, trimmed]); }
//             setTagInput("");
//         }
//     };
//     const removeTag = (tagToRemove) => setTags(tags.filter((tag) => tag !== tagToRemove));
//     if (!isOpen || !provider) return null;

//     return (
//         <div className="modal-overlay">
//             <div className="modal-content review-modal-content">
//                 <h2>Review {provider?.business_name}</h2>
//                 <form onSubmit={handleSubmit}>
//                     <div className="rating-container">
//                         <label>Rate your experience: <span className="required">*</span></label>
//                         <div className="stars">
//                             {[...Array(5)].map((_, index) => (
//                                 <FaStar key={index} className={index < (hover || rating) ? "star active" : "star"}
//                                     onClick={() => setRating(index + 1)}
//                                     onMouseEnter={() => setHover(index + 1)}
//                                     onMouseLeave={() => setHover(rating)}
//                                 />
//                             ))}
//                         </div>
//                         {error && <div className="error-message">{error}</div>}
//                     </div>
//                     <div className="review-input">
//                         <label>Tell us about your experience:</label>
//                         <textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder="Optional: Share your thoughts..." rows={4}/>
//                     </div>
//                     <div className="tag-input-group">
//                         <label>Add tags (press Enter to add):</label>
//                         <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="e.g. friendly, affordable"/>
//                         <div className="tag-container modal-tag-container">
//                             {tags.map((tag, idx) => (
//                                 <span key={idx} className="tag-badge">
//                                     {tag} <span className="remove-tag" onClick={() => removeTag(tag)}>×</span>
//                                 </span>
//                             ))}
//                         </div>
//                     </div>
//                     <div className="modal-buttons">
//                         <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
//                         <button type="submit" className="submit-button">Submit Review</button>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// };

// const TrustCircles = () => {
//     const { isLoaded, isSignedIn, user } = useUser();
//     const navigate = useNavigate();
//     const location = useLocation();

//     const [currentUser, setCurrentUser] = useState(null);
//     const [currentUserId, setCurrentUserId] = useState(null);
//     const [currentUserEmail, setCurrentUserEmail] = useState(null);

//     const [individualConnections, setIndividualConnections] = useState([]);
//     const [myCommunities, setMyCommunities] = useState([]);
//     const [availableCommunities, setAvailableCommunities] = useState([]);
//     const [joinRequests, setJoinRequests] = useState({});
//     const [loadingTrustCircle, setLoadingTrustCircle] = useState(true);
//     const [trustCircleError, setTrustCircleError] = useState("");

//     const [myRecProviders, setMyRecProviders] = useState([]);
//     const [myRecRawProviders, setMyRecRawProviders] = useState([]);
//     const [myRecReviewMap, setMyRecReviewMap] = useState({});
//     const [loadingMyRecommendations, setLoadingMyRecommendations] = useState(true);
//     const [myRecError, setMyRecError] = useState(null);
//     const [myRecIsReviewModalOpen, setMyRecIsReviewModalOpen] = useState(false);
//     const [myRecSelectedProvider, setMyRecSelectedProvider] = useState(null);
//     const [myRecSortOption, setMyRecSortOption] = useState("recommended");
//     const [myRecDropdownOpenForId, setMyRecDropdownOpenForId] = useState(null);
//     const [myRecShowLinkCopied, setMyRecShowLinkCopied] = useState(false);
//     const [myRecIsQuoteModalOpen, setMyRecIsQuoteModalOpen] = useState(false);
//     const [myRecLikedRecommendations, setMyRecLikedRecommendations] = useState(new Set());
//     const [myRecClickedRecommender, setMyRecClickedRecommender] = useState(null);
//     const [myRecShowFeatureComingModal, setMyRecShowFeatureComingModal] = useState(false);
    
//     const [showAddPersonModal, setShowAddPersonModal] = useState(false);
//     const [newPersonEmail, setNewPersonEmail] = useState("");
//     const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
//     const [newCommunityName, setNewCommunityName] = useState("");
//     const [newCommunityDescription, setNewCommunityDescription] = useState("");
//     const [activeTab, setActiveTab] = useState("myTrust");

//     useEffect(() => {
//         if (isLoaded && isSignedIn && user) {
//             setCurrentUserId(user.id);
//             setCurrentUserEmail(user.primaryEmailAddress?.emailAddress);
//         } else if (isLoaded && !isSignedIn) {
//             setCurrentUserId(null);
//             setCurrentUserEmail(null);
//         }
//     }, [isLoaded, isSignedIn, user]);

//     useEffect(() => {
//         const params = new URLSearchParams(location.search);
//         const tabParam = params.get('tab');
//         if (tabParam === 'myRecommendations') setActiveTab('myRecommendations');
//         else if (tabParam === 'discover') setActiveTab('discover');
//         else setActiveTab('myTrust');
//     }, [location.search]);

//     const fetchMyTrustCircleData = useCallback(async () => {
//         if (!currentUserId || !currentUserEmail) return;
//         setLoadingTrustCircle(true); setTrustCircleError("");
//         try {
//             const params = new URLSearchParams({ user_id: currentUserId, email: currentUserEmail });
//             const userRes = await fetch(`${API_URL}/api/communities/user/email/${currentUserEmail}?${params.toString()}`);
//             if (!userRes.ok) throw new Error("Failed to fetch user details for Trust Circle.");
//             const userData = await userRes.json();
//             setCurrentUser(userData); // This sets the state, but it's async
//             // console.log("TRACE 1: `userData` from backend user endpoint:", userData);
//             // console.log("TRACE 2: `currentUser` state *after* `setCurrentUser` (might be null):", currentUser); // Still shows null here
//             // console.log("TRACE 3: `currentUserId` state (from Clerk):", currentUserId);
    
//             const conRes = await fetch(`${API_URL}/api/connections/check-connections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: currentUserEmail }), });
//             if (!conRes.ok) throw new Error("Failed to fetch individual connections.");
//             const conData = await conRes.json(); setIndividualConnections(Array.from(new Set(conData.map(u => u.email))).map(email => conData.find(u => u.email === email)));
            
//             const myCommRes = await fetch(`${API_URL}/api/communities/user/${currentUserEmail}/communities`);
//             if (!myCommRes.ok) throw new Error("Failed to fetch your communities.");
//             let myCommData = await myCommRes.json();
//             myCommData = Array.isArray(myCommData) ? myCommData.filter(c => c && c.id).reduce((acc,curr) => acc.find(item=>item.id===curr.id)?acc:[...acc,curr],[]) : [];
//             setMyCommunities(myCommData.map(c => ({ ...c, recommendations: c.recommendation_count || Math.floor(Math.random() * 25) })));
            
//             const allCommRes = await fetch(`${API_URL}/api/communities/all${userData && userData.id ? `?user_id=${userData.id}` : ""}`);
//             if (!allCommRes.ok) throw new Error("Failed to fetch available communities.");
//             let allCommData = await allCommRes.json();
//             setAvailableCommunities(Array.isArray(allCommData) ? allCommData.map(c => ({ ...c, memberCount: c.member_count || Math.floor(Math.random() * 100) + 5 })) : []);
            
//             if (userData && userData.id) { // This condition is good, it ensures userData.id is valid
//                 const ownedIds = myCommData.filter(c => c.created_by === userData.id).map(c => c.id);
//                 // console.log("DEBUG: Owned Community IDs:", ownedIds);
                
//                 const reqs = {};
//                 for (const commId of ownedIds) {
//                     // console.log(`DEBUG: --- Starting fetch for community ID: ${commId} ---`);
    
//                     // Use userData.id directly, as it's synchronously available after the userRes.json() call
//                     const userIdForRequest = userData.id; 
//                     // console.log("TRACE 6: Using `userIdForRequest` (from `userData.id`):", userIdForRequest); 
    
//                     if (!userIdForRequest) {
//                         console.error(`DEBUG: userIdForRequest is missing for community ${commId}. Skipping request fetch.`);
//                         reqs[commId] = [];
//                         continue; 
//                     }
                    
//                     const requestUrl = `${API_URL}/api/communities/${commId}/requests/internal?user_id=${userIdForRequest}`; // **FIXED LINE**
//                     // console.log(`DEBUG: Attempting to make API call to: ${requestUrl}`); 
    
//                     try {
//                         const rRes = await fetch(requestUrl);
//                         // console.log(`DEBUG: Received API response for ${commId}. Status: ${rRes.status}`); 
//                         if (!rRes.ok) { // Simplified error handling to catch non-2xx responses
//                             const errorText = await rRes.text();
//                             throw new Error(`HTTP Error ${rRes.status}: ${errorText}`);
//                         }
//                         const allRequests = await rRes.json();
//                         // console.log(`DEBUG: Raw API Response for requests for ${commId}:`, allRequests); 
                        
//                         reqs[commId] = allRequests.filter(req => req.status === 'requested'); 
//                         // console.log(`DEBUG: Filtered (pending) requests for ${commId}:`, reqs[commId]); 
//                     } catch (error) {
//                         console.error(`DEBUG: Network or processing error for ${commId}:`, error);
//                         reqs[commId] = [];
//                     }
//                     // console.log(`DEBUG: --- Finished processing community ID: ${commId} ---`); 
//                 }
//                 setJoinRequests(reqs);
//                 // console.log("DEBUG: Final `joinRequests` state before setting:", reqs); 
//             }
//         } catch (err) { 
//             console.error("DEBUG: Trust Circle Data Fetch (Outer) Error:", err); // Catch any errors in the outer block
//             setTrustCircleError(err.message || "Could not load Trust Circle data.");
//         } finally { setLoadingTrustCircle(false); }
//     }, [currentUserId, currentUserEmail]); // Removed `currentUser` from dependencies, as it's no longer used synchronously in the loop

//     const fetchMyVisibleRecommendations = useCallback(async () => {
//         if (!currentUserId || !currentUserEmail) {
//             if (isLoaded && !isSignedIn) navigate("/"); return;
//         }
//         setLoadingMyRecommendations(true); setMyRecError(null);
//         try {
//             const params = new URLSearchParams({ user_id: currentUserId, email: currentUserEmail });
//             const response = await fetch(`${API_URL}/api/providers/visible?${params.toString()}`);
//             if (!response.ok) { const eData = await response.json().catch(() => ({})); throw new Error(eData.message || `HTTP error ${response.status}`);}
//             const data = await response.json();
//             if (!data.success) throw new Error(data.message || "Failed to fetch recommendations.");
//             let fetchedProviders = data.providers || [];
//             const statsMap = {}; const allReviewsMap = {};
//             if (fetchedProviders.length > 0) {
//                 await Promise.all(fetchedProviders.map(async p => {
//                     try {
//                         const statsRes = await fetch(`${API_URL}/api/reviews/stats/${p.id}`);
//                         statsMap[p.id] = statsRes.ok ? await statsRes.json() : { average_rating: 0, total_reviews: 0 };
//                     } catch (err) { statsMap[p.id] = { average_rating: p.average_rating || 0, total_reviews: p.total_reviews || 0 }; }
//                     try {
//                         const reviewsRes = await fetch(`${API_URL}/api/reviews/${p.id}`);
//                         allReviewsMap[p.id] = reviewsRes.ok ? await reviewsRes.json() : [];
//                     } catch (err) { allReviewsMap[p.id] = []; }
//                 }));
//             }
//             setMyRecReviewMap(allReviewsMap);
//             const enriched = fetchedProviders.map((p, idx) => ({
//                 ...p, originalIndex: idx,
//                 average_rating: statsMap[p.id]?.average_rating || p.average_rating || 0,
//                 total_reviews: statsMap[p.id]?.total_reviews || p.total_reviews || 0,
//                 currentUserLiked: p.currentUserLiked || false,
//                 num_likes: parseInt(p.num_likes, 10) || 0,
//             }));
//             const initialLikes = new Set(); enriched.forEach(p => { if (p.currentUserLiked) initialLikes.add(p.id); });
//             setMyRecLikedRecommendations(initialLikes);
//             setMyRecRawProviders(enriched);
//         } catch (err) { setMyRecError(err.message); setMyRecProviders([]); setMyRecRawProviders([]);
//         } finally { setLoadingMyRecommendations(false); }
//     }, [currentUserId, currentUserEmail, isLoaded, isSignedIn, navigate]);

//     useEffect(() => {
//         if (isLoaded && isSignedIn) {
//             if (activeTab === "myTrust" || activeTab === "discover") fetchMyTrustCircleData();
//             else if (activeTab === "myRecommendations") fetchMyVisibleRecommendations();
//         } else if (isLoaded && !isSignedIn) navigate("/");
//     }, [fetchMyTrustCircleData, fetchMyVisibleRecommendations, activeTab, isLoaded, isSignedIn, navigate]);
    
//     const sortedMyRecProviders = useMemo(() => {
//         if (!myRecRawProviders) return [];
//         const getBand = r => { if (r >= 4) return 0; if (r >= 3) return 1; if (r >= 2) return 2; if (r >= 1) return 3; return 4; };
//         let list = [...myRecRawProviders];
//         if (myRecSortOption === "topRated") {
//             return list.filter(p => p.average_rating >= 4.5).sort((a, b) => (b.average_rating !== a.average_rating) ? b.average_rating - a.average_rating : (b.total_reviews || 0) - (a.total_reviews || 0));
//         }
//         return list.sort((a, b) => {
//             const bA = getBand(a.average_rating); const bB = getBand(b.average_rating); if (bA !== bB) return bA - bB;
//             const sA = (a.average_rating || 0) * (a.total_reviews || 0); const sB = (b.average_rating || 0) * (b.total_reviews || 0); if (sB !== sA) return sB - sA;
//             if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating;
//             if ((b.total_reviews || 0) !== (a.total_reviews || 0)) return (b.total_reviews || 0) - (a.total_reviews || 0);
//             return (a.originalIndex || 0) - (b.originalIndex || 0);
//         });
//     }, [myRecRawProviders, myRecSortOption]);


//     const handleMyRecReviewSubmit = async (reviewData) => {
//         if (!isSignedIn || !myRecSelectedProvider || !currentUserId || !currentUserEmail) { alert("Please sign in to submit a review"); return; }
//         try {
//             const response = await fetch(`${API_URL}/api/reviews`, {
//                 method: "POST", headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({
//                     provider_id: myRecSelectedProvider.id, provider_email: myRecSelectedProvider.email || "",
//                     user_id: currentUserId, email: currentUserEmail, rating: reviewData.rating,
//                     content: reviewData.review, tags: reviewData.tags,
//                 }),
//             });
//             if (!response.ok) { const errTxt = await response.text(); throw new Error(errTxt || "Failed to submit review"); }
//             fetchMyVisibleRecommendations(); 
//         } catch (err) { alert(`Error submitting review: ${err.message}`); }
//     };

//     const handleMyRecLike = async (providerId) => {
//         if (!currentUserId || !currentUserEmail) { alert("Please log in to like/unlike."); return; }
//         const provToUpdate = myRecRawProviders.find(p => p.id === providerId); if (!provToUpdate) return;
//         const newLikedState = !provToUpdate.currentUserLiked;
//         const newNumLikes = newLikedState ? (provToUpdate.num_likes || 0) + 1 : Math.max(0, (provToUpdate.num_likes || 1) - 1);
        
//         const optimisticUpdateList = (list) => list.map(p => p.id === providerId ? { ...p, num_likes: newNumLikes, currentUserLiked: newLikedState } : p);
//         setMyRecRawProviders(optimisticUpdateList(myRecRawProviders));
        
//         const newLikedSet = new Set(myRecLikedRecommendations);
//         if (newLikedState) newLikedSet.add(providerId); else newLikedSet.delete(providerId);
//         setMyRecLikedRecommendations(newLikedSet);

//         try {
//             const response = await fetch(`${API_URL}/api/providers/${providerId}/like`, {
//                 method: 'POST', headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ userId: currentUserId, userEmail: currentUserEmail })
//             });
//             if (!response.ok) { const eData = await response.json().catch(() => ({})); throw new Error(eData.message || `Like error ${response.status}`); }
//             const result = await response.json();
            
//             const serverUpdateList = (list) => list.map(p => p.id === providerId ? { ...p, num_likes: parseInt(result.num_likes, 10) || 0, currentUserLiked: result.currentUserLiked } : p );
//             setMyRecRawProviders(serverUpdateList(myRecRawProviders));

//             const finalLikedSet = new Set(myRecLikedRecommendations);
//             if (result.currentUserLiked) finalLikedSet.add(providerId); else finalLikedSet.delete(providerId);
//             setMyRecLikedRecommendations(finalLikedSet);

//         } catch (error) {
//             setMyRecRawProviders(prev => prev.map(p => p.id === providerId ? provToUpdate : p)); // Revert optimistic update on error
//             setMyRecLikedRecommendations(prev => { // Revert liked set
//                 const revertedSet = new Set(prev);
//                 if (provToUpdate.currentUserLiked) revertedSet.add(providerId); else revertedSet.delete(providerId);
//                 return revertedSet;
//             });
//             alert(`Failed to update like: ${error.message}`);
//         }
//     };

//     const handleAddIndividualConnection = async (e) => { e.preventDefault(); if (!newPersonEmail.trim() || !currentUser) return; alert(`Simulated: Connection request to ${newPersonEmail}.`); setNewPersonEmail(""); setShowAddPersonModal(false); };
//     const handleCreateCommunity = async (e) => {
//         e.preventDefault(); if (!newCommunityName.trim() || !currentUser) return;
//         try {
//             const res = await fetch(`${API_URL}/api/communities/create`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCommunityName, description: newCommunityDescription, created_by: currentUser.id }), });
//             if (!res.ok) { const eD = await res.json(); throw new Error(eD.error || "Failed to create community."); }
//             alert("Community created!"); setNewCommunityName(""); setNewCommunityDescription(""); setShowCreateCommunityModal(false); fetchMyTrustCircleData();
//         } catch (err) { alert(`Error creating community: ${err.message}`); }
//     };
//     const handleRequestToJoinCommunity = async (commId) => {
//         if (!currentUser) return;
//         try {
//             const res = await fetch(`${API_URL}/api/communities/request/internal`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: currentUser.id, community_id: commId }), });
//             if (!res.ok) { const eD = await res.json(); throw new Error(eD.error || "Failed to request join."); }
//             alert("Request to join sent!"); fetchMyTrustCircleData();
//         } catch (err) { alert(`Error: ${err.message}`); }
//     };
//     const handleApproveMembership = async (commId, targetUId) => {
//         if (!currentUser) return;
//         try {
//             const res = await fetch(`${API_URL}/api/communities/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ community_id: commId, user_id: targetUId, approver_id: currentUser.id }), });
//             if (!res.ok) { const eD = await res.json(); throw new Error(eD.error || "Failed to approve."); }
//             alert("Membership approved!"); fetchMyTrustCircleData();
//         } catch (err) { alert(`Error: ${err.message}`); }
//     };
//     const navigateToCommunity = (commId) => navigate(`/community/${commId}`);
//     const handleTabChange = (tabName) => { setActiveTab(tabName); navigate(`/trustcircles?tab=${tabName}`, { replace: true }); };
    
//     if (!isLoaded || (loadingTrustCircle && (activeTab === "myTrust" || activeTab === "discover"))) return <div className="loading-message">Loading your Trust Circle...</div>;
//     if (isLoaded && !isSignedIn) { navigate("/"); return null; }

//     return (
//         <div className="trust-circles-page-container">
//             <header>
//                 <h1 className="trust-circles-main-header">Manage Your Trust Network</h1>
//                 <p className="trust-circles-sub-header">Connect, discover communities, and view your recommendations.</p>
//             </header>
//             <div className="tabs">
//                 <button className={`tab-button ${activeTab === "myTrust" ? "active" : ""}`} onClick={() => handleTabChange("myTrust")}>My Trust Circle</button>
//                 <button className={`tab-button ${activeTab === "myRecommendations" ? "active" : ""}`} onClick={() => handleTabChange("myRecommendations")}>Recommendations For You</button>
//                 <button className={`tab-button ${activeTab === "discover" ? "active" : ""}`} onClick={() => handleTabChange("discover")}>Discover Communities</button>
//             </div>

//             {activeTab === "myTrust" && !loadingTrustCircle && (
//                 <div className="tab-content">
//                     {trustCircleError && <div className="empty-message error-text">{trustCircleError}</div>}
//                     <section className="section-container">
//                         <div className="section-title-container"><h2 className="section-title">My Communities</h2>
//                             <div className="section-actions">
//                                 <button className="button button-success button-small icon-button" onClick={() => setShowCreateCommunityModal(true)}><GroupAddIcon /> Create Community</button>
//                                 <button className="button button-outline button-small icon-button" onClick={() => handleTabChange("discover")}><SearchIconSvg /> Discover More</button>
//                             </div>
//                         </div>
//                         {myCommunities.length === 0 && !trustCircleError ? <p className="empty-message">Not part of any communities. <a href="#" onClick={(e)=>{e.preventDefault();handleTabChange("discover");}}>Discover</a> or <a href="#" onClick={(e)=>{e.preventDefault();setShowCreateCommunityModal(true);}}>create one</a>.</p> : null}
//                         {myCommunities.length > 0 && <div className="grid-layout">{myCommunities.map(comm => (<div className="card" key={comm.id}><div className="card-content">{comm.created_by === currentUser?.id ? <span className="status-badge status-owner">Owner</span> : <span className="status-badge status-member">Member</span>}<h3 className="card-title">{comm.name}</h3><p className="card-description">{comm.description}</p><p className="card-info">{comm.recommendations} Recs</p></div><div className="card-actions"><button className="button button-outline" onClick={() => navigateToCommunity(comm.id)}>View <LaunchIcon /></button>{comm.created_by === currentUser?.id && joinRequests[comm.id]?.length > 0 && (<div className="pending-requests-section"><h4 className="pending-requests-title">Pending ({joinRequests[comm.id].length}):</h4>{joinRequests[comm.id].slice(0,2).map(req => (<div key={req.user_id} className="request-item"><span>{req.email}</span><button className="button button-success button-small" onClick={() => handleApproveMembership(comm.id, req.user_id)}>Approve</button></div>))}{joinRequests[comm.id].length > 2 && <p>+ {joinRequests[comm.id].length - 2} more...</p>}</div>)}</div></div>))}</div>}
//                     </section>
//                     <section className="section-container">
//                         <div className="section-title-container"><h2 className="section-title">Individual Connections</h2>
//                             <div className="section-actions"><button className="button button-primary button-small icon-button" onClick={() => setShowAddPersonModal(true)}><PersonAddIcon /> Add Connection</button></div>
//                         </div>
//                         {individualConnections.length === 0 && !trustCircleError? <p className="empty-message">No individual connections yet. <a href="#" onClick={(e) => { e.preventDefault(); setShowAddPersonModal(true); }}>Add one</a>.</p> : null}
//                         {individualConnections.length > 0 && <div className="grid-layout">{individualConnections.map(cu => (<div className="card" key={cu.email}><div className="card-content"><span className="status-badge status-connected">Connected</span><h3 className="card-title">{cu.name}</h3><p className="card-subtitle">{cu.email}</p></div></div>))}</div>}
//                     </section>
//                 </div>
//             )}

//             {activeTab === "myRecommendations" && (
//                  <div className="tab-content appliance-services-container my-recommendations-tab-content">
//                     <h1 className="section-heading">Recommendations Shared With You</h1>
//                     <div className="sort-bar">Sort by:
//                         <select className="sort-dropdown" value={myRecSortOption.startsWith("force-refresh-") ? "recommended" : myRecSortOption} onChange={(e) => setMyRecSortOption(e.target.value)}>
//                             <option value="recommended">Recommended</option><option value="topRated">Top Rated</option>
//                         </select>
//                     </div>
//                     {loadingMyRecommendations && <div className="loading-spinner">Loading your recommendations...</div>}
//                     {!loadingMyRecommendations && myRecError && sortedMyRecProviders.length === 0 && <div className="error-message full-width-error">{myRecError}</div>}
//                     {!loadingMyRecommendations && !myRecError && sortedMyRecProviders.length === 0 && (
//                         <div className="no-providers-message">
//                             <FaUsers className="no-providers-icon" /><h2>No Recommendations Found</h2>
//                             <p>We couldn't find any recommendations visible to you right now.</p>
//                             <div className="no-providers-actions">
//                                 <button onClick={() => handleTabChange("discover")} className="primary-button"><FaUsers style={{ marginRight: "8px" }} /> Discover Communities</button>
//                                 <button onClick={() => navigate("/share-recommendation")} className="secondary-button"><FaPlusCircle style={{ marginRight: "8px" }} /> Recommend a Provider</button>
//                             </div>
//                         </div>
//                     )}
//                     {sortedMyRecProviders.length > 0 && (
//                         <ul className="provider-list">
//                             {sortedMyRecProviders.map((provider) => {
//                                 const currentReviews = myRecReviewMap[provider.id] || [];
//                                 const displayAvgRating = (parseFloat(provider.average_rating) || 0).toFixed(1);
//                                 const displayTotalReviews = parseInt(provider.total_reviews, 10) || 0;
//                                 return (
//                                     <li key={provider.id} className="provider-card">
//                                         <div className="card-header">
//                                             <h2 className="card-title">
//                                                 <Link to={`/provider/${provider.id}`} target="_blank" rel="noopener noreferrer" className="clickable provider-name-link" onClick={() => localStorage.setItem("selectedProvider",JSON.stringify(provider))}>
//                                                     {provider.business_name}
//                                                 </Link>
//                                             </h2>
//                                             <div className="badge-wrapper-with-menu">
//                                                 <div className="badge-group">{(parseFloat(provider.average_rating) || 0) >= 4.5 && (<span className="top-rated-badge">Top Rated</span>)}</div>
//                                                 <div className="right-actions">
//                                                     <div className="dropdown-wrapper">
//                                                         <button className="three-dots-button" onClick={() => setMyRecDropdownOpenForId(myRecDropdownOpenForId === provider.id ? null : provider.id)} title="Options">⋮</button>
//                                                         {myRecDropdownOpenForId === provider.id && (
//                                                         <div className="dropdown-menu">
//                                                             <button className="dropdown-item" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/provider/${provider.id}`); setMyRecDropdownOpenForId(null); setMyRecShowLinkCopied(true); setTimeout(() => setMyRecShowLinkCopied(false), 2000);}}>Share this Rec</button>
//                                                         </div>)}
//                                                     </div>
//                                                     {myRecShowLinkCopied && myRecDropdownOpenForId !== provider.id && (<div className="toast">Link copied!</div>)}
//                                                 </div>
//                                             </div>
//                                         </div>
//                                         <div className="review-summary">
//                                             <span className="stars-and-score"><MyRecStarRating rating={parseFloat(provider.average_rating) || 0} /> {displayAvgRating} ({displayTotalReviews})</span>
//                                             <button className="see-all-button" onClick={() => { setMyRecSelectedProvider(provider); setMyRecIsReviewModalOpen(true); }}>Write a Review</button>
//                                             <button className={`like-button ${myRecLikedRecommendations.has(provider.id) ? 'liked' : ''}`} onClick={() => handleMyRecLike(provider.id)} title={myRecLikedRecommendations.has(provider.id) ? "Unlike" : "Like"}>
//                                                 <FaThumbsUp /> <span className="like-count">{provider.num_likes || 0}</span>
//                                             </button>
//                                         </div>
//                                         <p className="card-description">{provider.description || provider.recommender_message || "No description available"}</p>
//                                         {Array.isArray(provider.tags) && provider.tags.length > 0 && (
//                                         <div className="tag-container">
//                                             {provider.tags.map((tag, idx) => (<span key={idx} className="tag-badge">{tag}</span>))}
//                                             <button className="add-tag-button" onClick={() => { setMyRecSelectedProvider(provider); setMyRecIsReviewModalOpen(true);}} aria-label="Add a tag">+</button>
//                                         </div>)}
//                                         {provider.recommender_name && (
//                                         <>
//                                             <div className="recommended-row">
//                                                 <span className="recommended-label">Recommended by:</span>
//                                                 {provider.recommender_user_id ? (<Link to={`/user/${provider.recommender_clerk_id || provider.recommender_user_id}/recommendations`} className="recommended-name clickable" target="_blank" rel="noopener noreferrer">{provider.recommender_name}</Link>) : (<span className="recommended-name">{provider.recommender_name}</span>)}
//                                                 {provider.date_of_recommendation && (<span className="recommendation-date"> ({new Date(provider.date_of_recommendation).toLocaleDateString("en-US", {year:"2-digit",month:"numeric",day:"numeric"})})</span>)}
//                                             </div>
//                                             {currentReviews.length > 0 && [...new Set(currentReviews.map(r => r.user_name).filter(name => (name && name !== provider.recommender_name)))].filter(name => name).length > 0 && (
//                                             <div className="recommended-row">
//                                                 <span className="recommended-label">Also used by:</span>
//                                                 <span className="used-by-names">{[...new Set(currentReviews.map(r => r.user_name).filter(name => (name && name !== provider.recommender_name)))].filter(name => name).join(", ")}</span>
//                                             </div>)}
//                                         </>)}
//                                         <div className="action-buttons">
//                                             <button className="primary-button" onClick={() => { setMyRecSelectedProvider(provider); setMyRecIsQuoteModalOpen(true);}}>Request a Quote</button>
//                                             <button className="secondary-button" onClick={() => { if (provider.recommender_phone) window.location.href = `sms:${provider.recommender_phone}`; else if (provider.recommender_email) window.location.href = `mailto:${provider.recommender_email}`; else alert("Recommender contact info not available.");}}>Connect with Recommender</button>
//                                         </div>
//                                     </li>);
//                             })}
//                         </ul>
//                     )}
//                  </div>
//             )}

//             {activeTab === "discover" && !loadingTrustCircle && (
//                  <div className="tab-content">
//                     {trustCircleError && <div className="empty-message error-text">{trustCircleError}</div>}
//                     <section className="section-container">
//                         <div className="section-title-container"><h2 className="section-title">Discover & Join Communities</h2>
//                             <div className="section-actions"><button className="button button-success button-small icon-button" onClick={() => setShowCreateCommunityModal(true)}><GroupAddIcon /> Create New Community</button></div>
//                         </div>
//                         {availableCommunities.filter(c => c.user_membership_status !== "approved" && c.created_by !== currentUser?.id).length === 0 && !trustCircleError ? <p className="empty-message">No new communities to discover.</p> : null}
//                         {availableCommunities.filter(c => c.user_membership_status !== "approved" && c.created_by !== currentUser?.id).length > 0 && <div className="grid-layout">{availableCommunities.filter(c => c.user_membership_status !== "approved" && c.created_by !== currentUser?.id).map(comm => (<div className="card" key={comm.id}><div className="card-content"><h3 className="card-title">{comm.name}</h3><p className="card-description">{comm.description}</p><p className="card-info">{comm.memberCount} members</p></div><div className="card-actions">{comm.user_membership_status === "requested" ? <button className="button button-small icon-button status-requested" disabled><HourglassTopIcon /> Request Sent</button> : <button className="button button-primary" onClick={() => handleRequestToJoinCommunity(comm.id)} disabled={!currentUser}>Request to Join</button>}</div></div>))}</div>}
//                     </section>
//                 </div>
//             )}

//             {showAddPersonModal && (<div className="modal-backdrop" onClick={() => setShowAddPersonModal(false)}><div className="modal-content" onClick={(e) => e.stopPropagation()}><h3 className="modal-header">Add Individual Connection</h3><form onSubmit={handleAddIndividualConnection}><input type="email" className="form-input" placeholder="Enter email" value={newPersonEmail} onChange={(e) => setNewPersonEmail(e.target.value)} required /><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setShowAddPersonModal(false)}>Cancel</button><button type="submit" className="button button-primary">Send Request</button></div></form></div></div>)}
//             {showCreateCommunityModal && (<div className="modal-backdrop" onClick={() => setShowCreateCommunityModal(false)}><div className="modal-content" onClick={(e) => e.stopPropagation()}><h3 className="modal-header">Create New Community</h3><form onSubmit={handleCreateCommunity}><input type="text" className="form-input" placeholder="Community Name" value={newCommunityName} onChange={(e) => setNewCommunityName(e.target.value)} required /><textarea className="form-textarea" placeholder="Description (optional)" value={newCommunityDescription} onChange={(e) => setNewCommunityDescription(e.target.value)} /><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setShowCreateCommunityModal(false)}>Cancel</button><button type="submit" className="button button-success">Create Community</button></div></form></div></div>)}
        
//             {myRecIsReviewModalOpen && myRecSelectedProvider && <MyRecReviewModal isOpen={myRecIsReviewModalOpen} onClose={() => setMyRecIsReviewModalOpen(false)} onSubmit={handleMyRecReviewSubmit} provider={myRecSelectedProvider} />}
//             {myRecClickedRecommender && (<div className="modal-overlay"><div className="simple-modal"><button className="modal-close-x" onClick={() => setMyRecClickedRecommender(null)}>×</button><h3 className="modal-title">Want to connect with <span className="highlight">{myRecClickedRecommender}</span>?</h3><div className="modal-buttons-vertical"><button className="secondary-button" onClick={() => { setMyRecClickedRecommender(null); setMyRecShowFeatureComingModal(true); }}>Thank {myRecClickedRecommender}</button><button className="secondary-button" onClick={() => { setMyRecClickedRecommender(null); setMyRecShowFeatureComingModal(true); }}>Ask {myRecClickedRecommender} a question</button></div></div></div>)}
//             {myRecShowFeatureComingModal && (<div className="modal-overlay"><div className="modal-content review-modal-content"><button className="modal-close-x" onClick={() => setMyRecShowFeatureComingModal(false)}>×</button><p>Feature coming soon! <FaEye style={{ marginLeft: '5px' }} /></p><div className="modal-buttons"><button className="primary-button" onClick={() => setMyRecShowFeatureComingModal(false)}>OK</button></div></div></div>)}
//             {myRecIsQuoteModalOpen && myRecSelectedProvider && <QuoteModal isOpen={myRecIsQuoteModalOpen} providerName={myRecSelectedProvider.business_name} providerEmail={myRecSelectedProvider.email} providerPhotoUrl={myRecSelectedProvider.profile_image} onClose={() => setMyRecIsQuoteModalOpen(false)} />}
//         </div>
//     );
// };

// export default TrustCircles;
