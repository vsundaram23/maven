// working 4/15 – updated to show "Recommended by" from reviews
import { Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { FaStar, FaPhone, FaEnvelope } from 'react-icons/fa';
import { fetchApplianceProviders } from '../../services/providerService';
import QuoteModal from '../../components/QuoteModal/QuoteModal';
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

const ProviderProfileModal = ({ isOpen, onClose, provider, reviews = [], setSelectedProvider, setIsReviewModalOpen }) => {
  if (!isOpen || !provider) return null;

  const formattedDate = provider.date_of_recommendation
    ? new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
        year: '2-digit',
        month: 'numeric',
        day: 'numeric',
      })
    : 'Not provided';

  const recommenders = new Set();
  if (provider.recommended_by_name) recommenders.add(provider.recommended_by_name);
  reviews.forEach((r) => r.user_name && recommenders.add(r.user_name));

  const alsoUsedBy = Array.from(recommenders).filter(name => name !== provider.recommended_by_name);

  return (
    <div className="modal-overlay">
      <div className="profile-modal-content">
        <button className="modal-close-x" onClick={onClose}>×</button>

        {/* Header */}
        <div className="profile-header">
          <h2 className="profile-name">{provider.business_name}</h2>
          <div className="badge-wrapper">
            {provider.average_rating >= 4.5 && (
              <span className="top-rated-badge">Top Rated</span>
            )}
            <span className="profile-badge">{provider.service_type}</span>
            <div className="modal-icons">
              {provider.phone_number && (
                <a href={`tel:${provider.phone_number}`} title="Call">
                  <FaPhone />
                </a>
              )}
              {provider.email && (
                <a href={`mailto:${provider.email}`} title="Email">
                  <FaEnvelope />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Body Info */}
        <div className="profile-section">
          <p><strong>Description:</strong> {provider.description || 'N/A'}</p>
          <p><strong>Date of Recommendation:</strong> {formattedDate}</p>
          {provider.recommended_by_name && (
            <p><strong>Recommended by:</strong> {provider.recommended_by_name}</p>
          )}
          {alsoUsedBy.length > 0 && (
            <p><strong>Also used by:</strong> {alsoUsedBy.join(', ')}</p>
          )}
          {Array.isArray(provider.tags) && provider.tags.length > 0 && (
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
        </div>

        <hr className="my-4" />

        {/* Reviews */}
        <div className="profile-reviews">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Reviews</h3>
          {reviews.length === 0 ? (
            <p className="no-reviews">No reviews yet.</p>
          ) : (
            reviews.map((review, index) => (
              <div key={index} className="profile-review">
                <div className="review-stars">
                  {[...Array(5)].map((_, i) => (
                    <FaStar key={i} className={i < review.rating ? 'star active' : 'star'} style={{ color: '#1A365D' }} />
                  ))}
                </div>
                <p className="review-content">"{review.content}"</p>
                <p className="review-user">– {review.user_name || 'Anonymous'}</p>
              </div>
            ))
          )}
        </div>

        <div className="modal-buttons mt-6">
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
  const [clickedRecommender, setClickedRecommender] = useState(null);
  const [showFeatureComingModal, setShowFeatureComingModal] = useState(false);
  const [dropdownOpenForId, setDropdownOpenForId] = useState(null);
  const [showLinkCopied, setShowLinkCopied] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);


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
  
        const enriched = filtered.map((p, idx) => ({
          ...p,
          originalIndex:  idx,
          average_rating: statsMap[p.id]?.average_rating || 0,
          total_reviews:  statsMap[p.id]?.total_reviews || 0,
        }));
        // let sorted = [];
        // if (sortOption === 'topRated') {
        //   sorted = enriched
        //     .filter(p => p.average_rating >= 4.5)
        //     .sort((a, b) => b.average_rating - a.average_rating || b.total_reviews - a.total_reviews);
        // } else {
        //   sorted = enriched
        //     .sort((a, b) => {
        //       const aAbove4 = a.average_rating >= 4 ? 1 : 0;
        //       const bAbove4 = b.average_rating >= 4 ? 1 : 0;
        //       if (aAbove4 !== bAbove4) return bAbove4 - aAbove4;
        //       return b.total_reviews - a.total_reviews;
        //     });
        // }
  
        // setProviders(sorted);
        const getBand = rating => {
          if (rating >= 4) return 0;
          if (rating >= 3) return 1;
          if (rating >= 2) return 2;
          if (rating >= 1) return 3;
          return 4;
        };
        
        // 3) Sort
        let sorted;
        if (sortOption === 'topRated') {
          // keep your existing topRated logic, e.g. filter >=4.5 then sort by score
          sorted = enriched
            .filter(p => p.average_rating >= 4.5)
            .sort((a, b) => {
              const aScore = a.average_rating * a.total_reviews;
              const bScore = b.average_rating * b.total_reviews;
              if (bScore !== aScore) return bScore - aScore;
              if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating;
              if (b.total_reviews !== a.total_reviews) return b.total_reviews - a.total_reviews;
              return a.originalIndex - b.originalIndex;
            });
        } else {
          // “Recommended”: group by band, then by score, then avg, then count, then originalIndex
          sorted = enriched.sort((a, b) => {
            const bandA = getBand(a.average_rating);
            const bandB = getBand(b.average_rating);
            if (bandA !== bandB) return bandA - bandB;
        
            const scoreA = a.average_rating * a.total_reviews;
            const scoreB = b.average_rating * b.total_reviews;
            if (scoreB !== scoreA) return scoreB - scoreA;
        
            if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating;
            if (b.total_reviews !== a.total_reviews) return b.total_reviews - a.total_reviews;
        
            return a.originalIndex - b.originalIndex;
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
      <h1 className="section-heading">Top Repair Service Providers</h1>
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
              <h2 className="card-title">
                <Link
                  to={`/provider/${provider.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="clickable"
                  onClick={() => {
                    // preserve for your profile page if you need it
                    localStorage.setItem('selectedProvider', JSON.stringify(provider));
                  }}
                >
                  {provider.business_name}
                </Link>
              </h2>
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

                {showLinkCopied && (
                  <div className="toast">Link copied!</div>
                )}
                </div>
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
                    Write a Review
                  </button>
                </div>
              )}

              <p className="card-description">{provider.description || 'No description available'}</p>
              {Array.isArray(provider.tags) && provider.tags.length > 0 && (
                <div className="tag-container">
                {provider.tags && provider.tags.length > 0 ? (
                  provider.tags.map((tag, idx) => (
                    <span key={idx} className="tag-badge">{tag}</span>
                  ))
                ) : (
                  <span className="no-tags">No tags yet</span>
                )}
                <button
                  className="add-tag-button"
                  onClick={() => {
                    setSelectedProvider(provider);
                    setIsReviewModalOpen(true);
                  }}
                  aria-label="Add a tag"
                >
                  +
                </button>
              </div>
              )}
              {provider.recommended_by_name && (
                <>
                  <div className="recommended-row">
                    <span className="recommended-label">Recommended by:</span>
                    {provider.recommended_by ? (
                      <Link
                        to={`/user/${provider.recommended_by}/recommendations`}
                        className="recommended-name clickable"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {provider.recommended_by_name}
                      </Link>
                    ) : (
                      <span className="recommended-name">
                        {provider.recommended_by_name}
                      </span>
                    )}
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
              {/* <div className="action-buttons">
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
              </div> */}
              <div className="action-buttons">
                {/* 2) Request a Quote */}
                {/* <button
                  className="primary-button"
                  onClick={() => {
                    const msg = prompt(`Tell ${provider.business_name} what you need:`);
                    if (msg !== null && msg.trim() !== '') {
                      alert(`Thanks. ${provider.business_name} will reach out to you directly.`);
                      // ← if you want to POST msg to your backend, do it here
                    }
                  }}
                >
                  Request a Quote
                </button> */}
                <button
                  className="primary-button"
                  onClick={() => {
                    setSelectedProvider(provider);
                    setIsQuoteModalOpen(true);
                  }}
                >
                  Request a Quote
                </button>

                {/* 3) Connect with Recommender */}
                <button
                  className="secondary-button"
                  onClick={() => {
                    // prefer SMS if possible
                    if (provider.recommender_phone) {
                      window.location.href = `sms:${provider.recommender_phone}`;
                    } 
                    // otherwise email
                    else if (provider.recommender_email) {
                      window.location.href = `mailto:${provider.recommender_email}`;
                    } 
                    // fallback
                    else {
                      alert('Sorry, contact info not available.');
                    }
                  }}
                >
                  Connect with Recommender
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
    {isQuoteModalOpen && selectedProvider && (
      <QuoteModal
        providerName={selectedProvider.business_name}
        providerEmail={selectedProvider.email} 
        providerPhotoUrl={selectedProvider.profile_image}
        onClose={() => setIsQuoteModalOpen(false)}
      />
    )}
    </div>
  );
};

export default ApplianceServices;

// 4/10 working review modal: 

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