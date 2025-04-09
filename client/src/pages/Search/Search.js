import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FaPhone, FaEnvelope, FaStar } from 'react-icons/fa';
import './Search.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';

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

const Search = () => {
  const location = useLocation();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const params = new URLSearchParams(location.search);
  const query = params.get('q');
  const noResults = params.get('noResults') === 'true';

  useEffect(() => {
    if (!query || noResults) {
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/providers/search?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        setResults(data.providers || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching search results:', err);
        setError('Failed to fetch search results');
        setLoading(false);
      });
  }, [query, noResults]);

  const handleReviewSubmit = async (reviewData) => {
    const userEmail = localStorage.getItem('userEmail');
    if (!selectedProvider) return;

    try {
      await fetch(`${API_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: selectedProvider.id,
          provider_email: selectedProvider.email || '',
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
      window.location.href = `sms:${provider.phone_number}?body=Hi ${provider.business_name}, ${provider.recommended_by_name} recommended you, and I’d like to request a consultation.`;
    } else if (provider.email) {
      window.location.href = `mailto:${provider.email}?subject=Request%20for%20Consultation&body=Hi%20${provider.business_name},%20I%E2%80%99d%20like%20to%20request%20a%20consultation%20via%20Tried%20%26%20Trusted.`;
    } else {
      alert("Thanks for requesting a consultation. We'll reach out to you shortly.");
    }
  };

  if (loading) return <div className="loading-spinner">Loading results...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (noResults || results.length === 0) {
    return (
      <div className="no-results">
        <p>No trusted providers found for your search.</p>
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
      <h1 className="section-heading">Search Results</h1>
      <ul className="provider-list">
        {results.map((provider) => (
          <li key={provider.id || Math.random()} className="provider-card">
            <div className="card-header">
              <h2 className="card-title">{provider.business_name}</h2>
              <span className="badge">{provider.service_type || 'Service'}</span>
            </div>

            <p className="card-description">{provider.description || 'No description available'}</p>

            {provider.recommended_by_name && (
              <div className="recommended-row">
                <span className="recommended-label">Recommended by:</span>
                <span className="recommended-name">{provider.recommended_by_name}</span>
              </div>
            )}

            <div className="action-buttons">
              <button className="primary-button" onClick={() => handleConsultation(provider)}>
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
          onSubmit={handleReviewSubmit}
          provider={selectedProvider}
        />
      )}
    </div>
  );
};

export default Search;


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
