import { useUser } from "@clerk/clerk-react";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaBullhorn, FaChevronDown, FaEye, FaMapMarkerAlt, FaPaperPlane, FaStar } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import QuoteModal from '../../components/QuoteModal/QuoteModal';
import RecommendationCard from "../../components/RecommendationCard/RecommendationCard";
import ReviewModal from "../../components/ReviewModal/ReviewModal";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
import './Search.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = "http://localhost:3000";

// US States list for location selector
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

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



const Search = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isSignedIn, isLoaded: isClerkLoaded } = useUser();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const query = useMemo(() => params.get('q'), [params]);
  const stateParam = useMemo(() => params.get('state'), [params]);
  const noResultsParam = useMemo(() => params.get('noResults') === 'true', [params]);
  
  const initialProvidersRef = useRef(location.state?.initialProviders);
  const processedInitialProvidersRef = useRef(false);

  const [rawProviders, setRawProviders] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);

  const [error, setError] = useState(null);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [clickedRecommender, setClickedRecommender] = useState(null);
  const [showFeatureComingModal, setShowFeatureComingModal] = useState(false);
  const [showBumpNetworkModal, setShowBumpNetworkModal] = useState(false);
  const [likedRecommendations, setLikedRecommendations] = useState(new Set());
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedCities, setSelectedCities] = useState([]);
  const [showCityFilter, setShowCityFilter] = useState(false);
  
  // Batch comments state
  const [commentsMap, setCommentsMap] = useState(new Map());
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  
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
    
    // Use review data directly from service_providers table instead of individual API calls
    const newInitialUserLikes = new Set();
    const enriched = providersToProcess.map((p, idx) => {
        if (!p || typeof p.id === 'undefined') return null; 
        if (p.currentUserLiked) { 
            newInitialUserLikes.add(p.id);
        }
        return {
            ...p,
            originalIndex: idx,
            average_rating: parseFloat(p.average_rating) || 0,
            total_reviews: parseInt(p.total_reviews, 10) || 0,
            users_who_reviewed: p.users_who_reviewed || []
        };
    }).filter(p => p !== null);

    setLikedRecommendations(newInitialUserLikes);
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
        let fetchUrl = `${API_URL}/api/providers/search?q=${encodeURIComponent(query)}&user_id=${currentUserId}&email=${encodeURIComponent(currentUserEmail)}`;
        if (stateParam) {
            fetchUrl += `&state=${encodeURIComponent(stateParam)}`;
        }
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
        
        // Construct the full, correct URL that should be in the address bar
        const targetUrl = new URL(window.location.href);
        targetUrl.searchParams.set('q', query);
        targetUrl.searchParams.set('user_id', currentUserId);
        targetUrl.searchParams.set('email', currentUserEmail);
        if (stateParam) {
            targetUrl.searchParams.set('state', stateParam);
        } else {
            targetUrl.searchParams.delete('state');
        }

        // Only navigate if the constructed URL is different from the current one
        if (targetUrl.href !== window.location.href) {
            navigate(targetUrl.pathname + targetUrl.search, { 
                replace: true, 
                state: { prevQuery: query, currentSearchUserId: currentUserId } 
            });
        }

      } catch (err) {
        setError(err.message || 'Failed to fetch search results.');
        setRawProviders([]);
        setLikedRecommendations(new Set());
      } finally {
        setIsLoading(false);
      }
    })();
  }, [query, stateParam, currentUserId, currentUserEmail, navigate, location.search, isClerkLoaded, isSignedIn]);

  // Fetch comments when providers are loaded
  useEffect(() => {
    if (!isLoading && rawProviders.length > 0) {
      fetchBatchComments(rawProviders);
    }
  }, [rawProviders, isLoading]);

  const handleCitySelection = (cityName) => {
    setSelectedCities((prev) =>
      prev.includes(cityName)
        ? prev.filter((c) => c !== cityName)
        : [...prev, cityName]
    );
  };

  const availableCities = useMemo(() => {
    if (!rawProviders || rawProviders.length === 0) return [];
    const cityCounts = rawProviders.reduce((acc, rec) => {
      const city = rec.city || "Other";
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(cityCounts).sort(
      ([, countA], [, countB]) => countB - countA
    );
  }, [rawProviders]);

  const sortedProviders = useMemo(() => {
    if (!rawProviders || rawProviders.length === 0) return [];
    
    let list = [...rawProviders];

    // Apply city filter
    if (selectedCities.length > 0) {
      list = list.filter(p => {
        const city = p.city || "Other";
        return selectedCities.includes(city);
      });
    }
    
    // Sort by date of recommendation (newest first)
    return list.sort((a, b) => {
      const dateA = a.date_of_recommendation;
      const dateB = b.date_of_recommendation;

      if (dateA && dateB) return new Date(dateB) - new Date(dateA);
      if (dateA) return -1;
      if (dateB) return 1;
      return (a.originalIndex || 0) - (b.originalIndex || 0);
    });
  }, [rawProviders, selectedCities]);

  const handleReviewSubmit = async ({ rating, review, tags }) => {
    if (!currentUserEmail) {
      alert("User email not found. Cannot submit review.");
      return;
    }
    if (!currentUserId) {
      alert("User ID not found. Cannot submit review.");
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
          user_id: currentUserId,
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
      
      // Show success modal
      setSuccessMessage(`Thank you for reviewing ${selectedProvider.business_name}! Your feedback helps others make better decisions.`);
      setIsSuccessModalOpen(true);
      
      // Update the specific provider with new review data
      try {
        const params = new URLSearchParams({
          user_id: currentUserId,
          email: currentUserEmail,
        });
        const providerResponse = await fetch(`${API_URL}/api/providers/${selectedProvider.id}?${params.toString()}`);
        
        if (providerResponse.ok) {
          const data = await providerResponse.json();
          if (data.success && data.provider) {
            const updatedProvider = data.provider;
            setRawProviders(prevProviders => {
              return prevProviders.map(provider => {
                if (provider.id === selectedProvider.id) {
                  const existingTags = Array.isArray(provider.tags) ? provider.tags : [];
                  const newTags = Array.isArray(tags) ? tags : [];
                  const allTags = [...new Set([...existingTags, ...newTags])];

                  return {
                    ...provider,
                    average_rating: parseFloat(updatedProvider.average_rating) || provider.average_rating,
                    total_reviews: parseInt(updatedProvider.total_reviews, 10) || provider.total_reviews,
                    users_who_reviewed: updatedProvider.users_who_reviewed || provider.users_who_reviewed || [],
                    tags: allTags
                  };
                }
                return provider;
              });
            });
          }
        }
      } catch (error) {
        console.error(`Failed to update recommendation ${selectedProvider.id}:`, error);
        // Fallback: refresh all providers
        const currentRawProviders = JSON.parse(JSON.stringify(rawProviders));
        await processAndSetProviders(currentRawProviders);
      }
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

  // Batch fetch comments for multiple recommendations
  const fetchBatchComments = async (recommendations) => {
    if (!recommendations || recommendations.length === 0) return;
    
    setIsLoadingComments(true);
    try {
      const serviceIds = recommendations.map(rec => rec.id).filter(Boolean);
      
      if (serviceIds.length === 0) return;

      const response = await fetch(`${API_URL}/api/comments/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ service_ids: serviceIds })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.comments) {
          const commentsMap = new Map();
          Object.entries(data.comments).forEach(([serviceId, comments]) => {
            commentsMap.set(serviceId, comments || []);
          });
          setCommentsMap(commentsMap);
        }
      }
    } catch (error) {
      console.error('Error fetching batch comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  // Handle new comment added
  const handleCommentAdded = (serviceId, newComment) => {
    setCommentsMap(prev => {
      const newMap = new Map(prev);
      const existingComments = newMap.get(serviceId) || [];
      newMap.set(serviceId, [newComment, ...existingComments]);
      return newMap;
    });
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

      {availableCities.length > 0 && (
        <div className="profile-city-filter-toggle-section">
          <button
            className="profile-city-filter-toggle"
            onClick={() =>
              setShowCityFilter(!showCityFilter)
            }
          >
            <FaMapMarkerAlt className="profile-filter-icon" />
            <span className="filter-button-text">
              <span className="filter-button-text-long">
                Filter by{" "}
              </span>
              <span>City</span>
            </span>
            {selectedCities.length > 0 && (
              <span className="profile-active-filters-badge">
                {selectedCities.length}
              </span>
            )}
            <FaChevronDown
              className={`profile-filter-chevron ${
                showCityFilter ? "rotated" : ""
              }`}
            />
          </button>
          {showCityFilter && (
            <div className="profile-city-filter-wrapper">
              <div className="profile-city-filter-checkboxes">
                {availableCities.map(
                  ([cityName, count]) => (
                    <div
                      key={cityName}
                      className="profile-city-checkbox-item"
                    >
                      <input
                        type="checkbox"
                        id={`city-${cityName.replace(/\s+/g, '-')}`}
                        name={cityName}
                        checked={selectedCities.includes(
                          cityName
                        )}
                        onChange={() =>
                          handleCitySelection(
                            cityName
                          )
                        }
                      />
                      <label
                        htmlFor={`city-${cityName.replace(/\s+/g, '-')}`}
                        className="profile-city-checkbox-label"
                      >
                        {cityName}
                      </label>
                      <span className="profile-city-count">
                        ({count})
                      </span>
                    </div>
                  )
                )}
                {selectedCities.length > 0 && (
                  <button
                    onClick={() =>
                      setSelectedCities([])
                    }
                    className="profile-city-clear-all"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {isLoading && query && <div className="loading-spinner" style={{paddingTop: '1rem'}}>Updating results...</div>}

      {!isLoading && sortedProviders.length > 0 && (
        <div className="recommendations-feed">
          {sortedProviders.map(p => (
            <RecommendationCard
              key={p.id}
              rec={{
                ...p,
                provider_id: p.id,
                recommender_message: p.description || p.recommender_message || 'No description available'
              }}
              onWriteReview={(provider) => {
                setSelectedProvider(provider);
                setIsReviewModalOpen(true);
              }}
              onLike={handleLike}
              isLikedByCurrentUser={likedRecommendations.has(p.id)}
              loggedInUserId={currentUserId}
              currentUserName={user?.firstName}
              comments={commentsMap.get(String(p.id)) || []}
              onCommentAdded={handleCommentAdded}
            />
          ))}
        </div>
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
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        message={successMessage}
        title="Review Submitted!"
      />
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