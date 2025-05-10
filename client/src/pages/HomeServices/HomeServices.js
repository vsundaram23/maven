// import React, { useState, useEffect } from 'react';
// import { FaHeart, FaPhone, FaEnvelope } from 'react-icons/fa';
// import './HomeServices.css';
// import { fetchProviders } from '../../services/providerService';

// const HomeServices = () => {
//   const [providers, setProviders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [activeTab, setActiveTab] = useState('All Services');
//   const [likedProviders, setLikedProviders] = useState({});

//   useEffect(() => {
//     loadProviders();
//   }, []);

//   const loadProviders = async () => {
//     try {
//       const data = await fetchProviders();
//       setProviders(data);
//       setLoading(false);
//     } catch (err) {
//       setError('Failed to load providers');
//       setLoading(false);
//     }
//   };

//   const handleLike = (providerId) => {
//     setLikedProviders(prev => ({
//       ...prev,
//       [providerId]: !prev[providerId]
//     }));
//   };

//   const filterProviders = () => {
//     if (activeTab === 'All Services') return providers;
//     return providers.filter(provider => 
//       provider.serviceType === activeTab
//     );
//   };

//   if (loading) return <div className="loading-spinner">Loading...</div>;
//   if (error) return <div className="error-message">{error}</div>;
//   if (!providers.length) return <div className="no-data">No providers available</div>;

//   return (
//     <div className="home-services-container">
//       <div className="category-tabs">
//         {['All Services', 'Plumbing', 'Electrical', 'Carpentry'].map(tab => (
//           <button
//             key={tab}
//             className={`tab ${activeTab === tab ? 'active' : ''}`}
//             onClick={() => setActiveTab(tab)}
//           >
//             {tab}
//           </button>
//         ))}
//       </div>

//       <div className="providers-grid">
//         {filterProviders().map(provider => (
//           <div key={provider.id} className="home-service-card">
//             <div className="card-header">
//               <h2 className="card-title">{provider.name}</h2>
//               <div className="contact-icons">
//                 <FaPhone className="contact-icon phone-icon" />
//                 <FaEnvelope className="contact-icon email-icon" />
//               </div>
//             </div>

//             <div className="card-content">
//               <span className="card-service-type">{provider.serviceType}</span>
//               <p className="card-subtitle">{provider.credentials}</p>

//               <div className="recommended-section">
//                 <div className="recommended-by">
//                   <span>Recommended by: {provider.recommendedBy}</span>
//                   <div className="like-container">
//                     <FaHeart
//                       className={`heart-icon ${likedProviders[provider.id] ? 'liked' : ''}`}
//                       onClick={() => handleLike(provider.id)}
//                     />
//                     <span className="like-count">
//                       {likedProviders[provider.id] ? '1' : '0'}
//                     </span>
//                   </div>
//                 </div>
//                 <button className="service-button">
//                   Have you used this service?
//                 </button>
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default HomeServices;
