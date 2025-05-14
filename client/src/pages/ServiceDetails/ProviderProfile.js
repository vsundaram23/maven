import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom'; // Added useNavigate
import {
    FaStar, FaPhone, FaEnvelope, FaMapMarkerAlt, FaQuestionCircle,
    FaShareAlt, FaRegBookmark, FaBookmark, FaSms, FaExternalLinkAlt, FaRegHandshake
} from 'react-icons/fa';
import './ProviderProfile.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = 'http://localhost:3000';

const ProviderProfile = () => {
    const { id } = useParams();
    const [provider, setProvider] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [activeTab, setActiveTab] = useState('Reviews');
    const [showLinkCopied, setShowLinkCopied] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [loadingProvider, setLoadingProvider] = useState(true);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();


    useEffect(() => {
        const updateUserId = () => {
          const rawUser = localStorage.getItem('user');
          if (rawUser) {
            try {
              const userObject = JSON.parse(rawUser);
              setCurrentUserId(userObject?.id || null);
            } catch (e) {
              setCurrentUserId(null);
            }
          } else {
            setCurrentUserId(null);
          }
        };
        updateUserId();
        window.addEventListener('userLogin', updateUserId);
        window.addEventListener('userLogout', updateUserId);
        return () => {
          window.removeEventListener('userLogin', updateUserId);
          window.removeEventListener('userLogout', updateUserId);
        };
    }, []);


    useEffect(() => {
        if (!id) {
            setLoadingProvider(false);
            setError("Provider ID is missing.");
            return;
        }
        if (!currentUserId && localStorage.getItem('user')) {
            // Waiting for currentUserId to be set by the other effect
            return;
        }
        if (!currentUserId) {
            setError("Please log in to view provider details.");
            setLoadingProvider(false);
            return;
        }

        const fetchProvider = async () => {
            setLoadingProvider(true);
            setError(null);
            try {
                const fetchUrl = `${API_URL}/api/providers/${id}?user_id=${currentUserId}`;
                console.log("PROVIDER_PROFILE.JS: Fetching provider from:", fetchUrl);
                const res = await fetch(fetchUrl);
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.message || `HTTP error! status: ${res.status}`);
                }
                const data = await res.json();
                if (data.success) {
                    setProvider(data.provider);
                } else {
                    throw new Error(data.message || "Failed to fetch provider details");
                }
            } catch (error) {
                console.error("Failed to fetch provider:", error);
                setError(error.message);
                setProvider(null);
            } finally {
                setLoadingProvider(false);
            }
        };
        fetchProvider();
    }, [id, currentUserId]);

    useEffect(() => {
        if (!id) {
            setLoadingReviews(false);
            return;
        }
        const fetchReviews = async () => {
             setLoadingReviews(true);
             try {
                const res = await fetch(`${API_URL}/api/reviews/${id}`);
                 if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const data = await res.json();
                setReviews(Array.isArray(data) ? data : []);
            } catch (error) {
                 console.error("Failed to fetch reviews:", error);
                 setReviews([]);
            } finally {
                setLoadingReviews(false);
            }
        };
        fetchReviews();
    }, [id]);

    // Calculate avgRating and totalReviews from the provider object if they are now included
    // OR if you prefer, fetch them from /api/reviews/stats/:id like CleaningServices
    const avgRating = provider ? (parseFloat(provider.average_rating) || 0).toFixed(1) : '0.0';
    const totalReviews = provider ? (parseInt(provider.total_reviews, 10) || 0) : 0;


    const starCounts = React.useMemo(() => {
        const counts = [0, 0, 0, 0, 0];
        reviews.forEach((r) => {
            const rating = parseInt(r.rating);
            if (rating >= 1 && rating <= 5) {
                counts[rating - 1]++;
            }
        });
        return counts;
    }, [reviews]);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) { return ''; }
    };

    const getWebsiteHostname = (url) => {
        if (!url) return '';
        try {
            const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
            return parsedUrl.hostname.replace(/^www\./, '');
        } catch (e) { return url; }
    };

    const handleShareClick = () => {
        const shareUrl = `${window.location.origin}/provider/${provider?.id}`;
        navigator.clipboard.writeText(shareUrl)
            .then(() => {
                setShowLinkCopied(true);
                setTimeout(() => setShowLinkCopied(false), 2500);
            })
            .catch(err => console.error('Failed to copy: ', err));
    };

    const handleBookmarkClick = () => {
        setIsBookmarked(!isBookmarked);
    };

    const handleTabClick = (tab) => setActiveTab(tab);

     const primaryRecommenderName = provider?.recommender_name; // Use directly from provider if available
     const alsoUsedBy = React.useMemo(() => {
        const recommenders = new Set();
        if (primaryRecommenderName) recommenders.add(primaryRecommenderName);
        reviews.forEach((r) => r.user_name && recommenders.add(r.user_name));
        return Array.from(recommenders).filter((n) => n !== primaryRecommenderName);
     }, [reviews, primaryRecommenderName]);


    if (loadingProvider || (!provider && !error)) { // Show loading if provider is loading OR if provider is null and no error yet
        return (
            <div id="provider-profile-page">
                <div className="profile-wrapper">
                    <div className="loading-state">Loading Profile...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div id="provider-profile-page">
                <div className="profile-wrapper">
                    <div className="error-message full-width-error">Error: {error}</div>
                </div>
            </div>
        );
    }
    
    if (!provider) { // Should be caught by error state if fetch failed, but as a fallback
         return (
            <div id="provider-profile-page">
                <div className="profile-wrapper">
                    <div className="no-providers-message">Provider not found or not accessible.</div>
                </div>
            </div>
        );
    }


    const recommendationDate = formatDate(provider.date_of_recommendation);

    return (
        <div id="provider-profile-page">
            <div className="profile-wrapper">
                <div className="profile-content">

                    <div className="core-info">
                        <h1>{provider.business_name}</h1>

                        <div className="rating-and-location">
                            <div className="rating-summary-inline">
                                <FaStar className="rating-star-icon" />
                                <span className="avg-rating-text">{avgRating}</span>
                                <span className="review-count-text">({totalReviews} reviews)</span>
                            </div>
                            {provider.service_scope === 'local' && provider.city && provider.state && (
                                <span className="location-info">
                                    <FaMapMarkerAlt className="info-icon" />
                                    {provider.city}, {provider.state}
                                </span>
                            )}
                            {provider.website && (
                                <a
                                    href={provider.website.startsWith('http') ? provider.website : `https://${provider.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="website-link-inline"
                                >
                                    <FaExternalLinkAlt className="info-icon" />
                                    {getWebsiteHostname(provider.website)}
                                </a>
                            )}
                             {provider.price_range && (
                                <span className="price-range-info">{provider.price_range}</span>
                             )}
                        </div>

                        <div className="contact-actions-bar">
                            {provider.phone_number && (
                                <a href={`tel:${provider.phone_number}`} className="action-button">
                                    <FaPhone /> Call
                                </a>
                            )}
                             {provider.phone_number && (
                                 <a href={`sms:${provider.phone_number}?body=Hi ${provider.business_name}, I saw a recommendation and wanted to connect.`} className="action-button">
                                    <FaSms /> Text
                                </a>
                            )}
                            {provider.email && (
                                 <a href={`mailto:${provider.email}?subject=Inquiry%20via%20Tried%20&%20Trusted`} className="action-button">
                                    <FaEnvelope /> Email
                                </a>
                            )}
                        </div>
                    </div>

                    {provider.provider_message && (
                        <div className="message-block provider-message-block">
                            <p>
                                <strong>Message from {provider.business_contact || provider.business_name || 'the provider'}:</strong> “{provider.provider_message}”
                            </p>
                        </div>
                    )}

                     {provider.description && (
                        <div className="description-block">
                            <p>{provider.description}</p>
                        </div>
                    )}

                    {provider.recommender_message && primaryRecommenderName && (
                        <div className="message-block recommender-quote-block">
                            <div className="recommender-header">
                                <strong>{primaryRecommenderName}'s Recommendation</strong>
                                {recommendationDate && <span className="recommendation-date">from {recommendationDate}</span>}
                            </div>
                            <p className="recommender-text">"{provider.recommender_message}"</p>
                             <div className="quote-actions">
                                 {provider.recommender_phone && (
                                    <>
                                        <a href={`sms:${provider.recommender_phone}?body=Hey ${primaryRecommenderName}, just wanted to say thank you for recommending ${provider.business_name || 'them'}! 🙏`}
                                           className="quote-action-icon"
                                           title="Thank Recommender"
                                        >
                                           <FaRegHandshake />
                                        </a>
                                         <a href={`sms:${provider.recommender_phone}?body=Hi ${primaryRecommenderName}! I saw your recommendation for ${provider.business_name || 'them'} on Tried & Trusted and had a quick question.`}
                                           className="quote-action-icon"
                                           title="Ask Recommender a Question"
                                        >
                                           <FaQuestionCircle />
                                        </a>
                                    </>
                                 )}
                                 <button
                                     className="quote-action-icon share-button"
                                     title="Share this recommendation"
                                     onClick={handleShareClick}
                                 >
                                     <FaShareAlt />
                                     {showLinkCopied && <span className="tooltip-copied">Copied!</span>}
                                 </button>
                                  <button
                                     className={`quote-action-icon bookmark-button ${isBookmarked ? 'bookmarked' : ''}`}
                                     title={isBookmarked ? "Remove Bookmark" : "Bookmark"}
                                     onClick={handleBookmarkClick}
                                 >
                                     {isBookmarked ? <FaBookmark /> : <FaRegBookmark />}
                                 </button>
                                 {provider.recommender_user_id && (
                                    <Link to={`/user/${provider.recommender_user_id}/recommendations`} className="recommender-profile-link-action">
                                        View Recommender's Profile
                                    </Link>
                                 )}
                             </div>
                        </div>
                    )}

                    {alsoUsedBy.length > 0 && (
                        <p className="also-used-by-text">
                            Also used by: {alsoUsedBy.slice(0, 3).join(', ')}
                            {alsoUsedBy.length > 3 && ` and ${alsoUsedBy.length - 3} others`}
                        </p>
                    )}

                    {Array.isArray(provider.tags) && provider.tags.length > 0 && (
                        <div className="tags-section">
                            <h3 className="tags-header">Highlights from Previous Users</h3>
                            <div className="tags-container">
                                {provider.tags.map((tag, i) => (
                                    <span key={i} className="tag">{tag}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="profile-tabs-container">
                        {['Reviews', 'Details'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => handleTabClick(tab)}
                                className={`profile-tab ${activeTab === tab ? 'active' : ''}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="profile-tab-content">
                        {activeTab === 'Reviews' && (
                            <div className="reviews-content">
                                 <div className="review-breakdown-section">
                                    <h3 className="tab-section-header">Rating Breakdown</h3>
                                    <div className="rating-bars">
                                        {[5, 4, 3, 2, 1].map((star) => {
                                            const count = starCounts[star - 1];
                                            const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                                            return (
                                                <div key={star} className="rating-bar-row">
                                                    <span className="rating-bar-label">{star}★</span>
                                                    <div className="rating-bar-track">
                                                        <div className="rating-bar-fill" style={{ width: `${percent}%` }}></div>
                                                    </div>
                                                    <span className="rating-bar-count">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <h3 className="tab-section-header">User Reviews ({reviews.length})</h3>
                                {loadingReviews ? <p>Loading reviews...</p> : reviews.length === 0 ? (
                                    <p className="no-reviews-text">No reviews yet for this provider.</p>
                                ) : (
                                    <div className="reviews-list">
                                        {reviews.map((review, i) => (
                                            <div key={review.id || i} className="review-item">
                                                <div className="review-item-header">
                                                    <div className="review-item-stars">
                                                        {[...Array(5)].map((_, j) => (
                                                            <FaStar key={j} className={j < review.rating ? 'active' : ''} />
                                                        ))}
                                                    </div>
                                                    <span className="review-item-user">{review.user_name || 'Anonymous'}</span>
                                                    {review.date && <span className="review-item-date">{formatDate(review.created_at || review.date)}</span>}
                                                </div>
                                                <p className="review-item-content">"{review.content}"</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'Details' && (
                             <div className="details-content">
                                 <h3 className="tab-section-header">Credentials & Information</h3>
                                 <div className="credentials-list">
                                    {(parseFloat(avgRating) || 0) >= 4.5 && totalReviews > 5 && (
                                        <span className="credential-badge top-rated">Top Rated</span>
                                    )}
                                    {provider.service_type && (
                                         <span className="credential-badge">{provider.service_type}</span>
                                    )}
                                 </div>
                                 <p className="details-coming-soon">More details coming soon.</p>
                             </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProviderProfile;

// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import {
//     FaStar,
//     FaPhone,
//     FaEnvelope,
//     FaMapMarkerAlt,
//     FaQuestionCircle,
//     FaShareAlt,
//     FaRegBookmark,
//     FaBookmark,
//     FaSms,
//     FaExternalLinkAlt,
//     FaRegHandshake
// } from 'react-icons/fa';

// import './ProviderProfile.css';

// const API_URL = 'https://api.seanag-recommendations.org:8080';
// // const API_URL = 'http://localhost:3000';

// const ProviderProfile = () => {
//     const { id } = useParams();
//     const [provider, setProvider] = useState(null);
//     const [reviews, setReviews] = useState([]);
//     const [activeTab, setActiveTab] = useState('Reviews');
//     const [showLinkCopied, setShowLinkCopied] = useState(false);
//     const [isBookmarked, setIsBookmarked] = useState(false);

//     useEffect(() => {
//         const fetchProvider = async () => {
//             if (!id) return;
//             try {
//                 const res = await fetch(`${API_URL}/api/providers/${id}`);
//                 if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
//                 const data = await res.json();
//                 // --- TODO: Ensure backend sends 'recommended_by_preferred_name' ---
//                 setProvider(data.provider);
//             } catch (error) {
//                 console.error("Failed to fetch provider:", error);
//                 setProvider(null);
//             }
//         };
//         fetchProvider();
//     }, [id]);

//     useEffect(() => {
//         const fetchReviews = async () => {
//              if (!id) return;
//              try {
//                 const res = await fetch(`${API_URL}/api/reviews/${id}`);
//                  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
//                 const data = await res.json();
//                 setReviews(Array.isArray(data) ? data : []);
//             } catch (error) {
//                  console.error("Failed to fetch reviews:", error);
//                  setReviews([]);
//             }
//         };
//         fetchReviews();
//     }, [id]);

//     const avgRating = provider ? parseFloat(provider.average_rating || 0).toFixed(1) : '0.0';
//     const totalReviews = provider ? parseInt(provider.total_reviews || 0) : 0;

//     const starCounts = React.useMemo(() => {
//         const counts = [0, 0, 0, 0, 0];
//         reviews.forEach((r) => {
//             const rating = parseInt(r.rating);
//             if (rating >= 1 && rating <= 5) {
//                 counts[rating - 1]++;
//             }
//         });
//         return counts;
//     }, [reviews]);

//     const formatDate = (dateString) => {
//         if (!dateString) return '';
//         try {
//             return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
//         } catch (e) { return ''; }
//     };

//     const getWebsiteHostname = (url) => {
//         if (!url) return '';
//         try {
//             const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
//             return parsedUrl.hostname.replace(/^www\./, '');
//         } catch (e) { return url; }
//     };

//     const handleShareClick = () => {
//         const shareUrl = `${window.location.origin}/provider/${provider?.id}`;
//         navigator.clipboard.writeText(shareUrl)
//             .then(() => {
//                 setShowLinkCopied(true);
//                 setTimeout(() => setShowLinkCopied(false), 2500);
//             })
//             .catch(err => console.error('Failed to copy: ', err));
//     };

//     const handleBookmarkClick = () => {
//         setIsBookmarked(!isBookmarked);
//         // TODO: Add backend persistence logic for bookmark
//         console.log("Bookmark toggled:", !isBookmarked);
//     };

//     const handleTabClick = (tab) => setActiveTab(tab);

//      const primaryRecommenderName = provider?.recommended_by_preferred_name || provider?.recommended_by_name;
//      const alsoUsedBy = React.useMemo(() => {
//         const recommenders = new Set();
//         if (primaryRecommenderName) recommenders.add(primaryRecommenderName);
//         reviews.forEach((r) => r.user_name && recommenders.add(r.user_name));
//         return Array.from(recommenders).filter((n) => n !== primaryRecommenderName);
//      }, [reviews, primaryRecommenderName]);


//     if (!provider) {
//         return <div className="profile-wrapper"><div className="loading-state">Loading...</div></div>;
//     }

//     const recommendationDate = formatDate(provider.date_of_recommendation);

//     return (
//         <div className="profile-wrapper">
//             <div className="profile-content">

//                 <div className="core-info">
//                     <h1>{provider.business_name}</h1>

//                     <div className="rating-and-location">
//                         <div className="rating-summary-inline">
//                             <FaStar className="rating-star-icon" />
//                             <span className="avg-rating-text">{avgRating}</span>
//                             <span className="review-count-text">({totalReviews} reviews)</span>
//                         </div>
//                         {provider.service_scope === 'local' && provider.city && provider.state && (
//                             <span className="location-info">
//                                 <FaMapMarkerAlt className="info-icon" />
//                                 {provider.city}, {provider.state}
//                             </span>
//                         )}
//                         {provider.website && (
//                             <a
//                                 href={provider.website.startsWith('http') ? provider.website : `https://${provider.website}`}
//                                 target="_blank"
//                                 rel="noopener noreferrer"
//                                 className="website-link-inline"
//                             >
//                                 <FaExternalLinkAlt className="info-icon" />
//                                 {getWebsiteHostname(provider.website)}
//                             </a>
//                         )}
//                          {provider.price_range && (
//                             <span className="price-range-info">{provider.price_range}</span>
//                          )}
//                     </div>

//                     <div className="contact-actions-bar">
//                         {provider.phone_number && (
//                             <a href={`tel:${provider.phone_number}`} className="action-button">
//                                 <FaPhone /> Call
//                             </a>
//                         )}
//                          {provider.phone_number && (
//                              <a href={`sms:${provider.phone_number}?body=Hi ${provider.business_name}, I saw a recommendation and wanted to connect.`} className="action-button">
//                                 <FaSms /> Text
//                             </a>
//                         )}
//                         {provider.email && (
//                              <a href={`mailto:${provider.email}?subject=Inquiry%20via%20Tried%20&%20Trusted`} className="action-button">
//                                 <FaEnvelope /> Email
//                             </a>
//                         )}
//                     </div>
//                 </div>

//                 {provider.provider_message && (
//                     <div className="message-block provider-message-block">
//                         <p>
//                             <strong>Message from {provider.business_contact || 'the provider'}:</strong> “{provider.provider_message}”
//                         </p>
//                     </div>
//                 )}

//                  {provider.description && (
//                     <div className="description-block">
//                         <p>{provider.description}</p>
//                     </div>
//                 )}

//                 {provider.recommender_message && primaryRecommenderName && (
//                     <div className="message-block recommender-quote-block">
//                         <div className="recommender-header">
//                             <strong>{primaryRecommenderName}'s Recommendation</strong>
//                             {recommendationDate && <span className="recommendation-date">from {recommendationDate}</span>}
//                         </div>
//                         <p className="recommender-text">"{provider.recommender_message}"</p>
//                          <div className="quote-actions">
//                              {provider.recommended_by_phone && (
//                                 <>
//                                     <a href={`sms:${provider.recommended_by_phone}?body=Hey ${primaryRecommenderName}, just wanted to say thank you for recommending ${provider.business_name || 'them'}! 🙏`}
//                                        className="quote-action-icon"
//                                        title="Thank Recommender"
//                                     >
//                                        <FaRegHandshake />
//                                     </a>
//                                      <a href={`sms:${provider.recommended_by_phone}?body=Hi ${primaryRecommenderName}! I saw your recommendation for ${provider.business_name || 'them'} on Tried & Trusted and had a quick question.`}
//                                        className="quote-action-icon"
//                                        title="Ask Recommender a Question"
//                                     >
//                                        <FaQuestionCircle />
//                                     </a>
//                                 </>
//                              )}
//                              <button
//                                  className="quote-action-icon share-button"
//                                  title="Share this recommendation"
//                                  onClick={handleShareClick}
//                              >
//                                  <FaShareAlt />
//                                  {showLinkCopied && <span className="tooltip-copied">Copied!</span>}
//                              </button>
//                               <button
//                                  className={`quote-action-icon bookmark-button ${isBookmarked ? 'bookmarked' : ''}`}
//                                  title={isBookmarked ? "Remove Bookmark" : "Bookmark"}
//                                  onClick={handleBookmarkClick}
//                              >
//                                  {isBookmarked ? <FaBookmark /> : <FaRegBookmark />}
//                              </button>
//                              {provider.recommended_by && (
//                                 <a href={`/user/${provider.recommended_by}/recommendations`} className="recommender-profile-link-action">
//                                     View Profile
//                                 </a>
//                              )}
//                          </div>
//                     </div>
//                 )}

//                 {alsoUsedBy.length > 0 && (
//                     <p className="also-used-by-text">
//                         Also used by: {alsoUsedBy.slice(0, 3).join(', ')}
//                         {alsoUsedBy.length > 3 && ` and ${alsoUsedBy.length - 3} others`}
//                     </p>
//                 )}

//                 {Array.isArray(provider.tags) && provider.tags.length > 0 && (
//                     <div className="tags-section">
//                         {/* Added header as requested */}
//                         <h3 className="tags-header">Highlights from Previous Users</h3>
//                         <div className="tags-container">
//                             {provider.tags.map((tag, i) => (
//                                 <span key={i} className="tag">{tag}</span>
//                             ))}
//                         </div>
//                     </div>
//                 )}

//                 <div className="profile-tabs-container">
//                     {['Reviews', 'Details'].map(tab => (
//                         <button
//                             key={tab}
//                             onClick={() => handleTabClick(tab)}
//                             className={`profile-tab ${activeTab === tab ? 'active' : ''}`}
//                         >
//                             {tab}
//                         </button>
//                     ))}
//                 </div>

//                 <div className="profile-tab-content">
//                     {activeTab === 'Reviews' && (
//                         <div className="reviews-content">
//                              <div className="review-breakdown-section">
//                                 <h3 className="tab-section-header">Rating Breakdown</h3>
//                                 <div className="rating-bars">
//                                     {[5, 4, 3, 2, 1].map((star) => {
//                                         const count = starCounts[star - 1];
//                                         const percent = totalReviews ? (count / totalReviews) * 100 : 0;
//                                         return (
//                                             <div key={star} className="rating-bar-row">
//                                                 <span className="rating-bar-label">{star}★</span>
//                                                 <div className="rating-bar-track">
//                                                     <div className="rating-bar-fill" style={{ width: `${percent}%` }}></div>
//                                                 </div>
//                                                 <span className="rating-bar-count">{count}</span>
//                                             </div>
//                                         );
//                                     })}
//                                 </div>
//                             </div>

//                             <h3 className="tab-section-header">User Reviews</h3>
//                             {reviews.length === 0 ? (
//                                 <p className="no-reviews-text">No reviews yet.</p>
//                             ) : (
//                                 <div className="reviews-list">
//                                     {reviews.map((review, i) => (
//                                         <div key={review.id || i} className="review-item">
//                                             <div className="review-item-header">
//                                                 <div className="review-item-stars">
//                                                     {[...Array(5)].map((_, j) => (
//                                                         <FaStar key={j} className={j < review.rating ? 'active' : ''} />
//                                                     ))}
//                                                 </div>
//                                                 <span className="review-item-user">{review.user_name || 'Anonymous'}</span>
//                                                 {review.date && <span className="review-item-date">{formatDate(review.date)}</span>}
//                                             </div>
//                                             <p className="review-item-content">"{review.content}"</p>
//                                         </div>
//                                     ))}
//                                 </div>
//                             )}
//                         </div>
//                     )}

//                     {activeTab === 'Details' && (
//                          <div className="details-content">
//                              <h3 className="tab-section-header">Credentials & Information</h3>
//                              <div className="credentials-list">
//                                 {avgRating >= 4.5 && totalReviews > 5 && (
//                                     <span className="credential-badge top-rated">Top Rated</span>
//                                 )}
//                                 {provider.service_type && (
//                                      <span className="credential-badge">{provider.service_type}</span>
//                                 )}
//                              </div>
//                              <p className="details-coming-soon">More details coming soon.</p>
//                          </div>
//                     )}
//                 </div>

//             </div>
//         </div>
//     );
// };

// export default ProviderProfile;

//  import React, { useEffect, useState } from 'react';
// import { useParams, useLocation } from 'react-router-dom';
// import { FaStar, FaPhone, FaEnvelope, FaRegThumbsUp, FaRegComment} from 'react-icons/fa';
// import { FiSend } from 'react-icons/fi';

// import './ProviderProfile.css';

// const API_URL = 'https://api.seanag-recommendations.org:8080';
// // const API_URL = 'http://localhost:3000';

// const ProviderProfile = () => {
//     const { id } = useParams();
//     const location = useLocation();
//     const [provider, setProvider] = useState(null);
//     const [reviews, setReviews] = useState([]);
//     const [showContactChoice, setShowContactChoice] = useState(false);
//     const [activeTab, setActiveTab] = useState('Reviews');
//     const [dropdownOpen, setDropdownOpen] = useState(false);
//     const [showLinkCopied, setShowLinkCopied] = useState(false);
  
//     useEffect(() => {
//       const fetchProvider = async () => {
//         const res = await fetch(`${API_URL}/api/providers/${id}`);
//         const data = await res.json();
//         setProvider(data.provider);
//       };
//       fetchProvider();
//     }, [id]);
  
//     useEffect(() => {
//       const fetchReviews = async () => {
//         const res = await fetch(`${API_URL}/api/reviews/${id}`);
//         const data = await res.json();
//         setReviews(data);
//       };
//       fetchReviews();
//     }, [id]);
  
//     if (!provider) return <div className="profile-wrapper">Loading provider...</div>;
  
//     const recommenders = new Set();
//     if (provider.recommended_by_name) recommenders.add(provider.recommended_by_name);
//     reviews.forEach((r) => r.user_name && recommenders.add(r.user_name));
//     const alsoUsedBy = Array.from(recommenders).filter((n) => n !== provider.recommended_by_name);
  
//     const avgRating = parseFloat(provider.average_rating || 0).toFixed(1);
//     const totalReviews = parseInt(provider.total_reviews || 0);
  
//     const starCounts = [0, 0, 0, 0, 0];
//     reviews.forEach((r) => {
//       if (r.rating >= 1 && r.rating <= 5) starCounts[r.rating - 1]++;
//     });
  
//     const requestConsultation = () => {
//       if (provider.phone_number && provider.email) {
//         setShowContactChoice(true);
//       } else if (provider.phone_number) {
//         window.location.href = `sms:${provider.phone_number}?body=Hi ${provider.business_name}, someone recommended you, and I’d like to request a consultation.`;
//       } else if (provider.email) {
//         window.location.href = `mailto:${provider.email}?subject=Request%20for%20Consultation&body=Hi%20${provider.business_name},%20I%E2%80%99d%20like%20to%20request%20a%20consultation%20via%20Tried%20%26%20Trusted.`;
//       } else {
//         alert("No contact info available.");
//       }
//     };
  
//     const handleTabClick = (tab) => {
//         if (tab !== 'Reviews' && tab !== 'Credentials') {
//           alert("We're working to release this feature quickly!");
//         }
//         setActiveTab(tab);
//       };
  
//     return (
//       <div className="profile-wrapper">
//         <div className="profile-card">
//           <div className="profile-header">
//             <h1>{provider.business_name}</h1>
//             {/* <div className="modal-icons">
//               {provider.phone_number && <a href={`tel:${provider.phone_number}`}><FaPhone /></a>}
//               {provider.email && <a href={`mailto:${provider.email}`}><FaEnvelope /></a>}
//             </div> */}
//           </div>
  
//           {/* Meta Badges */}
//           <div className="meta-badges">
//             {provider.service_scope === 'local' && provider.city && provider.state && (
//               <span className="meta-badge">
//                 {provider.city}, {provider.state} ({provider.zip_code})
//                 </span>
//             )}
//             {provider.website && (
//               <a
//                 href={provider.website}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="meta-badge website-badge"
//               >
//                 Website
//               </a>
//             )}
//             {provider.price_range && (
//               <span className="meta-badge">{provider.price_range}</span>
//             )}
//           </div>
  
//           {/* Description + Recommenders */}
//           <p className="description-text"><strong>Description:</strong> {provider.description || 'N/A'}</p>
//           {/* <p><strong>Recommended by:</strong> {provider.recommended_by_name || 'N/A'}{' '}
//             {provider.date_of_recommendation && `(${new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
//               year: '2-digit',
//               month: 'numeric',
//               day: 'numeric'
//             })})`}
//           </p> */}
          
//           {provider.provider_message && (
//             <p>
//                 <strong>Message from {provider.business_contact || 'the provider'}:</strong> “{provider.provider_message}”
//             </p>
//             )}

//             {provider.recommender_message && (
//             <div className="recommender-quote">
//                 <div className="recommender-message-header">Recommender’s Message:</div>
//                 <div className="recommender-quote-top">
//                 <p>{provider.recommender_message}</p>
//                 </div>
//                 <div className="recommender-signoff-row">
//                     <div className="quote-actions-inline">
//                         {provider.recommended_by_phone && (
//                         <>
//                             <span
//                             className="quote-icon"
//                             title="Thank the recommender"
//                             onClick={() =>
//                                 window.location.href = `sms:${provider.recommended_by_phone}?body=Hey, just wanted to say thank you for recommending ${provider.business_contact}! 🙏`
//                             }
//                             >
//                             <FaRegThumbsUp />
//                             </span>

//                             <span
//                             className="quote-icon"
//                             title="Ask a question"
//                             onClick={() =>
//                                 window.location.href = `sms:${provider.recommended_by_phone}?body=Hi! I saw your recommendation for ${provider.business_contact} on Tried & Trusted and had a quick question — do you mind if I ask?`
//                             }
//                             >
//                             <FaRegComment />
//                             </span>
//                         </>
//                         )}
//                         <span
//                         className="quote-icon share-icon-wrapper"
//                         title="Share this recommendation"
//                         onClick={() => {
//                             navigator.clipboard.writeText(`https://triedandtrusted.ai/provider/${provider.id}`);
//                             setShowLinkCopied(true);
//                             setTimeout(() => setShowLinkCopied(false), 2000);
//                         }}
//                         >
//                         <FiSend className="share-icon" />
//                         {showLinkCopied && <span className="copied-tooltip">Copied!</span>}
//                         </span>
//                     </div>
//                     <div className="recommender-name">
//                     <strong>
//                     <a
//                         href={`/user/${provider.recommended_by}/recommendations`}
//                         className="recommender-link"
//                     >
//                         {provider.recommended_by_name}
//                     </a>
//                     </strong>
//                         {provider.date_of_recommendation && (
//                         <> ({new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
//                             year: '2-digit',
//                             month: 'numeric',
//                             day: 'numeric'
//                         })})</>
//                         )}
//                     </div>
//                     </div>
//             </div>
//             )}

//             {alsoUsedBy.length > 0 && (
//             <p>
//                 <strong>Also used by:</strong>{' '}
//                 {alsoUsedBy.slice(0, 2).join(', ')}
//                 {alsoUsedBy.length > 2 && ` and ${alsoUsedBy.length - 2} others`}
//             </p>
//             )}
  
//             <div className="contact-choice">
//             {provider.phone_number && (
//                 <button
//                 className="consultation-button"
//                 onClick={() => window.location.href = `tel:${provider.phone_number}`}
//                 >
//                 Call {provider.business_contact}
//                 </button>
//             )}
//             {provider.phone_number && (
//                 <button
//                 className="consultation-button"
//                 onClick={() => window.location.href = `sms:${provider.phone_number}?body=Hi ${provider.business_name}, someone recommended you, and I’d like to request a consultation.`}
//                 >
//                 Text {provider.business_contact}
//                 </button>
//             )}
//             {provider.email && (
//                 <button
//                 className="consultation-button"
//                 onClick={() =>
//                     window.location.href = `mailto:${provider.email}?subject=Request%20for%20Consultation&body=Hi%20${provider.business_name},%20I%E2%80%99d%20like%20to%20request%20a%20consultation%20via%20Tried%20%26%20Trusted.`
//                 }
//                 >
//                 Email {provider.business_contact}
//                 </button>
//             )}
//             </div>
  
//           {Array.isArray(provider.tags) && provider.tags.length > 0 && (
//             <>
//               <h3 className="highlights-header">Highlights from Users</h3>
//               <div className="tag-container">
//                 {provider.tags.map((tag, i) => (
//                   <span key={i} className="tag-badge">{tag}</span>
//                 ))}
//               </div>
//             </>
//           )}
  
//           {/* Tabs */}
//           <div className="profile-tabs">
//             {['Learn More', 'Reviews', 'Photos', 'Credentials'].map(tab => (
//               <button
//                 key={tab}
//                 onClick={() => handleTabClick(tab)}
//                 className={activeTab === tab ? 'tab active-tab' : 'tab'}
//               >
//                 {tab}
//               </button>
//             ))}
//           </div>
  
//           {/* Tab Content */}
//           {activeTab === 'Reviews' && (
//             <>
//               <div className="review-breakdown">
//                 <h3>Rating Summary</h3>
//                 <div className="breakdown-summary">
//                   <span className="avg-rating">{avgRating}</span>
//                   <div className="star-bar">
//                     {[...Array(5)].map((_, i) => (
//                       <FaStar key={i} className={i < Math.round(avgRating) ? 'filled' : 'empty'} />
//                     ))}
//                     <span className="review-count">({totalReviews} reviews)</span>
//                   </div>
//                 </div>
  
//                 <div className="bar-chart">
//                   {[5, 4, 3, 2, 1].map((star, idx) => {
//                     const count = starCounts[star - 1];
//                     const percent = totalReviews ? (count / totalReviews) * 100 : 0;
//                     return (
//                       <div key={star} className="bar-row">
//                         <span>{star} star</span>
//                         <div className="bar-track">
//                           <div className="bar-fill" style={{ width: `${percent}%` }}></div>
//                         </div>
//                         <span className="bar-count">{count}</span>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
  
//               <h2>Reviews</h2>
//               {reviews.length === 0 ? (
//                 <p>No reviews yet.</p>
//               ) : (
//                 reviews.map((review, i) => (
//                   <div key={i} className="profile-review">
//                     <div className="review-stars">
//                       {[...Array(5)].map((_, j) => (
//                         <FaStar key={j} className={j < review.rating ? 'star active' : 'star'} />
//                       ))}
//                     </div>
//                     <p>"{review.content}"</p>
//                     <p className="review-user">– {review.user_name || 'Anonymous'}</p>
//                   </div>
//                 ))
//               )}
//             </>
//           )}
  
//             {activeTab === 'Credentials' && (
//             <div className="credentials-section">
//                 <h3 className="credentials-header">Verified Credentials</h3>
//                 <div className="badge-wrapper credentials-badges">
//                 {avgRating >= 4.5 && <span className="top-rated-badge">Top Rated</span>}
//                 <span className="profile-badge">{provider.service_type || 'Appliance Services'}</span>
//                 </div>
//                 <p className="credentials-note">More details coming soon.</p>
//             </div>
//             )}
//         </div>
//       </div>
//     );
//   };
  
//   export default ProviderProfile;


// working 4/16 => 2pm
// import React, { useEffect, useState } from 'react';
// import { useParams, useLocation } from 'react-router-dom';
// import { FaStar, FaPhone, FaEnvelope } from 'react-icons/fa';
// import './ProviderProfile.css';

// const API_URL = 'http://localhost:3000';

// const ProviderProfile = () => {
//   const { id } = useParams();
//   const location = useLocation();

//   const [provider, setProvider] = useState(() => {
//     if (location.state?.provider) return location.state.provider;
//     const stored = localStorage.getItem('selectedProvider');
//     return stored ? JSON.parse(stored) : null;
//   });

//   const [reviews, setReviews] = useState([]);
//   const [showContactChoice, setShowContactChoice] = useState(false);

//   useEffect(() => {
//     const fetchReviews = async () => {
//       const res = await fetch(`${API_URL}/api/reviews/${id}`);
//       const data = await res.json();
//       setReviews(data);
//     };
//     fetchReviews();
//   }, [id]);

//   if (!provider) return <div className="profile-wrapper">Loading provider...</div>;

//   const recommenders = new Set();
//   if (provider.recommended_by_name) recommenders.add(provider.recommended_by_name);
//   reviews.forEach((r) => r.user_name && recommenders.add(r.user_name));
//   const alsoUsedBy = Array.from(recommenders).filter((n) => n !== provider.recommended_by_name);

//   const avgRating = parseFloat(provider.average_rating || 0).toFixed(1);
//   const totalReviews = parseInt(provider.total_reviews || 0);

//   const starCounts = [0, 0, 0, 0, 0];
//   reviews.forEach((r) => {
//     if (r.rating >= 1 && r.rating <= 5) starCounts[r.rating - 1]++;
//   });

//   const requestConsultation = () => {
//     if (provider.phone_number && provider.email) {
//       setShowContactChoice(true);
//     } else if (provider.phone_number) {
//       window.location.href = `sms:${provider.phone_number}?body=Hi ${provider.business_name}, someone recommended you, and I’d like to request a consultation.`;
//     } else if (provider.email) {
//       window.location.href = `mailto:${provider.email}?subject=Request%20for%20Consultation&body=Hi%20${provider.business_name},%20I%E2%80%99d%20like%20to%20request%20a%20consultation%20via%20Tried%20%26%20Trusted.`;
//     } else {
//       alert("No contact info available.");
//     }
//   };

//   return (
//     <div className="profile-wrapper">
//       <div className="profile-card">
//         <div className="profile-header">
//           <h1>{provider.business_name}</h1>
//           <div className="badge-wrapper">
//             {avgRating >= 4.5 && <span className="top-rated-badge">Top Rated</span>}
//             <span className="profile-badge">{provider.service_type || 'Appliance Services'}</span>
//           </div>
//           <div className="modal-icons">
//             {provider.phone_number && (
//               <a href={`tel:${provider.phone_number}`} title="Call"><FaPhone /></a>
//             )}
//             {provider.email && (
//               <a href={`mailto:${provider.email}`} title="Email"><FaEnvelope /></a>
//             )}
//           </div>
//         </div>

//         <p className="description-text">{provider.description || 'N/A'}</p>

//         <p>
//           <strong>Recommended by:</strong> {provider.recommended_by_name || 'N/A'}{' '}
//           {provider.date_of_recommendation &&
//             `(${new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
//               year: '2-digit',
//               month: 'numeric',
//               day: 'numeric',
//             })})`}
//         </p>

//         {alsoUsedBy.length > 0 && (
//           <p><strong>Also used by:</strong> {alsoUsedBy.join(', ')}</p>
//         )}

//         <button className="consultation-button" onClick={requestConsultation}>
//           Request a Consultation
//         </button>

//         {showContactChoice && (
//           <div className="contact-choice">
//             <button onClick={() => window.location.href = `tel:${provider.phone_number}`}>Call</button>
//             <button onClick={() => window.location.href = `mailto:${provider.email}`}>Email</button>
//           </div>
//         )}

//         {Array.isArray(provider.tags) && provider.tags.length > 0 && (
//           <>
//             <h3 className="highlights-header">Highlights from the Business</h3>
//             <div className="tag-container">
//               {provider.tags.map((tag, i) => (
//                 <span key={i} className="tag-badge">{tag}</span>
//               ))}
//             </div>
//           </>
//         )}

//         <div className="review-breakdown">
//           <h3>Rating Summary</h3>
//           <div className="breakdown-summary">
//             <span className="avg-rating">{avgRating}</span>
//             <div className="star-bar">
//               {[...Array(5)].map((_, i) => (
//                 <FaStar key={i} className={i < Math.round(avgRating) ? 'filled' : 'empty'} />
//               ))}
//               <span className="review-count">({totalReviews} reviews)</span>
//             </div>
//           </div>

//           <div className="bar-chart">
//             {[5, 4, 3, 2, 1].map((star, idx) => {
//               const count = starCounts[star - 1];
//               const percent = totalReviews ? (count / totalReviews) * 100 : 0;
//               return (
//                 <div key={star} className="bar-row">
//                   <span>{star} star</span>
//                   <div className="bar-track">
//                     <div className="bar-fill" style={{ width: `${percent}%` }}></div>
//                   </div>
//                   <span className="bar-count">{count}</span>
//                 </div>
//               );
//             })}
//           </div>
//         </div>

//         <h2>Reviews</h2>
//         {reviews.length === 0 ? (
//           <p>No reviews yet.</p>
//         ) : (
//           reviews.map((review, i) => (
//             <div key={i} className="profile-review">
//               <div className="review-stars">
//                 {[...Array(5)].map((_, j) => (
//                   <FaStar key={j} className={j < review.rating ? 'star active' : 'star'} />
//                 ))}
//               </div>
//               <p>"{review.content}"</p>
//               <p className="review-user">– {review.user_name || 'Anonymous'}</p>
//             </div>
//           ))
//         )}
//       </div>
//     </div>
//   );
// };

// export default ProviderProfile;
