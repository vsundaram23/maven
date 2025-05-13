// src/pages/Search/Search.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaStar, FaPhone, FaEnvelope } from 'react-icons/fa';
import './Search.css';

// const API_URL = 'https://api.seanag-recommendations.org:8080';
const API_URL = 'http://localhost:3000';

// ... (StarRating, ReviewModal, ProviderProfileModal components remain the same) ...
const StarRating = ({ rating }) => {
  const fullStars  = Math.floor(rating);
  const hasHalf    = rating - fullStars >= 0.5;
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
  const [rating, setRating]     = useState(0);
  const [hover, setHover]       = useState(0);
  const [review, setReview]     = useState('');
  const [tags, setTags]         = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [error, setError]       = useState('');

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

  const removeTag = (tagToRemove) =>
    setTags(tags.filter(tag => tag !== tagToRemove));

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
    setError('');
    onClose();
  };

  if (!isOpen || !provider) return null;

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
              {[...Array(5)].map((_, idx) => (
                <FaStar
                  key={idx}
                  className={idx < (hover || rating) ? 'star active' : 'star'}
                  onClick={() => setRating(idx + 1)}
                  onMouseEnter={() => setHover(idx + 1)}
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
              onChange={e => setReview(e.target.value)}
              placeholder="Optional: Share your thoughts..."
              rows={4}
            />
          </div>
          <div className="tag-input-group">
            <label>Add tags (press Enter to add):</label>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="e.g. fast, professional"
            />
            <div className="tag-container">
              {tags.map((tag, idx) => (
                <span key={idx} className="tag-badge">
                  {tag}
                  <button
                    type="button"
                    className="remove-tag"
                    onClick={() => removeTag(tag)}
                  >×</button>
                </span>
              ))}
            </div>
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

const ProviderProfileModal = ({
  isOpen,
  onClose,
  provider,
  reviews = [],
  setSelectedProvider,
  setIsReviewModalOpen
}) => {
  if (!isOpen || !provider) return null;

  const formattedDate = provider.date_of_recommendation
    ? new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
        year: '2-digit', month: 'numeric', day: 'numeric'
      })
    : 'Not provided';

  const recommenders = new Set();
  if (provider.recommended_by_name) recommenders.add(provider.recommended_by_name);
  reviews.forEach(r => r.user_name && recommenders.add(r.user_name));
  const alsoUsedBy = Array.from(recommenders).filter(n => n !== provider.recommended_by_name);

  return (
    <div className="modal-overlay">
      <div className="profile-modal-content">
        <button className="modal-close-x" onClick={onClose}>×</button>
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
              >+</button>
            </div>
          )}
        </div>
        <hr />
        <div className="profile-reviews">
          <h3>Reviews</h3>
          {reviews.length === 0
            ? <p>No reviews yet.</p>
            : reviews.map((r, i) => (
                <div key={i} className="profile-review">
                  <div className="review-stars">
                    {[...Array(5)].map((_, j) => (
                      <FaStar
                        key={j}
                        className={j < r.rating ? 'star active' : 'star'}
                      />
                    ))}
                  </div>
                  <p>"{r.content}"</p>
                  <p>– {r.user_name || 'Anonymous'}</p>
                </div>
              ))
          }
        </div>
        <div className="modal-buttons">
          <button className="cancel-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};


const Search = () => {
  const location     = useLocation();
  const params       = new URLSearchParams(location.search);
  const query        = params.get('q');
  const noResults    = params.get('noResults') === 'true';

  const [providers, setProviders]             = useState([]);
  const [reviewStatsMap, setReviewStatsMap]   = useState({});
  const [reviewMap, setReviewMap]             = useState({});
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);
  const [sortOption, setSortOption]           = useState('recommended');

  const [isReviewModalOpen, setIsReviewModalOpen]     = useState(false);
  const [selectedProvider, setSelectedProvider]       = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen]   = useState(false);
  const [clickedRecommender, setClickedRecommender]   = useState(null);
  const [showFeatureComingModal, setShowFeatureComingModal] = useState(false);
  const [dropdownOpenForId, setDropdownOpenForId]     = useState(null);
  const [showLinkCopied, setShowLinkCopied]           = useState(false);

  // Directly get user ID from localStorage
  const getCurrentUserId = () => {
    const userString = localStorage.getItem('user'); // Assuming key is 'user'
    if (userString) {
      try {
        const userObject = JSON.parse(userString);
        return userObject?.id || null;
      } catch (e) {
        console.error("Error parsing user from localStorage:", e);
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    if (!query || noResults) {
      setLoading(false);
      setProviders([]);
      return;
    }

    const currentUserId = getCurrentUserId();

    if (!currentUserId) {
        console.warn("Search cannot be performed: User ID not found in localStorage. Please log in.");
        setError("Please log in to search for recommendations.");
        setLoading(false);
        setProviders([]);
        return;
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const fetchUrl = `${API_URL}/api/providers/search?q=${encodeURIComponent(query)}&user_id=${currentUserId}`;
        console.log("Fetching search results from:", fetchUrl);
        const res  = await fetch(fetchUrl);

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || `Failed to fetch with status: ${res.status}`);
        }

        const data = await res.json();
        if (!data.success) {
            throw new Error(data.message || data.error || 'Search request was not successful');
        }

        let raw = data.providers || [];
        const stats = {};
        const revs = {};

        await Promise.all(raw.map(async p => {
          if (p.average_rating === undefined || p.total_reviews === undefined) {
            try {
                const sRes = await fetch(`${API_URL}/api/reviews/stats/${p.id}`);
                const sData = await sRes.json();
                stats[p.id] = {
                average_rating: parseFloat(sData.average_rating) || 0,
                total_reviews:  parseInt(sData.total_reviews, 10) || 0
                };
            } catch {
                stats[p.id] = { average_rating: 0, total_reviews: 0 };
            }
          } else {
            stats[p.id] = { average_rating: p.average_rating, total_reviews: p.total_reviews };
          }
          try {
              const rRes = await fetch(`${API_URL}/api/reviews/${p.id}`);
              revs[p.id] = await rRes.json();
          } catch {
              revs[p.id] = [];
          }
        }));
        setReviewStatsMap(stats);
        setReviewMap(revs);

        raw = raw.map(p => ({
          ...p,
          average_rating: stats[p.id]?.average_rating ?? p.average_rating ?? 0,
          total_reviews:  stats[p.id]?.total_reviews ?? p.total_reviews ?? 0
        }));

        let sorted = raw;
        if (sortOption === 'topRated') {
          sorted = raw
            .filter(p => p.average_rating >= 4.5)
            .sort((a, b) =>
              b.average_rating - a.average_rating ||
              b.total_reviews - a.total_reviews
            );
        } else {
          sorted = raw.sort((a, b) => {
            const a4 = a.average_rating >= 4 ? 1 : 0;
            const b4 = b.average_rating >= 4 ? 1 : 0;
            if (a4 !== b4) return b4 - a4;
            return b.total_reviews - a.total_reviews;
          });
        }
        setProviders(sorted);
      } catch (err) {
        console.error("Error in search useEffect:", err);
        setError(err.message || 'Failed to fetch providers');
        setProviders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [query, noResults, sortOption]); // Removed currentLoggedInUser from dependency array as it's read directly inside


  const handleReviewSubmit = async ({ rating, review, tags }) => {
    const userEmail = localStorage.getItem('userEmail'); // Still using email for submitting review for now
    if (!selectedProvider || !userEmail) {
        console.error("Cannot submit review: provider or user email missing.");
        return;
    }
    try {
      await fetch(`${API_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id:    selectedProvider.id,
          provider_email: selectedProvider.email || '',
          email:          userEmail,
          rating,
          content:        review,
          tags
        })
      });
    } catch (err) {
      console.error('Error submitting review:', err);
    }
  };

  const handleConsultation = provider => {
    if (provider.phone_number) {
      window.location.href =
        `sms:${provider.phone_number}?body=Hi ${provider.business_name}, I'd like to request a consultation.`;
    } else if (provider.email) {
      window.location.href =
        `mailto:${provider.email}?subject=Request Consultation`;
    } else {
      alert("Thanks! We'll reach out shortly.");
    }
  };

  if (loading) return <div className="loading-spinner">Loading...</div>;
  if (error && providers.length === 0) return <div className="error-message">{error}</div>;
  if ((noResults || providers.length === 0) && !loading) {
    return (
      <div className="no-results">
        <p>No trusted providers found for your search "{query}".</p>
        <button
          className="primary-button"
          onClick={() => alert('Coming soon: Bump your network!')}
        >
          Bump Your Network
        </button>
      </div>
    );
  }

  return (
    <div className="search-results-container">
      <h1 className="section-heading">Search Results for "{query}"</h1>
      {error && <div className="error-message small-error">{error}</div>}

      <div className="sort-bar">
        Sort by:
        <select
          className="sort-dropdown"
          value={sortOption}
          onChange={e => setSortOption(e.target.value)}
        >
          <option value="recommended">Recommended</option>
          <option value="topRated">Top Rated</option>
        </select>
      </div>

      <ul className="provider-list">
        {providers.map(p => {
          const stats = reviewStatsMap[p.id] || { average_rating: p.average_rating || 0, total_reviews: p.total_reviews || 0 };
          const revs  = reviewMap[p.id]   || [];
          return (
            <li key={p.id} className="provider-card">
              <div className="card-header">
                <h2 className="card-title">{p.business_name}</h2>
                <div className="badge-wrapper-with-menu">
                  <div className="badge-group">
                    {stats.average_rating >= 4.5 && (
                      <span className="top-rated-badge">Top Rated</span>
                    )}
                    <span className="profile-badge">{p.service_type || p.category}</span>
                  </div>
                  <div className="dropdown-wrapper">
                    <button
                      className="three-dots-button"
                      onClick={() =>
                        setDropdownOpenForId(dropdownOpenForId === p.id ? null : p.id)
                      }
                    >
                      ⋮
                    </button>
                    {dropdownOpenForId === p.id && (
                      <div className="dropdown-menu">
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `https://triedandtrusted.ai/provider/${p.id}`
                            );
                            setDropdownOpenForId(null);
                            setShowLinkCopied(true);
                            setTimeout(() => setShowLinkCopied(false), 2000);
                          }}
                        >
                          Share this Rec
                        </button>
                      </div>
                    )}
                    {showLinkCopied && <div className="toast">Link copied!</div>}
                  </div>
                </div>
              </div>

              <div className="review-summary">
                <StarRating rating={stats.average_rating} />
                <span className="review-score">
                  {stats.average_rating.toFixed(1)} ({stats.total_reviews})
                </span>
                <button
                  className="see-all-button"
                  onClick={() => {
                    setSelectedProvider(p);
                    setIsReviewModalOpen(true);
                  }}
                >
                  Write a Review
                </button>
              </div>

              <p className="card-description">{p.description || 'No description available'}</p>

              {Array.isArray(p.tags) && p.tags.length > 0 && (
                <div className="tag-container">
                  {p.tags.map((t, i) => (
                    <span key={i} className="tag-badge">{t}</span>
                  ))}
                </div>
              )}

              {p.recommender_name && (
                <div className="recommended-row">
                  <span className="recommended-label">Recommended by:</span>
                  <span
                    className="recommended-name clickable"
                    onClick={() => setClickedRecommender(p.recommender_name)}
                  >
                    {p.recommender_name}
                  </span>
                </div>
              )}

              {revs.length > 0 &&
                [...new Set(revs.map(r => r.user_name).filter(n => n && n !== p.recommender_name))].length > 0 && (
                <div className="recommended-row">
                  <span className="recommended-label">Also used by:</span>
                  <span className="used-by-names">
                    {[...new Set(revs.map(r => r.user_name).filter(n => n && n !== p.recommender_name))].join(', ')}
                  </span>
                </div>
              )}

              <div className="action-buttons">
                <button
                  className="primary-button"
                  onClick={() => {
                    setSelectedProvider(p);
                    setIsProfileModalOpen(true);
                  }}
                >
                  View Profile
                </button>
                <button
                  className="secondary-button"
                  onClick={() => handleConsultation(p)}
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
          onSubmit={handleReviewSubmit}
          provider={selectedProvider}
        />
      )}
      {isProfileModalOpen && selectedProvider && (
        <ProviderProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          provider={selectedProvider}
          reviews={reviewMap[selectedProvider.id]}
          setSelectedProvider={setSelectedProvider}
          setIsReviewModalOpen={setIsReviewModalOpen}
        />
      )}
      {clickedRecommender && (
        <div className="modal-overlay">
          <div className="simple-modal">
            <button className="modal-close-x" onClick={() => setClickedRecommender(null)}>×</button>
            <h3>Want to connect with <span className="highlight">{clickedRecommender}</span>?</h3>
            <div className="modal-buttons-vertical">
              <button className="secondary-button" onClick={() => { setClickedRecommender(null); setShowFeatureComingModal(true); }}>Thank {clickedRecommender}</button>
              <button className="secondary-button" onClick={() => { setClickedRecommender(null); setShowFeatureComingModal(true); }}>Ask {clickedRecommender} a question</button>
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

export default Search;

// waiting 4/20
// import React, { useEffect, useState } from 'react';
// import { useLocation } from 'react-router-dom';
// import { FaPhone, FaEnvelope, FaStar } from 'react-icons/fa';
// import './Search.css';

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

// const Search = () => {
//   const location = useLocation();
//   const [results, setResults] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
//   const [selectedProvider, setSelectedProvider] = useState(null);
//   const params = new URLSearchParams(location.search);
//   const query = params.get('q');
//   const noResults = params.get('noResults') === 'true';

//   useEffect(() => {
//     if (!query || noResults) {
//       setLoading(false);
//       return;
//     }

//     fetch(`${API_URL}/api/providers/search?q=${encodeURIComponent(query)}`)
//       .then(res => res.json())
//       .then(data => {
//         setResults(data.providers || []);
//         setLoading(false);
//       })
//       .catch(err => {
//         console.error('Error fetching search results:', err);
//         setError('Failed to fetch search results');
//         setLoading(false);
//       });
//   }, [query, noResults]);

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
//           content: reviewData.review,
//         }),
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

//   if (loading) return <div className="loading-spinner">Loading results...</div>;
//   if (error) return <div className="error-message">{error}</div>;
//   if (noResults || results.length === 0) {
//     return (
//       <div className="no-results">
//         <p>No trusted providers found for your search.</p>
//         <button
//           className="primary-button"
//           onClick={() => alert('Coming soon: Bump your network!')}
//         >
//           Bump Your Network
//         </button>
//       </div>
//     );
//   }

//   return (
//     <div className="search-results-container">
//       <h1 className="section-heading">Search Results</h1>
//       <ul className="provider-list">
//         {results.map((provider) => (
//           <li key={provider.id || Math.random()} className="provider-card">
//             <div className="card-header">
//               <h2 className="card-title">{provider.business_name}</h2>
//               <span className="badge">{provider.service_type || 'Service'}</span>
//             </div>

//             <p className="card-description">{provider.description || 'No description available'}</p>

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

// export default Search;


// import React, { useEffect, useState } from 'react';
// import { useLocation } from 'react-router-dom';
// import { FaPhone, FaEnvelope, FaHeart } from 'react-icons/fa';
// import './Search.css';

// const API_URL = 'https://api.seanag-recommendations.org:8080';

// const Search = () => {
//   const location = useLocation();
//   const [results, setResults] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const params = new URLSearchParams(location.search);
//   const query = params.get('q');
//   const noResults = params.get('noResults') === 'true';
//   const [likedProviders, setLikedProviders] = useState({});

//   useEffect(() => {
//     if (!query || noResults) {
//       setLoading(false);
//       return;
//     }

//     fetch(`${API_URL}/api/providers/search?q=${encodeURIComponent(query)}`)
//       .then(res => res.json())
//       .then(data => {
//         setResults(data.providers || []);
//         setLoading(false);
//       })
//       .catch(err => {
//         console.error('Error fetching search results:', err);
//         setLoading(false);
//       });
//   }, [query, noResults]);

//   const handleLike = (id) => {
//     setLikedProviders(prev => ({
//       ...prev,
//       [id]: !prev[id]
//     }));
//   };

//   return (
//     <div className="search-page">
//       <h1 className="search-heading">Results for “{query}”:</h1>

//       {loading ? (
//         <p className="search-loading">Loading results...</p>
//       ) : noResults || results.length === 0 ? (
//         <div className="no-results">
//           <p>No trusted providers found for your search.</p>
//           <button className="bump-network-button" onClick={() => alert("Coming soon: Bump your network!")}>
//             Bump Your Network
//           </button>
//         </div>
//       ) : (
//         <ul className="provider-list">
//           {results.map((provider) => (
//             <li key={provider.id} className="provider-card">
//               <div className="card-header">
//                 <h2 className="card-title">{provider.business_name || provider.name}</h2>
//                 {provider.service_type && (
//                   <span className="badge">{provider.service_type}</span>
//                 )}
//               </div>

//               <p className="card-description">{provider.description}</p>

//               <div className="card-meta">
//                 {provider.phone_number && (
//                   <span className="meta-item"><FaPhone /> {provider.phone_number}</span>
//                 )}
//                 {provider.email && (
//                   <span className="meta-item"><FaEnvelope /> {provider.email}</span>
//                 )}
//               </div>

//               {provider.recommended_by_name && (
//                 <div className="recommended-row">
//                   <span className="recommended-label">Recommended by:</span>
//                   <span className="recommended-name">{provider.recommended_by_name}</span>

//                   <button
//                     className={`heart-button ${likedProviders[provider.id] ? 'liked' : ''}`}
//                     onClick={() => handleLike(provider.id)}
//                   >
//                     <FaHeart />
//                   </button>
//                 </div>
//               )}
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// };

// export default Search;
