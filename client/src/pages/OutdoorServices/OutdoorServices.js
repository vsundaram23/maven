import { Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { FaStar, FaPhone, FaEnvelope } from 'react-icons/fa';
import { fetchOutdoorProviders } from '../../services/providerService';
import './OutdoorServices.css';

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
            <label>Add tags (press Enter to add):</label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="e.g. reliable, quick"
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

const OutdoorServices = () => {
  const [providers, setProviders] = useState([]);
  const [reviewStatsMap, setReviewStatsMap] = useState({});
  const [reviewMap, setReviewMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [clickedRecommender, setClickedRecommender] = useState(null);
  const [showFeatureComingModal, setShowFeatureComingModal] = useState(false);
  const [sortOption, setSortOption] = useState('recommended');
  const [dropdownOpenForId, setDropdownOpenForId] = useState(null);
  const [showLinkCopied, setShowLinkCopied] = useState(false);

  useEffect(() => {
    const getProviders = async () => {
      try {
        const data = await fetchOutdoorProviders();
        const statsMap = {};
        const allReviewsMap = {};

        await Promise.all(data.map(async (provider) => {
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
          } catch {
            allReviewsMap[provider.id] = [];
          }
        }));

        setReviewStatsMap(statsMap);
        setReviewMap(allReviewsMap);

        const enriched = data.map(p => ({
          ...p,
          average_rating: statsMap[p.id]?.average_rating || 0,
          total_reviews: statsMap[p.id]?.total_reviews || 0,
        }));

        const sorted = sortOption === 'topRated'
          ? enriched.filter(p => p.average_rating >= 4.5)
              .sort((a, b) => b.average_rating - a.average_rating || b.total_reviews - a.total_reviews)
          : enriched.sort((a, b) => {
              const aAbove4 = a.average_rating >= 4 ? 1 : 0;
              const bAbove4 = b.average_rating >= 4 ? 1 : 0;
              return bAbove4 - aAbove4 || b.total_reviews - a.total_reviews;
            });

        setProviders(sorted);
      } catch {
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

  const handleConsultation = (provider) => {
    if (provider.phone_number) {
      window.location.href = `sms:${provider.phone_number}?body=Hi ${provider.business_name}, someone recommended you, and I’d like to request a consultation.`;
    } else if (provider.email) {
      window.location.href = `mailto:${provider.email}?subject=Request%20for%20Consultation&body=Hi%20${provider.business_name},%20I%E2%80%99d%20like%20to%20request%20a%20consultation%20via%20Tried%20%26%20Trusted.`;
    } else {
      alert("Thanks for requesting a consultation. We'll reach out to you shortly.");
    }
  };

  if (loading) return <div className="loading-spinner">Loading...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="outdoor-services-container">
      <h1 className="section-heading">Top Outdoor Service Providers</h1>

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

          return (
            <li key={provider.id} className="provider-card">
              <div className="card-header">
                <h2 className="card-title">{provider.business_name}</h2>
                <div className="badge-wrapper-with-menu">
                  <div className="badge-group">
                    {provider.average_rating >= 4.5 && (
                      <span className="top-rated-badge">Top Rated</span>
                    )}
                    <span className="profile-badge">{provider.service_type}</span>
                  </div>

                  <div className="right-actions">
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
                              navigator.clipboard.writeText(`https://triedandtrusted.ai/provider/${provider.id}`);
                              setDropdownOpenForId(null);
                              setShowLinkCopied(true);
                              setTimeout(() => setShowLinkCopied(false), 2000);
                            }}
                          >
                            Share this Rec
                          </button>
                        </div>
                      )}
                    </div>
                    {showLinkCopied && <div className="toast">Link copied!</div>}
                  </div>
                </div>
              </div>

              <div className="review-summary">
                <StarRating rating={provider.average_rating} />
                <span className="review-score">
                  {provider.average_rating.toFixed(1)} ({provider.total_reviews})
                </span>
                <button className="see-all-button" onClick={() => {
                  setSelectedProvider(provider);
                  setIsReviewModalOpen(true);
                }}>
                  Write a Review
                </button>
              </div>

              <p className="card-description">{provider.description || 'No description available'}</p>

              {provider.tags?.length > 0 && (
                <div className="tag-container">
                  {provider.tags.map((tag, idx) => (
                    <span key={idx} className="tag-badge">{tag}</span>
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

              {provider.recommended_by_name && (
                <>
                  <div className="recommended-row">
                    <span className="recommended-label">Recommended by:</span>
                    <span
                      className="recommended-name clickable"
                      onClick={() => setClickedRecommender(provider.recommended_by_name)}
                    >
                      {provider.recommended_by_name}
                    </span>
                  </div>

                  {reviews.length > 0 && (
                    <div className="recommended-row">
                      <span className="recommended-label">Also used by:</span>
                      <span className="used-by-names">
                        {[...new Set(
                          reviews.map((r) => r.user_name).filter(name => name && name !== provider.recommended_by_name)
                        )].join(', ') || 'No additional users yet'}
                      </span>
                    </div>
                  )}
                </>
              )}

              <div className="action-buttons">
                <a
                  href={`/provider/${provider.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    localStorage.setItem('selectedProvider', JSON.stringify(provider));
                  }}
                  className="primary-button"
                >
                  View Profile
                </a>
                <button
                  className="secondary-button"
                  onClick={() => handleConsultation(provider)}
                >
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

      {clickedRecommender && (
        <div className="modal-overlay">
          <div className="simple-modal">
            <button className="modal-close-x" onClick={() => setClickedRecommender(null)}>×</button>
            <h3 className="modal-title">
              Want to connect with <span className="highlight">{clickedRecommender}</span>?
            </h3>
            <div className="modal-buttons-vertical">
              <button
                className="secondary-button"
                onClick={() => {
                  setClickedRecommender(null);
                  setShowFeatureComingModal(true);
                }}
              >
                Thank {clickedRecommender}
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  setClickedRecommender(null);
                  setShowFeatureComingModal(true);
                }}
              >
                Ask {clickedRecommender} a question
              </button>
            </div>
          </div>
        </div>
      )}

      {showFeatureComingModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p>We're about to launch this feature. Stay tuned 👁️</p>
            <div className="modal-buttons">
              <button className="primary-button" onClick={() => setShowFeatureComingModal(false)}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutdoorServices;


// working 4/20
// import React, { useState, useEffect } from 'react';
// import { FaPhone, FaEnvelope, FaStar } from 'react-icons/fa';
// import { fetchOutdoorProviders } from '../../services/providerService';
// import './OutdoorServices.css';

// const API_URL = 'https://api.seanag-recommendations.org:8080';

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

//   if (!isOpen || !provider) return null;

//   return (
//     <div className="modal-overlay">
//       <div className="modal-content">
//         <h2>Review {provider.business_name}</h2>
//         <form onSubmit={handleSubmit}>
//           <div className="rating-container">
//             <label>Rate your experience: <span className="required">*</span></label>
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

// const OutdoorServices = () => {
//   const [providers, setProviders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
//   const [selectedProvider, setSelectedProvider] = useState(null);

//   useEffect(() => {
//     const getProviders = async () => {
//       try {
//         setLoading(true);
//         const data = await fetchOutdoorProviders();
//         setProviders(data); // Don't filter — trust backend to return only relevant providers
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
//       await fetch(`${API_URL}/api/reviews`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           provider_id: selectedProvider.id,
//           provider_email: selectedProvider.email || '',
//           email: userEmail,
//           rating: reviewData.rating,
//           content: reviewData.review
//         })
//       });
//     } catch (err) {
//       console.error('Error submitting review:', err);
//     }
//   };

//   const handleConsultation = (provider) => {
//     if (provider.phone_number) {
//       window.location.href = `sms:${provider.phone_number}?body=Hi ${provider.business_name}, ${provider.recommended_by_name} recommended you, and I’d like to request a consultation.`;
//     } else if (provider.email) {
//       window.location.href = `mailto:${provider.email}?subject=Request%20for%20Consultation&body=Hi%20${provider.business_name},%20I%E2%80%99d%20like%20to%20request%20a%20consultation%20via%20Tried%20%26%20Trusted.`;
//     } else {
//       alert("Thanks for requesting a consultation. We'll reach out to you shortly.");
//     }
//   };

//   if (loading) return <div className="loading-spinner">Loading...</div>;
//   if (error) return <div className="error-message">Error: {error}</div>;
//   if (!providers.length) return <div className="no-data">No outdoor service providers found</div>;

//   return (
//     <div className="outdoor-services-container">
//       <h1 className="section-heading">Top Outdoor Service Providers</h1>
//       <ul className="provider-list">
//         {providers.map((provider) => (
//           <li key={provider.id || Math.random()} className="provider-card">
//             <div className="card-header">
//               <h2 className="card-title">{provider.business_name}</h2>
//               <span className="badge">Outdoor Services</span>
//             </div>

//             <p className="card-description">
//               {provider.description || 'No description available'}
//             </p>

//             {provider.recommended_by_name && (
//               <div className="recommended-row">
//                 <span className="recommended-label">Recommended by:</span>
//                 <span className="recommended-name">{provider.recommended_by_name}</span>
//               </div>
//             )}

//             <div className="action-buttons">
//               <button className="primary-button" onClick={() => handleConsultation(provider)}>
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
//           onSubmit={handleReviewSubmit}
//           provider={selectedProvider}
//         />
//       )}
//     </div>
//   );
// };

// export default OutdoorServices;
