// working 4/15 – updated to show "Recommended by" from reviews
import React, { useState, useEffect } from 'react';
import { FaStar } from 'react-icons/fa';
import { fetchApplianceProviders } from '../../services/providerService';
import './ApplianceServices.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = 'http://localhost:3000';

const StarRating = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="star-rating">
      {[...Array(fullStars)].map((_, i) => <FaStar key={`full-${i}`} className="filled" />)}
      {hasHalf && <FaStar className="half" />}
      {[...Array(emptyStars)].map((_, i) => <FaStar key={`empty-${i}`} className="empty" />)}
    </div>
  );
};

// const ReviewModal = ({ isOpen, onClose, onSubmit, provider }) => {
//   const [rating, setRating] = useState(0);
//   const [hover, setHover] = useState(0);
//   const [review, setReview] = useState('');
//   const [error, setError] = useState('');

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (!rating) {
//       setError('Please select a rating');
//       return;
//     }
//     onSubmit({ rating, review });
//     setRating(0);
//     setReview('');
//     onClose();
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="modal-overlay">
//       <div className="modal-content">
//         <h2>Review {provider.business_name}</h2>
//         <form onSubmit={handleSubmit}>
//           <div className="rating-container">
//             <label>
//               Rate your experience: <span className="required">*</span>
//             </label>
//             <div className="stars">
//               {[...Array(5)].map((_, index) => (
//                 <FaStar
//                   key={index}
//                   className={index < (hover || rating) ? 'star active' : 'star'}
//                   onClick={() => setRating(index + 1)}
//                   onMouseEnter={() => setHover(index + 1)}
//                   onMouseLeave={() => setHover(rating)}
//                 />
//               ))}
//             </div>
//             {error && <div className="error-message">{error}</div>}
//           </div>
//           <div className="review-input">
//             <label>Tell us about your experience:</label>
//             <textarea
//               value={review}
//               onChange={(e) => setReview(e.target.value)}
//               placeholder="Optional: Share your thoughts..."
//               rows={4}
//             />
//           </div>
//           <div className="modal-buttons">
//             <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
//             <button type="submit" className="submit-button">Submit Review</button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

const ReviewModal = ({ isOpen, onClose, onSubmit, provider }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rating) {
      setError('Please select a rating');
      return;
    }
    onSubmit({ rating, review, tags });
    setRating(0);
    setReview('');
    setTags([]);
    setTagInput('');
    onClose();
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = tagInput.trim();
      if (trimmed && !tags.includes(trimmed)) {
        setTags([...tags, trimmed]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Review {provider.business_name}</h2>
        <form onSubmit={handleSubmit}>
          <div className="rating-container">
            <label>
              Rate your experience: <span className="required">*</span>
            </label>
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
            <label>Add tags (press Enter to add):</label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="e.g. friendly, affordable"
            />
            <div className="tag-container">
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

const ProviderProfileModal = ({ isOpen, onClose, provider, reviews = [] }) => {
  if (!isOpen || !provider) return null;

  const reviewerNames = [...new Set(reviews.map(r => r.user_name).filter(Boolean))];

  console.log("🔍 Provider tags for modal:", provider.business_name, provider.tags);

  return (
    <div className="modal-overlay">
      <div className="profile-modal-content">
        <button className="modal-close-x" onClick={onClose}>×</button>
        <div className="profile-header">
          <h2 className="profile-name">{provider.business_name}</h2>
          <div className="profile-badges">
            {provider.average_rating >= 4.5 && <span className="top-rated-badge">Top Rated</span>}
            <span className="profile-badge">Appliance Services</span>
          </div>
        </div>

        <div className="profile-section">
          <p><strong>Description:</strong> {provider.description || 'N/A'}</p>
          <p><strong>Phone:</strong> {provider.phone_number || 'Not provided'}</p>
          <p><strong>Email:</strong> {provider.email || 'Not provided'}</p>
          {Array.isArray(provider.tags) && provider.tags.length > 0 && (
            <div className="modal-tags">
              <strong>Tags:</strong>
              <div className="tag-container">
                {provider.tags.map((tag, idx) => (
                  <span key={idx} className="tag-badge">{tag}</span>
                ))}
              </div>
            </div>
          )}
          <p><strong>Date of Recommendation:</strong> {provider.date_of_recommendation
            ? new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
                year: '2-digit',
                month: 'numeric',
                day: 'numeric',
              })
            : 'Not provided'}
          </p>
          {(() => {
            const allNames = new Set();
            if (provider.recommended_by_name) allNames.add(provider.recommended_by_name);
            reviews.forEach(r => r.user_name && allNames.add(r.user_name));

            return (
              <p>
                <strong>Recommended by:</strong>{' '}
                {[...allNames].join(', ')}
              </p>
            );
          })()}
        </div>
        <div className="profile-reviews">
          <h3>Reviews</h3>
          {reviews.length === 0 ? (
            <p className="no-reviews">No reviews yet.</p>
          ) : (
            reviews.map((review, index) => (
              <div key={index} className="profile-review">
                <div className="review-stars">
                  {[...Array(5)].map((_, i) => (
                    <FaStar key={i} className={i < review.rating ? 'star active' : 'star'} />
                  ))}
                </div>
                <p className="review-content">"{review.content}"</p>
                <p className="review-user">– {review.user_name || 'Anonymous'}</p>
              </div>
            ))
          )}
        </div>

        <div className="modal-buttons">
          <button className="cancel-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

const ApplianceServices = () => {
  const [providers, setProviders] = useState([]);
  const [reviewStatsMap, setReviewStatsMap] = useState({});
  const [reviewMap, setReviewMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [sortOption, setSortOption] = useState('recommended');

  useEffect(() => {
    const getProviders = async () => {
      try {
        const applianceProviders = await fetchApplianceProviders(); // must return data.providers
        // console.log("✅ First fetched provider:", applianceProviders[0]);
        const filtered = applianceProviders.filter(p => p.service_type === 'Appliance Services');
  
        const statsMap = {};
        const allReviewsMap = {};
  
        await Promise.all(
          filtered.map(async (provider) => {
            try {
              const statsRes = await fetch(`${API_URL}/api/reviews/stats/${provider.id}`);
              const statsData = await statsRes.json();
              statsMap[provider.id] = {
                average_rating: parseFloat(statsData.average_rating) || 0,
                total_reviews: parseInt(statsData.total_reviews) || 0,
              };
  
              const reviewsRes = await fetch(`${API_URL}/api/reviews/${provider.id}`);
              const reviewsData = await reviewsRes.json();
              allReviewsMap[provider.id] = reviewsData;
            } catch (err) {
              allReviewsMap[provider.id] = [];
              console.error('Error fetching data for', provider.business_name);
            }
          })
        );
  
        setReviewStatsMap(statsMap);
        setReviewMap(allReviewsMap);
  
        // ✅ Enrich providers with stats (tags already preserved from ...p)
        const enriched = filtered.map(p => ({
          ...p,
          average_rating: statsMap[p.id]?.average_rating || 0,
          total_reviews: statsMap[p.id]?.total_reviews || 0,
        }));
  
        // ✅ Sort based on selected option
        let sorted = [];
        if (sortOption === 'topRated') {
          sorted = enriched
            .filter(p => p.average_rating >= 4.5)
            .sort((a, b) => b.average_rating - a.average_rating || b.total_reviews - a.total_reviews);
        } else {
          sorted = enriched
            .sort((a, b) => {
              const aAbove4 = a.average_rating >= 4 ? 1 : 0;
              const bAbove4 = b.average_rating >= 4 ? 1 : 0;
              if (aAbove4 !== bAbove4) return bAbove4 - aAbove4;
              return b.total_reviews - a.total_reviews;
            });
        }
  
        setProviders(sorted);
      } catch (err) {
        setError('Failed to fetch providers');
      } finally {
        setLoading(false);
      }
    };
  
    getProviders();
  }, [sortOption]);  

  const handleReviewSubmit = async (reviewData) => {
    const userEmail = localStorage.getItem('userEmail');
    if (!selectedProvider) return;

    try {
      await fetch(`${API_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: selectedProvider.id,
          provider_email: selectedProvider.email,
          email: userEmail,
          rating: reviewData.rating,
          content: reviewData.review,
        }),
      });
    } catch (err) {
      console.error('Error submitting review:', err);
    }
  };

  const handleViewProfile = (provider) => {
    const enrichedProvider = {
      ...provider,
      average_rating: reviewStatsMap[provider.id]?.average_rating || 0,
      total_reviews: reviewStatsMap[provider.id]?.total_reviews || 0
    };

    setSelectedProvider(enrichedProvider);
    setIsProfileModalOpen(true);
  };

  if (loading) return <div className="loading-spinner">Loading...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="appliance-services-container">
      <h1 className="section-heading">Top Appliance Service Providers</h1>
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
      <ul className="provider-list">
        {providers.map((provider) => {
          const reviews = reviewMap[provider.id] || [];
          const reviewerNames = [...new Set(reviews.map(r => r.user_name).filter(Boolean))];

          return (
            <li key={provider.id} className="provider-card">
              <div className="card-header">
                <h2 className="card-title">{provider.business_name}</h2>
                <div className="badge-wrapper">
                  {reviewStatsMap[provider.id]?.average_rating >= 4.5 && (
                    <span className="top-rated-badge">Top rated</span>
                  )}
                  <span className="badge">Appliance Services</span>
                </div>
              </div>

              {reviewStatsMap[provider.id] && (
                <div className="review-summary">
                  <span className="stars-and-score">
                    <StarRating rating={reviewStatsMap[provider.id].average_rating} />
                    {reviewStatsMap[provider.id].average_rating.toFixed(1)} ({reviewStatsMap[provider.id].total_reviews})
                  </span>
                  <button className="see-all-button" onClick={() => {
                    setSelectedProvider(provider);
                    setIsReviewModalOpen(true);
                  }}>
                    Also used this service?
                  </button>
                </div>
              )}

              <p className="card-description">{provider.description || 'No description available'}</p>
              {Array.isArray(provider.tags) && provider.tags.length > 0 && (
                <div className="tag-container">
                  {provider.tags.map((tag, idx) => (
                    <span key={idx} className="tag-badge">{tag}</span>
                  ))}
                </div>
              )}
              {provider.recommended_by_name && (
                <>
                  <div className="recommended-row">
                    <span className="recommended-label">Recommended by:</span>
                    <span
                      className="recommended-name clickable"
                      onClick={() => handleViewProfile(provider)}
                    >
                      {provider.recommended_by_name}
                    </span>
                    {provider.date_of_recommendation && (
                      <span className="recommendation-date">
                        {' '}
                        ({new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
                          year: '2-digit',
                          month: 'numeric',
                          day: 'numeric',
                        })})
                      </span>
                    )}
                  </div>

                  {reviews.length > 0 && (
                    <div className="recommended-row">
                      <span className="recommended-label">Also used by:</span>
                      <span className="used-by-names">
                        {[...new Set(
                          reviews
                            .map((r) => r.user_name)
                            .filter(name => name && name !== provider.recommended_by_name)
                        )].join(', ') || 'No additional users yet'}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="action-buttons">
                <button className="primary-button" onClick={() => handleViewProfile(provider)}>
                  View Profile
                </button>
                <button className="secondary-button" onClick={() => {
                  if (provider.phone_number) {
                    window.location.href = `sms:${provider.phone_number}?body=Hi ${provider.business_name}, someone recommended you, and I’d like to request a consultation.`;
                  } else if (provider.email) {
                    window.location.href = `mailto:${provider.email}?subject=Request%20for%20Consultation&body=Hi%20${provider.business_name},%20I%E2%80%99d%20like%20to%20request%20a%20consultation%20via%20Tried%20%26%20Trusted.`;
                  } else {
                    alert("Thanks for requesting a consultation. We'll reach out to you shortly.");
                  }
                }}>
                  Request a Consultation
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {isReviewModalOpen && selectedProvider && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onSubmit={(reviewData) => handleReviewSubmit({ ...reviewData })}
          provider={selectedProvider}
        />
      )}

      {isProfileModalOpen && selectedProvider && (
        <ProviderProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          provider={selectedProvider}
          reviews={reviewMap[selectedProvider.id] || []}
        />
      )}
    </div>
  );
};

export default ApplianceServices;


// old version
// import React, { useState, useEffect } from 'react';
// import { FaStar } from 'react-icons/fa';
// import { fetchApplianceProviders } from '../../services/providerService';
// import './ApplianceServices.css';

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

// const ReviewModal = ({ isOpen, onClose, onSubmit, provider }) => {
//   const [rating, setRating] = useState(0);
//   const [hover, setHover] = useState(0);
//   const [review, setReview] = useState('');
//   const [error, setError] = useState('');

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (!rating) {
//       setError('Please select a rating');
//       return;
//     }
//     onSubmit({ rating, review });
//     setRating(0);
//     setReview('');
//     onClose();
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="modal-overlay">
//       <div className="modal-content">
//         <h2>Review {provider.business_name}</h2>
//         <form onSubmit={handleSubmit}>
//           <div className="rating-container">
//             <label>
//               Rate your experience: <span className="required">*</span>
//             </label>
//             <div className="stars">
//               {[...Array(5)].map((_, index) => (
//                 <FaStar
//                   key={index}
//                   className={index < (hover || rating) ? 'star active' : 'star'}
//                   onClick={() => setRating(index + 1)}
//                   onMouseEnter={() => setHover(index + 1)}
//                   onMouseLeave={() => setHover(rating)}
//                 />
//               ))}
//             </div>
//             {error && <div className="error-message">{error}</div>}
//           </div>
//           <div className="review-input">
//             <label>Tell us about your experience:</label>
//             <textarea
//               value={review}
//               onChange={(e) => setReview(e.target.value)}
//               placeholder="Optional: Share your thoughts..."
//               rows={4}
//             />
//           </div>
//           <div className="modal-buttons">
//             <button type="button" onClick={onClose} className="cancel-button">
//               Cancel
//             </button>
//             <button type="submit" className="submit-button">
//               Submit Review
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// const ProviderProfileModal = ({ isOpen, onClose, provider, reviews = [] }) => {
//   if (!isOpen || !provider) return null;

//   return (
//     <div className="modal-overlay">
//       <div className="profile-modal-content">
//       <div className="profile-header">
//         <h2 className="profile-name">{provider.business_name}</h2>
//         <div className="profile-badges">
//           {provider.average_rating >= 4.5 && (
//             <span className="top-rated-badge">Top Rated</span>
//           )}
//           <span className="profile-badge">Appliance Services</span>
//         </div>
//       </div>

//         <div className="profile-section">
//           <p><strong>Description:</strong> {provider.description || 'N/A'}</p>
//           <p><strong>Phone:</strong> {provider.phone_number || 'Not provided'}</p>
//           <p><strong>Email:</strong> {provider.email || 'Not provided'}</p>
//           <p>
//             <strong>Recommended by:</strong> {provider.recommended_by_name}{' '}
//             {provider.date_of_recommendation && (
//               <span className="recommendation-date">
//                 ({new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
//                   year: '2-digit',
//                   month: 'numeric',
//                   day: 'numeric',
//                 })})
//               </span>
//             )}
//           </p>
//         </div>

//         <div className="profile-reviews">
//           <h3>Reviews</h3>
//           {reviews.length === 0 ? (
//             <p className="no-reviews">No reviews yet.</p>
//           ) : (
//             reviews.map((review, index) => (
//               <div key={index} className="profile-review">
//                 <div className="review-stars">
//                   {[...Array(5)].map((_, i) => (
//                     <FaStar
//                       key={i}
//                       className={i < review.rating ? 'star active' : 'star'}
//                     />
//                   ))}
//                 </div>
//                 <p className="review-content">"{review.content}"</p>
//                 <p className="review-user">– {review.user_name || 'Anonymous'}</p>
//               </div>
//             ))
//           )}
//         </div>

//         <div className="modal-buttons">
//           <button className="cancel-button" onClick={onClose}>Close</button>
//         </div>
//       </div>
//     </div>
//   );
// };

// const ApplianceServices = () => {
//   const [providers, setProviders] = useState([]);
//   const [reviewStatsMap, setReviewStatsMap] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
//   const [selectedProvider, setSelectedProvider] = useState(null);
//   const [allReviews, setAllReviews] = useState([]);
//   const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
//   const [sortOption, setSortOption] = useState('recommended');

//   useEffect(() => {
//     const getProviders = async () => {
//       try {
//         const applianceProviders = await fetchApplianceProviders();
//         const filtered = applianceProviders.filter(p => p.service_type === 'Appliance Services');
  
//         const statsMap = {};
//         await Promise.all(
//           filtered.map(async (provider) => {
//             try {
//               const res = await fetch(`${API_URL}/api/reviews/stats/${provider.id}`);
//               const data = await res.json();
//               statsMap[provider.id] = {
//                 average_rating: parseFloat(data.average_rating) || 0,
//                 total_reviews: parseInt(data.total_reviews) || 0,
//               };
//             } catch (err) {
//               console.error('Error fetching stats for', provider.business_name);
//             }
//           })
//         );
//         setReviewStatsMap(statsMap);
  
//         const enriched = filtered.map((p) => ({
//           ...p,
//           average_rating: statsMap[p.id]?.average_rating || 0,
//           total_reviews: statsMap[p.id]?.total_reviews || 0,
//           review_count_including_recommender: 
//             (statsMap[p.id]?.total_reviews || 0) + (p.recommended_by_name ? 1 : 0)
//         }));
  
//         let sorted;
//         if (sortOption === 'topRated') {
//           sorted = enriched
//             .filter(p => p.average_rating >= 4.5)
//             .sort((a, b) => b.average_rating - a.average_rating);
//         } else {
//           // Recommended = sort all providers with 4+ stars first
//           sorted = enriched.sort((a, b) => {
//             const aAbove4 = a.average_rating >= 4 ? 1 : 0;
//             const bAbove4 = b.average_rating >= 4 ? 1 : 0;

//             if (aAbove4 !== bAbove4) {
//               return bAbove4 - aAbove4; // Put 4+ star providers first
//             }

//             return b.review_count_including_recommender - a.review_count_including_recommender;
//           });
//         }
  
//         setProviders(sorted);
//       } catch (err) {
//         setError('Failed to fetch providers');
//       } finally {
//         setLoading(false);
//       }
//     };
  
//     getProviders();
//   }, [sortOption]);

//   const handleReviewSubmit = async (reviewData) => {
//     const userEmail = localStorage.getItem('userEmail');
//     if (!selectedProvider) return;

//     try {
//       await fetch(`${API_URL}/api/reviews`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           provider_id: selectedProvider.id,
//           provider_email: selectedProvider.email,
//           email: userEmail,
//           rating: reviewData.rating,
//           content: reviewData.review,
//         }),
//       });
//     } catch (err) {
//       console.error('Error submitting review:', err);
//     }
//   };

//   const handleViewProfile = async (provider) => {
//     const enrichedProvider = {
//       ...provider,
//       average_rating: reviewStatsMap[provider.id]?.average_rating || 0,
//       total_reviews: reviewStatsMap[provider.id]?.total_reviews || 0
//     };
  
//     setSelectedProvider(enrichedProvider);
//     try {
//       const res = await fetch(`${API_URL}/api/reviews/${provider.id}`);
//       const data = await res.json();
//       setAllReviews(data);
//     } catch (err) {
//       setAllReviews([]);
//     }
//     setIsProfileModalOpen(true);
//   };

//   if (loading) return <div className="loading-spinner">Loading...</div>;
//   if (error) return <div className="error-message">Error: {error}</div>;

//   return (
//     <div className="appliance-services-container">
//       <h1 className="section-heading">Top Appliance Service Providers</h1>
//       <div className="filters-bar">
//         <div className="sort-control">
//           <label htmlFor="sort">Sort by:</label>
//           <select
//             id="sort"
//             value={sortOption}
//             onChange={(e) => setSortOption(e.target.value)}
//           >
//             <option value="recommended">Recommended</option>
//             <option value="topRated">Top Rated</option>
//           </select>
//         </div>
//       </div>
//       <ul className="provider-list">
//         {providers.map((provider) => (
//           <li key={provider.id} className="provider-card">
//             <div className="card-header">
//               <h2 className="card-title">{provider.business_name}</h2>
//               <div className="badge-wrapper">
//                 {reviewStatsMap[provider.id]?.average_rating >= 4.5 && (
//                   <span className="top-rated-badge">Top rated</span>
//                 )}
//                 <span className="badge">Appliance Services</span>
//               </div>
//             </div>

//             {reviewStatsMap[provider.id] && (
//               <div className="review-summary">
//                 <span className="stars-and-score">
//                   <StarRating rating={reviewStatsMap[provider.id].average_rating} />
//                   {reviewStatsMap[provider.id].average_rating.toFixed(1)} ({reviewStatsMap[provider.id].total_reviews})
//                 </span>
//                 <button
//                   className="see-all-button"
//                   onClick={() => handleViewProfile(provider)}
//                 >
//                   View Profile
//                 </button>
//               </div>
//             )}

//             <p className="card-description">{provider.description || 'No description available'}</p>

//             {provider.recommended_by_name && (
//               <div className="recommended-row">
//                 <span className="recommended-label">Recommended by:</span>
//                 <span className="recommended-name">{provider.recommended_by_name}</span>
//                 {provider.date_of_recommendation && (
//                   <span className="recommendation-date">
//                     {' '}
//                     ({new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
//                       year: '2-digit',
//                       month: 'numeric',
//                       day: 'numeric',
//                     })})
//                   </span>
//                 )}
//               </div>
//             )}

//             <div className="action-buttons">
//               <button
//                 className="primary-button"
//                 onClick={() => {
//                   if (provider.phone_number) {
//                     window.location.href = `sms:${provider.phone_number}?body=Hi ${provider.business_name}, ${provider.recommended_by_name} recommended you, and I’d like to request a consultation.`;
//                   } else if (provider.email) {
//                     window.location.href = `mailto:${provider.email}?subject=Request%20for%20Consultation&body=Hi%20${provider.business_name},%20I%E2%80%99d%20like%20to%20request%20a%20consultation%20via%20Tried%20%26%20Trusted.`;
//                   } else {
//                     alert("Thanks for requesting a consultation. We'll reach out to you shortly.");
//                   }
//                 }}
//               >
//                 Request a Consultation
//               </button>
//               <button
//                 className="secondary-button"
//                 onClick={() => {
//                   setSelectedProvider(provider);
//                   setIsReviewModalOpen(true);
//                 }}
//               >
//                 Have you used this service?
//               </button>
//             </div>
//           </li>
//         ))}
//       </ul>

//       {isReviewModalOpen && (
//         <ReviewModal
//           isOpen={isReviewModalOpen}
//           onClose={() => setIsReviewModalOpen(false)}
//           onSubmit={(reviewData) => handleReviewSubmit({ ...reviewData })}
//           provider={selectedProvider}
//         />
//       )}

//       {isProfileModalOpen && selectedProvider && (
//         <ProviderProfileModal
//           isOpen={isProfileModalOpen}
//           onClose={() => setIsProfileModalOpen(false)}
//           provider={selectedProvider}
//           reviews={allReviews}
//         />
//       )}
//     </div>
//   );
// };

// export default ApplianceServices;


// // working 4/9
// import React, { useState, useEffect } from 'react';
// import { FaStar } from 'react-icons/fa';
// import { fetchApplianceProviders } from '../../services/providerService';
// import './ApplianceServices.css';

// const API_URL = 'https://api.seanag-recommendations.org:8080';

// // const API_URL = 'http://localhost:3000';

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

// const ReviewModal = ({ isOpen, onClose, onSubmit, provider }) => {
//   const [rating, setRating] = useState(0);
//   const [hover, setHover] = useState(0);
//   const [review, setReview] = useState('');
//   const [error, setError] = useState('');

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (!rating) {
//       setError('Please select a rating');
//       return;
//     }
//     onSubmit({ rating, review });
//     setRating(0);
//     setReview('');
//     onClose();
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="modal-overlay">
//       <div className="modal-content">
//         <h2>Review {provider.business_name}</h2>
//         <form onSubmit={handleSubmit}>
//           <div className="rating-container">
//             <label>
//               Rate your experience: <span className="required">*</span>
//             </label>
//             <div className="stars">
//               {[...Array(5)].map((_, index) => (
//                 <FaStar
//                   key={index}
//                   className={index < (hover || rating) ? 'star active' : 'star'}
//                   onClick={() => setRating(index + 1)}
//                   onMouseEnter={() => setHover(index + 1)}
//                   onMouseLeave={() => setHover(rating)}
//                 />
//               ))}
//             </div>
//             {error && <div className="error-message">{error}</div>}
//           </div>
//           <div className="review-input">
//             <label>Tell us about your experience:</label>
//             <textarea
//               value={review}
//               onChange={(e) => setReview(e.target.value)}
//               placeholder="Optional: Share your thoughts..."
//               rows={4}
//             />
//           </div>
//           <div className="modal-buttons">
//             <button type="button" onClick={onClose} className="cancel-button">
//               Cancel
//             </button>
//             <button type="submit" className="submit-button">
//               Submit Review
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// const AllReviewsModal = ({ isOpen, onClose, provider, reviews }) => {
//   if (!isOpen) return null;

//   return (
//     <div className="modal-overlay">
//       <div className="modal-content">
//         <h2>All Reviews for {provider.business_name}</h2>
//         <div className="reviews-list">
//           {reviews.length === 0 ? (
//             <p>No reviews yet.</p>
//           ) : (
//             reviews.map((review, index) => (
//               <div key={index} className="review-entry">
//                 <div className="review-stars">
//                   {[...Array(5)].map((_, i) => (
//                     <FaStar
//                       key={i}
//                       className={i < review.rating ? 'star active' : 'star'}
//                     />
//                   ))}
//                 </div>
//                 <p className="review-content">"{review.content}"</p>
//                 <p className="review-user">– {review.user_name || 'Anonymous'}</p>
//               </div>
//             ))
//           )}
//         </div>
//         <div className="modal-buttons">
//           <button className="cancel-button" onClick={onClose}>
//             Close
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// const ProviderProfileModal = ({ isOpen, onClose, provider }) => {
//   if (!isOpen || !provider) return null;

//   return (
//     <div className="modal-overlay">
//       <div className="modal-content">
//         <h2>{provider.business_name}</h2>
//         <p><strong>Description:</strong> {provider.description || 'N/A'}</p>
//         <p><strong>Phone:</strong> {provider.phone_number || 'Not provided'}</p>
//         <p><strong>Email:</strong> {provider.email || 'Not provided'}</p>
//         <p><strong>Recommended by:</strong> {provider.recommended_by_name}</p>
//         {provider.date_of_recommendation && (
//           <p>
//             <strong>Date of Recommendation:</strong>{' '}
//             {new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
//               year: '2-digit',
//               month: 'numeric',
//               day: 'numeric',
//             })}
//           </p>
//         )}
//         <div className="modal-buttons">
//           <button className="cancel-button" onClick={onClose}>
//             Close
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// const ApplianceServices = () => {
//   const [providers, setProviders] = useState([]);
//   const [reviewStatsMap, setReviewStatsMap] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
//   const [selectedProvider, setSelectedProvider] = useState(null);
//   const [isAllReviewsModalOpen, setIsAllReviewsModalOpen] = useState(false);
//   const [allReviews, setAllReviews] = useState([]);
//   const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);


//   useEffect(() => {
//     const getProviders = async () => {
//       try {
//         setLoading(true);
//         const applianceProviders = await fetchApplianceProviders();
//         console.log("Returned appliance providers:", applianceProviders);
//         const filtered = applianceProviders.filter(p => p.service_type === 'Appliance Services');
//         console.log('Filtered providers:', filtered);
//         setProviders(filtered);

//         const statsMap = {};
//         await Promise.all(
//           filtered.map(async (provider) => {
//             try {
//               const res = await fetch(`${API_URL}/api/reviews/stats/${provider.id}`);
//               const data = await res.json();
//               statsMap[provider.id] = {
//                 average_rating: parseFloat(data.average_rating) || 0,
//                 total_reviews: parseInt(data.total_reviews) || 0,
//               };
//             } catch (err) {
//               console.error('Error fetching stats for', provider.business_name);
//             }
//           })
//         );
//         setReviewStatsMap(statsMap);
//       } catch (err) {
//         setError('Failed to fetch providers');
//         console.error('Error:', err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     getProviders();
//   }, []);

//   const handleReviewSubmit = async (reviewData) => {
//     const userEmail = localStorage.getItem('userEmail');
//     if (!selectedProvider) return;

//     try {
//       const response = await fetch(`${API_URL}/api/reviews`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           provider_id: selectedProvider.id,
//           provider_email: selectedProvider.email,
//           email: userEmail,
//           rating: reviewData.rating,
//           content: reviewData.review,
//         }),
//       });

//       if (!response.ok) throw new Error('Failed to submit review');
//     } catch (err) {
//       console.error('Error submitting review:', err);
//     }
//   };

//   const handleSeeAllReviews = async (provider) => {
//     try {
//       const res = await fetch(`${API_URL}/api/reviews/${provider.id}`);
//       const data = await res.json();
//       setAllReviews(data);
//       setSelectedProvider(provider);
//       setIsAllReviewsModalOpen(true);
//     } catch (err) {
//       console.error('Error fetching all reviews:', err);
//     }
//   };

//   if (loading) return <div className="loading-spinner">Loading...</div>;
//   if (error) return <div className="error-message">Error: {error}</div>;
//   if (providers.length === 0) return <div className="no-data">No appliance service providers found</div>;

//   return (
//     <div className="appliance-services-container">
//       <h1 className="section-heading">Top Appliance Service Providers</h1>

//       <ul className="provider-list">
//         {providers.map((provider) => (
//           <li key={provider.id} className="provider-card">
//             <div className="card-header">
//               <h2 className="card-title">{provider.business_name}</h2>
//               <span className="badge">Appliance Services</span>
//             </div>

//             {reviewStatsMap[provider.id] && (
//               <div className="review-summary">
//               <span className="stars-and-score">
//                 <StarRating rating={reviewStatsMap[provider.id].average_rating} />
//                 {reviewStatsMap[provider.id].average_rating.toFixed(1)} ({reviewStatsMap[provider.id].total_reviews})
//               </span>
//               <button className="see-all-button" onClick={() => handleSeeAllReviews(provider)}>
//                 See all
//               </button>
//             </div>
//             )}

//             <p className="card-description">{provider.description || 'No description available'}</p>

//             {provider.recommended_by_name && (
//               <div className="recommended-row">
//                 <span className="recommended-label">Recommended by:</span>
//                 <span className="recommended-name">
//                   {provider.recommended_by_name}
//                 </span>
//                 {provider.date_of_recommendation && (
//                   <span className="recommendation-date">
//                     {' '}
//                     ({new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
//                       year: '2-digit',
//                       month: 'numeric',
//                       day: 'numeric',
//                     })})
//                   </span>
//                 )}
//               </div>
//             )}
//             <div className="action-buttons">
//               <button
//                 className="primary-button"
//                 onClick={() => {
//                   if (provider.phone_number) {
//                     window.location.href = `sms:${provider.phone_number}?body=Hi ${provider.business_name}, ${provider.recommended_by_name} recommended you, and I’d like to request a consultation.`;
//                   } else if (provider.email) {
//                     window.location.href = `mailto:${provider.email}?subject=Request%20for%20Consultation&body=Hi%20${provider.business_name},%20I%E2%80%99d%20like%20to%20request%20a%20consultation%20via%20Tried%20%26%20Trusted.`;
//                   } else {
//                     alert("Thanks for requesting a consultation. We'll reach out to you shortly.");
//                   }
//                 }}
//               >
//                 Request a Consultation
//               </button>
//               <button
//                 className="secondary-button"
//                 onClick={() => {
//                   setSelectedProvider(provider);
//                   setIsReviewModalOpen(true);
//                 }}
//               >
//                 Have you used this service?
//               </button>
//               <button
//                 className="secondary-button"
//                 onClick={() => {
//                   setSelectedProvider(provider);
//                   setIsProfileModalOpen(true);
//                 }}
//               >
//                 View More
//               </button>
//             </div>
//           </li>
//         ))}
//       </ul>

//       {isReviewModalOpen && (
//         <ReviewModal
//           isOpen={isReviewModalOpen}
//           onClose={() => setIsReviewModalOpen(false)}
//           onSubmit={(reviewData) => handleReviewSubmit({ ...reviewData })}
//           provider={selectedProvider}
//         />
//       )}

//       {isAllReviewsModalOpen && selectedProvider && (
//         <AllReviewsModal
//           isOpen={isAllReviewsModalOpen}
//           onClose={() => setIsAllReviewsModalOpen(false)}
//           provider={selectedProvider}
//           reviews={allReviews}
//         />
//       )}

//       {isProfileModalOpen && selectedProvider && (
//         <ProviderProfileModal
//           isOpen={isProfileModalOpen}
//           onClose={() => setIsProfileModalOpen(false)}
//           provider={selectedProvider}
//         />
//       )}
//     </div>
//   );
// };

// export default ApplianceServices;