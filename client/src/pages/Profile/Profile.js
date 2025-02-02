// src/pages/Profile/Profile.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';

const Profile = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('—');
  const [name, setName] = useState('—');
  const [connections, setConnections] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  const fetchAllData = async () => {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch user data
      const userResponse = await fetch(`${API_URL}/api/auth/check-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: userEmail })
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setName(userData.name || '—');
        setUserData(userData);
        setEmail(userData.email || '—');
      }

      // Fetch connections
      const connectionsResponse = await fetch(`${API_URL}/api/connections/check-connections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: userEmail })
      });

      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json();
        setConnections(connectionsData);
      }

      // Fetch recommendations
      const recommendationsResponse = await fetch(`${API_URL}/api/providers/user-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: userEmail })
      });

      if (recommendationsResponse.ok) {
        const recommendationsData = await recommendationsResponse.json();
        setRecommendations(recommendationsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    // Clear all state
    setUserData(null);
    setEmail('—');
    setName('—');
    setConnections([]);
    setRecommendations([]);
    
    // Clear localStorage
    localStorage.removeItem('userEmail');
    localStorage.removeItem('token');
    
    // Navigate to home page
    navigate('/');
  };

  useEffect(() => {
    fetchAllData();
    
    const handleLogin = () => {
      setIsLoading(true);
      fetchAllData();
    };

    window.addEventListener('userLogin', handleLogin);
    return () => {
      window.removeEventListener('userLogin', handleLogin);
    };
  }, [navigate]);

  if (isLoading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Profile</h1>
        {!userData && <p className="login-prompt">Please log in to view your full profile</p>}
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <h2>Personal Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>NAME</label>
              <div className="info-value">{name}</div>
            </div>
            <div className="info-item">
              <label>EMAIL</label>
              <div className="info-value">{email}</div>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h2>Recommendations</h2>
          <div className="recommendations-grid">
            {recommendations.length > 0 ? (
              recommendations.map((rec, index) => (
                <div key={index} className="recommendation-card">
                  <h3 className="provider-name">{rec.business_name}</h3>
                  <div className="service-tag">{rec.service_type}</div>
                  <div className="credentials">{rec.credentials}</div>
                  <button className="contact-button">Contact Provider</button>
                </div>
              ))
            ) : (
              <div className="recommendation-placeholder">
                No recommendations made yet
              </div>
            )}
          </div>
        </div>

        <div className="profile-section">
          <h2>1st Level Connections</h2>
          <div className="connections-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Connected Since</th>
                </tr>
              </thead>
              <tbody>
                {connections.length > 0 ? (
                  connections.map((connection) => (
                    <tr key={connection.email}>
                      <td>{connection.name}</td>
                      <td>{connection.email}</td>
                      <td>{connection.connected_at}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="placeholder-cell">—</td>
                    <td className="placeholder-cell">—</td>
                    <td className="placeholder-cell">—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Profile;

// // src/pages/Profile/Profile.js
// import React, { useState, useEffect } from 'react';
// import './Profile.css';

// const Profile = () => {
//   const [userData, setUserData] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [email, setEmail] = useState('—');
//   const [name, setName] = useState('—');
//   const [connections, setConnections] = useState([]);
//   const [recommendations, setRecommendations] = useState([]);

//   const fetchAllData = async () => {
//     const userEmail = localStorage.getItem('userEmail');
//     if (!userEmail) {
//       setIsLoading(false);
//       return;
//     }

//     try {
//       // Fetch user data
//       const userResponse = await fetch(`http://localhost:3000/api/auth/check-email`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({ email: userEmail })
//       });

//       if (userResponse.ok) {
//         const userData = await userResponse.json();
//         setName(userData.name || '—');
//         setUserData(userData);
//         setEmail(userData.email || '—');
//       }

//       // Fetch connections
//       const connectionsResponse = await fetch('http://localhost:3000/api/connections/check-connections', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({ email: userEmail })
//       });

//       if (connectionsResponse.ok) {
//         const connectionsData = await connectionsResponse.json();
//         setConnections(connectionsData);
//       }

//       // Fetch recommendations
//       const recommendationsResponse = await fetch('http://localhost:3000/api/providers/user-recommendations', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({ email: userEmail })
//       });

//       if (recommendationsResponse.ok) {
//         const recommendationsData = await recommendationsResponse.json();
//         setRecommendations(recommendationsData);
//       }
//     } catch (error) {
//       console.error('Error fetching data:', error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchAllData();
    
//     const handleLogin = () => {
//       setIsLoading(true);
//       fetchAllData();
//     };

//     window.addEventListener('userLogin', handleLogin);
//     return () => {
//       window.removeEventListener('userLogin', handleLogin);
//     };
//   }, []);

//   if (isLoading) {
//     return <div className="loading-spinner">Loading...</div>;
//   }

//   return (
//     <div className="profile-container">
//       <div className="profile-header">
//         <h1>Profile</h1>
//         {!userData && <p className="login-prompt">Please log in to view your full profile</p>}
//       </div>

//       <div className="profile-content">
//         <div className="profile-section">
//           <h2>Personal Information</h2>
//           <div className="info-grid">
//             <div className="info-item">
//               <label>NAME</label>
//               <div className="info-value">{name}</div>
//             </div>
//             <div className="info-item">
//               <label>EMAIL</label>
//               <div className="info-value">{email}</div>
//             </div>
//           </div>
//         </div>

//         <div className="profile-section">
//           <h2>Recommendations</h2>
//           <div className="recommendations-grid">
//             {recommendations.length > 0 ? (
//               recommendations.map((rec, index) => (
//                 <div key={index} className="recommendation-card">
//                   <h3 className="provider-name">{rec.business_name}</h3>
//                   <div className="service-tag">{rec.service_type}</div>
//                   <div className="credentials">{rec.credentials}</div>
//                   <button className="contact-button">Contact Provider</button>
//                 </div>
//               ))
//             ) : (
//               <div className="recommendation-placeholder">
//                 No recommendations made yet
//               </div>
//             )}
//           </div>
//         </div>

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
//                   connections.map((connection) => (
//                     <tr key={connection.email}>
//                       <td>{connection.name}</td>
//                       <td>{connection.email}</td>
//                       <td>{connection.connected_at}</td>
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
//       </div>
//     </div>
//   );
// };

// export default Profile;

// // src/pages/Profile/Profile.js
// import React, { useState, useEffect } from 'react';
// import './Profile.css';

// const Profile = () => {
//   const [userData, setUserData] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [email, setEmail] = useState('—');
//   const [name, setName] = useState('—');
//   const [connections, setConnections] = useState([]);

//   const [recommendations, setRecommendations] = useState([]);

//   useEffect(() => {
//     const fetchUserData = async () => {
//       const userEmail = localStorage.getItem('userEmail');
//       if (!userEmail) {
//         setIsLoading(false);
//         return;
//       }

//       try {
//         const response = await fetch(`http://localhost:3000/api/auth/check-email`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json'
//           },
//           body: JSON.stringify({ email: userEmail })
//         });

//         if (response.ok) {
//           const data = await response.json();
//           // console.log('Full response:', data);
//           // console.log('Email:', data.email);
//           // console.log('Name:', data.name);
//           setName(data.name || '—');
//           setUserData(data);
//           setEmail(data.email || '—');
//         } else {
//           console.error('Failed to fetch user data');
//         }
//       } catch (error) {
//         console.error('Error fetching user data:', error);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchUserData();
//     const handleLogin = () => {
//       fetchUserData();
//     };
  
//     window.addEventListener('userLogin', handleLogin);
  
//     return () => {
//       window.removeEventListener('userLogin', handleLogin);
//     };
//   }, []);

//   useEffect(() => {
//     const fetchConnections = async () => {
//       const userEmail = localStorage.getItem('userEmail');
//       if (!userEmail) return;

//       try {
//         const response = await fetch('http://localhost:3000/api/connections/check-connections', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json'
//           },
//           body: JSON.stringify({ email: userEmail })
//         });
//         console.log('Response status:', response.status);

//         if (response.ok) {
//           const data = await response.json();
//           console.log('Full connections response:', data);
//           console.log('Connections data:', data.rows);
//           setConnections(data);
//         } else {
//           console.error('Failed to fetch connections');
//           console.log('Response status:', response.status);
//           console.log('Response statusText:', response.statusText);
//         }
//       } catch (error) {
//         console.error('Error fetching connections:', error);
//         console.log('Error details:', error.message);
//       }
//     };

//     fetchConnections();
//   }, []);

//   useEffect(() => {
//     const fetchRecommendations = async () => {
//       const userEmail = localStorage.getItem('userEmail');
//       if (!userEmail) return;
  
//       try {
//         const response = await fetch('http://localhost:3000/api/providers/user-recommendations', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json'
//           },
//           body: JSON.stringify({ email: userEmail })
//         });
//         console.log('Response status:', response.status);
  
//         if (response.ok) {
//           const data = await response.json();
//           setRecommendations(data);
//         }
//       } catch (error) {
//         console.error('Error fetching recommendations:', error);
//       }
//     };
  
//     fetchRecommendations();
//   }, []);


//   if (isLoading) {
//     return <div className="loading-spinner">Loading...</div>;
//   }

//   return (
//     <div className="profile-container">
//       <div className="profile-header">
//         <h1>Profile</h1>
//         {!userData && <p className="login-prompt">Please log in to view your full profile</p>}
//       </div>

//       <div className="profile-content">
//         <div className="profile-section">
//           <h2>Personal Information</h2>
//           <div className="info-grid">
//             <div className="info-item">
//               <label>NAME</label>
//               <div className="info-value">{name}</div>
//             </div>
//             <div className="info-item">
//               <label>EMAIL</label>
//               <div className="info-value">{email}</div>
//             </div>
//           </div>
//         </div>

//         <div className="profile-section">
//           <h2>Recommendations</h2>
//           <div className="recommendations-grid">
//             {recommendations.length > 0 ? (
//               recommendations.map((rec, index) => (
//                 <div key={index} className="recommendation-card">
//                   <h3 className="provider-name">{rec.business_name}</h3>
//                   <div className="service-tag">{rec.service_type}</div>
//                   <div className="credentials">{rec.credentials}</div>
//                   <button className="contact-button">Contact Provider</button>
//                 </div>
//               ))
//             ) : (
//               <div className="recommendation-placeholder">
//                 No recommendations made yet
//               </div>
//             )}
//           </div>
//         </div>

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
//                   connections.map((connection) => (
//                     <tr key={connection.email}>
//                       <td>{connection.name}</td>
//                       <td>{connection.email}</td>
//                       <td>{connection.connected_at}</td>
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
//       </div>
//     </div>
//   );
// };

// export default Profile;

// import React, { useState, useEffect } from 'react';
// import './Profile.css';

// const Profile = () => {
//   const [userData, setUserData] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [email, setEmail] = useState('—');
//   const [name, setName] = useState('—');

//   useEffect(() => {
//     const fetchUserData = async () => {
//       const userEmail = localStorage.getItem('userEmail');
//       if (!userEmail) {
//         setIsLoading(false);
//         return;
//       }

//       try {
//         const response = await fetch(`http://localhost:3000/api/auth/check-email`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json'
//           },
//           body: JSON.stringify({ email: userEmail })
//         });

//         if (response.ok) {
//           const data = await response.json();
//           console.log('Full response:', data);
//           console.log('Email:', data.email);
//           console.log('Name:', data.name);
//           setName(data.name || '—');
//           setUserData(data);
//           setEmail(data.email || '—');
//         } else {
//           console.error('Failed to fetch user data');
//         }
//       } catch (error) {
//         console.error('Error fetching user data:', error);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchUserData();
//   }, []);

//   if (isLoading) {
//     return <div className="loading-spinner">Loading...</div>;
//   }

//   return (
//     <div className="profile-container">
//       <div className="profile-header">
//         <h1>Profile</h1>
//         {!userData && <p className="login-prompt">Please log in to view your full profile</p>}
//       </div>

//       <div className="profile-content">
//         <div className="profile-section">
//           <h2>Personal Information</h2>
//           <div className="info-grid">
//             <div className="info-item">
//               <label>NAME</label>
//               <div className="info-value">{name}</div>
//             </div>
//             <div className="info-item">
//               <label>EMAIL</label>
//               <div className="info-value">{email}</div>
//             </div>
//           </div>
//         </div>

//         <div className="profile-section">
//           <h2>Recommendations</h2>
//           <div className="recommendations-grid">
//             {[1, 2, 3].map((_, index) => (
//               <div key={index} className="recommendation-card">
//                 <div className="recommendation-placeholder" />
//               </div>
//             ))}
//           </div>
//         </div>

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
//                 {[1, 2, 3].map((_, index) => (
//                   <tr key={index}>
//                     <td className="placeholder-cell">—</td>
//                     <td className="placeholder-cell">—</td>
//                     <td className="placeholder-cell">—</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Profile;