import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from "@clerk/clerk-react";
import { FaStar, FaPhone, FaEnvelope, FaBullhorn, FaPaperPlane, FaEye, FaThumbsUp } from 'react-icons/fa';
import QuoteModal from '../../components/QuoteModal/QuoteModal';
import './Search.css';

// const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = "http://localhost:3000";
const API_URL = process.env.REACT_APP_API_URL;

const StarRatingDisplay = ({ rating }) => {
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
          <p><strong>Description:</strong> {provider.description || provider.recommender_message || 'N/A'}</p>
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
  const { user, isSignedIn, isLoaded: isClerkLoaded } = useUser();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const query = useMemo(() => params.get('q'), [params]);
  const noResultsParam = useMemo(() => params.get('noResults') === 'true', [params]);
  
  const initialProvidersRef = useRef(location.state?.initialProviders);
  const processedInitialProvidersRef = useRef(false);

  const [rawProviders, setRawProviders] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);

  const [reviewStatsMap, setReviewStatsMap] = useState({});
  const [reviewMap, setReviewMap] = useState({});
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState('recommended');

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [clickedRecommender, setClickedRecommender] = useState(null);
  const [showFeatureComingModal, setShowFeatureComingModal] = useState(false);
  const [showBumpNetworkModal, setShowBumpNetworkModal] = useState(false);
  const [dropdownOpenForId, setDropdownOpenForId] = useState(null);
  const [showLinkCopied, setShowLinkCopied] = useState(false);
  const [likedRecommendations, setLikedRecommendations] = useState(new Set());
  
  const [isLoading, setIsLoading] = useState(!!query);

  useEffect(() => {
    if (isClerkLoaded) {
        if (isSignedIn && user) {
            setCurrentUserId(user.id);
            setCurrentUserEmail(user.primaryEmailAddress?.emailAddress);
        } else {
            setCurrentUserId(null);
            setCurrentUserEmail(null);
        }
    }
  }, [user, isSignedIn, isClerkLoaded]);
  
  useEffect(() => {
    if(location.state?.initialProviders && initialProvidersRef.current !== location.state.initialProviders) {
        initialProvidersRef.current = location.state.initialProviders;
        processedInitialProvidersRef.current = false; 
    }
  }, [location.state?.initialProviders]);

  const processAndSetProviders = async (providersToProcess) => {
    if (!Array.isArray(providersToProcess)) {
        setRawProviders([]);
        setLikedRecommendations(new Set());
        return;
    }
    const stats = {};
    const revs = {};
    await Promise.all(providersToProcess.map(async p => {
      if (!p || typeof p.id === 'undefined') return;
      try {
        const statsRes = await fetch(`${API_URL}/api/reviews/stats/${p.id}`);
        stats[p.id] = statsRes.ok ? await statsRes.json() : { average_rating: p.average_rating ?? 0, total_reviews: p.total_reviews ?? 0 };
      } catch (err) {
        stats[p.id] = { average_rating: p.average_rating ?? 0, total_reviews: p.total_reviews ?? 0 };
      }
      try {
        const rRes = await fetch(`${API_URL}/api/reviews/${p.id}`);
        revs[p.id] = rRes.ok ? await rRes.json() : [];
      } catch { revs[p.id] = []; }
    }));
    
    const newInitialUserLikes = new Set();
    const enriched = providersToProcess.map((p, idx) => {
        if (!p || typeof p.id === 'undefined') return null; 
        if (p.currentUserLiked) { 
            newInitialUserLikes.add(p.id);
        }
        return {
            ...p,
            originalIndex: idx,
            average_rating: parseFloat(stats[p.id]?.average_rating) || p.average_rating || 0,
            total_reviews: parseInt(stats[p.id]?.total_reviews, 10) || p.total_reviews || 0,
        };
    }).filter(p => p !== null);

    setLikedRecommendations(newInitialUserLikes);
    setReviewStatsMap(stats);
    setReviewMap(revs);
    setRawProviders(enriched);
  };

  useEffect(() => {
    const passedProviders = initialProvidersRef.current;

    if (passedProviders && !processedInitialProvidersRef.current && query) {
        setIsLoading(true);
        processAndSetProviders(passedProviders).finally(() => {
            setIsLoading(false);
            processedInitialProvidersRef.current = true;
        });
        return;
    }
    
    if (!query) {
        setRawProviders([]);
        setLikedRecommendations(new Set());
        setIsLoading(false);
        initialProvidersRef.current = null; 
        processedInitialProvidersRef.current = false;
        return;
    }

    if (!isClerkLoaded) {
        setIsLoading(true);
        return; 
    }

    if (!currentUserId || !currentUserEmail) {
        if (query && isSignedIn) { 
            setError("User details are still loading. Please wait briefly.");
        } else if (query && !isSignedIn) {
            setError("Please log in to perform a search.");
        }
        setIsLoading(false);
        setRawProviders([]);
        setLikedRecommendations(new Set());
        return;
    }
    
    setIsLoading(true);
    setError(null);
    initialProvidersRef.current = null; 
    processedInitialProvidersRef.current = false;

    (async () => {
      try {
        const fetchUrl = `${API_URL}/api/providers/search?q=${encodeURIComponent(query)}&user_id=${currentUserId}&email=${encodeURIComponent(currentUserEmail)}`;
        const res = await fetch(fetchUrl);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: `Search error: ${res.status}` }));
          throw new Error(errorData.message || errorData.error || `Search error: ${res.status}`);
        }
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.message || data.error || 'Search not successful');
        }
        await processAndSetProviders(data.providers || []);
        
        const currentUrlParams = new URLSearchParams(location.search);
        const urlQuery = currentUrlParams.get('q');
        const urlUserId = currentUrlParams.get('user_id');
        const urlEmail = currentUrlParams.get('email');

        if (urlQuery !== query || urlUserId !== currentUserId || urlEmail !== currentUserEmail) {
          navigate(
              `${location.pathname}?q=${encodeURIComponent(query)}&user_id=${currentUserId}&email=${encodeURIComponent(currentUserEmail)}`, 
              { 
                  replace: true, 
                  state: { prevQuery: query, currentSearchUserId: currentUserId } 
              }
          );
        }

      } catch (err) {
        setError(err.message || 'Failed to fetch search results.');
        setRawProviders([]);
        setLikedRecommendations(new Set());
      } finally {
        setIsLoading(false);
      }
    })();
  }, [query, currentUserId, currentUserEmail, navigate, location.search, isClerkLoaded, isSignedIn]);


  const sortedProviders = useMemo(() => {
    if (!rawProviders || rawProviders.length === 0) return [];
    const getBand = rating => {
      if (rating >= 4) return 0;
      if (rating >= 3) return 1;
      if (rating >= 2) return 2;
      if (rating >= 1) return 3;
      return 4;
    };
    let providersToSort = [...rawProviders];
    if (sortOption === 'topRated') {
      return providersToSort
        .filter(p => p.average_rating >= 4.5)
        .sort((a, b) => {
          if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating;
          return (b.total_reviews || 0) - (a.total_reviews || 0);
        });
    } else {
      return providersToSort.sort((a, b) => {
        const bandA = getBand(a.average_rating);
        const bandB = getBand(b.average_rating);
        if (bandA !== bandB) return bandA - bandB;
        const scoreA = (a.average_rating || 0) * (a.total_reviews || 0);
        const scoreB = (b.average_rating || 0) * (b.total_reviews || 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating;
        if ((b.total_reviews || 0) !== (a.total_reviews || 0)) return (b.total_reviews || 0) - (a.total_reviews || 0);
        return (a.originalIndex || 0) - (b.originalIndex || 0);
      });
    }
  }, [rawProviders, sortOption]);

  const handleReviewSubmit = async ({ rating, review, tags }) => {
    if (!currentUserEmail) {
      alert("User email not found. Cannot submit review.");
      return;
    }
    if (!selectedProvider) {
      alert("Provider details missing. Cannot submit review.");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: selectedProvider.id,
          provider_email: selectedProvider.email || '',
          email: currentUserEmail,
          rating,
          content: review,
          tags
        })
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Failed to submit review");
      }
      const currentRawProviders = JSON.parse(JSON.stringify(rawProviders));
      await processAndSetProviders(currentRawProviders); 
    } catch (err) {
      alert(`Error submitting review: ${err.message}`);
    }
  };

  const handleLike = async (recommendationId) => {
    if (!currentUserId || !currentUserEmail) {
        alert("Please log in to like/unlike a recommendation.");
        return;
    }
    
    const providerToUpdate = rawProviders.find(p => p.id === recommendationId);
    if (!providerToUpdate) {
        console.error("Provider not found for like action:", recommendationId);
        return;
    }

    const originalRawProviders = JSON.parse(JSON.stringify(rawProviders));
    const originalLikedRecommendations = new Set(likedRecommendations);

    const newCurrentUserLikedState = !providerToUpdate.currentUserLiked;
    const newNumLikes = newCurrentUserLikedState
        ? (providerToUpdate.num_likes || 0) + 1
        : Math.max(0, (providerToUpdate.num_likes || 1) - 1);

    setRawProviders(prevProviders =>
        prevProviders.map(provider =>
            provider.id === recommendationId
                ? { ...provider, num_likes: newNumLikes, currentUserLiked: newCurrentUserLikedState }
                : provider
        )
    );

    if (newCurrentUserLikedState) {
        setLikedRecommendations(prevLiked => new Set(prevLiked).add(recommendationId));
    } else {
        setLikedRecommendations(prevLiked => {
            const newSet = new Set(prevLiked);
            newSet.delete(recommendationId);
            return newSet;
        });
    }

    try {
      const response = await fetch(`${API_URL}/api/providers/${recommendationId}/like`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: currentUserId, userEmail: currentUserEmail }) 
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Server error during like/unlike action." }));
        throw new Error(errorData.message || `Failed to update like status. Status: ${response.status}`);
      }
      const result = await response.json(); 
      
      setRawProviders(prevProviders =>
        prevProviders.map(provider =>
            provider.id === recommendationId
                ? { ...provider, num_likes: parseInt(result.num_likes, 10) || 0, currentUserLiked: result.currentUserLiked }
                : provider
        )
      );
      
      if (result.currentUserLiked) {
         setLikedRecommendations(prev => new Set(prev).add(recommendationId));
      } else {
         setLikedRecommendations(prev => {
            const newSet = new Set(prev);
            newSet.delete(recommendationId);
            return newSet;
        });
      }
    } catch (error) {
      console.error("Error updating like status:", error.message);
      setRawProviders(originalRawProviders);
      setLikedRecommendations(originalLikedRecommendations);
      alert(`Failed to update like status: ${error.message}`);
    }
  };

  const handleBumpNetwork = () => {
    setShowBumpNetworkModal(true);
  };
  
  if (isLoading && rawProviders.length === 0 && query) {
    return (
        <div className="search-results-container">
            <div className="loading-spinner">
                Searching your trusted network...
            </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="no-results-container elite-no-results">
            <FaBullhorn className="no-results-icon" />
            <h2>Error During Search for "{query}"</h2>
            <p className="no-results-subtext">{error}</p>
            <p className="no-results-subtext">Please try again later or refine your search.</p>
        </div>
    );
  }

  if (noResultsParam && query && !isLoading) {
    return (
      <div className="no-results-container elite-no-results">
        <FaBullhorn className="no-results-icon" />
        <h2>No Instant Matches for "{query}" in Your Circle... Yet!</h2>
        <p className="no-results-subtext">
          Don't worry! While we couldn't find an immediate recommendation from your direct network,
          Tried & Trusted's intelligent agent is ready to dig deeper for you.
        </p>
        <div className="bump-network-feature">
          <h3>🚀 Activate: Bump Your Network</h3>
          <p>
            Unleash our proprietary algorithm! We'll intelligently identify and ping
            specific individuals within your extended Trust Circle who are most likely to have
            a top-tier recommendation for "{query}".
          </p>
          <p>
            Once they respond, you'll be the first to know. It's like having a personal
            concierge for trusted advice.
          </p>
          <button
            className="primary-button bump-button"
            onClick={handleBumpNetwork}
          >
            <FaPaperPlane style={{ marginRight: '10px' }} />
            Coming soon, stay tuned!
          </button>
        </div>
      </div>
    );
  }
  
  if (sortedProviders.length === 0 && query && !isLoading) {
    return (
        <div className="no-results-container elite-no-results">
            <FaBullhorn className="no-results-icon" />
            <h2>No Recommendations Found for "{query}"</h2>
            <p className="no-results-subtext">Try a different search term or expand your Trust Circle.</p>
        </div>
    );
  }
  
  if (!query && sortedProviders.length === 0 && !isLoading) {
    return (
        <div className="search-results-container">
            <h1 className="section-heading">Search for Trusted Recommendations</h1>
            <p style={{textAlign: 'center', fontSize: '1.1rem', color: '#4a5568'}}>Enter a search term above to find providers recommended by your network.</p>
        </div>
    )
  }

  return (
    <div className="search-results-container">
      <h1 className="section-heading">Search Results for "{query}"</h1>

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
      
      {isLoading && query && <div className="loading-spinner" style={{paddingTop: '1rem'}}>Updating results...</div>}

      {!isLoading && sortedProviders.length > 0 && (
        <ul className="provider-list">
          {sortedProviders.map(p => {
            const providerStats = reviewStatsMap[p.id] || { average_rating: p.average_rating || 0, total_reviews: p.total_reviews || 0 };
            const providerReviews  = reviewMap[p.id]   || [];
            const displayAvgRating = (parseFloat(providerStats.average_rating) || 0).toFixed(1);
            const hasUserLiked = likedRecommendations.has(p.id);

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
                  <StarRatingDisplay rating={parseFloat(providerStats.average_rating) || 0} />
                  <span className="review-score">
                    {displayAvgRating} ({providerStats.total_reviews || 0})
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
                  <button
                    className={`like-button ${hasUserLiked ? 'liked' : ''}`}
                    onClick={() => handleLike(p.id)}
                    title={hasUserLiked ? "Unlike this recommendation" : "Like this recommendation"}
                  >
                    <FaThumbsUp />
                    <span className="like-count">{p.num_likes || 0}</span>
                  </button>
                </div>

                <p className="card-description">{p.description || p.recommender_message || 'No description available'}</p>

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
      )}

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
            <p>We're about to launch this feature. Stay tuned <FaEye style={{ marginLeft: '5px' }} /></p>
            <div className="modal-buttons">
              <button className="primary-button" onClick={() => setShowFeatureComingModal(false)}>OK</button>
            </div>
          </div>
        </div>
      )}
      {showBumpNetworkModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close-x" onClick={() => setShowBumpNetworkModal(false)}>×</button>
            <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Great Things Coming!</h2>
            <p style={{ textAlign: 'center', fontSize: '1rem', lineHeight: '1.6' }}>
              We're working hard to launch the "Bump Your Network" feature soon.
              This intelligent agent will supercharge your search for trusted recommendations!
            </p>
            <p style={{ textAlign: 'center', marginTop: '1rem', fontWeight: 'bold' }}>Stay tuned! <FaEye style={{ marginLeft: '5px' }} /></p>
            <div className="modal-buttons" style={{marginTop: '2rem'}}>
              <button className="primary-button" onClick={() => setShowBumpNetworkModal(false)}>Got it!</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;

// working 5/20
// import React, { useState, useEffect, useMemo } from 'react';
// import { Link, useLocation, useNavigate } from 'react-router-dom';
// import { FaStar, FaPhone, FaEnvelope, FaBullhorn, FaPaperPlane, FaEye } from 'react-icons/fa';
// import QuoteModal from '../../components/QuoteModal/QuoteModal';
// import './Search.css';

// const API_URL = 'https://api.seanag-recommendations.org:8080';
// // const API_URL = 'http://localhost:3000';

// const StarRatingDisplay = ({ rating }) => {
//   const numRating = parseFloat(rating) || 0;
//   const fullStars = Math.floor(numRating);
//   const hasHalf = numRating - fullStars >= 0.5;
//   const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

//   return (
//     <div className="star-rating">
//       {[...Array(fullStars)].map((_, i) => <FaStar key={`full-${i}`} className="filled" />)}
//       {hasHalf && <FaStar key="half-star" className="half" />}
//       {[...Array(emptyStars)].map((_, i) => <FaStar key={`empty-${i}`} className="empty" />)}
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

//   useEffect(() => {
//     if (isOpen) {
//         setRating(0);
//         setHover(0);
//         setReview('');
//         setTags([]);
//         setTagInput('');
//         setError('');
//     }
//   }, [isOpen]);

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
//             <div className="tag-container modal-tag-container">
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
//   if (provider.recommender_name) recommenders.add(provider.recommender_name);
//   reviews.forEach(r => r.user_name && recommenders.add(r.user_name));
//   const alsoUsedBy = Array.from(recommenders).filter(n => n !== provider.recommender_name);
//   const currentProviderAverageRating = parseFloat(provider.average_rating) || 0;

//   return (
//     <div className="modal-overlay">
//       <div className="profile-modal-content">
//         <button className="modal-close-x" onClick={onClose}>×</button>
//         <div className="profile-header">
//           <h2 className="profile-name">{provider.business_name}</h2>
//           <div className="badge-wrapper">
//             {currentProviderAverageRating >= 4.5 && (
//               <span className="top-rated-badge">Top Rated</span>
//             )}
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
//           <p><strong>Service Type:</strong> {provider.service_type || provider.category || 'N/A'}</p>
//           <p><strong>Date of Recommendation:</strong> {formattedDate}</p>
//           {provider.recommender_name && (
//             <p><strong>Recommended by:</strong> {provider.recommender_name}
//             {provider.date_of_recommendation &&
//                 ` (on ${new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
//                     year: 'numeric', month: 'long', day: 'numeric'})})`}
//             </p>
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
//                   if (setSelectedProvider && setIsReviewModalOpen) {
//                     setSelectedProvider(provider);
//                     setIsReviewModalOpen(true);
//                   }
//                 }}
//               >+</button>
//             </div>
//           )}
//         </div>
//         <hr />
//         <div className="profile-reviews">
//           <h3>Reviews</h3>
//           {reviews.length === 0
//             ? <p className="no-reviews">No reviews yet.</p>
//             : reviews.map((r, i) => (
//                 <div key={i} className="profile-review">
//                   <div className="review-stars">
//                     {[...Array(5)].map((_, j) => (
//                       <FaStar
//                         key={j}
//                         className={j < r.rating ? 'star active' : 'star'}
//                         style={{ color: '#1A365D' }}
//                       />
//                     ))}
//                   </div>
//                   <p className="review-content">"{r.content}"</p>
//                   <p className="review-user">– {r.user_name || 'Anonymous'}</p>
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
//   const navigate = useNavigate();
//   const params = new URLSearchParams(location.search);
//   const query = params.get('q');
//   const noResultsParam = params.get('noResults') === 'true';
//   const userIdFromUrl = params.get('user_id');

//   const [rawProviders, setRawProviders] = useState(location.state?.initialProviders || []);
//   const [currentUserId, setCurrentUserId] = useState(location.state?.currentSearchUserId || null);

//   const [reviewStatsMap, setReviewStatsMap] = useState({});
//   const [reviewMap, setReviewMap] = useState({});
//   const [loading, setLoading] = useState(!location.state?.initialProviders && query);
//   const [error, setError] = useState(null);
//   const [sortOption, setSortOption] = useState('recommended');

//   const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
//   const [selectedProvider, setSelectedProvider] = useState(null);
//   const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
//   const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
//   const [clickedRecommender, setClickedRecommender] = useState(null);
//   const [showFeatureComingModal, setShowFeatureComingModal] = useState(false);
//   const [showBumpNetworkModal, setShowBumpNetworkModal] = useState(false);
//   const [dropdownOpenForId, setDropdownOpenForId] = useState(null);
//   const [showLinkCopied, setShowLinkCopied] = useState(false);
//   const [initialFetchDone, setInitialFetchDone] = useState(false);

//   useEffect(() => {
//     let idToUse = userIdFromUrl;
//     if (!idToUse) {
//       const rawUser = localStorage.getItem('user');
//       if (rawUser) {
//         try {
//           const userObject = JSON.parse(rawUser);
//           idToUse = userObject?.id || null;
//         } catch (e) { idToUse = null; }
//       }
//     }
//     if (idToUse !== currentUserId) {
//       setCurrentUserId(idToUse);
//     }
//   }, [userIdFromUrl, currentUserId]);

//   const processAndSetProviders = async (providersToProcess) => {
//     const stats = {};
//     const revs = {};
//     await Promise.all(providersToProcess.map(async p => {
//       try {
//         const statsRes = await fetch(`${API_URL}/api/reviews/stats/${p.id}`);
//         stats[p.id] = statsRes.ok ? await statsRes.json() : { average_rating: p.average_rating ?? 0, total_reviews: p.total_reviews ?? 0 };
//       } catch (err) {
//         stats[p.id] = { average_rating: p.average_rating ?? 0, total_reviews: p.total_reviews ?? 0 };
//       }
//       try {
//         const rRes = await fetch(`${API_URL}/api/reviews/${p.id}`);
//         revs[p.id] = rRes.ok ? await rRes.json() : [];
//       } catch { revs[p.id] = []; }
//     }));
//     setReviewStatsMap(stats);
//     setReviewMap(revs);

//     const enriched = providersToProcess.map((p, idx) => ({
//       ...p,
//       originalIndex: idx,
//       average_rating: parseFloat(stats[p.id]?.average_rating) || 0,
//       total_reviews: parseInt(stats[p.id]?.total_reviews, 10) || 0,
//     }));
//     setRawProviders(enriched);
//   };

//   useEffect(() => {
//     const passedProviders = location.state?.initialProviders;

//     if (passedProviders && query === params.get('q')) {
//         setLoading(true);
//         processAndSetProviders(passedProviders).finally(() => {
//             setLoading(false);
//             setInitialFetchDone(true);
//         });
//         return;
//     }
    
//     if (!query) {
//         setRawProviders([]);
//         setLoading(false);
//         setInitialFetchDone(true);
//         return;
//     }

//     if (!currentUserId) {
//       if (!localStorage.getItem('user')) setError("Please log in to search for recommendations.");
//       setRawProviders([]);
//       setLoading(false);
//       setInitialFetchDone(true);
//       return;
//     }

//     setLoading(true);
//     setError(null);
//     (async () => {
//       try {
//         const fetchUrl = `${API_URL}/api/providers/search?q=${encodeURIComponent(query)}&user_id=${currentUserId}`;
//         const res = await fetch(fetchUrl);
//         if (!res.ok) {
//           const errorData = await res.json().catch(() => ({ message: `Search error: ${res.status}` }));
//           throw new Error(errorData.message || errorData.error || `Search error: ${res.status}`);
//         }
//         const data = await res.json();
//         if (!data.success) {
//           throw new Error(data.message || data.error || 'Search not successful');
//         }
//         await processAndSetProviders(data.providers || []);
//       } catch (err) {
//         setError(err.message || 'Failed to fetch search results.');
//         setRawProviders([]);
//       } finally {
//         setLoading(false);
//         setInitialFetchDone(true);
//       }
//     })();
//   }, [query, currentUserId, location.state]);

//   const sortedProviders = useMemo(() => {
//     if (!rawProviders || rawProviders.length === 0) return [];

//     const getBand = rating => {
//       if (rating >= 4) return 0;
//       if (rating >= 3) return 1;
//       if (rating >= 2) return 2;
//       if (rating >= 1) return 3;
//       return 4;
//     };

//     let providersToSort = [...rawProviders];

//     if (sortOption === 'topRated') {
//       return providersToSort
//         .filter(p => p.average_rating >= 4.5)
//         .sort((a, b) => {
//           if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating;
//           return (b.total_reviews || 0) - (a.total_reviews || 0);
//         });
//     } else {
//       return providersToSort.sort((a, b) => {
//         const bandA = getBand(a.average_rating);
//         const bandB = getBand(b.average_rating);
//         if (bandA !== bandB) return bandA - bandB;

//         const scoreA = (a.average_rating || 0) * (a.total_reviews || 0);
//         const scoreB = (b.average_rating || 0) * (b.total_reviews || 0);
//         if (scoreB !== scoreA) return scoreB - scoreA;

//         if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating;
//         if ((b.total_reviews || 0) !== (a.total_reviews || 0)) return (b.total_reviews || 0) - (a.total_reviews || 0);
        
//         return (a.originalIndex || 0) - (b.originalIndex || 0);
//       });
//     }
//   }, [rawProviders, sortOption]);


//   const handleReviewSubmit = async ({ rating, review, tags }) => {
//     const userEmail = localStorage.getItem('userEmail');
//     if (!selectedProvider || !userEmail) {
//       alert("Cannot submit review: User or provider details missing.");
//       return;
//     }
//     try {
//       const response = await fetch(`${API_URL}/api/reviews`, {
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
//       if (!response.ok) {
//         const errText = await response.text();
//         throw new Error(errText || "Failed to submit review");
//       }
//       await processAndSetProviders([...rawProviders]);
//     } catch (err) {
//       alert(`Error submitting review: ${err.message}`);
//     }
//   };

//   const handleBumpNetwork = () => {
//     setShowBumpNetworkModal(true);
//   };

//   if (loading && !initialFetchDone) return <div className="loading-spinner">Searching your trusted network...</div>;
  
//   if (error && sortedProviders.length === 0 && !loading && initialFetchDone) {
//     return (
//         <div className="no-results-container elite-no-results">
//             <FaBullhorn className="no-results-icon" />
//             <h2>Error During Search for "{query}"</h2>
//             <p className="no-results-subtext">{error}</p>
//             <p className="no-results-subtext">Please try again later or refine your search.</p>
//         </div>
//     );
//   }

//   if ((noResultsParam || (initialFetchDone && sortedProviders.length === 0 && query)) && !loading) {
//     return (
//       <div className="no-results-container elite-no-results">
//         <FaBullhorn className="no-results-icon" />
//         <h2>No Instant Matches for "{query}" in Your Circle... Yet!</h2>
//         <p className="no-results-subtext">
//           Don't worry! While we couldn't find an immediate recommendation from your direct network,
//           Tried & Trusted's intelligent agent is ready to dig deeper for you.
//         </p>
//         <div className="bump-network-feature">
//           <h3>🚀 Activate: Bump Your Network</h3>
//           <p>
//             Unleash our proprietary algorithm! We'll intelligently identify and ping
//             specific individuals within your extended Trust Circle who are most likely to have
//             a top-tier recommendation for "{query}".
//           </p>
//           <p>
//             Once they respond, you'll be the first to know. It's like having a personal
//             concierge for trusted advice.
//           </p>
//           <button
//             className="primary-button bump-button"
//             onClick={handleBumpNetwork}
//           >
//             <FaPaperPlane style={{ marginRight: '10px' }} />
//             {/* Bump Your Network for "{query}" */}
//             Coming soon, stay tuned!
//           </button>
//         </div>
//       </div>
//     );
//   }
  
//   if (!query && !loading && initialFetchDone && sortedProviders.length === 0) {
//     return (
//         <div className="search-results-container">
//             <h1 className="section-heading">Search for Trusted Recommendations</h1>
//             <p style={{textAlign: 'center', fontSize: '1.1rem', color: '#4a5568'}}>Enter a search term above to find providers recommended by your network.</p>
//         </div>
//     )
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

//       {loading && <div className="loading-spinner" style={{marginTop: '2rem'}}>Updating results...</div>}

//       {!loading && sortedProviders.length > 0 && (
//         <ul className="provider-list">
//           {sortedProviders.map(p => {
//             const providerStats = reviewStatsMap[p.id] || { average_rating: p.average_rating || 0, total_reviews: p.total_reviews || 0 };
//             const providerReviews  = reviewMap[p.id]   || [];
//             const displayAvgRating = (parseFloat(providerStats.average_rating) || 0).toFixed(1);

//             return (
//               <li key={p.id} className="provider-card">
//                 <div className="card-header">
//                   <h2 className="card-title">
//                       <Link
//                           to={`/provider/${p.id}`}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                           className="provider-name-link"
//                           onClick={() => localStorage.setItem('selectedProvider', JSON.stringify(p))}
//                       >
//                           {p.business_name}
//                       </Link>
//                   </h2>
//                   <div className="badge-wrapper-with-menu">
//                     <div className="badge-group">
//                       {(parseFloat(providerStats.average_rating) || 0) >= 4.5 && (
//                         <span className="top-rated-badge">Top Rated</span>
//                       )}
//                     </div>
//                     <div className="dropdown-wrapper">
//                       <button
//                         className="three-dots-button"
//                         onClick={() =>
//                           setDropdownOpenForId(dropdownOpenForId === p.id ? null : p.id)
//                         }
//                         title="Options"
//                       >
//                         ⋮
//                       </button>
//                       {dropdownOpenForId === p.id && (
//                         <div className="dropdown-menu">
//                           <button
//                             className="dropdown-item"
//                             onClick={() => {
//                               navigator.clipboard.writeText(
//                                 `${window.location.origin}/provider/${p.id}`
//                               );
//                               setDropdownOpenForId(null);
//                               setShowLinkCopied(true);
//                               setTimeout(() => setShowLinkCopied(false), 2000);
//                             }}
//                           >
//                             Share this Rec
//                           </button>
//                         </div>
//                       )}
//                       {showLinkCopied && <div className="toast">Link copied!</div>}
//                     </div>
//                   </div>
//                 </div>

//                 <div className="review-summary">
//                   <StarRatingDisplay rating={parseFloat(providerStats.average_rating) || 0} />
//                   <span className="review-score">
//                     {displayAvgRating} ({providerStats.total_reviews || 0})
//                   </span>
//                   <button
//                     className="see-all-button"
//                     onClick={() => {
//                       setSelectedProvider(p);
//                       setIsReviewModalOpen(true);
//                     }}
//                   >
//                     Write a Review
//                   </button>
//                 </div>

//                 <p className="card-description">{p.description || 'No description available'}</p>

//                 {Array.isArray(p.tags) && p.tags.length > 0 && (
//                   <div className="tag-container">
//                     {p.tags.map((tag, idx) => (
//                       <span key={`${idx}-${p.id}`} className="tag-badge">{tag}</span>
//                     ))}
//                     <button
//                       className="add-tag-button"
//                       onClick={() => {
//                         setSelectedProvider(p);
//                         setIsReviewModalOpen(true);
//                       }}
//                     >
//                       +
//                     </button>
//                   </div>
//                 )}


//                 {p.recommender_name && (
//                   <div className="recommended-row">
//                     <span className="recommended-label">Recommended by:</span>
//                     {p.recommender_user_id ? (
//                           <Link
//                               to={`/user/${p.recommender_user_id}/recommendations`}
//                               className="recommended-name clickable"
//                               target="_blank"
//                               rel="noopener noreferrer"
//                           >
//                               {p.recommender_name}
//                           </Link>
//                       ) : (
//                           <span
//                               className="recommended-name clickable"
//                               onClick={() => setClickedRecommender(p.recommender_name)}
//                           >
//                               {p.recommender_name}
//                           </span>
//                       )}
//                     {p.date_of_recommendation && (
//                           <span className="recommendation-date">
//                               {'('}{new Date(p.date_of_recommendation).toLocaleDateString('en-US', {
//                                   year: '2-digit', month: 'numeric', day: 'numeric',
//                               })}{')'}
//                           </span>
//                       )}
//                   </div>
//                 )}

//                 {providerReviews.length > 0 &&
//                   [...new Set(providerReviews.map(r => r.user_name).filter(n => n && n !== p.recommender_name))].length > 0 && (
//                   <div className="recommended-row">
//                     <span className="recommended-label">Also used by:</span>
//                     <span className="used-by-names">
//                       {[...new Set(providerReviews.map(r => r.user_name).filter(n => n && n !== p.recommender_name))].join(', ')}
//                     </span>
//                   </div>
//                 )}

//                 <div className="action-buttons">
//                   <button
//                       className="primary-button"
//                       onClick={() => {
//                           setSelectedProvider(p);
//                           setIsQuoteModalOpen(true);
//                       }}
//                   >
//                       Request a Quote
//                   </button>
//                    <button
//                       className="secondary-button"
//                       onClick={() => {
//                           if (p.recommender_phone) {
//                               window.location.href = `sms:${p.recommender_phone}`;
//                           } else if (p.recommender_email) {
//                               window.location.href = `mailto:${p.recommender_email}`;
//                           } else {
//                               alert('Sorry, contact info for the recommender is not available.');
//                           }
//                       }}
//                       disabled={!p.recommender_phone && !p.recommender_email && !p.recommender_name}
//                   >
//                       Connect with Recommender
//                   </button>
//                 </div>
//               </li>
//             );
//           })}
//         </ul>
//       )}

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
//           reviews={reviewMap[selectedProvider.id] || []}
//           setSelectedProvider={setSelectedProvider}
//           setIsReviewModalOpen={setIsReviewModalOpen}
//         />
//       )}
//       {isQuoteModalOpen && selectedProvider && (
//         <QuoteModal
//             isOpen={isQuoteModalOpen}
//             providerName={selectedProvider.business_name}
//             providerEmail={selectedProvider.email}
//             providerPhotoUrl={selectedProvider.profile_image}
//             onClose={() => setIsQuoteModalOpen(false)}
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
//             <button className="modal-close-x" onClick={() => setShowFeatureComingModal(false)}>×</button>
//             <p>We're about to launch this feature. Stay tuned <FaEye style={{ marginLeft: '5px' }} /></p>
//             <div className="modal-buttons">
//               <button className="primary-button" onClick={() => setShowFeatureComingModal(false)}>OK</button>
//             </div>
//           </div>
//         </div>
//       )}
//       {showBumpNetworkModal && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <button className="modal-close-x" onClick={() => setShowBumpNetworkModal(false)}>×</button>
//             <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Great Things Coming!</h2>
//             <p style={{ textAlign: 'center', fontSize: '1rem', lineHeight: '1.6' }}>
//               We're working hard to launch the "Bump Your Network" feature soon.
//               This intelligent agent will supercharge your search for trusted recommendations!
//             </p>
//             <p style={{ textAlign: 'center', marginTop: '1rem', fontWeight: 'bold' }}>Stay tuned! <FaEye style={{ marginLeft: '5px' }} /></p>
//             <div className="modal-buttons" style={{marginTop: '2rem'}}>
//               <button className="primary-button" onClick={() => setShowBumpNetworkModal(false)}>Got it!</button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Search;