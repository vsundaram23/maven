import React, { useState, useEffect } from 'react';
import { FaStar } from 'react-icons/fa';
import { fetchFinancialProviders } from '../../services/providerService';
import './FinancialServices.css';

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
          <div className="modal-buttons">
            <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
            <button type="submit" className="submit-button">Submit Review</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FinancialServices = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);

  useEffect(() => {
    const getProviders = async () => {
      try {
        const data = await fetchFinancialProviders();
        console.log('[Financial Providers]', data?.providers);
        setProviders(data?.providers || []);
      } catch (err) {
        console.error('Error fetching financial providers:', err);
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
      const response = await fetch(`${API_URL}/api/reviews`, {
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

      if (!response.ok) throw new Error('Failed to submit review');
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

  if (loading) return <div className="loading-spinner">Loading...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;
  if (!providers.length) return <div className="no-data">No financial service providers found</div>;

  return (
    <div className="financial-services-container">
      <h1 className="section-heading">Top Financial Service Providers</h1>
      <ul className="provider-list">
        {providers.map((provider) => (
          <li key={provider.id || Math.random()} className="provider-card">
            <div className="card-header">
              <h2 className="card-title">{provider.business_name || 'Unnamed Provider'}</h2>
              <span className="badge">Financial Services</span>
            </div>

            <p className="card-description">
              {provider.description || 'No description available'}
            </p>

            {provider.recommended_by_name && (
              <div className="recommended-row">
                <span className="recommended-label">Recommended by:</span>
                <span className="recommended-name">{provider.recommended_by_name}</span>
              </div>
            )}

            <div className="action-buttons">
              <button
                className="primary-button"
                onClick={() => handleConsultation(provider)}
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
          onSubmit={handleReviewSubmit}
          provider={selectedProvider}
        />
      )}
    </div>
  );
};

export default FinancialServices;


// import React, { useState, useEffect } from 'react';
// import { FaPhone, FaEnvelope, FaStar } from 'react-icons/fa';
// import { fetchFinancialProviders } from '../../services/providerService';
// import './FinancialServices.css';

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

//   if (!isOpen) return null;

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

// const FinancialServices = () => {
//   const [providers, setProviders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
//   const [selectedProvider, setSelectedProvider] = useState(null);

//   useEffect(() => {
//     const getProviders = async () => {
//       try {
//         const data = await fetchFinancialProviders();
//         const financialProviders = data.providers || [];
//         setProviders(financialProviders);
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
//           provider_email: reviewData.providerEmail,
//           email: userEmail,
//           rating: reviewData.rating,
//           content: reviewData.review
//         })
//       });

//       if (!response.ok) throw new Error('Failed to submit review');
//     } catch (err) {
//       console.error('Error submitting review:', err);
//     }
//   };

//   const handlePhoneClick = (phoneNumber) => {
//     if (phoneNumber) window.location.href = `tel:${phoneNumber}`;
//   };

//   const handleEmailClick = (email) => {
//     if (email) window.location.href = `mailto:${email}`;
//   };

//   if (loading) return <div className="loading-spinner">Loading...</div>;
//   if (error) return <div className="error-message">Error: {error}</div>;
//   if (providers.length === 0) return <div className="no-data">No financial service providers found</div>;

//   return (
//     <div className="financial-services-container">
//       <div className="category-tabs">
//         <button className="tab active">All Financial Services</button>
//       </div>
//       <div className="providers-grid">
//         {providers.map(provider => (
//           <div className="financial-service-card" key={provider.id}>
//             <div className="card-content">
//               <div className="card-header">
//                 <h2 className="card-title">{provider.business_name}</h2>
//                 <div className="contact-icons">
//                   {provider.phone_number?.trim() && (
//                     <FaPhone
//                       className="contact-icon phone-icon"
//                       size={16}
//                       onClick={() => handlePhoneClick(provider.phone_number)}
//                       title="Call provider"
//                     />
//                   )}
//                   {provider.email?.trim() && (
//                     <FaEnvelope
//                       className="contact-icon email-icon"
//                       size={16}
//                       onClick={() => handleEmailClick(provider.email)}
//                       title="Email provider"
//                     />
//                   )}
//                 </div>
//               </div>
//               <div className="card-service-type">{provider.service_type}</div>
//               <div className="card-description">{provider.description}</div>
//               <div className="recommended-section">
//                 <div className="recommended-by">
//                   Recommended by: {provider.recommended_by_name}
//                 </div>
//               </div>
//               <button
//                 className="service-button"
//                 onClick={() => {
//                   setSelectedProvider(provider);
//                   setIsReviewModalOpen(true);
//                 }}
//               >
//                 Have you used this service?
//               </button>
//             </div>
//           </div>
//         ))}
//       </div>
//       {isReviewModalOpen && (
//         <ReviewModal
//           isOpen={isReviewModalOpen}
//           onClose={() => setIsReviewModalOpen(false)}
//           onSubmit={(reviewData) => handleReviewSubmit({
//             ...reviewData,
//             providerEmail: selectedProvider.email
//           })}
//           provider={selectedProvider}
//         />
//       )}
//     </div>
//   );
// };

// export default FinancialServices;



// import React, { useState, useEffect } from 'react';
// import { FaComment, FaHeart, FaPhone, FaEnvelope, FaStar } from 'react-icons/fa';
// import { fetchProviders } from '../../services/providerService';
// import CommentModal from '../../components/CommentModal/CommentModal';
// import './FinancialServices.css';

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

//   if (!isOpen) return null;

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

// const FinancialServices = () => {
//   const [providers, setProviders] = useState([]);
//   const [categories, setCategories] = useState([]);
//   const [selectedCategory, setSelectedCategory] = useState('all');
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
//   const [selectedProvider, setSelectedProvider] = useState(null);
//   const [likedProviders, setLikedProviders] = useState(new Set());
//   const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

//   useEffect(() => {
//     const getProviders = async () => {
//       try {
//         setLoading(true);
//         const data = await fetchProviders();
//         console.log('Providers data:', data);
//         setProviders(data);
  
//         const userEmail = localStorage.getItem('userEmail');
//         if (userEmail) {
//           const likesResponse = await fetch(`${API_URL}/api/reviews/user-likes`, {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({ email: userEmail })
//           });
//           const likedData = await likesResponse.json();
//           setLikedProviders(new Set(likedData.map(like => like.provider_id)));
//         }
  
//         const uniqueCategories = [...new Set(data.map(provider => 
//           provider.service_type))];
//         setCategories(uniqueCategories);
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
//     if (!selectedProvider) {
//       console.error('No provider selected');
//       return;
//     }
//     try {
//       const response = await fetch(`${API_URL}/api/reviews`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//           provider_id: selectedProvider.id,
//           provider_email: reviewData.providerEmail,
//           email: userEmail,
//           rating: reviewData.rating,
//           content: reviewData.review
//         })
//       });
  
//       if (!response.ok) {
//         throw new Error('Failed to submit review');
//       }
//     } catch (err) {
//       console.error('Error submitting review:', err);
//     }
//   };

//   const handleLike = async (providerId, providerEmail) => {
//     const userEmail = localStorage.getItem('userEmail');
//     if (!userEmail) {
//       alert('Please log in to like this provider');
//       return;
//     }
  
//     const isCurrentlyLiked = likedProviders.has(providerId);
  
//     try {
//       const response = await fetch(`${API_URL}/api/reviews`, {
//         method: isCurrentlyLiked ? 'DELETE' : 'POST',
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//           provider_id: providerId,
//           provider_email: providerEmail,
//           email: userEmail,
//           rating: 1,
//           content: isCurrentlyLiked ? 'Unliked' : 'Liked'
//         })
//       });
  
//       if (response.ok) {
//         setLikedProviders(prev => {
//           const newSet = new Set(prev);
//           if (isCurrentlyLiked) {
//             newSet.delete(providerId);
//           } else {
//             newSet.add(providerId);
//           }
//           return newSet;
//         });
  
//         setProviders(providers.map(p => 
//           p.id === providerId 
//             ? { 
//                 ...p, 
//                 num_likes: isCurrentlyLiked 
//                   ? (p.num_likes || 1) - 1 
//                   : (p.num_likes || 0) + 1 
//               }
//             : p
//         ));
//       }
//     } catch (error) {
//       console.error('Error handling like:', error);
//     }
//   };  

//   const handlePhoneClick = (phoneNumber) => {
//     if (phoneNumber) {
//       window.location.href = `tel:${phoneNumber}`;
//     }
//   };

//   const handleEmailClick = (email) => {
//     if (email) {
//       window.location.href = `mailto:${email}`;
//     }
//   };

//   const filteredProviders = selectedCategory === 'all' 
//     ? providers 
//     : providers.filter(provider => provider.service_type === selectedCategory);

//   if (loading) {
//     return <div className="loading-spinner">Loading...</div>;
//   }
//   if (error) {
//     return <div className="error-message">Error: {error}</div>;
//   }
//   if (providers.length === 0) {
//     return <div className="no-data">No providers found</div>;
//   }

//   return (
//     <div className="financial-services-container">
//       <div className="category-tabs">
//         <button 
//           className={`tab ${selectedCategory === 'all' ? 'active' : ''}`}
//           onClick={() => setSelectedCategory('all')}
//         >
//           All Services
//         </button>
//         {categories.map(category => (
//           <button
//             key={category}
//             className={`tab ${selectedCategory === category ? 'active' : ''}`}
//             onClick={() => setSelectedCategory(category)}
//           >
//             {category}
//           </button>
//         ))}
//       </div>
//       <div className="providers-grid">
//         {filteredProviders.map(provider => (
//           <div className="financial-service-card" key={provider.id}>
//             <div className="recommended-by-top">
//               <div className="recommended-header">
//                 <span>Rec'd By:</span>
//                 <span className="recommendation-name">{provider.recommended_by_name}</span>
//               </div>
//               {/* <div className="recommendation-date">
//                 {new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
//                   year: 'numeric',
//                   month: 'long',
//                   day: 'numeric'
//                 })}
//               </div> */}
//             </div>
//             <div className="card-content">
//               <div className="card-header">
//                 <h2 className="card-title">{provider.business_name}</h2>
//                 <div className="contact-icons">
//                   {provider.phone_number?.trim() && (
//                     <FaPhone 
//                       className="contact-icon phone-icon" 
//                       size={16} 
//                       onClick={() => handlePhoneClick(provider.phone_number)}
//                       title="Call provider"
//                     />
//                   )}
//                   {provider.email?.trim() && (
//                     <FaEnvelope 
//                       className="contact-icon email-icon" 
//                       size={16}
//                       onClick={() => handleEmailClick(provider.email)}
//                       title="Email provider"
//                     />
//                   )}
//                 </div>
//               </div>
//               {/* <div className="card-subtitle">{provider.role}</div> */}
//               {/* <div className="card-service-type">{provider.service_type}</div> */}
//               <div className="card-description">{provider.description}</div>
//               <button 
//                 className="service-button"
//                 onClick={() => {
//                   setSelectedProvider(provider);
//                   setIsReviewModalOpen(true);
//                 }}
//               >
//                 Have you used this service?
//               </button>
//             </div>
//           </div>
//         ))}
//       </div>
//       {isReviewModalOpen && (
//         <ReviewModal
//           isOpen={isReviewModalOpen}
//           onClose={() => setIsReviewModalOpen(false)}
//           onSubmit={(reviewData) => handleReviewSubmit({
//             ...reviewData,
//             providerEmail: selectedProvider.email
//           })}
//           provider={selectedProvider}
//         />
//       )}
//     </div>
//   );
// };

// export default FinancialServices;
