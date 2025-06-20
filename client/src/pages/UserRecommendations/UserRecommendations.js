import { useUser } from "@clerk/clerk-react";
import React, { useEffect, useState } from 'react';
import { FaPlusCircle, FaStar, FaUsers } from 'react-icons/fa';
import { Link, useNavigate, useParams } from 'react-router-dom';
import QuoteModal from '../../components/QuoteModal/QuoteModal';
import './UserRecommendations.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = 'http://localhost:5000';

const StarRating = ({ rating }) => {
  const numRating = parseFloat(rating) || 0;
  const fullStars = Math.floor(numRating);
  const hasHalf = numRating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="star-rating">
      {[...Array(fullStars)].map((_, i) => <FaStar key={`full-${i}`} className="filled" />)}
      {hasHalf && <FaStar key="half-star" className="half" />}
      {[...Array(emptyStars)].map((_, i) => <FaStar key={`empty-${i}`} className="empty" />)}
    </div>
  );
};

const ReviewModal = ({ isOpen, onClose, onSubmit, provider }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
        setRating(0);
        setHover(0);
        setReview('');
        setTags([]);
        setTagInput('');
        setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rating) {
      setError('Please select a rating');
      return;
    }
    onSubmit({ rating, review, tags });
    onClose();
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
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
    setTagInput('');
  };

  // Handle blur event to process comma-separated tags when user leaves input
  const handleTagInputBlur = () => {
    if (tagInput.includes(',')) {
      processTagInput();
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  if (!isOpen || !provider) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Review {provider.business_name}</h2>
        <form onSubmit={handleSubmit}>
          <div className="rating-container">
            <label>Rate your experience: <span className="required">*</span></label>
            <div className="stars">
              {[...Array(5)].map((_, index) => (
                <FaStar
                  key={index}
                  className={index < (hover || rating) ? 'star active' : 'star'}
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
            <label>Add tags (press Enter or , to add):</label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={handleTagInputBlur}
              placeholder="e.g. fast, professional"
            />
            <div className="tag-container modal-tag-container">
              {tags.map((tag, idx) => (
                <span key={idx} className="tag-badge">
                  {tag}
                  <span className="remove-tag" onClick={() => removeTag(tag)}>×</span>
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


const UserRecommendations = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { id: userIdPage } = useParams();
  const [recommendations, setRecommendations] = useState([]);
  const [userProfile, setUserProfile] = useState({ name: 'User', phone_number: null, email: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewMap, setReviewMap] = useState({});
  const [sortOption, setSortOption] = useState('recommended');

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [currentLoggedInUserId, setCurrentLoggedInUserId] = useState(null);
  const [dropdownOpenForId, setDropdownOpenForId] = useState(null);
  const [showLinkCopied, setShowLinkCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      navigate('/');
      return;
    }

    setCurrentLoggedInUserId(user.id);
  }, [isLoaded, isSignedIn, user, navigate]);

  const fetchPageData = async () => {
    if (!isSignedIn || !userIdPage) {
      setError("Authentication or user ID missing");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/users/${userIdPage}/recommendations`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Failed to fetch user data" }));
        throw new Error(errData.message || `HTTP error ${res.status}`);
      }
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch user recommendations successfully");
      }
      
      setUserProfile({
        name: data.userName || 'User',
        phone_number: data.userPhone || null,
        email: data.userEmail || null
      });
      let fetchedRecs = data.recommendations || [];

      const statsMap = {};
      const allReviewsMap = {};

      if (fetchedRecs.length > 0) {
          await Promise.all(
            fetchedRecs.map(async (provider, index) => {
              provider.originalIndex = index;
              try {
                const statsRes = await fetch(`${API_URL}/api/reviews/stats/${provider.id}`);
                if(statsRes.ok) {
                  const statsData = await statsRes.json();
                  statsMap[provider.id] = {
                    average_rating: parseFloat(statsData.average_rating) || 0,
                    total_reviews: parseInt(statsData.total_reviews, 10) || 0,
                  };
                } else {
                   statsMap[provider.id] = { average_rating: provider.average_rating || 0, total_reviews: provider.total_reviews || 0 };
                }
              } catch (err) {
                statsMap[provider.id] = { average_rating: provider.average_rating || 0, total_reviews: provider.total_reviews || 0 };
              }
              try {
                const reviewsRes = await fetch(`${API_URL}/api/reviews/${provider.id}`);
                if(reviewsRes.ok) {
                  allReviewsMap[provider.id] = await reviewsRes.json();
                } else {
                  allReviewsMap[provider.id] = [];
                }
              } catch (err) {
                allReviewsMap[provider.id] = [];
              }
            })
          );
      }
      
      const enrichedRecs = fetchedRecs.map(p => ({
        ...p,
        average_rating: statsMap[p.id]?.average_rating ?? p.average_rating ?? 0,
        total_reviews:  statsMap[p.id]?.total_reviews ?? p.total_reviews ?? 0,
      }));

      const getBand = rating => {
        if (rating >= 4) return 0;
        if (rating >= 3) return 1;
        if (rating >= 2) return 2;
        if (rating >= 1) return 3;
        return 4;
      };
      
      let sortedProviders;
      if (sortOption === 'topRated') {
        sortedProviders = [...enrichedRecs]
          .filter(p => p.average_rating >= 4.5)
          .sort((a, b) => {
            if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating;
            return (b.total_reviews || 0) - (a.total_reviews || 0);
          });
      } else { 
        sortedProviders = [...enrichedRecs].sort((a, b) => {
          const bandA = getBand(a.average_rating);
          const bandB = getBand(b.average_rating);
          if (bandA !== bandB) return bandA - bandB;
      
          const scoreA = (a.average_rating || 0) * (a.total_reviews || 0);
          const scoreB = (b.average_rating || 0) * (b.total_reviews || 0);
          if (scoreB !== scoreA) return scoreB - scoreA;
      
          if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating;
          if ((b.total_reviews || 0) !== (a.total_reviews || 0)) return (b.total_reviews || 0) - (a.total_reviews || 0);
          
          const dateA = a.date_of_recommendation ? new Date(a.date_of_recommendation).getTime() : 0;
          const dateB = b.date_of_recommendation ? new Date(b.date_of_recommendation).getTime() : 0;
          if (dateB !== dateA) return dateB - dateA;

          return (a.originalIndex || 0) - (b.originalIndex || 0);
        });
      }
      setRecommendations(sortedProviders);
      setReviewMap(allReviewsMap);

    } catch (errorCatch) {
      setError(errorCatch.message || 'Error fetching recommendations');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, [userIdPage, sortOption]);

  const handleReviewSubmit = async (reviewData) => {
    const userEmail = localStorage.getItem('userEmail');
    if (!selectedProvider || !userEmail || !currentLoggedInUserId) {
        alert("Cannot submit review: Missing user or provider details.");
        return;
    }

    try {
      const response = await fetch(`${API_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: selectedProvider.id,
          provider_email: selectedProvider.email || '',
          email: userEmail,
          rating: reviewData.rating,
          content: reviewData.review,
          tags: reviewData.tags,
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Failed to submit review");
      }
      fetchPageData();
    } catch (errSubmit) {
      alert(`Error submitting review: ${errSubmit.message}`);
    }
  };

  if (loading) return <div className="user-recommendations-container loading-spinner">Loading recommendations...</div>;
  if (error) return <div className="user-recommendations-container error-message full-width-error">{error}</div>;

  return (
    <div className="user-recommendations-container">
      <h1 className="section-heading">Recommendations by {userProfile.name}</h1>
      
      <div className="sort-bar">
        Sort by:
        <select
          className="sort-dropdown"
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
        >
          <option value="recommended">Recommended</option>
          <option value="topRated">Top Rated</option>
        </select>
      </div>

      {recommendations.length === 0 ? (
        <div className="no-providers-message">
            <FaUsers className="no-providers-icon" />
            <h2>No Recommendations Yet</h2>
            <p>{userProfile.name} hasn't made any recommendations yet.</p>
            {currentLoggedInUserId === userIdPage && (
                 <div className="no-providers-actions">
                    <button onClick={() => navigate('/add-recommendation')} className="primary-button">
                        <FaPlusCircle style={{marginRight: '8px'}}/> Add Your First Recommendation
                    </button>
                </div>
            )}
        </div>
      ) : (
        <ul className="provider-list">
          {recommendations.map((provider) => {
            const currentProviderStats = { 
                average_rating: provider.average_rating || 0, 
                total_reviews: provider.total_reviews || 0 
            };
            const currentReviews = reviewMap[provider.id] || [];
            const displayAvgRating = (parseFloat(currentProviderStats.average_rating) || 0).toFixed(1);
            
            return (
            <li key={provider.id} className="provider-card">
              <div className="card-header">
                <h2 className="card-title">
                    <Link
                        to={`/provider/${provider.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="provider-name-link"
                        onClick={() => localStorage.setItem('selectedProvider', JSON.stringify(provider))}
                    >
                        {provider.business_name}
                    </Link>
                </h2>
                <div className="badge-wrapper-with-menu">
                  <div className="badge-group">
                    {(parseFloat(currentProviderStats.average_rating) || 0) >= 4.5 && (
                      <span className="top-rated-badge">Top Rated</span>
                    )}
                  </div>
                  <div className="dropdown-wrapper">
                    <button
                      className="three-dots-button"
                      onClick={() =>
                        setDropdownOpenForId(dropdownOpenForId === provider.id ? null : provider.id)
                      }
                      title="Options"
                    >
                      ⋮
                    </button>
                    {dropdownOpenForId === provider.id && (
                      <div className="dropdown-menu">
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/provider/${provider.id}`);
                            setDropdownOpenForId(null);
                            setShowLinkCopied(true);
                            setTimeout(() => setShowLinkCopied(false), 2000);
                          }}
                        >
                          Share Provider
                        </button>
                      </div>
                    )}
                    {showLinkCopied && <div className="toast">Link copied!</div>}
                  </div>
                </div>
              </div>

              <div className="review-summary">
                <StarRating rating={parseFloat(currentProviderStats.average_rating) || 0} />
                <span className="review-score">
                  {displayAvgRating} ({currentProviderStats.total_reviews || 0})
                </span>
                <button className="see-all-button" onClick={() => {
                  setSelectedProvider(provider);
                  setIsReviewModalOpen(true);
                }}>
                  Write a Review
                </button>
              </div>

              <p className="card-description">{provider.recommender_message || 'No description available'}</p>
              {/* <p className="card-service-type">Service: {provider.service_type} ({provider.category_name || 'N/A'})</p> */}

              {Array.isArray(provider.tags) && provider.tags.length > 0 && (
                <div className="tag-container">
                  {provider.tags.map((tag, idx) => (
                    <span key={`${idx}-${provider.id}`} className="tag-badge">{tag}</span>
                  ))}
                  <button
                    className="add-tag-button"
                    onClick={() => {
                      setSelectedProvider(provider);
                      setIsReviewModalOpen(true);
                    }}
                  >
                    +
                  </button>
                </div>
              )}
              
              <div className="recommended-row">
                <span className="recommended-label">{userProfile.name} recommended on:</span>
                <span className="recommendation-date">
                    {provider.date_of_recommendation 
                        ? new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric'
                          })
                        : 'Date not available'}
                </span>
              </div>

              {currentReviews.length > 0 &&
                [...new Set(currentReviews.map(r => r.user_name).filter(name => name && name !== userProfile.name))].length > 0 && (
                <div className="recommended-row">
                  <span className="recommended-label">Also reviewed by:</span>
                  <span className="used-by-names">
                    {[...new Set(
                      currentReviews
                        .map((r) => r.user_name)
                        .filter(name => name && name !== userProfile.name) 
                    )].join(', ')}
                  </span>
                </div>
              )}

              <div className="action-buttons">
                <button
                    className="primary-button"
                    onClick={() => {
                        setSelectedProvider(provider);
                        setIsQuoteModalOpen(true);
                    }}
                >
                    Request a Quote
                </button>
                <button
                    className="secondary-button"
                    onClick={() => {
                        if (userProfile.phone_number) {
                            window.location.href = `sms:${userProfile.phone_number}?body=Regarding your recommendation for ${provider.business_name} on Tried & Trusted...`;
                        } else if (userProfile.email) {
                            window.location.href = `mailto:${userProfile.email}?subject=Regarding your recommendation for ${provider.business_name} on Tried & Trusted`;
                        } else {
                            alert(`Contact information for ${userProfile.name} is not available.`);
                        }
                    }}
                    disabled={!userProfile.phone_number && !userProfile.email}
                >
                    Connect with {userProfile.name.split(" ")[0]}
                </button>
              </div>
            </li>
          );
        })}
        </ul>
      )}
      {isReviewModalOpen && selectedProvider && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onSubmit={handleReviewSubmit}
          provider={selectedProvider}
        />
      )}
      {isQuoteModalOpen && selectedProvider && (
        <QuoteModal
            isOpen={isQuoteModalOpen}
            providerName={selectedProvider.business_name}
            providerEmail={selectedProvider.email}
            providerPhotoUrl={selectedProvider.profile_image}
            onClose={() => setIsQuoteModalOpen(false)}
        />
      )}
    </div>
  );
};

