import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaStar, FaStarHalfAlt } from 'react-icons/fa';
import {
  UserCircleIcon,
  EnvelopeIcon,
  UsersIcon,
  ArrowRightOnRectangleIcon,
  PencilSquareIcon,
  TagIcon,
  CalendarDaysIcon,
  PlusCircleIcon,
  BuildingOffice2Icon,
  ChatBubbleLeftEllipsisIcon,
  EllipsisVerticalIcon,
  ShareIcon,
} from '@heroicons/react/24/solid';
import './Profile.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = 'http://localhost:3000';

const StarRating = ({ rating }) => {
  const numRating = parseFloat(rating) || 0;
  const fullStars = Math.floor(numRating);
  const hasHalf = numRating - fullStars >= 0.4;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="profile-star-display">
      {[...Array(fullStars)].map((_, i) => <FaStar key={`full-${i}`} className="profile-star-icon filled" />)}
      {hasHalf && <FaStarHalfAlt key={`half-${Date.now()}-sr`} className="profile-star-icon filled" />}
      {[...Array(emptyStars)].map((_, i) => <FaStar key={`empty-${i}`} className="profile-star-icon empty" />)}
    </div>
  );
};

const MyRecommendationCard = ({ rec }) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const displayCommunityRating = parseFloat(rec.average_rating).toFixed(1);
  const personalRating = rec.rating || 0;
  const communityTotalReviews = rec.total_reviews || 0;

  const handleEdit = () => {
    alert('Edit functionality coming soon!');
    setDropdownOpen(false);
  };

  const handleShare = () => {
    alert('Share functionality coming soon!');
    setDropdownOpen(false);
  };
  
  const handleAddTags = () => {
    alert('Adding/editing tags coming soon!');
  };

  return (
    <div className="profile-my-rec-card">
      <div className="profile-my-rec-card-header">
        <div className="profile-my-rec-title-section">
          <BuildingOffice2Icon className="profile-my-rec-building-icon" />
          <h3 className="profile-my-rec-business-name">{rec.business_name || 'Unknown Business'}</h3>
        </div>
        <div className="profile-my-rec-actions-menu">
          {(parseFloat(rec.average_rating) || 0) >= 4.5 && (
            <span className="profile-my-rec-top-rated-badge">Top Rated</span>
          )}
          <div className="profile-my-rec-dropdown-wrapper">
            <button
              className="profile-my-rec-three-dots-button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-label="Options"
            >
              <EllipsisVerticalIcon style={{ width: '20px', height: '20px' }} />
            </button>
            {dropdownOpen && (
              <div className="profile-my-rec-dropdown-menu">
                <button className="profile-my-rec-dropdown-item" onClick={handleEdit}>
                  <PencilSquareIcon /> Edit My Recommendation
                </button>
                <button className="profile-my-rec-dropdown-item" onClick={handleShare}>
                  <ShareIcon /> Share Recommendation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="profile-my-rec-review-summary">
        <StarRating rating={rec.average_rating} />
        <span className="profile-my-rec-review-score">
          {displayCommunityRating} ({communityTotalReviews} Community Reviews)
        </span>
      </div>
      <div className="profile-my-rec-personal-rating-text">
        My Rating: ({personalRating}/5)
      </div>

      {rec.recommender_message && (
        <p className="profile-my-rec-message">
          <ChatBubbleLeftEllipsisIcon className="inline-icon" />
          {rec.recommender_message}
        </p>
      )}

      {Array.isArray(rec.tags) && rec.tags.length > 0 && (
        <div className="profile-my-rec-tag-container">
          {rec.tags.map((tag, idx) => (
            <span key={idx} className="profile-my-rec-tag-badge">{tag}</span>
          ))}
          <button
            className="profile-my-rec-add-tag-button"
            onClick={handleAddTags}
            aria-label="Add a tag"
          >
            +
          </button>
        </div>
      )}
       {(Array.isArray(rec.tags) && rec.tags.length === 0) && (
         <div className="profile-my-rec-tag-container">
            <span className="profile-my-rec-no-tags-text">No tags added yet.</span>
            <button
                className="profile-my-rec-add-tag-button"
                onClick={handleAddTags}
                aria-label="Add a tag"
            >
                +
            </button>
         </div>
       )}


      <div className="profile-my-rec-footer">
        <div className="profile-my-rec-date">
          <CalendarDaysIcon className="inline-icon" />
          My Recommendation on: {formatDate(rec.date_of_recommendation || rec.createdAt || rec.updatedAt)}
        </div>
         <button className="profile-my-rec-primary-action-button" onClick={handleEdit}>
            <PencilSquareIcon className="btn-icon" /> Edit My Rec
        </button>
      </div>
    </div>
  );
};

const Profile = () => {
  const navigate = useNavigate();

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isUserSessionResolved, setIsUserSessionResolved] = useState(false);

  const [connections, setConnections] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState('recommended'); 

  const updateUserSessionData = useCallback(() => {
    const rawUser = localStorage.getItem('user');
    let uName = '';
    let uEmail = '';
    let uId = null;

    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        uName = u.preferred_name || u.firstName || u.name || (u.email && u.email.split('@')[0]) || '';
        uEmail = u.email || '';
        uId = u.id || null;
      } catch (e) {
        console.error("Profile.js: Error parsing user from localStorage:", e);
      }
    }
    setUserName(uName);
    setUserEmail(uEmail);
    setCurrentUserId(uId);
    setIsUserSessionResolved(true);

    if (!uEmail && !uId) {
      setError("User session not found. Please log in.");
      setIsLoading(false); 
    }
  }, []);

  useEffect(() => {
    updateUserSessionData();
    
    const handleLogin = () => updateUserSessionData();
    const handleLogoutEvent = () => {
      setUserName('');
      setUserEmail('');
      setCurrentUserId(null);
      setConnections([]);
      setRecommendations([]);
      setIsUserSessionResolved(false);
      setIsLoading(false); 
      navigate('/'); 
    };

    window.addEventListener('userLogin', handleLogin);
    window.addEventListener('userLogout', handleLogoutEvent);
    return () => {
      window.removeEventListener('userLogin', handleLogin);
      window.removeEventListener('userLogout', handleLogoutEvent);
    };
  }, [updateUserSessionData, navigate]);

  const fetchProfileAPIData = useCallback(async () => {
    if (!currentUserId && !userEmail) {
      setIsLoading(false);
      if (!error) setError("User identifier not found. Cannot load profile data.");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      if (userEmail) {
        const connRes = await fetch(`${API_URL}/api/connections/check-connections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail })
        });
        if (connRes.ok) {
          const connectionsData = await connRes.json();
          if (Array.isArray(connectionsData)) {
              const uniqueConnections = Array.from(new Set(connectionsData.map(u => u.email)))
                  .map(email => {
                      const conn = connectionsData.find(u => u.email === email);
                      return {
                          name: conn?.name || 'N/A',
                          email: conn?.email || 'N/A',
                          connected_at: conn?.connected_at 
                      };
                  })
                  .filter(conn => conn.email && conn.email !== 'N/A');
              setConnections(uniqueConnections);
          } else {
              setConnections([]);
          }
        } else {
          setError(prev => prev ? `${prev}\nFailed to fetch connections.` : 'Failed to fetch connections.');
          setConnections([]);
        }
      } else {
        setConnections([]);
      }

      if (currentUserId) {
        const recPrimaryRes = await fetch(`${API_URL}/api/users/${currentUserId}/recommendations`);
        if (!recPrimaryRes.ok) {
          const errData = await recPrimaryRes.json().catch(() => ({ message: "Failed to fetch user recommendations data" }));
          throw new Error(errData.message || `HTTP error ${recPrimaryRes.status} fetching recommendations`);
        }
        const data = await recPrimaryRes.json();
        
        if (!data.success) {
          throw new Error(data.message || "Fetching user recommendations was not successful according to API");
        }
        
        setUserName(prevName => data.userName || prevName);
        setUserEmail(prevEmail => data.userEmail || prevEmail);

        let fetchedRecs = data.recommendations || [];
        const statsMap = {};

        if (fetchedRecs.length > 0) {
            await Promise.all(
              fetchedRecs.map(async (provider, index) => {
                provider.originalIndex = index;
                try {
                  const statsRes = await fetch(`${API_URL}/api/reviews/stats/${provider.id}`);
                  if(statsRes.ok) {
                    const statsData = await statsRes.json();
                    statsMap[provider.id] = {
                      average_rating: parseFloat(statsData.average_rating) || 0,
                      total_reviews: parseInt(statsData.total_reviews, 10) || 0,
                    };
                  } else {
                     statsMap[provider.id] = { average_rating: provider.average_rating || 0, total_reviews: provider.total_reviews || 0 };
                  }
                } catch (err) {
                  statsMap[provider.id] = { average_rating: provider.average_rating || 0, total_reviews: provider.total_reviews || 0 };
                }
              })
            );
        }
        
        const enrichedRecs = fetchedRecs.map((p, idx) => ({
          ...p,
          originalIndex:  idx,
          average_rating: statsMap[p.id]?.average_rating ?? p.average_rating ?? 0,
          total_reviews:  statsMap[p.id]?.total_reviews ?? p.total_reviews ?? 0,
        }));

        const getBand = rating => {
          if (rating >= 4) return 0; if (rating >= 3) return 1; if (rating >= 2) return 2; if (rating >= 1) return 3; return 4;
        };
        
        let sortedProviders;
        if (sortOption === 'topRated') {
          sortedProviders = [...enrichedRecs]
            .filter(p => p.average_rating >= 4.5)
            .sort((a, b) => {
              if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating;
              return (b.total_reviews || 0) - (a.total_reviews || 0);
            });
        } else { 
          sortedProviders = [...enrichedRecs].sort((a, b) => {
            const bandA = getBand(a.average_rating);
            const bandB = getBand(b.average_rating);
            if (bandA !== bandB) return bandA - bandB;
        
            const scoreA = a.average_rating * (a.total_reviews || 0);
            const scoreB = b.average_rating * (b.total_reviews || 0);
            if (scoreB !== scoreA) return scoreB - scoreA;
        
            if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating;
            if ((b.total_reviews || 0) !== (a.total_reviews || 0)) return (b.total_reviews || 0) - (a.total_reviews || 0);
            
            const dateA = a.date_of_recommendation ? new Date(a.date_of_recommendation).getTime() : 0;
            const dateB = b.date_of_recommendation ? new Date(b.date_of_recommendation).getTime() : 0;
            if (dateB !== dateA) return dateB - dateA;

            return (a.originalIndex || 0) - (b.originalIndex || 0);
          });
        }
        setRecommendations(sortedProviders);

      } else {
        setRecommendations([]);
      }

    } catch (errCatch) {
      console.error('Error fetching profile API data:', errCatch);
      setError(prev => prev ? `${prev}\nAn unexpected error occurred: ${errCatch.message}` : `An unexpected error occurred: ${errCatch.message}`);
      setRecommendations([]); 
      setConnections([]); 
    } finally {
      setIsLoading(false);
    }
  }, [userEmail, currentUserId, sortOption, error, navigate]); 


  useEffect(() => {
    if (isUserSessionResolved) {
      if (currentUserId || userEmail) { 
        fetchProfileAPIData();
      } else {
        setIsLoading(false); 
        if (!error) setError("User session not found. Please log in to view your profile.");
        navigate('/login');
      }
    }
  }, [isUserSessionResolved, userEmail, currentUserId, fetchProfileAPIData, navigate, error, sortOption]); 


  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    window.dispatchEvent(new CustomEvent('userLogout'));
  };
  
  if (!isUserSessionResolved && isLoading) {
    return (
      <div className="profile-loading-container">
        <div className="profile-spinner"></div>
        <p>Loading Profile...</p>
      </div>
    );
  }
  
  if (isUserSessionResolved && !currentUserId && !userEmail && !isLoading) {
     return (
      <div className="profile-page">
        <div className="profile-main-content" style={{ textAlign: 'center', paddingTop: '5rem' }}>
            <h1 style={{color: 'var(--profile-primary-color)'}}>Profile Access Denied</h1>
            <p className="profile-error-banner" style={{margin: '1rem auto', maxWidth: '600px'}}>{error || "Please log in to view your profile."}</p>
            <button className="profile-primary-action-btn" onClick={() => navigate('/login')}>
                Go to Login
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <header className="profile-main-header">
        <div className="profile-avatar-container">
          <UserCircleIcon className="profile-avatar-icon" />
        </div>
        <div className="profile-user-info">
          <h1>{userName || 'User'}</h1>
          <p><EnvelopeIcon className="inline-icon" /> {userEmail ? userEmail.toLowerCase() : 'No email'}</p>
        </div>
        <div className="profile-header-actions">
            <button className="profile-edit-btn" onClick={() => alert('Edit profile coming soon!')}>
              <PencilSquareIcon className="btn-icon" /> Edit Profile
            </button>
            <button className="profile-logout-btn-header" onClick={handleLogout}>
                <ArrowRightOnRectangleIcon className="btn-icon" /> Logout
            </button>
        </div>
      </header>

      {error && !isLoading && <div className="profile-error-banner" style={{margin: '1rem 2rem'}}>{error}</div>}

      <section className="profile-stats-bar">
        <div className="stat-item">
          <FaStar className="stat-icon" style={{color: 'var(--profile-accent-yellow)'}}/>
          <span>{recommendations.length}</span>
          <p>Recommendations Made</p>
        </div>
        <div className="stat-item">
          <UsersIcon className="stat-icon" />
          <span>{connections.length}</span>
          <p>Connections</p>
        </div>
      </section>

      <main className="profile-main-content">
        <section className="profile-content-section" id="my-recommendations">
          <div className="section-header">
            <h2>My Recommendations</h2>
            <button className="profile-add-new-btn" onClick={() => navigate('/share-recommendation')}>
              <PlusCircleIcon className="btn-icon"/> Add New
            </button>
          </div>
          {isLoading && <div className="profile-loading-container small-spinner"><div className="profile-spinner"></div> <p>Loading recommendations...</p></div>}
          {!isLoading && recommendations.length > 0 && (
            <div className="profile-my-recommendations-grid">
              {recommendations.map((rec, idx) => (
                <MyRecommendationCard key={rec.id || idx} rec={rec} />
              ))}
            </div>
          )}
          {!isLoading && recommendations.length === 0 && !error && (
            <div className="profile-empty-state">
              <FaStar className="empty-state-icon" style={{color: 'var(--profile-text-light)'}} />
              <p>You haven't made any recommendations yet.</p>
              <button className="profile-primary-action-btn" onClick={() => navigate('/share-recommendation')}>
                Share Your First Recommendation
              </button>
            </div>
          )}
           {!isLoading && recommendations.length === 0 && error && (
            <p className="profile-empty-state-error-inline">Could not load recommendations. Check console for details.</p>
          )}
        </section>
      </main>
    </div>
  );
};

export default Profile;

// import React, { useEffect, useState, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { FaStar } from 'react-icons/fa'; // Import FaStar
// import {
//   UserCircleIcon,
//   EnvelopeIcon,
//   // StarIcon as SolidStarIconHero, // No longer needed for star display here
//   UsersIcon,
//   ArrowRightOnRectangleIcon,
//   PencilSquareIcon,
//   TagIcon,
//   CalendarDaysIcon,
//   PlusCircleIcon,
//   BuildingOffice2Icon,
//   ChatBubbleLeftEllipsisIcon
// } from '@heroicons/react/24/solid';
// // import { StarIcon as OutlineStarIconHero } from '@heroicons/react/24/outline'; // No longer needed
// import './Profile.css';

// // const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = 'http://localhost:3000';

// // New StarRating component using FaStar
// const StarRating = ({ rating }) => {
//   const numRating = parseFloat(rating) || 0;
//   const fullStars = Math.floor(numRating);
//   const hasHalf = numRating - fullStars >= 0.5;
//   const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

//   return (
//     <div className="profile-star-display"> {/* Use existing class or create a new one if styles differ */}
//       {[...Array(fullStars)].map((_, i) => <FaStar key={`full-${i}`} className="profile-star-icon filled" />)}
//       {hasHalf && <FaStar key={`half-${Date.now()}-sr`} className="profile-star-icon half" />} {/* Make sure CSS handles .filled, .half, .empty */}
//       {[...Array(emptyStars)].map((_, i) => <FaStar key={`empty-${i}`} className="profile-star-icon empty" />)}
//     </div>
//   );
// };

// const MyRecommendationCard = ({ rec }) => {
//   const formatDate = (dateString) => {
//     if (!dateString) return 'Date not available';
//     return new Date(dateString).toLocaleDateString('en-US', {
//       year: 'numeric', month: 'long', day: 'numeric'
//     });
//   };

//   const displayCommunityRating = parseFloat(rec.average_rating).toFixed(1);
//   const personalRating = rec.rating || 0;

//   return (
//     <div className="my-recommendation-card">
//       <div className="my-rec-card-header">
//         <BuildingOffice2Icon className="my-rec-card-icon" />
//         <h3 className="my-rec-business-name">{rec.business_name || 'Unknown Business'}</h3>
//       </div>
//       <div className="my-rec-rating">
//         {/* Visual stars now show community average_rating for consistency with sorting */}
//         <StarRating rating={rec.average_rating} /> 
//         <span className="my-rec-rating-text">
//           Community: ({displayCommunityRating}/5 from {rec.total_reviews || 0} reviews)
//         </span>
//       </div>
//       <div className="my-rec-personal-rating-text">
//         My Rating: ({personalRating}/5)
//       </div>
//       {rec.recommender_message && (
//         <p className="my-rec-message">
//           <ChatBubbleLeftEllipsisIcon className="inline-icon" />
//           {rec.recommender_message}
//         </p>
//       )}
//       {rec.tags && rec.tags.length > 0 && (
//         <div className="my-rec-tags">
//           <TagIcon className="inline-icon" />
//           {rec.tags.map((tag, index) => (
//             <span key={index} className="my-rec-tag-pill">{tag}</span>
//           ))}
//         </div>
//       )}
//       <div className="my-rec-date">
//         <CalendarDaysIcon className="inline-icon" />
//         Recommended on: {formatDate(rec.date_of_recommendation || rec.createdAt || rec.updatedAt)}
//       </div>
//       <button className="my-rec-edit-button" onClick={() => alert('Edit functionality coming soon!')}>
//         <PencilSquareIcon className="btn-icon" /> Edit
//       </button>
//     </div>
//   );
// };

// const Profile = () => {
//   const navigate = useNavigate();

//   const [userName, setUserName] = useState('');
//   const [userEmail, setUserEmail] = useState('');
//   const [currentUserId, setCurrentUserId] = useState(null);
//   const [isUserSessionResolved, setIsUserSessionResolved] = useState(false);

//   const [connections, setConnections] = useState([]);
//   const [recommendations, setRecommendations] = useState([]);
//   const [isLoading, setIsLoading] = useState(true); 
//   const [error, setError] = useState(null);
//   const [sortOption, setSortOption] = useState('recommended'); 

//   const updateUserSessionData = useCallback(() => {
//     const rawUser = localStorage.getItem('user');
//     let uName = '';
//     let uEmail = '';
//     let uId = null;

//     if (rawUser) {
//       try {
//         const u = JSON.parse(rawUser);
//         uName = u.preferred_name || u.firstName || u.name || (u.email && u.email.split('@')[0]) || '';
//         uEmail = u.email || '';
//         uId = u.id || null;
//       } catch (e) {
//         console.error("Profile.js: Error parsing user from localStorage:", e);
//       }
//     }
//     setUserName(uName);
//     setUserEmail(uEmail);
//     setCurrentUserId(uId);
//     setIsUserSessionResolved(true);

//     if (!uEmail && !uId) {
//       setError("User session not found. Please log in.");
//       setIsLoading(false); 
//     }
//   }, []);

//   useEffect(() => {
//     updateUserSessionData();
    
//     const handleLogin = () => updateUserSessionData();
//     const handleLogoutEvent = () => {
//       setUserName('');
//       setUserEmail('');
//       setCurrentUserId(null);
//       setConnections([]);
//       setRecommendations([]);
//       setIsUserSessionResolved(false);
//       setIsLoading(false); 
//       navigate('/'); 
//     };

//     window.addEventListener('userLogin', handleLogin);
//     window.addEventListener('userLogout', handleLogoutEvent);
//     return () => {
//       window.removeEventListener('userLogin', handleLogin);
//       window.removeEventListener('userLogout', handleLogoutEvent);
//     };
//   }, [updateUserSessionData, navigate]);

//   const fetchProfileAPIData = useCallback(async () => {
//     if (!currentUserId && !userEmail) {
//       setIsLoading(false);
//       if (!error) setError("User identifier not found. Cannot load profile data.");
//       return;
//     }

//     setIsLoading(true);
//     setError(null);
    
//     try {
//       if (userEmail) {
//         const connRes = await fetch(`${API_URL}/api/connections/check-connections`, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ email: userEmail })
//         });
//         if (connRes.ok) {
//           const connectionsData = await connRes.json();
//           if (Array.isArray(connectionsData)) {
//               const uniqueConnections = Array.from(new Set(connectionsData.map(u => u.email)))
//                   .map(email => {
//                       const conn = connectionsData.find(u => u.email === email);
//                       return {
//                           name: conn?.name || 'N/A',
//                           email: conn?.email || 'N/A',
//                           connected_at: conn?.connected_at 
//                       };
//                   })
//                   .filter(conn => conn.email && conn.email !== 'N/A');
//               setConnections(uniqueConnections);
//           } else {
//               setConnections([]);
//               console.warn('Profile.js: Connections data is not an array.');
//           }
//         } else {
//           setError(prev => prev ? `${prev}\nFailed to fetch connections.` : 'Failed to fetch connections.');
//           setConnections([]);
//         }
//       } else {
//         setConnections([]);
//       }

//       if (currentUserId) {
//         const recPrimaryRes = await fetch(`${API_URL}/api/users/${currentUserId}/recommendations`);
//         if (!recPrimaryRes.ok) {
//           const errData = await recPrimaryRes.json().catch(() => ({ message: "Failed to fetch user recommendations data" }));
//           throw new Error(errData.message || `HTTP error ${recPrimaryRes.status} fetching recommendations`);
//         }
//         const data = await recPrimaryRes.json();
        
//         if (!data.success) {
//           throw new Error(data.message || "Fetching user recommendations was not successful according to API");
//         }
        
//         setUserName(prevName => data.userName || prevName);
//         setUserEmail(prevEmail => data.userEmail || prevEmail);

//         let fetchedRecs = data.recommendations || [];
//         const statsMap = {};

//         if (fetchedRecs.length > 0) {
//             await Promise.all(
//               fetchedRecs.map(async (provider, index) => {
//                 provider.originalIndex = index;
//                 try {
//                   const statsRes = await fetch(`${API_URL}/api/reviews/stats/${provider.id}`);
//                   if(statsRes.ok) {
//                     const statsData = await statsRes.json();
//                     statsMap[provider.id] = {
//                       average_rating: parseFloat(statsData.average_rating) || 0,
//                       total_reviews: parseInt(statsData.total_reviews, 10) || 0,
//                     };
//                   } else {
//                      statsMap[provider.id] = { average_rating: provider.average_rating || 0, total_reviews: provider.total_reviews || 0 };
//                   }
//                 } catch (err) {
//                   statsMap[provider.id] = { average_rating: provider.average_rating || 0, total_reviews: provider.total_reviews || 0 };
//                 }
//               })
//             );
//         }
        
//         const enrichedRecs = fetchedRecs.map((p, idx) => ({
//           ...p,
//           originalIndex:  idx, // Keep originalIndex from provider if it was set before, or set it here.
//           // p.rating should be the user's personal rating from the fetchedRecs
//           // p.recommender_message should be the user's personal message
//           average_rating: statsMap[p.id]?.average_rating ?? p.average_rating ?? 0, // Community average
//           total_reviews:  statsMap[p.id]?.total_reviews ?? p.total_reviews ?? 0,  // Community reviews
//         }));

//         const getBand = rating => {
//           if (rating >= 4) return 0; if (rating >= 3) return 1; if (rating >= 2) return 2; if (rating >= 1) return 3; return 4;
//         };
        
//         let sortedProviders;
//         if (sortOption === 'topRated') {
//           sortedProviders = [...enrichedRecs]
//             .filter(p => p.average_rating >= 4.5) // Filter by community average
//             .sort((a, b) => {
//               if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating;
//               return (b.total_reviews || 0) - (a.total_reviews || 0);
//             });
//         } else { // Default 'recommended' sort from appliance services
//           sortedProviders = [...enrichedRecs].sort((a, b) => {
//             const bandA = getBand(a.average_rating); // Uses community average
//             const bandB = getBand(b.average_rating);
//             if (bandA !== bandB) return bandA - bandB;
        
//             const scoreA = a.average_rating * (a.total_reviews || 0);
//             const scoreB = b.average_rating * (b.total_reviews || 0);
//             if (scoreB !== scoreA) return scoreB - scoreA;
        
//             if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating;
//             if ((b.total_reviews || 0) !== (a.total_reviews || 0)) return (b.total_reviews || 0) - (a.total_reviews || 0);
            
//             // If date_of_recommendation exists on 'a' and 'b' from fetchedRecs (user's own rec date)
//             const dateA = a.date_of_recommendation ? new Date(a.date_of_recommendation).getTime() : 0;
//             const dateB = b.date_of_recommendation ? new Date(b.date_of_recommendation).getTime() : 0;
//             if (dateB !== dateA) return dateB - dateA; // Fresher recommendations first if all else is equal

//             return (a.originalIndex || 0) - (b.originalIndex || 0);
//           });
//         }
//         setRecommendations(sortedProviders);

//       } else {
//         setRecommendations([]);
//       }

//     } catch (errCatch) {
//       console.error('Error fetching profile API data:', errCatch);
//       setError(prev => prev ? `${prev}\nAn unexpected error occurred: ${errCatch.message}` : `An unexpected error occurred: ${errCatch.message}`);
//       setRecommendations([]); 
//       setConnections([]); 
//     } finally {
//       setIsLoading(false);
//     }
//   }, [userEmail, currentUserId, sortOption, navigate, setUserName, setUserEmail, setConnections, setRecommendations, setIsLoading, setError, error]); // Added error here as it was in original, review if needed.


//   useEffect(() => {
//     if (isUserSessionResolved) {
//       if (currentUserId || userEmail) { 
//         fetchProfileAPIData();
//       } else {
//         setIsLoading(false); 
//         if (!error) setError("User session not found. Please log in to view your profile.");
//         navigate('/login');
//       }
//     }
//   // Removed fetchProfileAPIData from here to break potential loops if its reference changes due to state updates within it.
//   // userEmail and currentUserId being stable from session should be the main triggers.
//   // sortOption could be a trigger if user could change it on this page.
//   }, [isUserSessionResolved, userEmail, currentUserId, navigate, error, sortOption]); 
//   // Re-added fetchProfileAPIData to dependency array as it's a function defined outside but used. This is correct.
//   // The stability of fetchProfileAPIData (via useCallback) is key.
//   // The dependency array of fetchProfileAPIData itself has been reviewed.


//   const handleLogout = () => {
//     localStorage.removeItem('token');
//     localStorage.removeItem('user');
//     localStorage.removeItem('userEmail');
//     localStorage.removeItem('userId');
//     window.dispatchEvent(new CustomEvent('userLogout'));
//   };
  
//   if (!isUserSessionResolved && isLoading) {
//     return (
//       <div className="profile-loading-container">
//         <div className="profile-spinner"></div>
//         <p>Loading Profile...</p>
//       </div>
//     );
//   }
  
//   if (isUserSessionResolved && !currentUserId && !userEmail && !isLoading) {
//      return (
//       <div className="profile-page">
//         <div className="profile-main-content" style={{ textAlign: 'center', paddingTop: '5rem' }}>
//             <h1 style={{color: 'var(--profile-primary-color)'}}>Profile Access Denied</h1>
//             <p className="profile-error-banner" style={{margin: '1rem auto', maxWidth: '600px'}}>{error || "Please log in to view your profile."}</p>
//             <button className="profile-primary-action-btn" onClick={() => navigate('/login')}>
//                 Go to Login
//             </button>
//         </div>
//       </div>
//     );
//   }


//   return (
//     <div className="profile-page">
//       <header className="profile-main-header">
//         <div className="profile-avatar-container">
//           <UserCircleIcon className="profile-avatar-icon" />
//         </div>
//         <div className="profile-user-info">
//           <h1>{userName || 'User'}</h1>
//           <p><EnvelopeIcon className="inline-icon" /> {userEmail ? userEmail.toLowerCase() : 'No email'}</p>
//         </div>
//         <button className="profile-edit-btn" onClick={() => alert('Edit profile coming soon!')}>
//           <PencilSquareIcon className="btn-icon" /> Edit Profile
//         </button>
//       </header>

//       {error && !isLoading && <div className="profile-error-banner" style={{margin: '1rem 2rem'}}>{error}</div>}


//       <section className="profile-stats-bar">
//         <div className="stat-item">
//           {/* Using FaStar for consistency in stats too, if desired, or keep HeroIcon */}
//           <FaStar className="stat-icon" style={{color: 'var(--profile-accent-yellow)'}}/>
//           <span>{recommendations.length}</span>
//           <p>Recommendations Made</p>
//         </div>
//         <div className="stat-item">
//           <UsersIcon className="stat-icon" />
//           <span>{connections.length}</span>
//           <p>Connections</p>
//         </div>
//       </section>

//       <main className="profile-main-content">
//         <section className="profile-content-section" id="my-recommendations">
//           <div className="section-header">
//             <h2>My Recommendations</h2>
//             {/* UI to change sortOption could be added here if needed */}
//             <button className="profile-add-new-btn" onClick={() => navigate('/share-recommendation')}>
//               <PlusCircleIcon className="btn-icon"/> Add New
//             </button>
//           </div>
//           {isLoading && <div className="profile-loading-container small-spinner"><div className="profile-spinner"></div> <p>Loading recommendations...</p></div>}
//           {!isLoading && recommendations.length > 0 && (
//             <div className="my-recommendations-grid">
//               {recommendations.map((rec, idx) => (
//                 <MyRecommendationCard key={rec.id || idx} rec={rec} />
//               ))}
//             </div>
//           )}
//           {!isLoading && recommendations.length === 0 && !error && (
//             <div className="profile-empty-state">
//               <FaStar className="empty-state-icon" style={{color: 'var(--profile-text-light)'}} />
//               <p>You haven't made any recommendations yet.</p>
//               <button className="profile-primary-action-btn" onClick={() => navigate('/share-recommendation')}>
//                 Share Your First Recommendation
//               </button>
//             </div>
//           )}
//            {!isLoading && recommendations.length === 0 && error && (
//             <p className="profile-empty-state-error-inline">Could not load recommendations. Check console for details.</p>
//           )}
//         </section>

//         <section className="profile-content-section" id="my-connections">
//           <div className="section-header">
//             <h2>My Connections</h2>
//              <button className="profile-add-new-btn" onClick={() => navigate('/connections')}>
//               <UsersIcon className="btn-icon"/> Manage Connections
//             </button>
//           </div>
//            {isLoading && <div className="profile-loading-container small-spinner"><div className="profile-spinner"></div> <p>Loading connections...</p></div>}
//            {!isLoading && connections.length > 0 && (
//             <div className="connections-table-wrapper">
//               <table className="connections-table">
//                 <thead>
//                   <tr>
//                     <th>Name</th>
//                     <th>Email</th>
//                     <th>Connected Since</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {connections.map(conn => (
//                     <tr key={conn.email || conn.id}>
//                       <td>{conn.name}</td>
//                       <td>{conn.email.toLowerCase()}</td>
//                       <td>{conn.connected_at ? new Date(conn.connected_at).toLocaleDateString() : 'N/A'}</td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//           {!isLoading && connections.length === 0 && !error && (
//              <div className="profile-empty-state">
//               <UsersIcon className="empty-state-icon" />
//               <p>You don't have any connections yet.</p>
//               <button className="profile-primary-action-btn" onClick={() => navigate('/find-connections')}>
//                 Find Connections
//               </button>
//             </div>
//           )}
//           {!isLoading && connections.length === 0 && error && (
//              <p className="profile-empty-state-error-inline">Could not load connections. Check console for details.</p>
//           )}
//         </section>
        
//         <section className="profile-content-section" id="account-actions">
//             <h2>Account</h2>
//             <button className="profile-logout-btn" onClick={handleLogout}>
//                 <ArrowRightOnRectangleIcon className="btn-icon" /> Logout
//             </button>
//         </section>
//       </main>
//     </div>
//   );
// };

// export default Profile;

// working somewhat 5/16
// // src/pages/Profile/Profile.js
// import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import './Profile.css';

// const API_URL = 'https://api.seanag-recommendations.org:8080';

// const Profile = () => {
//   const navigate = useNavigate();

//   const [userData, setUserData] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [email, setEmail] = useState('—');
//   const [name, setName] = useState('—');
//   const [connections, setConnections] = useState([]);
//   const [recommendations, setRecommendations] = useState([]);

//   // Fetch everything for this email
//   const fetchAllData = async () => {
//     const userEmail = localStorage.getItem('userEmail');
//     if (!userEmail) {
//       setIsLoading(false);
//       return;
//     }

//     setIsLoading(true);
//     try {
//       // 1) Get user profile
//       const userRes = await fetch(`${API_URL}/api/auth/check-email`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ email: userEmail })
//       });
//       if (userRes.ok) {
//         const ud = await userRes.json();
//         setUserData(ud);
//         setName(ud.name || '—');
//         setEmail(ud.email || '—');
//       }

//       // 2) Get connections
//       const connRes = await fetch(`${API_URL}/api/connections/check-connections`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ email: userEmail })
//       });
//       if (connRes.ok) {
//         setConnections(await connRes.json());
//       }

//       // 3) Get user’s own recommendations
//       const recRes = await fetch(`${API_URL}/api/providers/user-recommendations`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ email: userEmail })
//       });
//       if (recRes.ok) {
//         setRecommendations(await recRes.json());
//       }

//     } catch (err) {
//       console.error('Error fetching profile data:', err);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Logout clears everything
//   const handleLogout = () => {
//     // 1) Remove all auth/user keys from localStorage
//     localStorage.removeItem('token');
//     localStorage.removeItem('user');        // your full user JSON
//     localStorage.removeItem('userEmail');
//     localStorage.removeItem('userId');
  
//     // (Optionally, if you want to clear absolutely everything:)
//     // localStorage.clear();
  
//     // 2) Reset all Profile state
//     setUserData(null);
//     setName('—');
//     setEmail('—');
//     setConnections([]);
//     setRecommendations([]);
  
//     // 3) Navigate back home
//     navigate('/');
//   };
  
//   useEffect(() => {
//     // Initial load
//     fetchAllData();

//     // Re-fetch on login event or storage change
//     const onStorage = (e) => {
//       if (e.key === 'userEmail') {
//         fetchAllData();
//       }
//     };
//     const onLogin = () => fetchAllData();

//     window.addEventListener('storage', onStorage);
//     window.addEventListener('userLogin', onLogin);
//     return () => {
//       window.removeEventListener('storage', onStorage);
//       window.removeEventListener('userLogin', onLogin);
//     };
//   }, []);

//   if (isLoading) {
//     return <div className="loading-spinner">Loading...</div>;
//   }

//   return (
//     <div className="profile-container">
//       <div className="profile-header">
//         <h1>Profile</h1>
//         {!userData && (
//           <p className="login-prompt">
//             Please log in to view your full profile
//           </p>
//         )}
//       </div>

//       <div className="profile-content">
//         {/* Personal Information */}
//         <div className="profile-section">
//           <h2>Personal Information</h2>
//           <div className="info-grid">
//             <div className="info-item">
//               <label>NAME</label>
//               <div className="info-value">{name}</div>
//             </div>
//             <div className="info-item">
//               <label>EMAIL</label>
//               <div className="info-value">{email.toLowerCase()}</div>
//             </div>
//           </div>
//         </div>

//         {/* Recommendations */}
//         <div className="profile-section">
//           <h2>Recommendations</h2>
//           <div className="recommendations-grid">
//             {recommendations.length > 0 ? (
//               recommendations.map((rec, idx) => (
//                 <div key={idx} className="recommendation-card">
//                   <h3 className="provider-name">{rec.business_name}</h3>
//                   <div className="service-tag">{rec.service_type}</div>
//                   <div className="credentials">{rec.credentials}</div>
//                   <button className="contact-button">
//                     Contact Provider
//                   </button>
//                 </div>
//               ))
//             ) : (
//               <div className="recommendation-placeholder">
//                 No recommendations made yet
//               </div>
//             )}
//           </div>
//         </div>

//         {/* 1st Level Connections */}
//         <div className="profile-section">
//           <h2>1st Level Connections</h2>
//           <div className="connections-table">
//             <table>
//               <thead>
//                 <tr>
//                   <th>Name</th>
//                   <th>Email</th>
//                   <th>Connected Since</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {connections.length > 0 ? (
//                   connections.map(conn => (
//                     <tr key={conn.email}>
//                       <td>{conn.name}</td>
//                       <td>{conn.email}</td>
//                       <td>{conn.connected_at}</td>
//                     </tr>
//                   ))
//                 ) : (
//                   <tr>
//                     <td className="placeholder-cell">—</td>
//                     <td className="placeholder-cell">—</td>
//                     <td className="placeholder-cell">—</td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>

//         <button className="logout-button" onClick={handleLogout}>
//           Logout
//         </button>
//       </div>
//     </div>
//   );
// };

// export default Profile;