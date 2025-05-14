import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaStar, FaPhone, FaEnvelope } from 'react-icons/fa';
import QuoteModal from '../../components/QuoteModal/QuoteModal';
import './Search.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = 'http://localhost:3000';

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
  const [rating, setRating]     = useState(0);
  const [hover, setHover]       = useState(0);
  const [review, setReview]     = useState('');
  const [tags, setTags]         = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [error, setError]       = useState('');

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
            <div className="tag-container modal-tag-container">
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
  if (provider.recommender_name) recommenders.add(provider.recommender_name);
  reviews.forEach(r => r.user_name && recommenders.add(r.user_name));
  const alsoUsedBy = Array.from(recommenders).filter(n => n !== provider.recommender_name);
  const currentProviderAverageRating = parseFloat(provider.average_rating) || 0;

  return (
    <div className="modal-overlay">
      <div className="profile-modal-content">
        <button className="modal-close-x" onClick={onClose}>×</button>
        <div className="profile-header">
          <h2 className="profile-name">{provider.business_name}</h2>
          <div className="badge-wrapper">
            {currentProviderAverageRating >= 4.5 && (
              <span className="top-rated-badge">Top Rated</span>
            )}
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
          <p><strong>Service Type:</strong> {provider.service_type || provider.category || 'N/A'}</p>
          <p><strong>Date of Recommendation:</strong> {formattedDate}</p>
          {provider.recommender_name && (
            <p><strong>Recommended by:</strong> {provider.recommender_name}
            {provider.date_of_recommendation &&
                ` (on ${new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'})})`}
            </p>
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
                  if (setSelectedProvider && setIsReviewModalOpen) {
                    setSelectedProvider(provider);
                    setIsReviewModalOpen(true);
                  }
                }}
              >+</button>
            </div>
          )}
        </div>
        <hr />
        <div className="profile-reviews">
          <h3>Reviews</h3>
          {reviews.length === 0
            ? <p className="no-reviews">No reviews yet.</p>
            : reviews.map((r, i) => (
                <div key={i} className="profile-review">
                  <div className="review-stars">
                    {[...Array(5)].map((_, j) => (
                      <FaStar
                        key={j}
                        className={j < r.rating ? 'star active' : 'star'}
                        style={{ color: '#1A365D' }}
                      />
                    ))}
                  </div>
                  <p className="review-content">"{r.content}"</p>
                  <p className="review-user">– {r.user_name || 'Anonymous'}</p>
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
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const query = params.get('q');
  const noResults = params.get('noResults') === 'true';
  const userIdFromUrl = params.get('user_id');

  const [providers, setProviders] = useState(location.state?.initialProviders || []);
  const [currentUserId, setCurrentUserId] = useState(location.state?.currentSearchUserId || null);

  const [reviewStatsMap, setReviewStatsMap] = useState({});
  const [reviewMap, setReviewMap] = useState({});
  const [loading, setLoading] = useState(!location.state?.initialProviders);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState('recommended');

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [clickedRecommender, setClickedRecommender] = useState(null);
  const [showFeatureComingModal, setShowFeatureComingModal] = useState(false);
  const [dropdownOpenForId, setDropdownOpenForId] = useState(null);
  const [showLinkCopied, setShowLinkCopied] = useState(false);

  useEffect(() => {
    let idToUse = userIdFromUrl;
    if (!idToUse) {
      const rawUser = localStorage.getItem('user');
      if (rawUser) {
        try {
          const userObject = JSON.parse(rawUser);
          idToUse = userObject?.id || null;
        } catch (e) {
          idToUse = null;
        }
      }
    }
    if (idToUse !== currentUserId) {
        setCurrentUserId(idToUse);
    }
  }, [userIdFromUrl, currentUserId]);


  const fetchAndProcessProviders = async (providersToProcess) => {
    setLoading(true);
    const stats = {};
    const revs = {};
    await Promise.all(providersToProcess.map(async p => {
        try {
            const statsRes = await fetch(`${API_URL}/api/reviews/stats/${p.id}`);
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                stats[p.id] = {
                    average_rating: parseFloat(statsData.average_rating) || 0,
                    total_reviews: parseInt(statsData.total_reviews, 10) || 0,
                };
            } else {
                 stats[p.id] = { average_rating: p.average_rating ?? 0, total_reviews: p.total_reviews ?? 0 };
            }
        } catch (err) {
            stats[p.id] = { average_rating: p.average_rating ?? 0, total_reviews: p.total_reviews ?? 0 };
        }
        try {
            const rRes = await fetch(`${API_URL}/api/reviews/${p.id}`);
            if(rRes.ok) revs[p.id] = await rRes.json(); else revs[p.id] = [];
        } catch { revs[p.id] = []; }
    }));
    setReviewStatsMap(stats);
    setReviewMap(revs);

    const enrichedProviders = providersToProcess.map(p => ({
        ...p,
        average_rating: stats[p.id]?.average_rating ?? p.average_rating ?? 0,
        total_reviews: stats[p.id]?.total_reviews ?? p.total_reviews ?? 0
    }));
    
    setProviders(enrichedProviders);
    setLoading(false);
  };


  useEffect(() => {
    const passedProviders = location.state?.initialProviders;
    const passedUserId = location.state?.currentSearchUserId;

    if (passedProviders && passedProviders.length > 0 && passedUserId && passedUserId === currentUserId && query === params.get('q')) {
        fetchAndProcessProviders(passedProviders);
        return;
    }

    if (!query || (noResults && !passedProviders)) {
      setLoading(false);
      setProviders([]);
      return;
    }

    if (!currentUserId) {
      if (!localStorage.getItem('user')) {
        setError("Please log in to search for recommendations.");
      }
      setLoading(false);
      setProviders([]);
      return;
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const fetchUrl = `${API_URL}/api/providers/search?q=${encodeURIComponent(query)}&user_id=${currentUserId}`;
        const res = await fetch(fetchUrl);

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: `Failed to fetch with status: ${res.status}` }));
          throw new Error(errorData.message || errorData.error || `Failed to fetch with status: ${res.status}`);
        }

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.message || data.error || 'Search request was not successful');
        }
        fetchAndProcessProviders(data.providers || []);
      } catch (err) {
        setError(err.message || 'Failed to fetch providers');
        setProviders([]);
        setLoading(false);
      }
    })();
  }, [query, noResults, sortOption, currentUserId, location.state]);


  const handleReviewSubmit = async ({ rating, review, tags }) => {
    const userEmail = localStorage.getItem('userEmail');
    if (!selectedProvider || !userEmail) {
      alert("Cannot submit review: User or provider details missing.");
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
          rating,
          content: review,
          tags
        })
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Failed to submit review");
      }
      const updatedProviders = providers.map(p => p.id === selectedProvider.id ? { ...p } : p);
      fetchAndProcessProviders(updatedProviders);

    } catch (err) {
      alert(`Error submitting review: ${err.message}`);
    }
  };

  if (loading && providers.length === 0) return <div className="loading-spinner">Loading...</div>;
  if (error && providers.length === 0 && !loading) return <div className="error-message">{error}</div>;
  if ((noResults || providers.length === 0) && !loading) {
    return (
      <div className="no-results">
        <p>No trusted providers found for your search "{query}".</p>
        <button
          className="primary-button"
          onClick={() => navigate('/add-recommendation')}
        >
          Recommend a Provider
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
          const providerStats = reviewStatsMap[p.id] || { average_rating: p.average_rating || 0, total_reviews: p.total_reviews || 0 };
          const providerReviews  = reviewMap[p.id]   || [];
          const displayAvgRating = (parseFloat(providerStats.average_rating) || 0).toFixed(1);

          return (
            <li key={p.id} className="provider-card">
              <div className="card-header">
                <h2 className="card-title">
                    <Link
                        to={`/provider/${p.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="provider-name-link"
                        onClick={() => localStorage.setItem('selectedProvider', JSON.stringify(p))}
                    >
                        {p.business_name}
                    </Link>
                </h2>
                <div className="badge-wrapper-with-menu">
                  <div className="badge-group">
                    {(parseFloat(providerStats.average_rating) || 0) >= 4.5 && (
                      <span className="top-rated-badge">Top Rated</span>
                    )}
                  </div>
                  <div className="dropdown-wrapper">
                    <button
                      className="three-dots-button"
                      onClick={() =>
                        setDropdownOpenForId(dropdownOpenForId === p.id ? null : p.id)
                      }
                      title="Options"
                    >
                      ⋮
                    </button>
                    {dropdownOpenForId === p.id && (
                      <div className="dropdown-menu">
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${window.location.origin}/provider/${p.id}`
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
                <StarRating rating={parseFloat(providerStats.average_rating) || 0} />
                <span className="review-score">
                  {displayAvgRating} ({providerStats.total_reviews || 0})
                </span>
                <button
                  className="see-all-button" // "Write a Review" button
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
                  {p.tags.map((tag, idx) => (
                    <span key={`${idx}-${p.id}`} className="tag-badge">{tag}</span>
                  ))}
                  <button
                    className="add-tag-button"
                    onClick={() => {
                      setSelectedProvider(p);
                      setIsReviewModalOpen(true);
                    }}
                  >
                    +
                  </button>
                </div>
              )}


              {p.recommender_name && (
                <div className="recommended-row">
                  <span className="recommended-label">Recommended by:</span>
                  {p.recommender_user_id ? (
                        <Link
                            to={`/user/${p.recommender_user_id}/recommendations`}
                            className="recommended-name clickable"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {p.recommender_name}
                        </Link>
                    ) : (
                        <span
                            className="recommended-name clickable"
                            onClick={() => setClickedRecommender(p.recommender_name)}
                        >
                            {p.recommender_name}
                        </span>
                    )}
                  {p.date_of_recommendation && (
                        <span className="recommendation-date">
                            {'('}{new Date(p.date_of_recommendation).toLocaleDateString('en-US', {
                                year: '2-digit', month: 'numeric', day: 'numeric',
                            })}{')'}
                        </span>
                    )}
                </div>
              )}

              {providerReviews.length > 0 &&
                [...new Set(providerReviews.map(r => r.user_name).filter(n => n && n !== p.recommender_name))].length > 0 && (
                <div className="recommended-row">
                  <span className="recommended-label">Also used by:</span>
                  <span className="used-by-names">
                    {[...new Set(providerReviews.map(r => r.user_name).filter(n => n && n !== p.recommender_name))].join(', ')}
                  </span>
                </div>
              )}

              <div className="action-buttons">
                <button
                    className="primary-button"
                    onClick={() => {
                        setSelectedProvider(p);
                        setIsQuoteModalOpen(true);
                    }}
                >
                    Request a Quote
                </button>
                 <button
                    className="secondary-button"
                    onClick={() => {
                        if (p.recommender_phone) {
                            window.location.href = `sms:${p.recommender_phone}`;
                        } else if (p.recommender_email) {
                            window.location.href = `mailto:${p.recommender_email}`;
                        } else {
                            alert('Sorry, contact info for the recommender is not available.');
                        }
                    }}
                    disabled={!p.recommender_phone && !p.recommender_email && !p.recommender_name} 
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
          onSubmit={handleReviewSubmit}
          provider={selectedProvider}
        />
      )}
      {isProfileModalOpen && selectedProvider && (
        <ProviderProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          provider={selectedProvider}
          reviews={reviewMap[selectedProvider.id] || []}
          setSelectedProvider={setSelectedProvider}
          setIsReviewModalOpen={setIsReviewModalOpen}
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
            <button className="modal-close-x" onClick={() => setShowFeatureComingModal(false)}>×</button>
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

// import React, { useState, useEffect } from 'react';
// import { Link, useLocation, useNavigate } from 'react-router-dom';
// import { FaStar, FaPhone, FaEnvelope } from 'react-icons/fa';
// import './Search.css';

// const API_URL = 'https://api.seanag-recommendations.org:8080';
// // const API_URL = 'http://localhost:3000';

// const StarRating = ({ rating }) => {
//   const fullStars  = Math.floor(rating);
//   const hasHalf    = rating - fullStars >= 0.5;
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
//   const [rating, setRating]     = useState(0);
//   const [hover, setHover]       = useState(0);
//   const [review, setReview]     = useState('');
//   const [tags, setTags]         = useState([]);
//   const [tagInput, setTagInput] = useState('');
//   const [error, setError]       = useState('');

//   const handleTagKeyDown = (e) => {
//     if (e.key === 'Enter') {
//       e.preventDefault();
//       const trimmed = tagInput.trim();
//       if (trimmed && !tags.includes(trimmed)) {
//         setTags([...tags, trimmed]);
//       }
//       setTagInput('');
//     }
//   };

//   const removeTag = (tagToRemove) =>
//     setTags(tags.filter(tag => tag !== tagToRemove));

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (!rating) {
//       setError('Please select a rating');
//       return;
//     }
//     onSubmit({ rating, review, tags });
//     setRating(0);
//     setReview('');
//     setTags([]);
//     setTagInput('');
//     setError('');
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
//               {[...Array(5)].map((_, idx) => (
//                 <FaStar
//                   key={idx}
//                   className={idx < (hover || rating) ? 'star active' : 'star'}
//                   onClick={() => setRating(idx + 1)}
//                   onMouseEnter={() => setHover(idx + 1)}
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
//               onChange={e => setReview(e.target.value)}
//               placeholder="Optional: Share your thoughts..."
//               rows={4}
//             />
//           </div>
//           <div className="tag-input-group">
//             <label>Add tags (press Enter to add):</label>
//             <input
//               type="text"
//               value={tagInput}
//               onChange={e => setTagInput(e.target.value)}
//               onKeyDown={handleTagKeyDown}
//               placeholder="e.g. fast, professional"
//             />
//             <div className="tag-container">
//               {tags.map((tag, idx) => (
//                 <span key={idx} className="tag-badge">
//                   {tag}
//                   <button
//                     type="button"
//                     className="remove-tag"
//                     onClick={() => removeTag(tag)}
//                   >×</button>
//                 </span>
//               ))}
//             </div>
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

// const ProviderProfileModal = ({
//   isOpen,
//   onClose,
//   provider,
//   reviews = [],
//   setSelectedProvider,
//   setIsReviewModalOpen
// }) => {
//   if (!isOpen || !provider) return null;

//   const formattedDate = provider.date_of_recommendation
//     ? new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
//         year: '2-digit', month: 'numeric', day: 'numeric'
//       })
//     : 'Not provided';

//   const recommenders = new Set();
//   if (provider.recommended_by_name) recommenders.add(provider.recommended_by_name);
//   reviews.forEach(r => r.user_name && recommenders.add(r.user_name));
//   const alsoUsedBy = Array.from(recommenders).filter(n => n !== provider.recommended_by_name);

//   return (
//     <div className="modal-overlay">
//       <div className="profile-modal-content">
//         <button className="modal-close-x" onClick={onClose}>×</button>
//         <div className="profile-header">
//           <h2 className="profile-name">{provider.business_name}</h2>
//           <div className="badge-wrapper">
//             {provider.average_rating >= 4.5 && (
//               <span className="top-rated-badge">Top Rated</span>
//             )}
//             <span className="profile-badge">{provider.service_type}</span>
//             <div className="modal-icons">
//               {provider.phone_number && (
//                 <a href={`tel:${provider.phone_number}`} title="Call">
//                   <FaPhone />
//                 </a>
//               )}
//               {provider.email && (
//                 <a href={`mailto:${provider.email}`} title="Email">
//                   <FaEnvelope />
//                 </a>
//               )}
//             </div>
//           </div>
//         </div>

//         <div className="profile-section">
//           <p><strong>Description:</strong> {provider.description || 'N/A'}</p>
//           <p><strong>Date of Recommendation:</strong> {formattedDate}</p>
//           {provider.recommended_by_name && (
//             <p><strong>Recommended by:</strong> {provider.recommended_by_name}</p>
//           )}
//           {alsoUsedBy.length > 0 && (
//             <p><strong>Also used by:</strong> {alsoUsedBy.join(', ')}</p>
//           )}
//           {Array.isArray(provider.tags) && provider.tags.length > 0 && (
//             <div className="tag-container">
//               {provider.tags.map((tag, idx) => (
//                 <span key={idx} className="tag-badge">{tag}</span>
//               ))}
//               <button
//                 className="add-tag-button"
//                 onClick={() => {
//                   setSelectedProvider(provider);
//                   setIsReviewModalOpen(true);
//                 }}
//               >+</button>
//             </div>
//           )}
//         </div>
//         <hr />
//         <div className="profile-reviews">
//           <h3>Reviews</h3>
//           {reviews.length === 0
//             ? <p>No reviews yet.</p>
//             : reviews.map((r, i) => (
//                 <div key={i} className="profile-review">
//                   <div className="review-stars">
//                     {[...Array(5)].map((_, j) => (
//                       <FaStar
//                         key={j}
//                         className={j < r.rating ? 'star active' : 'star'}
//                       />
//                     ))}
//                   </div>
//                   <p>"{r.content}"</p>
//                   <p>– {r.user_name || 'Anonymous'}</p>
//                 </div>
//               ))
//           }
//         </div>
//         <div className="modal-buttons">
//           <button className="cancel-button" onClick={onClose}>Close</button>
//         </div>
//       </div>
//     </div>
//   );
// };

// const Search = () => {
//   const location = useLocation();
//   const params = new URLSearchParams(location.search);
//   const query = params.get('q');
//   const noResults = params.get('noResults') === 'true';
//   const userIdFromUrl = params.get('user_id'); // Get user_id from URL if Home.js passed it

//   const [providers, setProviders] = useState(location.state?.initialProviders || []);
//   const [currentUserId, setCurrentUserId] = useState(location.state?.currentSearchUserId || null);

//   const [reviewStatsMap, setReviewStatsMap] = useState({});
//   const [reviewMap, setReviewMap] = useState({});
//   const [loading, setLoading] = useState(!location.state?.initialProviders);
//   const [error, setError] = useState(null);
//   const [sortOption, setSortOption] = useState('recommended');

//   const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
//   const [selectedProvider, setSelectedProvider] = useState(null);
//   const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
//   const [clickedRecommender, setClickedRecommender] = useState(null);
//   const [showFeatureComingModal, setShowFeatureComingModal] = useState(false);
//   const [dropdownOpenForId, setDropdownOpenForId] = useState(null);
//   const [showLinkCopied, setShowLinkCopied] = useState(false);

//   useEffect(() => {
//     let idToUse = userIdFromUrl;
//     if (!idToUse) {
//       const rawUser = localStorage.getItem('user');
//       if (rawUser) {
//         try {
//           const userObject = JSON.parse(rawUser);
//           idToUse = userObject?.id || null;
//         } catch (e) {
//           idToUse = null;
//         }
//       }
//     }
//     if (idToUse !== currentUserId) { // Only update if different or initially setting
//         setCurrentUserId(idToUse);
//     }
//   }, [userIdFromUrl, currentUserId]); // Listen to changes in userIdFromUrl & currentUserId to avoid loops


//   useEffect(() => {
//     const passedProviders = location.state?.initialProviders;
//     const passedUserId = location.state?.currentSearchUserId;

//     if (passedProviders && passedUserId && passedUserId === currentUserId && query === params.get('q') /* ensure query matches */) {
//         console.log("SEARCH.JS: Using initial providers passed from Home.js");
//         setProviders(passedProviders);
//         // Process stats and reviews for these initial providers
//         (async () => {
//             setLoading(true);
//             const stats = {};
//             const revs = {};
//             await Promise.all(passedProviders.map(async p => {
//                 stats[p.id] = { average_rating: p.average_rating ?? 0, total_reviews: p.total_reviews ?? 0 };
//                 try {
//                     const rRes = await fetch(`${API_URL}/api/reviews/${p.id}`);
//                     if(rRes.ok) revs[p.id] = await rRes.json(); else revs[p.id] = [];
//                 } catch { revs[p.id] = []; }
//             }));
//             setReviewStatsMap(stats);
//             setReviewMap(revs);
//             setLoading(false);
//         })();
//         return; // Don't fetch again if we used initial data
//     }

//     if (!query || (noResults && !passedProviders)) {
//       setLoading(false);
//       setProviders([]);
//       return;
//     }

//     if (!currentUserId) {
//       if (!localStorage.getItem('user')) {
//         setError("Please log in to search for recommendations.");
//       }
//       setLoading(false);
//       setProviders([]);
//       return;
//     }

//     setLoading(true);
//     setError(null);

//     (async () => {
//       try {
//         const fetchUrl = `${API_URL}/api/providers/search?q=${encodeURIComponent(query)}&user_id=${currentUserId}`;
//         console.log("SEARCH.JS: Fetching search results from URL because initial data not used or query changed:", fetchUrl);
//         const res = await fetch(fetchUrl);

//         if (!res.ok) {
//           const errorData = await res.json().catch(() => ({ message: `Failed to fetch with status: ${res.status}` }));
//           throw new Error(errorData.message || errorData.error || `Failed to fetch with status: ${res.status}`);
//         }

//         const data = await res.json();
//         if (!data.success) {
//           throw new Error(data.message || data.error || 'Search request was not successful');
//         }

//         let raw = data.providers || [];
//         const stats = {};
//         const revs = {};

//         await Promise.all(raw.map(async p => {
//           stats[p.id] = { average_rating: p.average_rating ?? 0, total_reviews: p.total_reviews ?? 0 };
//           try {
//             const rRes = await fetch(`${API_URL}/api/reviews/${p.id}`);
//             if(rRes.ok) revs[p.id] = await rRes.json(); else revs[p.id] = [];
//           } catch {
//             revs[p.id] = [];
//           }
//         }));
//         setReviewStatsMap(stats);
//         setReviewMap(revs);
        
//         setProviders(raw.map(p => ({ // Ensure providers are mapped with their stats for rendering
//           ...p,
//           average_rating: stats[p.id]?.average_rating ?? p.average_rating ?? 0,
//           total_reviews:  stats[p.id]?.total_reviews ?? p.total_reviews ?? 0
//         })));
//         // Sorting is applied in the map above or needs to be re-applied if you keep it separate
//       } catch (err) {
//         console.error("Error in search useEffect:", err);
//         setError(err.message || 'Failed to fetch providers');
//         setProviders([]);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [query, noResults, sortOption, currentUserId, location.state]);


//   const handleReviewSubmit = async ({ rating, review, tags }) => {
//     const userEmail = localStorage.getItem('userEmail');
//     if (!selectedProvider || !userEmail) {
//       return;
//     }
//     try {
//       await fetch(`${API_URL}/api/reviews`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           provider_id: selectedProvider.id,
//           provider_email: selectedProvider.email || '',
//           email: userEmail,
//           rating,
//           content: review,
//           tags
//         })
//       });
//     } catch (err) {
//       console.error('Error submitting review:', err);
//     }
//   };

//   const handleConsultation = provider => {
//     if (provider.phone_number) {
//       window.location.href =
//         `sms:${provider.phone_number}?body=Hi ${provider.business_name}, I'd like to request a consultation.`;
//     } else if (provider.email) {
//       window.location.href =
//         `mailto:${provider.email}?subject=Request Consultation`;
//     } else {
//       alert("Thanks! We'll reach out shortly.");
//     }
//   };

//   if (loading && providers.length === 0) return <div className="loading-spinner">Loading...</div>;
//   if (error && providers.length === 0) return <div className="error-message">{error}</div>;
//   if ((noResults || providers.length === 0) && !loading) {
//     return (
//       <div className="no-results">
//         <p>No trusted providers found for your search "{query}".</p>
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
//       <h1 className="section-heading">Search Results for "{query}"</h1>
//       {error && <div className="error-message small-error">{error}</div>}

//       <div className="sort-bar">
//         Sort by:
//         <select
//           className="sort-dropdown"
//           value={sortOption}
//           onChange={e => setSortOption(e.target.value)}
//         >
//           <option value="recommended">Recommended</option>
//           <option value="topRated">Top Rated</option>
//         </select>
//       </div>

//       <ul className="provider-list">
//         {providers.map(p => {
//           const providerStats = reviewStatsMap[p.id] || { average_rating: p.average_rating || 0, total_reviews: p.total_reviews || 0 };
//           const providerReviews  = reviewMap[p.id]   || [];
//           const displayAvgRating = typeof providerStats.average_rating === 'number' ? providerStats.average_rating.toFixed(1) : '0.0';

//           return (
//             <li key={p.id} className="provider-card">
//               <div className="card-header">
//                 <h2 className="card-title">{p.business_name}</h2>
//                 <div className="badge-wrapper-with-menu">
//                   <div className="badge-group">
//                     {providerStats.average_rating >= 4.5 && (
//                       <span className="top-rated-badge">Top Rated</span>
//                     )}
//                     <span className="profile-badge">{p.service_type || p.category}</span>
//                   </div>
//                   <div className="dropdown-wrapper">
//                     <button
//                       className="three-dots-button"
//                       onClick={() =>
//                         setDropdownOpenForId(dropdownOpenForId === p.id ? null : p.id)
//                       }
//                     >
//                       ⋮
//                     </button>
//                     {dropdownOpenForId === p.id && (
//                       <div className="dropdown-menu">
//                         <button
//                           className="dropdown-item"
//                           onClick={() => {
//                             navigator.clipboard.writeText(
//                               `https://triedandtrusted.ai/provider/${p.id}`
//                             );
//                             setDropdownOpenForId(null);
//                             setShowLinkCopied(true);
//                             setTimeout(() => setShowLinkCopied(false), 2000);
//                           }}
//                         >
//                           Share this Rec
//                         </button>
//                       </div>
//                     )}
//                     {showLinkCopied && <div className="toast">Link copied!</div>}
//                   </div>
//                 </div>
//               </div>

//               <div className="review-summary">
//                 <StarRating rating={providerStats.average_rating} />
//                 <span className="review-score">
//                   {displayAvgRating} ({providerStats.total_reviews})
//                 </span>
//                 <button
//                   className="see-all-button"
//                   onClick={() => {
//                     setSelectedProvider(p);
//                     setIsReviewModalOpen(true);
//                   }}
//                 >
//                   Write a Review
//                 </button>
//               </div>

//               <p className="card-description">{p.description || 'No description available'}</p>

//               {Array.isArray(p.tags) && p.tags.length > 0 && (
//                 <div className="tag-container">
//                   {p.tags.map((t, i) => (
//                     <span key={i} className="tag-badge">{t}</span>
//                   ))}
//                 </div>
//               )}

//               {p.recommender_name && (
//                 <div className="recommended-row">
//                   <span className="recommended-label">Recommended by:</span>
//                   <span
//                     className="recommended-name clickable"
//                     onClick={() => setClickedRecommender(p.recommender_name)}
//                   >
//                     {p.recommender_name}
//                   </span>
//                 </div>
//               )}

//               {providerReviews.length > 0 &&
//                 [...new Set(providerReviews.map(r => r.user_name).filter(n => n && n !== p.recommender_name))].length > 0 && (
//                 <div className="recommended-row">
//                   <span className="recommended-label">Also used by:</span>
//                   <span className="used-by-names">
//                     {[...new Set(providerReviews.map(r => r.user_name).filter(n => n && n !== p.recommender_name))].join(', ')}
//                   </span>
//                 </div>
//               )}

//               <div className="action-buttons">
//                 <button
//                   className="primary-button"
//                   onClick={() => {
//                     setSelectedProvider(p);
//                     setIsProfileModalOpen(true);
//                   }}
//                 >
//                   View Profile
//                 </button>
//                 <button
//                   className="secondary-button"
//                   onClick={() => handleConsultation(p)}
//                 >
//                   Request a Consultation
//                 </button>
//               </div>
//             </li>
//           );
//         })}
//       </ul>

//       {isReviewModalOpen && selectedProvider && (
//         <ReviewModal
//           isOpen={isReviewModalOpen}
//           onClose={() => setIsReviewModalOpen(false)}
//           onSubmit={handleReviewSubmit}
//           provider={selectedProvider}
//         />
//       )}
//       {isProfileModalOpen && selectedProvider && (
//         <ProviderProfileModal
//           isOpen={isProfileModalOpen}
//           onClose={() => setIsProfileModalOpen(false)}
//           provider={selectedProvider}
//           reviews={reviewMap[selectedProvider.id]}
//           setSelectedProvider={setSelectedProvider}
//           setIsReviewModalOpen={setIsReviewModalOpen}
//         />
//       )}
//       {clickedRecommender && (
//         <div className="modal-overlay">
//           <div className="simple-modal">
//             <button className="modal-close-x" onClick={() => setClickedRecommender(null)}>×</button>
//             <h3>Want to connect with <span className="highlight">{clickedRecommender}</span>?</h3>
//             <div className="modal-buttons-vertical">
//               <button className="secondary-button" onClick={() => { setClickedRecommender(null); setShowFeatureComingModal(true); }}>Thank {clickedRecommender}</button>
//               <button className="secondary-button" onClick={() => { setClickedRecommender(null); setShowFeatureComingModal(true); }}>Ask {clickedRecommender} a question</button>
//             </div>
//           </div>
//         </div>
//       )}
//       {showFeatureComingModal && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <p>We're about to launch this feature. Stay tuned 👁️</p>
//             <div className="modal-buttons">
//               <button className="primary-button" onClick={() => setShowFeatureComingModal(false)}>OK</button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Search;

// import React, { useState, useEffect } from 'react';
// import { Link, useLocation } from 'react-router-dom';
// import { FaStar, FaPhone, FaEnvelope } from 'react-icons/fa';
// import './Search.css';

// // const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = 'http://localhost:3000';

// const StarRating = ({ rating }) => {
//   const fullStars  = Math.floor(rating);
//   const hasHalf    = rating - fullStars >= 0.5;
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
//   const [rating, setRating]     = useState(0);
//   const [hover, setHover]       = useState(0);
//   const [review, setReview]     = useState('');
//   const [tags, setTags]         = useState([]);
//   const [tagInput, setTagInput] = useState('');
//   const [error, setError]       = useState('');

//   const handleTagKeyDown = (e) => {
//     if (e.key === 'Enter') {
//       e.preventDefault();
//       const trimmed = tagInput.trim();
//       if (trimmed && !tags.includes(trimmed)) {
//         setTags([...tags, trimmed]);
//       }
//       setTagInput('');
//     }
//   };

//   const removeTag = (tagToRemove) =>
//     setTags(tags.filter(tag => tag !== tagToRemove));

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (!rating) {
//       setError('Please select a rating');
//       return;
//     }
//     onSubmit({ rating, review, tags });
//     setRating(0);
//     setReview('');
//     setTags([]);
//     setTagInput('');
//     setError('');
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
//               {[...Array(5)].map((_, idx) => (
//                 <FaStar
//                   key={idx}
//                   className={idx < (hover || rating) ? 'star active' : 'star'}
//                   onClick={() => setRating(idx + 1)}
//                   onMouseEnter={() => setHover(idx + 1)}
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
//               onChange={e => setReview(e.target.value)}
//               placeholder="Optional: Share your thoughts..."
//               rows={4}
//             />
//           </div>
//           <div className="tag-input-group">
//             <label>Add tags (press Enter to add):</label>
//             <input
//               type="text"
//               value={tagInput}
//               onChange={e => setTagInput(e.target.value)}
//               onKeyDown={handleTagKeyDown}
//               placeholder="e.g. fast, professional"
//             />
//             <div className="tag-container">
//               {tags.map((tag, idx) => (
//                 <span key={idx} className="tag-badge">
//                   {tag}
//                   <button
//                     type="button"
//                     className="remove-tag"
//                     onClick={() => removeTag(tag)}
//                   >×</button>
//                 </span>
//               ))}
//             </div>
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

// const ProviderProfileModal = ({
//   isOpen,
//   onClose,
//   provider,
//   reviews = [],
//   setSelectedProvider,
//   setIsReviewModalOpen
// }) => {
//   if (!isOpen || !provider) return null;

//   const formattedDate = provider.date_of_recommendation
//     ? new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
//         year: '2-digit', month: 'numeric', day: 'numeric'
//       })
//     : 'Not provided';

//   const recommenders = new Set();
//   if (provider.recommended_by_name) recommenders.add(provider.recommended_by_name);
//   reviews.forEach(r => r.user_name && recommenders.add(r.user_name));
//   const alsoUsedBy = Array.from(recommenders).filter(n => n !== provider.recommended_by_name);

//   return (
//     <div className="modal-overlay">
//       <div className="profile-modal-content">
//         <button className="modal-close-x" onClick={onClose}>×</button>
//         <div className="profile-header">
//           <h2 className="profile-name">{provider.business_name}</h2>
//           <div className="badge-wrapper">
//             {provider.average_rating >= 4.5 && (
//               <span className="top-rated-badge">Top Rated</span>
//             )}
//             <span className="profile-badge">{provider.service_type}</span>
//             <div className="modal-icons">
//               {provider.phone_number && (
//                 <a href={`tel:${provider.phone_number}`} title="Call">
//                   <FaPhone />
//                 </a>
//               )}
//               {provider.email && (
//                 <a href={`mailto:${provider.email}`} title="Email">
//                   <FaEnvelope />
//                 </a>
//               )}
//             </div>
//           </div>
//         </div>

//         <div className="profile-section">
//           <p><strong>Description:</strong> {provider.description || 'N/A'}</p>
//           <p><strong>Date of Recommendation:</strong> {formattedDate}</p>
//           {provider.recommended_by_name && (
//             <p><strong>Recommended by:</strong> {provider.recommended_by_name}</p>
//           )}
//           {alsoUsedBy.length > 0 && (
//             <p><strong>Also used by:</strong> {alsoUsedBy.join(', ')}</p>
//           )}
//           {Array.isArray(provider.tags) && provider.tags.length > 0 && (
//             <div className="tag-container">
//               {provider.tags.map((tag, idx) => (
//                 <span key={idx} className="tag-badge">{tag}</span>
//               ))}
//               <button
//                 className="add-tag-button"
//                 onClick={() => {
//                   setSelectedProvider(provider);
//                   setIsReviewModalOpen(true);
//                 }}
//               >+</button>
//             </div>
//           )}
//         </div>
//         <hr />
//         <div className="profile-reviews">
//           <h3>Reviews</h3>
//           {reviews.length === 0
//             ? <p>No reviews yet.</p>
//             : reviews.map((r, i) => (
//                 <div key={i} className="profile-review">
//                   <div className="review-stars">
//                     {[...Array(5)].map((_, j) => (
//                       <FaStar
//                         key={j}
//                         className={j < r.rating ? 'star active' : 'star'}
//                       />
//                     ))}
//                   </div>
//                   <p>"{r.content}"</p>
//                   <p>– {r.user_name || 'Anonymous'}</p>
//                 </div>
//               ))
//           }
//         </div>
//         <div className="modal-buttons">
//           <button className="cancel-button" onClick={onClose}>Close</button>
//         </div>
//       </div>
//     </div>
//   );
// };

// const Search = () => {
//   const location     = useLocation();
//   const params       = new URLSearchParams(location.search);
//   const query        = params.get('q');
//   const noResults    = params.get('noResults') === 'true';

//   const [providers, setProviders]             = useState([]);
//   const [reviewStatsMap, setReviewStatsMap]   = useState({});
//   const [reviewMap, setReviewMap]             = useState({});
//   const [loading, setLoading]                 = useState(true);
//   const [error, setError]                     = useState(null);
//   const [sortOption, setSortOption]           = useState('recommended');

//   const [isReviewModalOpen, setIsReviewModalOpen]     = useState(false);
//   const [selectedProvider, setSelectedProvider]       = useState(null);
//   const [isProfileModalOpen, setIsProfileModalOpen]   = useState(false);
//   const [clickedRecommender, setClickedRecommender]   = useState(null);
//   const [showFeatureComingModal, setShowFeatureComingModal] = useState(false);
//   const [dropdownOpenForId, setDropdownOpenForId]     = useState(null);
//   const [showLinkCopied, setShowLinkCopied]           = useState(false);
//   const [currentUserId, setCurrentUserId]             = useState(null);

//   useEffect(() => {
//     const updateUserId = () => {
//       const rawUser = localStorage.getItem('user');
//       if (rawUser) {
//         try {
//           const userObject = JSON.parse(rawUser);
//           setCurrentUserId(userObject?.id || null);
//         } catch (e) {
//           console.error("Error parsing user from localStorage for Search page:", e);
//           setCurrentUserId(null);
//         }
//       } else {
//         setCurrentUserId(null);
//       }
//     };

//     updateUserId();
//     window.addEventListener('userLogin', updateUserId);
//     window.addEventListener('userLogout', () => updateUserId()); 
//     return () => {
//       window.removeEventListener('userLogin', updateUserId);
//       window.removeEventListener('userLogout', updateUserId);
//     };
//   }, []);


//   useEffect(() => {
//     if (!query || noResults) {
//       setLoading(false);
//       setProviders([]);
//       return;
//     }

//     if (currentUserId === null && localStorage.getItem('user')) {
//       setLoading(true); 
//       return; 
//     }


//     if (!currentUserId && !localStorage.getItem('user')) {
//         console.warn("Search cannot be performed: User ID not available. Please log in.");
//         setError("Please log in to search for recommendations.");
//         setLoading(false);
//         setProviders([]);
//         return;
//     }
    
//     if (!currentUserId && localStorage.getItem('user')) {
//         return; 
//     }


//     setLoading(true);
//     setError(null);

//     (async () => {
//       try {
//         const fetchUrl = `${API_URL}/api/providers/search?q=${encodeURIComponent(query)}&user_id=${currentUserId}`;
//         console.log("SEARCH.JS: Fetching search results from URL:", fetchUrl);
//         const res  = await fetch(fetchUrl);

//         if (!res.ok) {
//             const errorData = await res.json();
//             throw new Error(errorData.message || `Failed to fetch with status: ${res.status}`);
//         }

//         const data = await res.json();
//         if (!data.success) {
//             throw new Error(data.message || data.error || 'Search request was not successful');
//         }

//         let raw = data.providers || [];
//         const stats = {};
//         const revs = {};

//         await Promise.all(raw.map(async p => {
//           if (p.average_rating === undefined || p.total_reviews === undefined) {
//             try {
//                 const sRes = await fetch(`${API_URL}/api/reviews/stats/${p.id}`);
//                 const sData = await sRes.json();
//                 stats[p.id] = {
//                 average_rating: parseFloat(sData.average_rating) || 0,
//                 total_reviews:  parseInt(sData.total_reviews, 10) || 0
//                 };
//             } catch {
//                 stats[p.id] = { average_rating: 0, total_reviews: 0 };
//             }
//           } else {
//             stats[p.id] = { average_rating: p.average_rating, total_reviews: p.total_reviews };
//           }
//           try {
//               const rRes = await fetch(`${API_URL}/api/reviews/${p.id}`);
//               revs[p.id] = await rRes.json();
//           } catch {
//               revs[p.id] = [];
//           }
//         }));
//         setReviewStatsMap(stats);
//         setReviewMap(revs);

//         raw = raw.map(p => ({
//           ...p,
//           average_rating: stats[p.id]?.average_rating ?? p.average_rating ?? 0,
//           total_reviews:  stats[p.id]?.total_reviews ?? p.total_reviews ?? 0
//         }));

//         let sorted = raw;
//         if (sortOption === 'topRated') {
//           sorted = raw
//             .filter(p => p.average_rating >= 4.5)
//             .sort((a, b) =>
//               b.average_rating - a.average_rating ||
//               b.total_reviews - a.total_reviews
//             );
//         } else {
//           sorted = raw.sort((a, b) => {
//             const a4 = a.average_rating >= 4 ? 1 : 0;
//             const b4 = b.average_rating >= 4 ? 1 : 0;
//             if (a4 !== b4) return b4 - a4;
//             return b.total_reviews - a.total_reviews;
//           });
//         }
//         setProviders(sorted);
//       } catch (err) {
//         console.error("Error in search useEffect:", err);
//         setError(err.message || 'Failed to fetch providers');
//         setProviders([]);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [query, noResults, sortOption, currentUserId]);


//   const handleReviewSubmit = async ({ rating, review, tags }) => {
//     const userEmail = localStorage.getItem('userEmail');
//     if (!selectedProvider || !userEmail) {
//         console.error("Cannot submit review: provider or user email missing.");
//         return;
//     }
//     try {
//       await fetch(`${API_URL}/api/reviews`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           provider_id:    selectedProvider.id,
//           provider_email: selectedProvider.email || '',
//           email:          userEmail,
//           rating,
//           content:        review,
//           tags
//         })
//       });
//     } catch (err) {
//       console.error('Error submitting review:', err);
//     }
//   };

//   const handleConsultation = provider => {
//     if (provider.phone_number) {
//       window.location.href =
//         `sms:${provider.phone_number}?body=Hi ${provider.business_name}, I'd like to request a consultation.`;
//     } else if (provider.email) {
//       window.location.href =
//         `mailto:${provider.email}?subject=Request Consultation`;
//     } else {
//       alert("Thanks! We'll reach out shortly.");
//     }
//   };

//   if (loading) return <div className="loading-spinner">Loading...</div>;
//   if (error && providers.length === 0) return <div className="error-message">{error}</div>;
//   if ((noResults || providers.length === 0) && !loading) {
//     return (
//       <div className="no-results">
//         <p>No trusted providers found for your search "{query}".</p>
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
//       <h1 className="section-heading">Search Results for "{query}"</h1>
//       {error && <div className="error-message small-error">{error}</div>}

//       <div className="sort-bar">
//         Sort by:
//         <select
//           className="sort-dropdown"
//           value={sortOption}
//           onChange={e => setSortOption(e.target.value)}
//         >
//           <option value="recommended">Recommended</option>
//           <option value="topRated">Top Rated</option>
//         </select>
//       </div>

//       <ul className="provider-list">
//         {providers.map(p => {
//           const stats = reviewStatsMap[p.id] || { average_rating: p.average_rating || 0, total_reviews: p.total_reviews || 0 };
//           const revs  = reviewMap[p.id]   || [];
//           return (
//             <li key={p.id} className="provider-card">
//               <div className="card-header">
//                 <h2 className="card-title">{p.business_name}</h2>
//                 <div className="badge-wrapper-with-menu">
//                   <div className="badge-group">
//                     {stats.average_rating >= 4.5 && (
//                       <span className="top-rated-badge">Top Rated</span>
//                     )}
//                     <span className="profile-badge">{p.service_type || p.category}</span>
//                   </div>
//                   <div className="dropdown-wrapper">
//                     <button
//                       className="three-dots-button"
//                       onClick={() =>
//                         setDropdownOpenForId(dropdownOpenForId === p.id ? null : p.id)
//                       }
//                     >
//                       ⋮
//                     </button>
//                     {dropdownOpenForId === p.id && (
//                       <div className="dropdown-menu">
//                         <button
//                           className="dropdown-item"
//                           onClick={() => {
//                             navigator.clipboard.writeText(
//                               `https://triedandtrusted.ai/provider/${p.id}`
//                             );
//                             setDropdownOpenForId(null);
//                             setShowLinkCopied(true);
//                             setTimeout(() => setShowLinkCopied(false), 2000);
//                           }}
//                         >
//                           Share this Rec
//                         </button>
//                       </div>
//                     )}
//                     {showLinkCopied && <div className="toast">Link copied!</div>}
//                   </div>
//                 </div>
//               </div>

//               <div className="review-summary">
//                 <StarRating rating={stats.average_rating} />
//                 <span className="review-score">
//                   {stats.average_rating.toFixed(1)} ({stats.total_reviews})
//                 </span>
//                 <button
//                   className="see-all-button"
//                   onClick={() => {
//                     setSelectedProvider(p);
//                     setIsReviewModalOpen(true);
//                   }}
//                 >
//                   Write a Review
//                 </button>
//               </div>

//               <p className="card-description">{p.description || 'No description available'}</p>

//               {Array.isArray(p.tags) && p.tags.length > 0 && (
//                 <div className="tag-container">
//                   {p.tags.map((t, i) => (
//                     <span key={i} className="tag-badge">{t}</span>
//                   ))}
//                 </div>
//               )}

//               {p.recommender_name && (
//                 <div className="recommended-row">
//                   <span className="recommended-label">Recommended by:</span>
//                   <span
//                     className="recommended-name clickable"
//                     onClick={() => setClickedRecommender(p.recommender_name)}
//                   >
//                     {p.recommender_name}
//                   </span>
//                 </div>
//               )}

//               {revs.length > 0 &&
//                 [...new Set(revs.map(r => r.user_name).filter(n => n && n !== p.recommender_name))].length > 0 && (
//                 <div className="recommended-row">
//                   <span className="recommended-label">Also used by:</span>
//                   <span className="used-by-names">
//                     {[...new Set(revs.map(r => r.user_name).filter(n => n && n !== p.recommender_name))].join(', ')}
//                   </span>
//                 </div>
//               )}

//               <div className="action-buttons">
//                 <button
//                   className="primary-button"
//                   onClick={() => {
//                     setSelectedProvider(p);
//                     setIsProfileModalOpen(true);
//                   }}
//                 >
//                   View Profile
//                 </button>
//                 <button
//                   className="secondary-button"
//                   onClick={() => handleConsultation(p)}
//                 >
//                   Request a Consultation
//                 </button>
//               </div>
//             </li>
//           );
//         })}
//       </ul>

//       {isReviewModalOpen && selectedProvider && (
//         <ReviewModal
//           isOpen={isReviewModalOpen}
//           onClose={() => setIsReviewModalOpen(false)}
//           onSubmit={handleReviewSubmit}
//           provider={selectedProvider}
//         />
//       )}
//       {isProfileModalOpen && selectedProvider && (
//         <ProviderProfileModal
//           isOpen={isProfileModalOpen}
//           onClose={() => setIsProfileModalOpen(false)}
//           provider={selectedProvider}
//           reviews={reviewMap[selectedProvider.id]}
//           setSelectedProvider={setSelectedProvider}
//           setIsReviewModalOpen={setIsReviewModalOpen}
//         />
//       )}
//       {clickedRecommender && (
//         <div className="modal-overlay">
//           <div className="simple-modal">
//             <button className="modal-close-x" onClick={() => setClickedRecommender(null)}>×</button>
//             <h3>Want to connect with <span className="highlight">{clickedRecommender}</span>?</h3>
//             <div className="modal-buttons-vertical">
//               <button className="secondary-button" onClick={() => { setClickedRecommender(null); setShowFeatureComingModal(true); }}>Thank {clickedRecommender}</button>
//               <button className="secondary-button" onClick={() => { setClickedRecommender(null); setShowFeatureComingModal(true); }}>Ask {clickedRecommender} a question</button>
//             </div>
//           </div>
//         </div>
//       )}
//       {showFeatureComingModal && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <p>We're about to launch this feature. Stay tuned 👁️</p>
//             <div className="modal-buttons">
//               <button className="primary-button" onClick={() => setShowFeatureComingModal(false)}>OK</button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Search;

// // src/pages/Search/Search.js
// import React, { useState, useEffect } from 'react';
// import { Link, useLocation } from 'react-router-dom';
// import { FaStar, FaPhone, FaEnvelope } from 'react-icons/fa';
// import './Search.css';

// // const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = 'http://localhost:3000';

// // ... (StarRating, ReviewModal, ProviderProfileModal components remain the same) ...
// const StarRating = ({ rating }) => {
//   const fullStars  = Math.floor(rating);
//   const hasHalf    = rating - fullStars >= 0.5;
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
//   const [rating, setRating]     = useState(0);
//   const [hover, setHover]       = useState(0);
//   const [review, setReview]     = useState('');
//   const [tags, setTags]         = useState([]);
//   const [tagInput, setTagInput] = useState('');
//   const [error, setError]       = useState('');

//   const handleTagKeyDown = (e) => {
//     if (e.key === 'Enter') {
//       e.preventDefault();
//       const trimmed = tagInput.trim();
//       if (trimmed && !tags.includes(trimmed)) {
//         setTags([...tags, trimmed]);
//       }
//       setTagInput('');
//     }
//   };

//   const removeTag = (tagToRemove) =>
//     setTags(tags.filter(tag => tag !== tagToRemove));

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (!rating) {
//       setError('Please select a rating');
//       return;
//     }
//     onSubmit({ rating, review, tags });
//     setRating(0);
//     setReview('');
//     setTags([]);
//     setTagInput('');
//     setError('');
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
//               {[...Array(5)].map((_, idx) => (
//                 <FaStar
//                   key={idx}
//                   className={idx < (hover || rating) ? 'star active' : 'star'}
//                   onClick={() => setRating(idx + 1)}
//                   onMouseEnter={() => setHover(idx + 1)}
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
//               onChange={e => setReview(e.target.value)}
//               placeholder="Optional: Share your thoughts..."
//               rows={4}
//             />
//           </div>
//           <div className="tag-input-group">
//             <label>Add tags (press Enter to add):</label>
//             <input
//               type="text"
//               value={tagInput}
//               onChange={e => setTagInput(e.target.value)}
//               onKeyDown={handleTagKeyDown}
//               placeholder="e.g. fast, professional"
//             />
//             <div className="tag-container">
//               {tags.map((tag, idx) => (
//                 <span key={idx} className="tag-badge">
//                   {tag}
//                   <button
//                     type="button"
//                     className="remove-tag"
//                     onClick={() => removeTag(tag)}
//                   >×</button>
//                 </span>
//               ))}
//             </div>
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

// const ProviderProfileModal = ({
//   isOpen,
//   onClose,
//   provider,
//   reviews = [],
//   setSelectedProvider,
//   setIsReviewModalOpen
// }) => {
//   if (!isOpen || !provider) return null;

//   const formattedDate = provider.date_of_recommendation
//     ? new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
//         year: '2-digit', month: 'numeric', day: 'numeric'
//       })
//     : 'Not provided';

//   const recommenders = new Set();
//   if (provider.recommended_by_name) recommenders.add(provider.recommended_by_name);
//   reviews.forEach(r => r.user_name && recommenders.add(r.user_name));
//   const alsoUsedBy = Array.from(recommenders).filter(n => n !== provider.recommended_by_name);

//   return (
//     <div className="modal-overlay">
//       <div className="profile-modal-content">
//         <button className="modal-close-x" onClick={onClose}>×</button>
//         <div className="profile-header">
//           <h2 className="profile-name">{provider.business_name}</h2>
//           <div className="badge-wrapper">
//             {provider.average_rating >= 4.5 && (
//               <span className="top-rated-badge">Top Rated</span>
//             )}
//             <span className="profile-badge">{provider.service_type}</span>
//             <div className="modal-icons">
//               {provider.phone_number && (
//                 <a href={`tel:${provider.phone_number}`} title="Call">
//                   <FaPhone />
//                 </a>
//               )}
//               {provider.email && (
//                 <a href={`mailto:${provider.email}`} title="Email">
//                   <FaEnvelope />
//                 </a>
//               )}
//             </div>
//           </div>
//         </div>

//         <div className="profile-section">
//           <p><strong>Description:</strong> {provider.description || 'N/A'}</p>
//           <p><strong>Date of Recommendation:</strong> {formattedDate}</p>
//           {provider.recommended_by_name && (
//             <p><strong>Recommended by:</strong> {provider.recommended_by_name}</p>
//           )}
//           {alsoUsedBy.length > 0 && (
//             <p><strong>Also used by:</strong> {alsoUsedBy.join(', ')}</p>
//           )}
//           {Array.isArray(provider.tags) && provider.tags.length > 0 && (
//             <div className="tag-container">
//               {provider.tags.map((tag, idx) => (
//                 <span key={idx} className="tag-badge">{tag}</span>
//               ))}
//               <button
//                 className="add-tag-button"
//                 onClick={() => {
//                   setSelectedProvider(provider);
//                   setIsReviewModalOpen(true);
//                 }}
//               >+</button>
//             </div>
//           )}
//         </div>
//         <hr />
//         <div className="profile-reviews">
//           <h3>Reviews</h3>
//           {reviews.length === 0
//             ? <p>No reviews yet.</p>
//             : reviews.map((r, i) => (
//                 <div key={i} className="profile-review">
//                   <div className="review-stars">
//                     {[...Array(5)].map((_, j) => (
//                       <FaStar
//                         key={j}
//                         className={j < r.rating ? 'star active' : 'star'}
//                       />
//                     ))}
//                   </div>
//                   <p>"{r.content}"</p>
//                   <p>– {r.user_name || 'Anonymous'}</p>
//                 </div>
//               ))
//           }
//         </div>
//         <div className="modal-buttons">
//           <button className="cancel-button" onClick={onClose}>Close</button>
//         </div>
//       </div>
//     </div>
//   );
// };


// const Search = () => {
//   const location     = useLocation();
//   const params       = new URLSearchParams(location.search);
//   const query        = params.get('q');
//   const noResults    = params.get('noResults') === 'true';

//   const [providers, setProviders]             = useState([]);
//   const [reviewStatsMap, setReviewStatsMap]   = useState({});
//   const [reviewMap, setReviewMap]             = useState({});
//   const [loading, setLoading]                 = useState(true);
//   const [error, setError]                     = useState(null);
//   const [sortOption, setSortOption]           = useState('recommended');

//   const [isReviewModalOpen, setIsReviewModalOpen]     = useState(false);
//   const [selectedProvider, setSelectedProvider]       = useState(null);
//   const [isProfileModalOpen, setIsProfileModalOpen]   = useState(false);
//   const [clickedRecommender, setClickedRecommender]   = useState(null);
//   const [showFeatureComingModal, setShowFeatureComingModal] = useState(false);
//   const [dropdownOpenForId, setDropdownOpenForId]     = useState(null);
//   const [showLinkCopied, setShowLinkCopied]           = useState(false);

//   // Directly get user ID from localStorage
//   const getCurrentUserId = () => {
//     const userString = localStorage.getItem('user'); // Assuming key is 'user'
//     if (userString) {
//       try {
//         const userObject = JSON.parse(userString);
//         return userObject?.id || null;
//       } catch (e) {
//         console.error("Error parsing user from localStorage:", e);
//         return null;
//       }
//     }
//     return null;
//   };

//   useEffect(() => {
//     if (!query || noResults) {
//       setLoading(false);
//       setProviders([]);
//       return;
//     }

//     const currentUserId = getCurrentUserId();
//     console.log("SEARCH.JS: currentUserId from localStorage:", currentUserId);

//     if (!currentUserId) {
//         console.warn("Search cannot be performed: User ID not found in localStorage. Please log in.");
//         setError("Please log in to search for recommendations.");
//         setLoading(false);
//         setProviders([]);
//         return;
//     }

//     setLoading(true);
//     setError(null);

//     (async () => {
//       try {
//         const fetchUrl = `${API_URL}/api/providers/search?q=${encodeURIComponent(query)}&user_id=${currentUserId}`;
//         console.log("Fetching search results from:", fetchUrl);
//         const res  = await fetch(fetchUrl);

//         if (!res.ok) {
//             const errorData = await res.json();
//             throw new Error(errorData.message || `Failed to fetch with status: ${res.status}`);
//         }

//         const data = await res.json();
//         if (!data.success) {
//             throw new Error(data.message || data.error || 'Search request was not successful');
//         }

//         let raw = data.providers || [];
//         const stats = {};
//         const revs = {};

//         await Promise.all(raw.map(async p => {
//           if (p.average_rating === undefined || p.total_reviews === undefined) {
//             try {
//                 const sRes = await fetch(`${API_URL}/api/reviews/stats/${p.id}`);
//                 const sData = await sRes.json();
//                 stats[p.id] = {
//                 average_rating: parseFloat(sData.average_rating) || 0,
//                 total_reviews:  parseInt(sData.total_reviews, 10) || 0
//                 };
//             } catch {
//                 stats[p.id] = { average_rating: 0, total_reviews: 0 };
//             }
//           } else {
//             stats[p.id] = { average_rating: p.average_rating, total_reviews: p.total_reviews };
//           }
//           try {
//               const rRes = await fetch(`${API_URL}/api/reviews/${p.id}`);
//               revs[p.id] = await rRes.json();
//           } catch {
//               revs[p.id] = [];
//           }
//         }));
//         setReviewStatsMap(stats);
//         setReviewMap(revs);

//         raw = raw.map(p => ({
//           ...p,
//           average_rating: stats[p.id]?.average_rating ?? p.average_rating ?? 0,
//           total_reviews:  stats[p.id]?.total_reviews ?? p.total_reviews ?? 0
//         }));

//         let sorted = raw;
//         if (sortOption === 'topRated') {
//           sorted = raw
//             .filter(p => p.average_rating >= 4.5)
//             .sort((a, b) =>
//               b.average_rating - a.average_rating ||
//               b.total_reviews - a.total_reviews
//             );
//         } else {
//           sorted = raw.sort((a, b) => {
//             const a4 = a.average_rating >= 4 ? 1 : 0;
//             const b4 = b.average_rating >= 4 ? 1 : 0;
//             if (a4 !== b4) return b4 - a4;
//             return b.total_reviews - a.total_reviews;
//           });
//         }
//         setProviders(sorted);
//       } catch (err) {
//         console.error("Error in search useEffect:", err);
//         setError(err.message || 'Failed to fetch providers');
//         setProviders([]);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [query, noResults, sortOption]); // Removed currentLoggedInUser from dependency array as it's read directly inside


//   const handleReviewSubmit = async ({ rating, review, tags }) => {
//     const userEmail = localStorage.getItem('userEmail'); // Still using email for submitting review for now
//     if (!selectedProvider || !userEmail) {
//         console.error("Cannot submit review: provider or user email missing.");
//         return;
//     }
//     try {
//       await fetch(`${API_URL}/api/reviews`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           provider_id:    selectedProvider.id,
//           provider_email: selectedProvider.email || '',
//           email:          userEmail,
//           rating,
//           content:        review,
//           tags
//         })
//       });
//     } catch (err) {
//       console.error('Error submitting review:', err);
//     }
//   };

//   const handleConsultation = provider => {
//     if (provider.phone_number) {
//       window.location.href =
//         `sms:${provider.phone_number}?body=Hi ${provider.business_name}, I'd like to request a consultation.`;
//     } else if (provider.email) {
//       window.location.href =
//         `mailto:${provider.email}?subject=Request Consultation`;
//     } else {
//       alert("Thanks! We'll reach out shortly.");
//     }
//   };

//   if (loading) return <div className="loading-spinner">Loading...</div>;
//   if (error && providers.length === 0) return <div className="error-message">{error}</div>;
//   if ((noResults || providers.length === 0) && !loading) {
//     return (
//       <div className="no-results">
//         <p>No trusted providers found for your search "{query}".</p>
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
//       <h1 className="section-heading">Search Results for "{query}"</h1>
//       {error && <div className="error-message small-error">{error}</div>}

//       <div className="sort-bar">
//         Sort by:
//         <select
//           className="sort-dropdown"
//           value={sortOption}
//           onChange={e => setSortOption(e.target.value)}
//         >
//           <option value="recommended">Recommended</option>
//           <option value="topRated">Top Rated</option>
//         </select>
//       </div>

//       <ul className="provider-list">
//         {providers.map(p => {
//           const stats = reviewStatsMap[p.id] || { average_rating: p.average_rating || 0, total_reviews: p.total_reviews || 0 };
//           const revs  = reviewMap[p.id]   || [];
//           return (
//             <li key={p.id} className="provider-card">
//               <div className="card-header">
//                 <h2 className="card-title">{p.business_name}</h2>
//                 <div className="badge-wrapper-with-menu">
//                   <div className="badge-group">
//                     {stats.average_rating >= 4.5 && (
//                       <span className="top-rated-badge">Top Rated</span>
//                     )}
//                     <span className="profile-badge">{p.service_type || p.category}</span>
//                   </div>
//                   <div className="dropdown-wrapper">
//                     <button
//                       className="three-dots-button"
//                       onClick={() =>
//                         setDropdownOpenForId(dropdownOpenForId === p.id ? null : p.id)
//                       }
//                     >
//                       ⋮
//                     </button>
//                     {dropdownOpenForId === p.id && (
//                       <div className="dropdown-menu">
//                         <button
//                           className="dropdown-item"
//                           onClick={() => {
//                             navigator.clipboard.writeText(
//                               `https://triedandtrusted.ai/provider/${p.id}`
//                             );
//                             setDropdownOpenForId(null);
//                             setShowLinkCopied(true);
//                             setTimeout(() => setShowLinkCopied(false), 2000);
//                           }}
//                         >
//                           Share this Rec
//                         </button>
//                       </div>
//                     )}
//                     {showLinkCopied && <div className="toast">Link copied!</div>}
//                   </div>
//                 </div>
//               </div>

//               <div className="review-summary">
//                 <StarRating rating={stats.average_rating} />
//                 <span className="review-score">
//                   {stats.average_rating.toFixed(1)} ({stats.total_reviews})
//                 </span>
//                 <button
//                   className="see-all-button"
//                   onClick={() => {
//                     setSelectedProvider(p);
//                     setIsReviewModalOpen(true);
//                   }}
//                 >
//                   Write a Review
//                 </button>
//               </div>

//               <p className="card-description">{p.description || 'No description available'}</p>

//               {Array.isArray(p.tags) && p.tags.length > 0 && (
//                 <div className="tag-container">
//                   {p.tags.map((t, i) => (
//                     <span key={i} className="tag-badge">{t}</span>
//                   ))}
//                 </div>
//               )}

//               {p.recommender_name && (
//                 <div className="recommended-row">
//                   <span className="recommended-label">Recommended by:</span>
//                   <span
//                     className="recommended-name clickable"
//                     onClick={() => setClickedRecommender(p.recommender_name)}
//                   >
//                     {p.recommender_name}
//                   </span>
//                 </div>
//               )}

//               {revs.length > 0 &&
//                 [...new Set(revs.map(r => r.user_name).filter(n => n && n !== p.recommender_name))].length > 0 && (
//                 <div className="recommended-row">
//                   <span className="recommended-label">Also used by:</span>
//                   <span className="used-by-names">
//                     {[...new Set(revs.map(r => r.user_name).filter(n => n && n !== p.recommender_name))].join(', ')}
//                   </span>
//                 </div>
//               )}

//               <div className="action-buttons">
//                 <button
//                   className="primary-button"
//                   onClick={() => {
//                     setSelectedProvider(p);
//                     setIsProfileModalOpen(true);
//                   }}
//                 >
//                   View Profile
//                 </button>
//                 <button
//                   className="secondary-button"
//                   onClick={() => handleConsultation(p)}
//                 >
//                   Request a Consultation
//                 </button>
//               </div>
//             </li>
//           );
//         })}
//       </ul>

//       {isReviewModalOpen && selectedProvider && (
//         <ReviewModal
//           isOpen={isReviewModalOpen}
//           onClose={() => setIsReviewModalOpen(false)}
//           onSubmit={handleReviewSubmit}
//           provider={selectedProvider}
//         />
//       )}
//       {isProfileModalOpen && selectedProvider && (
//         <ProviderProfileModal
//           isOpen={isProfileModalOpen}
//           onClose={() => setIsProfileModalOpen(false)}
//           provider={selectedProvider}
//           reviews={reviewMap[selectedProvider.id]}
//           setSelectedProvider={setSelectedProvider}
//           setIsReviewModalOpen={setIsReviewModalOpen}
//         />
//       )}
//       {clickedRecommender && (
//         <div className="modal-overlay">
//           <div className="simple-modal">
//             <button className="modal-close-x" onClick={() => setClickedRecommender(null)}>×</button>
//             <h3>Want to connect with <span className="highlight">{clickedRecommender}</span>?</h3>
//             <div className="modal-buttons-vertical">
//               <button className="secondary-button" onClick={() => { setClickedRecommender(null); setShowFeatureComingModal(true); }}>Thank {clickedRecommender}</button>
//               <button className="secondary-button" onClick={() => { setClickedRecommender(null); setShowFeatureComingModal(true); }}>Ask {clickedRecommender} a question</button>
//             </div>
//           </div>
//         </div>
//       )}
//       {showFeatureComingModal && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <p>We're about to launch this feature. Stay tuned 👁️</p>
//             <div className="modal-buttons">
//               <button className="primary-button" onClick={() => setShowFeatureComingModal(false)}>OK</button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Search;

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
