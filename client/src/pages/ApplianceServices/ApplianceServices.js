import React, { useState, useEffect } from 'react';
import { FaStar } from 'react-icons/fa';
import { fetchApplianceProviders } from '../../services/providerService';
import './ApplianceServices.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';

const StarRating = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="star-rating">
      {[...Array(fullStars)].map((_, i) => (
        <FaStar key={`full-${i}`} className="filled" />
      ))}
      {hasHalf && <FaStar className="half" />}
      {[...Array(emptyStars)].map((_, i) => (
        <FaStar key={`empty-${i}`} className="empty" />
      ))}
    </div>
  );
};

const ReviewModal = ({ isOpen, onClose, onSubmit, provider }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rating) {
      setError('Please select a rating');
      return;
    }
    onSubmit({ rating, review });
    setRating(0);
    setReview('');
    onClose();
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
          <div className="modal-buttons">
            <button type="button" onClick={onClose} className="cancel-button">
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

const ProviderProfileModal = ({ isOpen, onClose, provider, reviews = [] }) => {
  if (!isOpen || !provider) return null;

  return (
    <div className="modal-overlay">
      <div className="profile-modal-content">
      <div className="profile-header">
        <h2 className="profile-name">{provider.business_name}</h2>
        <div className="profile-badges">
          {provider.average_rating >= 4.5 && (
            <span className="top-rated-badge">Top Rated</span>
          )}
          <span className="profile-badge">Appliance Services</span>
        </div>
      </div>

        <div className="profile-section">
          <p><strong>Description:</strong> {provider.description || 'N/A'}</p>
          <p><strong>Phone:</strong> {provider.phone_number || 'Not provided'}</p>
          <p><strong>Email:</strong> {provider.email || 'Not provided'}</p>
          <p>
            <strong>Recommended by:</strong> {provider.recommended_by_name}{' '}
            {provider.date_of_recommendation && (
              <span className="recommendation-date">
                ({new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
                  year: '2-digit',
                  month: 'numeric',
                  day: 'numeric',
                })})
              </span>
            )}
          </p>
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
                    <FaStar
                      key={i}
                      className={i < review.rating ? 'star active' : 'star'}
                    />
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [allReviews, setAllReviews] = useState([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    const getProviders = async () => {
      try {
        const applianceProviders = await fetchApplianceProviders();
        const filtered = applianceProviders.filter(p => p.service_type === 'Appliance Services');
        setProviders(filtered);

        const statsMap = {};
        await Promise.all(
          filtered.map(async (provider) => {
            try {
              const res = await fetch(`${API_URL}/api/reviews/stats/${provider.id}`);
              const data = await res.json();
              statsMap[provider.id] = {
                average_rating: parseFloat(data.average_rating) || 0,
                total_reviews: parseInt(data.total_reviews) || 0,
              };
            } catch (err) {
              console.error('Error fetching stats for', provider.business_name);
            }
          })
        );
        setReviewStatsMap(statsMap);
      } catch (err) {
        setError('Failed to fetch providers');
      } finally {
        setLoading(false);
      }
    };

    getProviders();
  }, []);

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

  const handleViewProfile = async (provider) => {
    const enrichedProvider = {
      ...provider,
      average_rating: reviewStatsMap[provider.id]?.average_rating || 0,
      total_reviews: reviewStatsMap[provider.id]?.total_reviews || 0
    };
  
    setSelectedProvider(enrichedProvider);
    try {
      const res = await fetch(`${API_URL}/api/reviews/${provider.id}`);
      const data = await res.json();
      setAllReviews(data);
    } catch (err) {
      setAllReviews([]);
    }
    setIsProfileModalOpen(true);
  };

  if (loading) return <div className="loading-spinner">Loading...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="appliance-services-container">
      <h1 className="section-heading">Top Appliance Service Providers</h1>
      <ul className="provider-list">
        {providers.map((provider) => (
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
                <button
                  className="see-all-button"
                  onClick={() => handleViewProfile(provider)}
                >
                  View Profile
                </button>
              </div>
            )}

            <p className="card-description">{provider.description || 'No description available'}</p>

            {provider.recommended_by_name && (
              <div className="recommended-row">
                <span className="recommended-label">Recommended by:</span>
                <span className="recommended-name">{provider.recommended_by_name}</span>
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
            )}

            <div className="action-buttons">
              <button
                className="primary-button"
                onClick={() => {
                  if (provider.phone_number) {
                    window.location.href = `sms:${provider.phone_number}?body=Hi ${provider.business_name}, ${provider.recommended_by_name} recommended you, and I’d like to request a consultation.`;
                  } else if (provider.email) {
                    window.location.href = `mailto:${provider.email}?subject=Request%20for%20Consultation&body=Hi%20${provider.business_name},%20I%E2%80%99d%20like%20to%20request%20a%20consultation%20via%20Tried%20%26%20Trusted.`;
                  } else {
                    alert("Thanks for requesting a consultation. We'll reach out to you shortly.");
                  }
                }}
              >
                Request a Consultation
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  setSelectedProvider(provider);
                  setIsReviewModalOpen(true);
                }}
              >
                Have you used this service?
              </button>
            </div>
          </li>
        ))}
      </ul>

      {isReviewModalOpen && (
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
          reviews={allReviews}
        />
      )}
    </div>
  );
};

export default ApplianceServices;


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