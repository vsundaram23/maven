import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { FaStar, FaPhone, FaEnvelope } from 'react-icons/fa';
import './ProviderProfile.css';

// const API_URL = 'https://api.seanag-recommendations.org:8080';
const API_URL = 'http://localhost:3000';

const ProviderProfile = () => {
    const { id } = useParams();
    const location = useLocation();
    const [provider, setProvider] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [showContactChoice, setShowContactChoice] = useState(false);
    const [activeTab, setActiveTab] = useState('Reviews');
  
    useEffect(() => {
      const fetchProvider = async () => {
        const res = await fetch(`${API_URL}/api/providers/${id}`);
        const data = await res.json();
        setProvider(data.provider);
      };
      fetchProvider();
    }, [id]);
  
    useEffect(() => {
      const fetchReviews = async () => {
        const res = await fetch(`${API_URL}/api/reviews/${id}`);
        const data = await res.json();
        setReviews(data);
      };
      fetchReviews();
    }, [id]);
  
    if (!provider) return <div className="profile-wrapper">Loading provider...</div>;
  
    const recommenders = new Set();
    if (provider.recommended_by_name) recommenders.add(provider.recommended_by_name);
    reviews.forEach((r) => r.user_name && recommenders.add(r.user_name));
    const alsoUsedBy = Array.from(recommenders).filter((n) => n !== provider.recommended_by_name);
  
    const avgRating = parseFloat(provider.average_rating || 0).toFixed(1);
    const totalReviews = parseInt(provider.total_reviews || 0);
  
    const starCounts = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) starCounts[r.rating - 1]++;
    });
  
    const requestConsultation = () => {
      if (provider.phone_number && provider.email) {
        setShowContactChoice(true);
      } else if (provider.phone_number) {
        window.location.href = `sms:${provider.phone_number}?body=Hi ${provider.business_name}, someone recommended you, and I’d like to request a consultation.`;
      } else if (provider.email) {
        window.location.href = `mailto:${provider.email}?subject=Request%20for%20Consultation&body=Hi%20${provider.business_name},%20I%E2%80%99d%20like%20to%20request%20a%20consultation%20via%20Tried%20%26%20Trusted.`;
      } else {
        alert("No contact info available.");
      }
    };
  
    const handleTabClick = (tab) => {
        if (tab !== 'Reviews' && tab !== 'Credentials') {
          alert("We're working to release this feature quickly!");
        }
        setActiveTab(tab);
      };
  
    return (
      <div className="profile-wrapper">
        <div className="profile-card">
          <div className="profile-header">
            <h1>{provider.business_name}</h1>
            <div className="modal-icons">
              {provider.phone_number && <a href={`tel:${provider.phone_number}`}><FaPhone /></a>}
              {provider.email && <a href={`mailto:${provider.email}`}><FaEnvelope /></a>}
            </div>
          </div>
  
          {/* Meta Badges */}
          <div className="meta-badges">
            {provider.service_scope === 'local' && provider.city && provider.state && (
              <span className="meta-badge">
                {provider.city}, {provider.state} ({provider.zip_code})
                </span>
            )}
            {provider.website && (
              <a
                href={provider.website}
                target="_blank"
                rel="noopener noreferrer"
                className="meta-badge website-badge"
              >
                Website
              </a>
            )}
            {provider.price_range && (
              <span className="meta-badge">{provider.price_range}</span>
            )}
          </div>
  
          {/* Description + Recommenders */}
          <p className="description-text"><strong>Description:</strong> {provider.description || 'N/A'}</p>
          <p><strong>Recommended by:</strong> {provider.recommended_by_name || 'N/A'}{' '}
            {provider.date_of_recommendation && `(${new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
              year: '2-digit',
              month: 'numeric',
              day: 'numeric'
            })})`}
          </p>
          {alsoUsedBy.length > 0 && (
            <p><strong>Also used by:</strong> {alsoUsedBy.join(', ')}</p>
          )}
  
          <button className="consultation-button" onClick={requestConsultation}>
            Request a Consultation
          </button>
  
          {showContactChoice && (
            <div className="contact-choice">
              <button onClick={() => window.location.href = `tel:${provider.phone_number}`}>Call</button>
              <button onClick={() => window.location.href = `mailto:${provider.email}`}>Email</button>
            </div>
          )}
  
          {Array.isArray(provider.tags) && provider.tags.length > 0 && (
            <>
              <h3 className="highlights-header">Highlights from the Business</h3>
              <div className="tag-container">
                {provider.tags.map((tag, i) => (
                  <span key={i} className="tag-badge">{tag}</span>
                ))}
              </div>
            </>
          )}
  
          {/* Tabs */}
          <div className="profile-tabs">
            {['Learn More', 'Reviews', 'Photos', 'Credentials'].map(tab => (
              <button
                key={tab}
                onClick={() => handleTabClick(tab)}
                className={activeTab === tab ? 'tab active-tab' : 'tab'}
              >
                {tab}
              </button>
            ))}
          </div>
  
          {/* Tab Content */}
          {activeTab === 'Reviews' && (
            <>
              <div className="review-breakdown">
                <h3>Rating Summary</h3>
                <div className="breakdown-summary">
                  <span className="avg-rating">{avgRating}</span>
                  <div className="star-bar">
                    {[...Array(5)].map((_, i) => (
                      <FaStar key={i} className={i < Math.round(avgRating) ? 'filled' : 'empty'} />
                    ))}
                    <span className="review-count">({totalReviews} reviews)</span>
                  </div>
                </div>
  
                <div className="bar-chart">
                  {[5, 4, 3, 2, 1].map((star, idx) => {
                    const count = starCounts[star - 1];
                    const percent = totalReviews ? (count / totalReviews) * 100 : 0;
                    return (
                      <div key={star} className="bar-row">
                        <span>{star} star</span>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${percent}%` }}></div>
                        </div>
                        <span className="bar-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
  
              <h2>Reviews</h2>
              {reviews.length === 0 ? (
                <p>No reviews yet.</p>
              ) : (
                reviews.map((review, i) => (
                  <div key={i} className="profile-review">
                    <div className="review-stars">
                      {[...Array(5)].map((_, j) => (
                        <FaStar key={j} className={j < review.rating ? 'star active' : 'star'} />
                      ))}
                    </div>
                    <p>"{review.content}"</p>
                    <p className="review-user">– {review.user_name || 'Anonymous'}</p>
                  </div>
                ))
              )}
            </>
          )}
  
            {activeTab === 'Credentials' && (
            <div className="credentials-section">
                <h3 className="credentials-header">Verified Credentials</h3>
                <div className="badge-wrapper credentials-badges">
                {avgRating >= 4.5 && <span className="top-rated-badge">Top Rated</span>}
                <span className="profile-badge">{provider.service_type || 'Appliance Services'}</span>
                </div>
                <p className="credentials-note">More details coming soon.</p>
            </div>
            )}
        </div>
      </div>
    );
  };
  
  export default ProviderProfile;


// working 4/16 => 2pm
// import React, { useEffect, useState } from 'react';
// import { useParams, useLocation } from 'react-router-dom';
// import { FaStar, FaPhone, FaEnvelope } from 'react-icons/fa';
// import './ProviderProfile.css';

// const API_URL = 'http://localhost:3000';

// const ProviderProfile = () => {
//   const { id } = useParams();
//   const location = useLocation();

//   const [provider, setProvider] = useState(() => {
//     if (location.state?.provider) return location.state.provider;
//     const stored = localStorage.getItem('selectedProvider');
//     return stored ? JSON.parse(stored) : null;
//   });

//   const [reviews, setReviews] = useState([]);
//   const [showContactChoice, setShowContactChoice] = useState(false);

//   useEffect(() => {
//     const fetchReviews = async () => {
//       const res = await fetch(`${API_URL}/api/reviews/${id}`);
//       const data = await res.json();
//       setReviews(data);
//     };
//     fetchReviews();
//   }, [id]);

//   if (!provider) return <div className="profile-wrapper">Loading provider...</div>;

//   const recommenders = new Set();
//   if (provider.recommended_by_name) recommenders.add(provider.recommended_by_name);
//   reviews.forEach((r) => r.user_name && recommenders.add(r.user_name));
//   const alsoUsedBy = Array.from(recommenders).filter((n) => n !== provider.recommended_by_name);

//   const avgRating = parseFloat(provider.average_rating || 0).toFixed(1);
//   const totalReviews = parseInt(provider.total_reviews || 0);

//   const starCounts = [0, 0, 0, 0, 0];
//   reviews.forEach((r) => {
//     if (r.rating >= 1 && r.rating <= 5) starCounts[r.rating - 1]++;
//   });

//   const requestConsultation = () => {
//     if (provider.phone_number && provider.email) {
//       setShowContactChoice(true);
//     } else if (provider.phone_number) {
//       window.location.href = `sms:${provider.phone_number}?body=Hi ${provider.business_name}, someone recommended you, and I’d like to request a consultation.`;
//     } else if (provider.email) {
//       window.location.href = `mailto:${provider.email}?subject=Request%20for%20Consultation&body=Hi%20${provider.business_name},%20I%E2%80%99d%20like%20to%20request%20a%20consultation%20via%20Tried%20%26%20Trusted.`;
//     } else {
//       alert("No contact info available.");
//     }
//   };

//   return (
//     <div className="profile-wrapper">
//       <div className="profile-card">
//         <div className="profile-header">
//           <h1>{provider.business_name}</h1>
//           <div className="badge-wrapper">
//             {avgRating >= 4.5 && <span className="top-rated-badge">Top Rated</span>}
//             <span className="profile-badge">{provider.service_type || 'Appliance Services'}</span>
//           </div>
//           <div className="modal-icons">
//             {provider.phone_number && (
//               <a href={`tel:${provider.phone_number}`} title="Call"><FaPhone /></a>
//             )}
//             {provider.email && (
//               <a href={`mailto:${provider.email}`} title="Email"><FaEnvelope /></a>
//             )}
//           </div>
//         </div>

//         <p className="description-text">{provider.description || 'N/A'}</p>

//         <p>
//           <strong>Recommended by:</strong> {provider.recommended_by_name || 'N/A'}{' '}
//           {provider.date_of_recommendation &&
//             `(${new Date(provider.date_of_recommendation).toLocaleDateString('en-US', {
//               year: '2-digit',
//               month: 'numeric',
//               day: 'numeric',
//             })})`}
//         </p>

//         {alsoUsedBy.length > 0 && (
//           <p><strong>Also used by:</strong> {alsoUsedBy.join(', ')}</p>
//         )}

//         <button className="consultation-button" onClick={requestConsultation}>
//           Request a Consultation
//         </button>

//         {showContactChoice && (
//           <div className="contact-choice">
//             <button onClick={() => window.location.href = `tel:${provider.phone_number}`}>Call</button>
//             <button onClick={() => window.location.href = `mailto:${provider.email}`}>Email</button>
//           </div>
//         )}

//         {Array.isArray(provider.tags) && provider.tags.length > 0 && (
//           <>
//             <h3 className="highlights-header">Highlights from the Business</h3>
//             <div className="tag-container">
//               {provider.tags.map((tag, i) => (
//                 <span key={i} className="tag-badge">{tag}</span>
//               ))}
//             </div>
//           </>
//         )}

//         <div className="review-breakdown">
//           <h3>Rating Summary</h3>
//           <div className="breakdown-summary">
//             <span className="avg-rating">{avgRating}</span>
//             <div className="star-bar">
//               {[...Array(5)].map((_, i) => (
//                 <FaStar key={i} className={i < Math.round(avgRating) ? 'filled' : 'empty'} />
//               ))}
//               <span className="review-count">({totalReviews} reviews)</span>
//             </div>
//           </div>

//           <div className="bar-chart">
//             {[5, 4, 3, 2, 1].map((star, idx) => {
//               const count = starCounts[star - 1];
//               const percent = totalReviews ? (count / totalReviews) * 100 : 0;
//               return (
//                 <div key={star} className="bar-row">
//                   <span>{star} star</span>
//                   <div className="bar-track">
//                     <div className="bar-fill" style={{ width: `${percent}%` }}></div>
//                   </div>
//                   <span className="bar-count">{count}</span>
//                 </div>
//               );
//             })}
//           </div>
//         </div>

//         <h2>Reviews</h2>
//         {reviews.length === 0 ? (
//           <p>No reviews yet.</p>
//         ) : (
//           reviews.map((review, i) => (
//             <div key={i} className="profile-review">
//               <div className="review-stars">
//                 {[...Array(5)].map((_, j) => (
//                   <FaStar key={j} className={j < review.rating ? 'star active' : 'star'} />
//                 ))}
//               </div>
//               <p>"{review.content}"</p>
//               <p className="review-user">– {review.user_name || 'Anonymous'}</p>
//             </div>
//           ))
//         )}
//       </div>
//     </div>
//   );
// };

// export default ProviderProfile;