export default UserRecommendations;

// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import { FaStar } from 'react-icons/fa';
// import './UserRecommendations.css';

// // const API_URL = 'http://localhost:3000';
// const API_URL = 'https://api.seanag-recommendations.org:8080';

// const StarRating = ({ rating }) => {
//   const fullStars = Math.floor(rating);
//   const hasHalf = rating - fullStars >= 0.5;
//   const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

//   return (
//     <div className="star-rating">
//       {[...Array(fullStars)].map((_, i) => (
//         <FaStar key={`full-${i}`} className="filled" />
//       ))}
//       {hasHalf && <FaStar className="half" />}
//       {[...Array(emptyStars)].map((_, i) => (
//         <FaStar key={`empty-${i}`} className="empty" />
//       ))}
//     </div>
//   );
// };

// const UserRecommendations = () => {
//   const { id } = useParams();
//   const [recommendations, setRecommendations] = useState([]);
//   const [userName, setUserName] = useState('');
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchRecs = async () => {
//       try {
//         const res = await fetch(`${API_URL}/api/users/${id}/recommendations`);
//         const data = await res.json();
//         setRecommendations(data.recommendations || []);
//         setUserName(data.userName || 'User');
//       } catch (error) {
//         console.error('Error fetching recommendations:', error);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchRecs();
//   }, [id]);

//   if (loading) return <div className="appliance-services-container">Loading recommendations...</div>;

//   return (
//     <div className="appliance-services-container">
//       <h1 className="section-heading">Recommendations by {userName}</h1>

//       {recommendations.length === 0 ? (
//         <p className="no-recommendations">This user hasn't recommended any providers yet.</p>
//       ) : (
//         <ul className="provider-list">
//           {recommendations.map((provider) => (
//             <li key={provider.id} className="provider-card">
//               <div className="card-header">
//                 <h2 className="card-title">{provider.business_name}</h2>
//                 <div className="badge-group">
//                   <span className="profile-badge">{provider.service_type}</span>
//                   <span className="profile-badge">{provider.category}</span>
//                 </div>
//               </div>

//               <p className="card-description">{provider.description || 'No description available'}</p>

//               <div className="action-buttons">
//                 <a
//                   href={`/provider/${provider.id}`}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="primary-button"
//                 >
//                   View Profile
//                 </a>
//                 <button
//                   className="secondary-button"
//                   onClick={() => {
//                     if (provider.phone_number) {
//                       window.location.href = `sms:${provider.phone_number}?body=Hi ${provider.business_name}, I saw a recommendation about you on Tried & Trusted and would like to connect!`;
//                     } else if (provider.email) {
//                       window.location.href = `mailto:${provider.email}?subject=Request%20for%20Consultation&body=Hi%20${provider.business_name},%20I%20found%20you%20on%20Tried%20%26%20Trusted%20and%20would%20like%20to%20connect.`;
//                     } else {
//                       alert("No contact information available.");
//                     }
//                   }}
//                 >
//                   Request a Consultation
//                 </button>
//               </div>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// };

// export default UserRecommendations;
