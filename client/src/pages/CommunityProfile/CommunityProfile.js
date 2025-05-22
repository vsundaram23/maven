import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUser } from "@clerk/clerk-react";
import { FaUserTie, FaCalendarAlt, FaUsers, FaStar, FaEdit, FaSignInAlt, FaUserPlus, FaEye, FaUserCheck, FaHourglassHalf, FaTools, FaThumbsUp, FaPhone, FaEnvelope, FaPlusCircle } from 'react-icons/fa';
import QuoteModal from "../../components/QuoteModal/QuoteModal";
import "./CommunityProfile.css";

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = "http://localhost:3000";

const IconText = ({ icon, text, className = "" }) => (
  <div className={`icon-text-item ${className}`}> {icon} <span>{text}</span> </div>
);

const MemberCard = ({ member }) => {
  const [imageFailed, setImageFailed] = useState(false);
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

  return (
    <div className="member-item-card">
      {avatarContent}
      <span className="member-name">{member.name || member.email}</span>
      {member.clerk_id && <Link to={`/user/${member.clerk_id}/profile`} className="member-profile-link">View Profile</Link>}
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
            {[...Array(fullStars)].map((_, i) => (<FaStar key={`full-${i}`} className="filled" />))}
            {hasHalf && (<FaStar key={`half-${Date.now()}-sr`} className="half" />)}
            {[...Array(emptyStars)].map((_, i) => (<FaStar key={`empty-${i}`} className="empty" />))}
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
        if (isOpen) { setRating(0); setHover(0); setReview(""); setTags([]); setTagInput(""); setError(""); }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault(); if (!rating) { setError("Please select a rating"); return; }
        onSubmit({ rating, review, tags }); onClose();
    };
    const handleTagKeyDown = (e) => {
        if (e.key === "Enter") { e.preventDefault(); const trimmed = tagInput.trim();
            if (trimmed && !tags.includes(trimmed)) { setTags([...tags, trimmed]); } setTagInput("");
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
                            {[...Array(5)].map((_, index) => (<FaStar key={index} className={index < (hover || rating) ? "star active" : "star"} onClick={() => setRating(index + 1)} onMouseEnter={() => setHover(index + 1)} onMouseLeave={() => setHover(rating)}/>))}
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
                        <div className="tag-container modal-tag-container">{tags.map((tag, idx) => (<span key={idx} className="tag-badge">{tag} <span className="remove-tag" onClick={() => removeTag(tag)}>×</span></span>))}</div>
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

const CommunityProfile = () => {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { isLoaded, isSignedIn, user } = useUser();

  const [communityDetails, setCommunityDetails] = useState(null);
  const [communityMembers, setCommunityMembers] = useState([]);
  const [loadingCommunityDetails, setLoadingCommunityDetails] = useState(true);
  const [loadingCommunityMembers, setLoadingCommunityMembers] = useState(false);
  const [communityError, setCommunityError] = useState('');

  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [isRequestingJoin, setIsRequestingJoin] = useState(false);
  const [activeTab, setActiveTab] = useState('recommendations');

  const [commRecsRaw, setCommRecsRaw] = useState([]);
  const [commRecsReviewMap, setCommRecsReviewMap] = useState({});
  const [loadingCommRecs, setLoadingCommRecs] = useState(true);
  const [commRecsError, setCommRecsError] = useState(null);
  const [commRecsIsReviewModalOpen, setCommRecsIsReviewModalOpen] = useState(false);
  const [commRecsSelectedProvider, setCommRecsSelectedProvider] = useState(null);
  const [commRecsSortOption, setCommRecsSortOption] = useState("recommended");
  const [commRecsDropdownOpenForId, setCommRecsDropdownOpenForId] = useState(null);
  const [commRecsShowLinkCopied, setCommRecsShowLinkCopied] = useState(false);
  const [commRecsIsQuoteModalOpen, setCommRecsIsQuoteModalOpen] = useState(false);
  const [commRecsLikedMap, setCommRecsLikedMap] = useState(new Map());
  const [commRecsClickedRecommender, setCommRecsClickedRecommender] = useState(null);
  const [commRecsShowFeatureComingModal, setCommRecsShowFeatureComingModal] = useState(false);

  const [communityServiceCategories, setCommunityServiceCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' initially, or a category ID

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
    setLoadingCommunityDetails(true); setCommunityError('');
    try {
      let url = `${API_URL}/api/communities/${communityId}/details`;
      if (currentUserId) url += `?user_id=${currentUserId}`;
      const response = await fetch(url);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || `Failed to fetch community details (status: ${response.status})`);}
      const data = await response.json(); setCommunityDetails(data);
    } catch (err) { setCommunityError(err.message);
    } finally { setLoadingCommunityDetails(false); }
  }, [communityId, currentUserId]);

  const fetchCommunityMembers = useCallback(async () => {
    setLoadingCommunityMembers(true); setCommunityError('');
    try {
      const response = await fetch(`${API_URL}/api/communities/${communityId}/members`);
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.message || `Failed to fetch members (status: ${response.status})`);}
      const data = await response.json();
      if(!data.success) throw new Error(data.message || "Failed to fetch members");
      setCommunityMembers(data.members || []);
    } catch (err) { setCommunityError(err.message); setCommunityMembers([]);
    } finally { setLoadingCommunityMembers(false); }
  }, [communityId]);

  const fetchCommunityRecommendations = useCallback(async () => {
    if (!communityId || !currentUserId || !currentUserEmail) return;
    setLoadingCommRecs(true); setCommRecsError(null);
    try {
        const params = new URLSearchParams({ user_id: currentUserId, email: currentUserEmail });
        const response = await fetch(`${API_URL}/api/communities/${communityId}/recommendations?${params.toString()}`);
        if (!response.ok) { const eData = await response.json().catch(() => ({})); throw new Error(eData.message || `HTTP error ${response.status}`);}
        const data = await response.json();
        if (!data.success) throw new Error(data.message || "Failed to fetch recommendations.");
        let fetchedProviders = data.recommendations || data.providers || [];
        const statsMap = {}; const allReviewsMap = {};
        if (fetchedProviders.length > 0) {
            await Promise.all(fetchedProviders.map(async p => {
                try { const statsRes = await fetch(`${API_URL}/api/reviews/stats/${p.id}`); statsMap[p.id] = statsRes.ok ? await statsRes.json() : { average_rating: 0, total_reviews: 0 }; } catch (err) { statsMap[p.id] = { average_rating: p.average_rating || 0, total_reviews: p.total_reviews || 0 }; }
                try { const reviewsRes = await fetch(`${API_URL}/api/reviews/${p.id}`); allReviewsMap[p.id] = reviewsRes.ok ? await reviewsRes.json() : []; } catch (err) { allReviewsMap[p.id] = []; }
            }));
        }
        setCommRecsReviewMap(allReviewsMap);
        
        let currentCommunityCategories = [];
        const categoriesResponse = await fetch(`${API_URL}/api/communities/${communityId}/categories`);
        if (categoriesResponse.ok) {
            const categoriesData = await categoriesResponse.json();
            if (categoriesData.success && categoriesData.categories) {
                currentCommunityCategories = categoriesData.categories;
                setCommunityServiceCategories(categoriesData.categories);
            } else {
                setCommunityServiceCategories([]);
            }
        } else {
            setCommunityServiceCategories([]);
        }

        const miscellaneousCategory = currentCommunityCategories.find(cat => cat.category_name === 'Miscellaneous');
        const miscellaneousCategoryId = miscellaneousCategory ? miscellaneousCategory.id : null;

        const enriched = fetchedProviders.map((p, idx) => ({
            ...p, originalIndex: idx,
            average_rating: parseFloat(statsMap[p.id]?.average_rating) || parseFloat(p.average_rating) || 0,
            total_reviews: parseInt(statsMap[p.id]?.total_reviews, 10) || parseInt(p.total_reviews, 10) || 0,
            currentUserLiked: p.currentUserLiked || false, num_likes: parseInt(p.num_likes, 10) || 0,
            community_service_category_id: p.community_service_category_id || miscellaneousCategoryId,
        }));
        const initialLikes = new Map(); enriched.forEach(p => { if (p.currentUserLiked) initialLikes.set(p.id, true);});
        setCommRecsLikedMap(initialLikes);
        setCommRecsRaw(enriched);

    } catch (err) { setCommRecsError(err.message); setCommRecsRaw([]); setCommunityServiceCategories([]);
    } finally { setLoadingCommRecs(false); }
  }, [communityId, currentUserId, currentUserEmail]);

  useEffect(() => { if(communityId && (currentUserId || !isSignedIn)) fetchCommunityDetails(); }, [communityId, currentUserId, isSignedIn, fetchCommunityDetails]);
  useEffect(() => { if (activeTab === 'members' && communityId) fetchCommunityMembers(); }, [activeTab, communityId, fetchCommunityMembers]);
  useEffect(() => { if (activeTab === 'recommendations' && communityId && currentUserId && currentUserEmail) fetchCommunityRecommendations(); }, [activeTab, communityId, currentUserId, currentUserEmail, fetchCommunityRecommendations]);

  const sortedAndFilteredCommRecs = useMemo(() => {
    if (!commRecsRaw) return [];

    let list = [...commRecsRaw];

    if (communityServiceCategories.length > 0 && selectedCategory !== 'all') {
      list = list.filter(p => p.community_service_category_id === selectedCategory);
    }

    const getBand = r => { if (r >= 4) return 0; if (r >= 3) return 1; if (r >= 2) return 2; if (r >= 1) return 3; return 4; };
    if (commRecsSortOption === "topRated") {
      return list.filter(p => p.average_rating >= 4.5).sort((a, b) => (b.average_rating !== a.average_rating) ? b.average_rating - a.average_rating : (b.total_reviews || 0) - (a.total_reviews || 0));
    }
    return list.sort((a, b) => {
        const bA = getBand(a.average_rating); const bB = getBand(b.average_rating); if (bA !== bB) return bA - bB;
        const sA = (a.average_rating || 0) * (a.total_reviews || 0); const sB = (b.average_rating || 0) * (b.total_reviews || 0); if (sB !== sA) return sB - sA;
        if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating;
        if ((b.total_reviews || 0) !== (a.total_reviews || 0)) return (b.total_reviews || 0) - (a.total_reviews || 0);
        return (a.originalIndex || 0) - (b.originalIndex || 0);
    });
  }, [commRecsRaw, commRecsSortOption, selectedCategory, communityServiceCategories]);

  const handleCommRecsReviewSubmit = async (reviewData) => {
    if (!isSignedIn || !commRecsSelectedProvider || !currentUserId || !currentUserEmail) { alert("Please sign in to submit a review"); return; }
    try {
        const response = await fetch(`${API_URL}/api/reviews`, { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ provider_id: commRecsSelectedProvider.id, provider_email: commRecsSelectedProvider.email || "", user_id: currentUserId, email: currentUserEmail, rating: reviewData.rating, content: reviewData.review, tags: reviewData.tags, }),
        });
        if (!response.ok) { const errTxt = await response.text(); throw new Error(errTxt || "Failed to submit review"); }
        fetchCommunityRecommendations(); setCommRecsIsReviewModalOpen(false);
    } catch (err) { alert(`Error submitting review: ${err.message}`); }
  };

  const handleCommRecsLike = async (providerId) => {
    if (!currentUserId || !currentUserEmail) { alert("Please log in to like/unlike."); return; }
    const provToUpdate = commRecsRaw.find(p => p.id === providerId); if (!provToUpdate) return;

    const originalProviderState = { ...provToUpdate };
    const originalLikedState = commRecsLikedMap.get(providerId) || false;

    const newLikedState = !originalLikedState;
    const newNumLikes = newLikedState ? (originalProviderState.num_likes || 0) + 1 : Math.max(0, (originalProviderState.num_likes || 1) - 1);

    setCommRecsRaw(prev => prev.map(p => p.id === providerId ? { ...p, num_likes: newNumLikes, currentUserLiked: newLikedState } : p));
    setCommRecsLikedMap(prev => {
        const newMap = new Map(prev);
        newMap.set(providerId, newLikedState);
        return newMap;
    });
    try {
        const response = await fetch(`${API_URL}/api/providers/${providerId}/like`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUserId, userEmail: currentUserEmail }) });
        if (!response.ok) { const eData = await response.json().catch(() => ({})); throw new Error(eData.message || `Like error ${response.status}`); }
        const result = await response.json();
        setCommRecsRaw(prev => prev.map(p => p.id === providerId ? { ...p, num_likes: parseInt(result.num_likes, 10) || 0, currentUserLiked: result.currentUserLiked } : p ));
        setCommRecsLikedMap(prev => {
            const newMap = new Map(prev);
            newMap.set(providerId, result.currentUserLiked);
            return newMap;
        });
    } catch (error) {
        setCommRecsRaw(prev => prev.map(p => p.id === providerId ? originalProviderState : p));
        setCommRecsLikedMap(prev => {
            const newMap = new Map(prev);
            newMap.set(providerId, originalLikedState);
            return newMap;
        });
        alert(`Failed to update like: ${error.message}`);
    }
  };

  const handleRequestToJoin = async () => {
    if (!currentUserId) { alert('You must be logged in to request to join.'); navigate('/sign-in', { state: { from: location.pathname } }); return; }
    if (!communityDetails) return; setIsRequestingJoin(true); setCommunityError('');
    try {
      const response = await fetch(`${API_URL}/api/communities/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUserId, community_id: communityDetails.id }) });
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to send join request.');}
      alert('Request to join community sent!'); fetchCommunityDetails();
    } catch (err) { setCommunityError(err.message); alert(`Error: ${err.message}`);
    } finally { setIsRequestingJoin(false); }
  };

  if (loadingCommunityDetails && !communityDetails) return <div className="page-loading-state"><div className="profile-spinner"></div>Loading community...</div>;
  if (communityError && !communityDetails && activeTab !== 'recommendations' && activeTab !== 'members') return <div className="page-error-state">Error: {communityError}</div>;
  if (!isLoaded) return <div className="page-loading-state"><div className="profile-spinner"></div></div>;
  if (!communityDetails && !loadingCommunityDetails) return <div className="page-empty-state">Community not found or error loading details.</div>;

  const { name, description, creator_name, created_at, member_count, recommendation_count, isOwner, currentUserStatus } = communityDetails || {};
  const canRequestToJoin = isSignedIn && currentUserStatus === 'none';
  const isMember = isSignedIn && currentUserStatus === 'approved';
  const hasRequested = isSignedIn && currentUserStatus === 'requested';

  const renderActionButtons = () => {
    if (!isLoaded) return null;
    if (!isSignedIn) return <button className="btn btn-primary-outline" onClick={() => navigate('/sign-in', { state: { from: location } })}> <FaSignInAlt /> Sign in to Interact</button>;
    if (isOwner) return <button className="btn btn-secondary" onClick={() => navigate(`/community/${communityId}/admin`)}><FaEdit /> Admin Tools</button>;
    if (isMember) return <span className="status-chip member"><FaUserCheck /> Member</span>;
    if (hasRequested) return <span className="status-chip pending"><FaHourglassHalf /> Request Pending</span>;
    if (canRequestToJoin) return <button className="btn btn-primary" onClick={handleRequestToJoin} disabled={isRequestingJoin}><FaUserPlus /> {isRequestingJoin ? 'Sending...' : 'Request to Join'}</button>;
    return null;
  };

  return (
    <div className="community-profile-page-wrapper">
      {communityDetails && (
        <div className="community-info-card">
          <div className="info-card-header"> <h1 className="community-title">{name}</h1> <div className="info-card-actions">{renderActionButtons()}</div></div>
          <p className="community-description-card">{description || 'No description provided.'}</p>
          <div className="community-stats-grid">
            <IconText icon={<FaUserTie size={18} />} text={`Created by ${creator_name || 'N/A'}`} />
            <IconText icon={<FaCalendarAlt size={16} />} text={`Since ${created_at ? new Date(created_at).toLocaleDateString() : 'N/A'}`} />
            <IconText icon={<FaUsers size={18} />} text={`${member_count || 0} Members`} />
            <IconText icon={<FaStar size={18} />} text={`${recommendation_count || 0} Shared Recommendations`} />
          </div>
        </div>
      )}

      <div className="community-content-area">
        <div className="tabs">
          <button className={`tab-button ${activeTab === 'recommendations' ? 'active' : ''}`} onClick={() => setActiveTab('recommendations')}>Recommendations</button>
          <button className={`tab-button ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>Members ({(activeTab === 'members' && communityMembers.length > 0) ? communityMembers.length : (communityDetails?.member_count || 0)})</button>
        </div>

        {activeTab === 'recommendations' && (
          <div className="recommendations-section appliance-services-container">
             <div className="sort-bar">Sort by:
                <select className="sort-dropdown" value={commRecsSortOption.startsWith("force-refresh-")?"recommended":commRecsSortOption} onChange={(e)=>setCommRecsSortOption(e.target.value)}>
                    <option value="recommended">Recommended</option><option value="topRated">Top Rated</option>
                </select>
            </div>

            {communityServiceCategories.length > 0 && (
                <div className="category-filter-bar">
                    <button
                        className={`category-button ${selectedCategory === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('all')}
                    >
                        All
                    </button>
                    {[...communityServiceCategories]
                        .sort((a, b) => a.category_name.localeCompare(b.category_name))
                        .map((category) => (
                        <button
                            key={category.id}
                            className={`category-button ${selectedCategory === category.id ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(category.id)}
                        >
                            {category.category_name}
                        </button>
                    ))}
                </div>
            )}


            {loadingCommRecs && <div className="loading-spinner">Loading recommendations...</div>}
            {!loadingCommRecs && commRecsError && sortedAndFilteredCommRecs.length === 0 && <div className="error-message full-width-error">{commRecsError}</div>}
            {!loadingCommRecs && !commRecsError && sortedAndFilteredCommRecs.length === 0 && (
                <div className="no-providers-message">
                    <FaTools className="no-providers-icon" /><h2>No Recommendations Yet</h2>
                    <p>This community doesn't have any shared recommendations yet. {isMember ? "Be the first to add one!" : ""}</p>
                    {isMember && <div className="no-providers-actions"><button onClick={() => navigate("/share-recommendation", { state: { communityId: communityId, communityName: name }})} className="primary-button"><FaPlusCircle style={{ marginRight: "8px" }} /> Share a Recommendation</button></div>}
                </div>
            )}
            {sortedAndFilteredCommRecs.length > 0 && (
                <ul className="provider-list">
                    {sortedAndFilteredCommRecs.map((provider) => {
                        const currentReviews = commRecsReviewMap[provider.id] || [];
                        const displayAvgRating = (parseFloat(provider.average_rating) || 0).toFixed(1);
                        const displayTotalReviews = parseInt(provider.total_reviews, 10) || 0;
                        const isLiked = commRecsLikedMap.get(provider.id);
                        return (
                            <li key={provider.id} className="provider-card">
                                <div className="card-header">
                                    <h3 className="card-title">
                                        <Link to={`/provider/${provider.id}`} target="_blank" rel="noopener noreferrer" className="clickable provider-name-link" onClick={() => localStorage.setItem("selectedProvider",JSON.stringify(provider))}>
                                            {provider.business_name}
                                        </Link>
                                    </h3>
                                    <div className="badge-wrapper-with-menu">
                                        {(parseFloat(provider.average_rating) || 0) >= 4.5 && (<span className="badge top-rated-badge">Top Rated</span>)}
                                        <div className="dropdown-wrapper">
                                            <button className="three-dots-button" onClick={() => setCommRecsDropdownOpenForId(commRecsDropdownOpenForId === provider.id ? null : provider.id)} title="Options">⋮</button>
                                            {commRecsDropdownOpenForId === provider.id && (
                                                <div className="dropdown-menu">
                                                    <button className="dropdown-item" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/provider/${provider.id}`); setCommRecsDropdownOpenForId(null); setCommRecsShowLinkCopied(true); setTimeout(() => setCommRecsShowLinkCopied(false), 2000);}}>Share this Rec</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="review-summary">
                                    <CommunityRecStarRating rating={parseFloat(provider.average_rating) || 0} />
                                    <span className="review-score">{displayAvgRating}</span>
                                    <span className="review-count">({displayTotalReviews} {displayTotalReviews === 1 ? "review" : "reviews"})</span>
                                    {isSignedIn && <button className="write-review-link" onClick={() => { setCommRecsSelectedProvider(provider); setCommRecsIsReviewModalOpen(true); }}>Write a Review</button>}
                                    <button className={`like-button ${isLiked ? 'liked' : ''}`} onClick={() => handleCommRecsLike(provider.id)} title={isLiked ? "Unlike" : "Like"} disabled={!isSignedIn}>
                                        <FaThumbsUp /> <span className="like-count">{provider.num_likes || 0}</span>
                                    </button>
                                </div>

                                <p className="card-description">{provider.description || provider.recommender_message || "No description available"}</p>
                                
                                <div className="tag-container">
                                    {Array.isArray(provider.tags) && provider.tags.map((tag, idx) => (
                                        <span key={idx} className="tag-badge">{tag}</span>
                                    ))}
                                    {isSignedIn && (
                                        <button className="add-tag-button" onClick={() => { setCommRecsSelectedProvider(provider); setCommRecsIsReviewModalOpen(true);}} aria-label="Add or edit tags">
                                            <FaPlusCircle />
                                        </button>
                                    )}
                                </div>

                                {provider.recommender_name && (
                                    <div className="recommended-row">
                                        <span className="recommended-label">Recommended by:</span>
                                        {provider.recommender_clerk_id ? (
                                            <Link to={`/user/${provider.recommender_clerk_id}/recommendations`} className="recommended-name clickable" target="_blank" rel="noopener noreferrer">{provider.recommender_name}</Link>
                                        ) : (
                                            <span className="recommended-name">{provider.recommender_name}</span>
                                        )}
                                        {provider.date_of_recommendation && (
                                            <span className="recommendation-date">({new Date(provider.date_of_recommendation).toLocaleDateString("en-US", {year:"2-digit",month:"numeric",day:"numeric"})})</span>
                                        )}
                                    </div>
                                )}
                                
                                {currentReviews.length > 0 && 
                                    (currentReviews.map(r => r.user_name).filter(n => (n && n.trim() && n !== provider.recommender_name)).filter((v, i, a) => a.indexOf(v) === i)).length > 0 && (
                                    <div className="recommended-row also-used-by">
                                        <span className="recommended-label">Also used by:</span>
                                        <span className="used-by-names">
                                            {currentReviews.map(r => r.user_name)
                                                .filter(n => (n && n.trim() && n !== provider.recommender_name)) 
                                                .filter((v, i, a) => a.indexOf(v) === i) 
                                                .join(", ")}
                                        </span>
                                    </div>
                                )}

                                <div className="action-buttons">
                                    {/* {isSignedIn && <button className="primary-button" onClick={() => { setCommRecsSelectedProvider(provider); setCommRecsIsQuoteModalOpen(true);}}>Request a Quote</button>} */}
                                    {isSignedIn && (provider.recommender_phone || provider.recommender_email) && 
                                        <button className="secondary-button" onClick={() => { 
                                            if (provider.recommender_phone) window.location.href = `sms:${provider.recommender_phone}`; 
                                            else if (provider.recommender_email) window.location.href = `mailto:${provider.recommender_email}`;
                                        }}>Connect with Recommender</button>
                                    }
                                </div>
                            </li>);
                    })}
                </ul>
            )}
            {commRecsShowLinkCopied && (<div className="toast">Link copied!</div>)}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="members-section">
            {loadingCommunityMembers && <div className="loading-spinner">Loading members...</div>}
            {!loadingCommunityMembers && communityError && communityMembers.length === 0 && <div className="error-message full-width-error">{communityError}</div>}
            {!loadingCommunityMembers && !communityError && communityMembers.length === 0 && (<p className="no-results-message">No members to display in this community yet.</p>)}
            {communityMembers.length > 0 && (<div className="members-list">{communityMembers.map(member => <MemberCard key={member.id || member.clerk_id || member.email} member={member} />)}</div>)}
          </div>
        )}
      </div>
      {commRecsIsReviewModalOpen && commRecsSelectedProvider && <CommunityRecReviewModal isOpen={commRecsIsReviewModalOpen} onClose={() => setCommRecsIsReviewModalOpen(false)} onSubmit={handleCommRecsReviewSubmit} provider={commRecsSelectedProvider} />}
      {commRecsClickedRecommender && (<div className="modal-overlay"><div className="simple-modal"><button className="modal-close-x" onClick={() => setCommRecsClickedRecommender(null)}>×</button><h3 className="modal-title">Want to connect with <span className="highlight">{commRecsClickedRecommender}</span>?</h3><div className="modal-buttons-vertical"><button className="secondary-button" onClick={() => { setCommRecsClickedRecommender(null); setCommRecsShowFeatureComingModal(true); }}>Thank {commRecsClickedRecommender}</button><button className="secondary-button" onClick={() => { setCommRecsClickedRecommender(null); setCommRecsShowFeatureComingModal(true); }}>Ask {commRecsClickedRecommender} a question</button></div></div></div>)}
      {commRecsShowFeatureComingModal && (<div className="modal-overlay"><div className="modal-content review-modal-content"><button className="modal-close-x" onClick={() => setCommRecsShowFeatureComingModal(false)}>×</button><p>Feature coming soon! <FaEye style={{ marginLeft: '5px' }} /></p><div className="modal-buttons"><button className="primary-button" onClick={() => setCommRecsShowFeatureComingModal(false)}>OK</button></div></div></div>)}
      {commRecsIsQuoteModalOpen && commRecsSelectedProvider && <QuoteModal isOpen={commRecsIsQuoteModalOpen} providerName={commRecsSelectedProvider.business_name} providerEmail={commRecsSelectedProvider.email} providerPhotoUrl={commRecsSelectedProvider.profile_image} onClose={() => setCommRecsIsQuoteModalOpen(false)} />}
    </div>
  );
};

export default CommunityProfile;

// working good 5/21, no filtering
// import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import { useParams, useNavigate, Link } from 'react-router-dom';
// import { useUser } from "@clerk/clerk-react";
// import { FaUserTie, FaCalendarAlt, FaUsers, FaStar, FaEdit, FaSignInAlt, FaUserPlus, FaEye, FaUserCheck, FaHourglassHalf, FaTools, FaThumbsUp, FaPhone, FaEnvelope, FaPlusCircle } from 'react-icons/fa';
// import QuoteModal from "../../components/QuoteModal/QuoteModal";
// import "./CommunityProfile.css";

// const API_URL = 'https://api.seanag-recommendations.org:8080';
// // const API_URL = "http://localhost:3000";

// const IconText = ({ icon, text, className = "" }) => (
//   <div className={`icon-text-item ${className}`}> {icon} <span>{text}</span> </div>
// );

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

//   return (
//     <div className="member-item-card">
//       {avatarContent}
//       <span className="member-name">{member.name || member.email}</span>
//       {member.clerk_id && <Link to={`/user/${member.clerk_id}/profile`} className="member-profile-link">View Profile</Link>}
//     </div>
//   );
// };

// const CommunityRecStarRating = ({ rating }) => {
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

// const CommunityRecReviewModal = ({ isOpen, onClose, onSubmit, provider }) => {
//     const [rating, setRating] = useState(0);
//     const [hover, setHover] = useState(0);
//     const [review, setReview] = useState("");
//     const [tags, setTags] = useState([]);
//     const [tagInput, setTagInput] = useState("");
//     const [error, setError] = useState("");

//     useEffect(() => {
//         if (isOpen) { setRating(0); setHover(0); setReview(""); setTags([]); setTagInput(""); setError(""); }
//     }, [isOpen]);

//     const handleSubmit = (e) => {
//         e.preventDefault(); if (!rating) { setError("Please select a rating"); return; }
//         onSubmit({ rating, review, tags }); onClose();
//     };
//     const handleTagKeyDown = (e) => {
//         if (e.key === "Enter") { e.preventDefault(); const trimmed = tagInput.trim();
//             if (trimmed && !tags.includes(trimmed)) { setTags([...tags, trimmed]); } setTagInput("");
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
//                             {[...Array(5)].map((_, index) => (<FaStar key={index} className={index < (hover || rating) ? "star active" : "star"} onClick={() => setRating(index + 1)} onMouseEnter={() => setHover(index + 1)} onMouseLeave={() => setHover(rating)}/>))}
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
//                         <div className="tag-container modal-tag-container">{tags.map((tag, idx) => (<span key={idx} className="tag-badge">{tag} <span className="remove-tag" onClick={() => removeTag(tag)}>×</span></span>))}</div>
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

// const CommunityProfile = () => {
//   const { communityId } = useParams();
//   const navigate = useNavigate();
//   const { isLoaded, isSignedIn, user } = useUser();

//   const [communityDetails, setCommunityDetails] = useState(null);
//   const [communityMembers, setCommunityMembers] = useState([]);
//   const [loadingCommunityDetails, setLoadingCommunityDetails] = useState(true);
//   const [loadingCommunityMembers, setLoadingCommunityMembers] = useState(false);
//   const [communityError, setCommunityError] = useState('');

//   const [currentUserId, setCurrentUserId] = useState(null);
//   const [currentUserEmail, setCurrentUserEmail] = useState(null);
//   const [isRequestingJoin, setIsRequestingJoin] = useState(false);
//   const [activeTab, setActiveTab] = useState('recommendations');

//   const [commRecsRaw, setCommRecsRaw] = useState([]);
//   const [commRecsReviewMap, setCommRecsReviewMap] = useState({});
//   const [loadingCommRecs, setLoadingCommRecs] = useState(true);
//   const [commRecsError, setCommRecsError] = useState(null);
//   const [commRecsIsReviewModalOpen, setCommRecsIsReviewModalOpen] = useState(false);
//   const [commRecsSelectedProvider, setCommRecsSelectedProvider] = useState(null);
//   const [commRecsSortOption, setCommRecsSortOption] = useState("recommended");
//   const [commRecsDropdownOpenForId, setCommRecsDropdownOpenForId] = useState(null);
//   const [commRecsShowLinkCopied, setCommRecsShowLinkCopied] = useState(false);
//   const [commRecsIsQuoteModalOpen, setCommRecsIsQuoteModalOpen] = useState(false);
//   const [commRecsLikedMap, setCommRecsLikedMap] = useState(new Map());
//   const [commRecsClickedRecommender, setCommRecsClickedRecommender] = useState(null);
//   const [commRecsShowFeatureComingModal, setCommRecsShowFeatureComingModal] = useState(false);

//   useEffect(() => {
//     if (isLoaded && user) {
//       setCurrentUserId(user.id);
//       setCurrentUserEmail(user.primaryEmailAddress?.emailAddress);
//     } else if (isLoaded && !isSignedIn) {
//       setCurrentUserId(null);
//       setCurrentUserEmail(null);
//     }
//   }, [isLoaded, isSignedIn, user]);

//   const fetchCommunityDetails = useCallback(async () => {
//     setLoadingCommunityDetails(true); setCommunityError('');
//     try {
//       let url = `${API_URL}/api/communities/${communityId}/details`;
//       if (currentUserId) url += `?user_id=${currentUserId}`;
//       const response = await fetch(url);
//       if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || `Failed to fetch community details (status: ${response.status})`);}
//       const data = await response.json(); setCommunityDetails(data);
//     } catch (err) { setCommunityError(err.message);
//     } finally { setLoadingCommunityDetails(false); }
//   }, [communityId, currentUserId]);

//   const fetchCommunityMembers = useCallback(async () => {
//     setLoadingCommunityMembers(true); setCommunityError('');
//     try {
//       const response = await fetch(`${API_URL}/api/communities/${communityId}/members`);
//       if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.message || `Failed to fetch members (status: ${response.status})`);}
//       const data = await response.json();
//       if(!data.success) throw new Error(data.message || "Failed to fetch members");
//       setCommunityMembers(data.members || []);
//     } catch (err) { setCommunityError(err.message); setCommunityMembers([]);
//     } finally { setLoadingCommunityMembers(false); }
//   }, [communityId]);

//   const fetchCommunityRecommendations = useCallback(async () => {
//     if (!communityId || !currentUserId || !currentUserEmail) return;
//     setLoadingCommRecs(true); setCommRecsError(null);
//     try {
//         const params = new URLSearchParams({ user_id: currentUserId, email: currentUserEmail });
//         const response = await fetch(`${API_URL}/api/communities/${communityId}/recommendations?${params.toString()}`);
//         if (!response.ok) { const eData = await response.json().catch(() => ({})); throw new Error(eData.message || `HTTP error ${response.status}`);}
//         const data = await response.json();
//         if (!data.success) throw new Error(data.message || "Failed to fetch recommendations.");
//         let fetchedProviders = data.recommendations || data.providers || [];
//         const statsMap = {}; const allReviewsMap = {};
//         if (fetchedProviders.length > 0) {
//             await Promise.all(fetchedProviders.map(async p => {
//                 try { const statsRes = await fetch(`${API_URL}/api/reviews/stats/${p.id}`); statsMap[p.id] = statsRes.ok ? await statsRes.json() : { average_rating: 0, total_reviews: 0 }; } catch (err) { statsMap[p.id] = { average_rating: p.average_rating || 0, total_reviews: p.total_reviews || 0 }; }
//                 try { const reviewsRes = await fetch(`${API_URL}/api/reviews/${p.id}`); allReviewsMap[p.id] = reviewsRes.ok ? await reviewsRes.json() : []; } catch (err) { allReviewsMap[p.id] = []; }
//             }));
//         }
//         setCommRecsReviewMap(allReviewsMap);
//         const enriched = fetchedProviders.map((p, idx) => ({
//             ...p, originalIndex: idx,
//             average_rating: parseFloat(statsMap[p.id]?.average_rating) || parseFloat(p.average_rating) || 0,
//             total_reviews: parseInt(statsMap[p.id]?.total_reviews, 10) || parseInt(p.total_reviews, 10) || 0,
//             currentUserLiked: p.currentUserLiked || false, num_likes: parseInt(p.num_likes, 10) || 0,
//         }));
//         const initialLikes = new Map(); enriched.forEach(p => { if (p.currentUserLiked) initialLikes.set(p.id, true);});
//         setCommRecsLikedMap(initialLikes);
//         setCommRecsRaw(enriched);
//     } catch (err) { setCommRecsError(err.message); setCommRecsRaw([]);
//     } finally { setLoadingCommRecs(false); }
//   }, [communityId, currentUserId, currentUserEmail]);

//   useEffect(() => { if(communityId && (currentUserId || !isSignedIn)) fetchCommunityDetails(); }, [communityId, currentUserId, isSignedIn, fetchCommunityDetails]);
//   useEffect(() => { if (activeTab === 'members' && communityId) fetchCommunityMembers(); }, [activeTab, communityId, fetchCommunityMembers]);
//   useEffect(() => { if (activeTab === 'recommendations' && communityId && currentUserId && currentUserEmail) fetchCommunityRecommendations(); }, [activeTab, communityId, currentUserId, currentUserEmail, fetchCommunityRecommendations]);

//   const sortedCommRecs = useMemo(() => {
//     if (!commRecsRaw) return [];
//     const getBand = r => { if (r >= 4) return 0; if (r >= 3) return 1; if (r >= 2) return 2; if (r >= 1) return 3; return 4; };
//     let list = [...commRecsRaw];
//     if (commRecsSortOption === "topRated") return list.filter(p => p.average_rating >= 4.5).sort((a, b) => (b.average_rating !== a.average_rating) ? b.average_rating - a.average_rating : (b.total_reviews || 0) - (a.total_reviews || 0));
//     return list.sort((a, b) => {
//         const bA = getBand(a.average_rating); const bB = getBand(b.average_rating); if (bA !== bB) return bA - bB;
//         const sA = (a.average_rating || 0) * (a.total_reviews || 0); const sB = (b.average_rating || 0) * (b.total_reviews || 0); if (sB !== sA) return sB - sA;
//         if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating;
//         if ((b.total_reviews || 0) !== (a.total_reviews || 0)) return (b.total_reviews || 0) - (a.total_reviews || 0);
//         return (a.originalIndex || 0) - (b.originalIndex || 0);
//     });
//   }, [commRecsRaw, commRecsSortOption]);

//   const handleCommRecsReviewSubmit = async (reviewData) => {
//     if (!isSignedIn || !commRecsSelectedProvider || !currentUserId || !currentUserEmail) { alert("Please sign in to submit a review"); return; }
//     try {
//         const response = await fetch(`${API_URL}/api/reviews`, { method: "POST", headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ provider_id: commRecsSelectedProvider.id, provider_email: commRecsSelectedProvider.email || "", user_id: currentUserId, email: currentUserEmail, rating: reviewData.rating, content: reviewData.review, tags: reviewData.tags, }),
//         });
//         if (!response.ok) { const errTxt = await response.text(); throw new Error(errTxt || "Failed to submit review"); }
//         fetchCommunityRecommendations(); setCommRecsIsReviewModalOpen(false);
//     } catch (err) { alert(`Error submitting review: ${err.message}`); }
//   };

//   const handleCommRecsLike = async (providerId) => {
//     if (!currentUserId || !currentUserEmail) { alert("Please log in to like/unlike."); return; }
//     const provToUpdate = commRecsRaw.find(p => p.id === providerId); if (!provToUpdate) return;

//     const originalProviderState = { ...provToUpdate };
//     const originalLikedState = commRecsLikedMap.get(providerId) || false;

//     const newLikedState = !originalLikedState;
//     const newNumLikes = newLikedState ? (originalProviderState.num_likes || 0) + 1 : Math.max(0, (originalProviderState.num_likes || 1) - 1);

//     setCommRecsRaw(prev => prev.map(p => p.id === providerId ? { ...p, num_likes: newNumLikes, currentUserLiked: newLikedState } : p));
//     setCommRecsLikedMap(prev => new Map(prev).set(providerId, newLikedState));
//     try {
//         const response = await fetch(`${API_URL}/api/providers/${providerId}/like`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUserId, userEmail: currentUserEmail }) });
//         if (!response.ok) { const eData = await response.json().catch(() => ({})); throw new Error(eData.message || `Like error ${response.status}`); }
//         const result = await response.json();
//         setCommRecsRaw(prev => prev.map(p => p.id === providerId ? { ...p, num_likes: parseInt(result.num_likes, 10) || 0, currentUserLiked: result.currentUserLiked } : p ));
//         setCommRecsLikedMap(prev => new Map(prev).set(providerId, result.currentUserLiked));
//     } catch (error) {
//         setCommRecsRaw(prev => prev.map(p => p.id === providerId ? originalProviderState : p));
//         setCommRecsLikedMap(prev => new Map(prev).set(providerId, originalLikedState));
//         alert(`Failed to update like: ${error.message}`);
//     }
//   };

//   const handleRequestToJoin = async () => {
//     if (!currentUserId) { alert('You must be logged in to request to join.'); navigate('/sign-in', { state: { from: location.pathname } }); return; }
//     if (!communityDetails) return; setIsRequestingJoin(true); setCommunityError('');
//     try {
//       const response = await fetch(`${API_URL}/api/communities/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUserId, community_id: communityDetails.id }) });
//       if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || 'Failed to send join request.');}
//       alert('Request to join community sent!'); fetchCommunityDetails();
//     } catch (err) { setCommunityError(err.message); alert(`Error: ${err.message}`);
//     } finally { setIsRequestingJoin(false); }
//   };

//   if (loadingCommunityDetails && !communityDetails) return <div className="page-loading-state"><div className="profile-spinner"></div>Loading community...</div>;
//   if (communityError && !communityDetails && activeTab !== 'recommendations' && activeTab !== 'members') return <div className="page-error-state">Error: {communityError}</div>;
//   if (!isLoaded) return <div className="page-loading-state"><div className="profile-spinner"></div></div>;
//   if (!communityDetails && !loadingCommunityDetails) return <div className="page-empty-state">Community not found or error loading details.</div>;

//   const { name, description, creator_name, created_at, member_count, recommendation_count, isOwner, currentUserStatus } = communityDetails || {};
//   const canRequestToJoin = isSignedIn && currentUserStatus === 'none';
//   const isMember = isSignedIn && currentUserStatus === 'approved';
//   const hasRequested = isSignedIn && currentUserStatus === 'requested';

//   const renderActionButtons = () => {
//     if (!isLoaded) return null;
//     if (!isSignedIn) return <button className="btn btn-primary-outline" onClick={() => navigate('/sign-in', { state: { from: location } })}> <FaSignInAlt /> Sign in to Interact</button>;
//     if (isOwner) return <button className="btn btn-secondary" onClick={() => navigate(`/community/${communityId}/admin`)}><FaEdit /> Admin Tools</button>;
//     if (isMember) return <span className="status-chip member"><FaUserCheck /> Member</span>;
//     if (hasRequested) return <span className="status-chip pending"><FaHourglassHalf /> Request Pending</span>;
//     if (canRequestToJoin) return <button className="btn btn-primary" onClick={handleRequestToJoin} disabled={isRequestingJoin}><FaUserPlus /> {isRequestingJoin ? 'Sending...' : 'Request to Join'}</button>;
//     return null;
//   };

//   return (
//     <div className="community-profile-page-wrapper">
//       {communityDetails && (
//         <div className="community-info-card">
//           <div className="info-card-header"> <h1 className="community-title">{name}</h1> <div className="info-card-actions">{renderActionButtons()}</div></div>
//           <p className="community-description-card">{description || 'No description provided.'}</p>
//           <div className="community-stats-grid">
//             <IconText icon={<FaUserTie size={18} />} text={`Created by ${creator_name || 'N/A'}`} />
//             <IconText icon={<FaCalendarAlt size={16} />} text={`Since ${created_at ? new Date(created_at).toLocaleDateString() : 'N/A'}`} />
//             <IconText icon={<FaUsers size={18} />} text={`${member_count || 0} Members`} />
//             <IconText icon={<FaStar size={18} />} text={`${recommendation_count || 0} Shared Recommendations`} />
//           </div>
//         </div>
//       )}

//       <div className="community-content-area">
//         <div className="tabs">
//           <button className={`tab-button ${activeTab === 'recommendations' ? 'active' : ''}`} onClick={() => setActiveTab('recommendations')}>Recommendations</button>
//           <button className={`tab-button ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>Members ({(activeTab === 'members' && communityMembers.length > 0) ? communityMembers.length : (communityDetails?.member_count || 0)})</button>
//         </div>

//         {activeTab === 'recommendations' && (
//           <div className="recommendations-section appliance-services-container">
//              <div className="sort-bar">Sort by:
//                 <select className="sort-dropdown" value={commRecsSortOption.startsWith("force-refresh-")?"recommended":commRecsSortOption} onChange={(e)=>setCommRecsSortOption(e.target.value)}>
//                     <option value="recommended">Recommended</option><option value="topRated">Top Rated</option>
//                 </select>
//             </div>
//             {loadingCommRecs && <div className="loading-spinner">Loading recommendations...</div>}
//             {!loadingCommRecs && commRecsError && sortedCommRecs.length === 0 && <div className="error-message full-width-error">{commRecsError}</div>}
//             {!loadingCommRecs && !commRecsError && sortedCommRecs.length === 0 && (
//                 <div className="no-providers-message">
//                     <FaTools className="no-providers-icon" /><h2>No Recommendations Yet</h2>
//                     <p>This community doesn't have any shared recommendations yet. {isMember ? "Be the first to add one!" : ""}</p>
//                     {isMember && <div className="no-providers-actions"><button onClick={() => navigate("/share-recommendation", { state: { communityId: communityId, communityName: name }})} className="primary-button"><FaPlusCircle style={{ marginRight: "8px" }} /> Share a Recommendation</button></div>}
//                 </div>
//             )}
//             {sortedCommRecs.length > 0 && (
//                 <ul className="provider-list">
//                     {sortedCommRecs.map((provider) => {
//                         const currentReviews = commRecsReviewMap[provider.id] || [];
//                         const displayAvgRating = (parseFloat(provider.average_rating) || 0).toFixed(1);
//                         const displayTotalReviews = parseInt(provider.total_reviews, 10) || 0;
//                         const isLiked = commRecsLikedMap.get(provider.id);
//                         return (
//                             <li key={provider.id} className="provider-card">
//                                 <div className="card-header">
//                                     <h3 className="card-title">
//                                         <Link to={`/provider/${provider.id}`} target="_blank" rel="noopener noreferrer" className="clickable provider-name-link" onClick={() => localStorage.setItem("selectedProvider",JSON.stringify(provider))}>
//                                             {provider.business_name}
//                                         </Link>
//                                     </h3>
//                                     <div className="badge-wrapper-with-menu">
//                                         {(parseFloat(provider.average_rating) || 0) >= 4.5 && (<span className="badge top-rated-badge">Top Rated</span>)}
//                                         <div className="dropdown-wrapper">
//                                             <button className="three-dots-button" onClick={() => setCommRecsDropdownOpenForId(commRecsDropdownOpenForId === provider.id ? null : provider.id)} title="Options">⋮</button>
//                                             {commRecsDropdownOpenForId === provider.id && (
//                                                 <div className="dropdown-menu">
//                                                     <button className="dropdown-item" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/provider/${provider.id}`); setCommRecsDropdownOpenForId(null); setCommRecsShowLinkCopied(true); setTimeout(() => setCommRecsShowLinkCopied(false), 2000);}}>Share this Rec</button>
//                                                 </div>
//                                             )}
//                                         </div>
//                                     </div>
//                                 </div>

//                                 <div className="review-summary">
//                                     <CommunityRecStarRating rating={parseFloat(provider.average_rating) || 0} />
//                                     <span className="review-score">{displayAvgRating}</span>
//                                     <span className="review-count">({displayTotalReviews} {displayTotalReviews === 1 ? "review" : "reviews"})</span>
//                                     {isSignedIn && <button className="write-review-link" onClick={() => { setCommRecsSelectedProvider(provider); setCommRecsIsReviewModalOpen(true); }}>Write a Review</button>}
//                                     <button className={`like-button ${isLiked ? 'liked' : ''}`} onClick={() => handleCommRecsLike(provider.id)} title={isLiked ? "Unlike" : "Like"} disabled={!isSignedIn}>
//                                         <FaThumbsUp /> <span className="like-count">{provider.num_likes || 0}</span>
//                                     </button>
//                                 </div>

//                                 <p className="card-description">{provider.description || provider.recommender_message || "No description available"}</p>
                                
//                                 <div className="tag-container">
//                                     {Array.isArray(provider.tags) && provider.tags.map((tag, idx) => (
//                                         <span key={idx} className="tag-badge">{tag}</span>
//                                     ))}
//                                     {isSignedIn && (
//                                         <button className="add-tag-button" onClick={() => { setCommRecsSelectedProvider(provider); setCommRecsIsReviewModalOpen(true);}} aria-label="Add or edit tags">
//                                             <FaPlusCircle />
//                                         </button>
//                                     )}
//                                 </div>

//                                 {provider.recommender_name && (
//                                     <div className="recommended-row">
//                                         <span className="recommended-label">Recommended by:</span>
//                                         {provider.recommender_clerk_id ? (
//                                             <Link to={`/user/${provider.recommender_clerk_id}/recommendations`} className="recommended-name clickable" target="_blank" rel="noopener noreferrer">{provider.recommender_name}</Link>
//                                         ) : (
//                                             <span className="recommended-name">{provider.recommender_name}</span>
//                                         )}
//                                         {provider.date_of_recommendation && (
//                                             <span className="recommendation-date">({new Date(provider.date_of_recommendation).toLocaleDateString("en-US", {year:"2-digit",month:"numeric",day:"numeric"})})</span>
//                                         )}
//                                     </div>
//                                 )}
                                
//                                 {currentReviews.length > 0 && 
//                                     (currentReviews.map(r => r.user_name).filter(n => (n && n.trim() && n !== provider.recommender_name)).filter((v, i, a) => a.indexOf(v) === i)).length > 0 && (
//                                     <div className="recommended-row also-used-by">
//                                         <span className="recommended-label">Also used by:</span>
//                                         <span className="used-by-names">
//                                             {currentReviews.map(r => r.user_name)
//                                                 .filter(n => (n && n.trim() && n !== provider.recommender_name)) 
//                                                 .filter((v, i, a) => a.indexOf(v) === i) 
//                                                 .join(", ")}
//                                         </span>
//                                     </div>
//                                 )}

//                                 <div className="action-buttons">
//                                     {isSignedIn && <button className="primary-button" onClick={() => { setCommRecsSelectedProvider(provider); setCommRecsIsQuoteModalOpen(true);}}>Request a Quote</button>}
//                                     {isSignedIn && (provider.recommender_phone || provider.recommender_email) && 
//                                         <button className="secondary-button" onClick={() => { 
//                                             if (provider.recommender_phone) window.location.href = `sms:${provider.recommender_phone}`; 
//                                             else if (provider.recommender_email) window.location.href = `mailto:${provider.recommender_email}`;
//                                         }}>Connect with Recommender</button>
//                                     }
//                                 </div>
//                             </li>);
//                     })}
//                 </ul>
//             )}
//             {commRecsShowLinkCopied && (<div className="toast">Link copied!</div>)}
//           </div>
//         )}

//         {activeTab === 'members' && (
//           <div className="members-section">
//             {loadingCommunityMembers && <div className="loading-spinner">Loading members...</div>}
//             {!loadingCommunityMembers && communityError && communityMembers.length === 0 && <div className="error-message full-width-error">{communityError}</div>}
//             {!loadingCommunityMembers && !communityError && communityMembers.length === 0 && (<p className="no-results-message">No members to display in this community yet.</p>)}
//             {communityMembers.length > 0 && (<div className="members-list">{communityMembers.map(member => <MemberCard key={member.id || member.clerk_id || member.email} member={member} />)}</div>)}
//           </div>
//         )}
//       </div>
//       {commRecsIsReviewModalOpen && commRecsSelectedProvider && <CommunityRecReviewModal isOpen={commRecsIsReviewModalOpen} onClose={() => setCommRecsIsReviewModalOpen(false)} onSubmit={handleCommRecsReviewSubmit} provider={commRecsSelectedProvider} />}
//       {commRecsClickedRecommender && (<div className="modal-overlay"><div className="simple-modal"><button className="modal-close-x" onClick={() => setCommRecsClickedRecommender(null)}>×</button><h3 className="modal-title">Want to connect with <span className="highlight">{commRecsClickedRecommender}</span>?</h3><div className="modal-buttons-vertical"><button className="secondary-button" onClick={() => { setCommRecsClickedRecommender(null); setCommRecsShowFeatureComingModal(true); }}>Thank {commRecsClickedRecommender}</button><button className="secondary-button" onClick={() => { setCommRecsClickedRecommender(null); setCommRecsShowFeatureComingModal(true); }}>Ask {commRecsClickedRecommender} a question</button></div></div></div>)}
//       {commRecsShowFeatureComingModal && (<div className="modal-overlay"><div className="modal-content review-modal-content"><button className="modal-close-x" onClick={() => setCommRecsShowFeatureComingModal(false)}>×</button><p>Feature coming soon! <FaEye style={{ marginLeft: '5px' }} /></p><div className="modal-buttons"><button className="primary-button" onClick={() => setCommRecsShowFeatureComingModal(false)}>OK</button></div></div></div>)}
//       {commRecsIsQuoteModalOpen && commRecsSelectedProvider && <QuoteModal isOpen={commRecsIsQuoteModalOpen} providerName={commRecsSelectedProvider.business_name} providerEmail={commRecsSelectedProvider.email} providerPhotoUrl={commRecsSelectedProvider.profile_image} onClose={() => setCommRecsIsQuoteModalOpen(false)} />}
//     </div>
//   );
// };

// export default CommunityProfile;
