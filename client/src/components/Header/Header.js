import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';

const API_URL = 'http://34.214.248.192:8080';

const Header = () => {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAddRecommendationModal, setShowAddRecommendationModal] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showServicesDropdown, setShowServicesDropdown] = useState(false);
  const [closeTimeout, setCloseTimeout] = useState(null);
  const isLoggedIn = localStorage.getItem('userEmail');
  const [recommendationForm, setRecommendationForm] = useState({
    business_name: '',
    email: '',
    phone_number: '',
    category: '',
    subcategory: '',
    description: '',
    notes: '',
    user_email: localStorage.getItem('userEmail') || ''
  });

  const categories = {
    'Home Services': [
      { name: 'Appliances', backend: 'Appliance Services' },
      { name: 'Cleaning', backend: 'Cleaning and Upkeep' },
      { name: 'Utilities', backend: 'Utilities' },
      { name: 'Repairs', backend: 'Structural Repairs' },
      { name: 'Outdoor', backend: 'Outdoor Services' },
      { name: 'Moving and Misc', backend: 'Moving and Misc' }
    ],
    'Financial Services': [
      { name: 'Tax Preparation', backend: 'Tax Preparation' },
      { name: 'Financial Planning', backend: 'Financial Planning' }
    ]
  };

  const handleMouseEnter = () => {
    if (closeTimeout) clearTimeout(closeTimeout);
    setShowServicesDropdown(true);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setShowServicesDropdown(false);
    }, 300);
    setCloseTimeout(timeout);
  };

  useEffect(() => {
    return () => {
      if (closeTimeout) clearTimeout(closeTimeout);
    };
  }, [closeTimeout]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');
    
    try {
      const response = await fetch(`${API_URL}/api/auth/check-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Network error');
      
      if (data.exists) {
        const sessionResponse = await fetch(`${API_URL}/api/auth/create-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email })
        });
        localStorage.setItem('token', data.token);
        localStorage.setItem('userEmail', email);
        window.dispatchEvent(new Event('userLogin'));
        setEmailError('Welcome back!');
        setTimeout(() => {
          setShowLoginModal(false);
          setEmail('');
          navigate('/profile');
        }, 1500);
      } else {
        setEmailError('Email not found. Would you like to create an account?');
      }
    } catch (err) {
      setEmailError('Error checking email. Please try again.');
    }
  };

  const handleRecommendationSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recommendationForm)
      });
      
      if (!response.ok) throw new Error('Failed to add recommendation');
      
      setShowAddRecommendationModal(false);
      setRecommendationForm({
        business_name: '',
        email: '',
        phone_number: '',
        category: '',
        subcategory: '',
        description: '',
        notes: '',
        user_email: localStorage.getItem('userEmail')
      });
    } catch (error) {
      console.error('Error adding recommendation:', error);
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">Seanag Recommends</Link>
        <nav className="nav-links">
          <div 
            className="nav-link dropdown" 
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            Home Services
            {showServicesDropdown && (
              <div 
                className="dropdown-menu"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <Link to="/appliances" className="dropdown-item">Appliances</Link>
                <Link to="/cleaning" className="dropdown-item">Cleaning</Link>
                <Link to="/utilities" className="dropdown-item">Utilities</Link>
                <Link to="/repairs" className="dropdown-item">Repairs</Link>
                <Link to="/outdoor" className="dropdown-item">Outdoor</Link>
                <Link to="/moving" className="dropdown-item">Moving</Link>
              </div>
            )}
          </div>
          <Link to="/financial-services" className="nav-link">Financial Services</Link>
          <Link to="/profile" className="nav-link">Profile</Link>
          <button 
            className="login-button" 
            onClick={() => setShowLoginModal(true)}
          >
            Login
          </button>
          {isLoggedIn ? (
          <button 
            className="add-recommendation-button"
            onClick={() => setShowAddRecommendationModal(true)}
          >
            Add Recommendation
          </button>
        ) : (
          <button 
            className="add-recommendation-button"
            onClick={() => setShowLoginModal(true)}
          >
            Add Recommendation
          </button>
        )}
        </nav>
      </div>

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button 
              className="close-button" 
              onClick={() => setShowLoginModal(false)}
            >
              ×
            </button>
            <h2>Welcome to Maven</h2>
            <form onSubmit={handleEmailSubmit}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {emailError && <div className="error-message">{emailError}</div>}
              <button type="submit">Continue</button>
            </form>
          </div>
        </div>
      )}

      {showAddRecommendationModal && (
        <div className="modal-overlay" onClick={() => setShowAddRecommendationModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button 
              className="close-button" 
              onClick={() => setShowAddRecommendationModal(false)}
            >
              ×
            </button>
            <h2>Add New Recommendation</h2>
            <form onSubmit={handleRecommendationSubmit}>
              <input
                type="text"
                placeholder="Business Name"
                value={recommendationForm.business_name}
                onChange={(e) => setRecommendationForm({
                  ...recommendationForm,
                  business_name: e.target.value
                })}
                required
              />
              <input
                type="email"
                placeholder="Business Email"
                value={recommendationForm.email}
                onChange={(e) => setRecommendationForm({
                  ...recommendationForm,
                  email: e.target.value
                })}
                required
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={recommendationForm.phone_number}
                onChange={(e) => setRecommendationForm({
                  ...recommendationForm,
                  phone_number: e.target.value
                })}
                required
              />
              <textarea
                placeholder="Description"
                value={recommendationForm.description}
                onChange={(e) => setRecommendationForm({
                  ...recommendationForm,
                  description: e.target.value
                })}
              />
              <textarea
                placeholder="Additional Notes"
                value={recommendationForm.notes}
                onChange={(e) => setRecommendationForm({
                  ...recommendationForm,
                  notes: e.target.value
                })}
              />
              <select
                value={recommendationForm.category}
                onChange={(e) => setRecommendationForm({
                  ...recommendationForm,
                  category: e.target.value,
                  subcategory: ''
                })}
                required
              >
                <option value="">Select Category</option>
                {Object.keys(categories).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {recommendationForm.category && (
                <select
                  value={recommendationForm.subcategory}
                  onChange={(e) => setRecommendationForm({
                    ...recommendationForm,
                    subcategory: e.target.value
                  })}
                  required
                >
                  <option value="">Select Subcategory</option>
                  {categories[recommendationForm.category].map(sub => (
                    <option key={sub.backend} value={sub.backend}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              )}
              <button type="submit">Submit Recommendation</button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;


// // Header.jsx
// import React, { useState, useEffect } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import './Header.css';

// const Header = () => {
//   const navigate = useNavigate();
//   const [showLoginModal, setShowLoginModal] = useState(false);
//   const [email, setEmail] = useState('');
//   const [emailError, setEmailError] = useState('');
//   const [showServicesDropdown, setShowServicesDropdown] = useState(false);
//   const [closeTimeout, setCloseTimeout] = useState(null);

//   const handleMouseEnter = () => {
//     if (closeTimeout) clearTimeout(closeTimeout);
//     setShowServicesDropdown(true);
//   };

//   const handleMouseLeave = () => {
//     const timeout = setTimeout(() => {
//       setShowServicesDropdown(false);
//     }, 300);
//     setCloseTimeout(timeout);
//   };

//   useEffect(() => {
//     return () => {
//       if (closeTimeout) clearTimeout(closeTimeout);
//     };
//   }, [closeTimeout]);

//   const handleEmailSubmit = async (e) => {
//     e.preventDefault();
//     setEmailError('');
    
//     try {
//       const response = await fetch('http://localhost:3000/api/auth/check-email', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ email })
//       });
      
//       const data = await response.json();
      
//       if (!response.ok) throw new Error(data.message || 'Network error');
      
//       if (data.exists) {
//         const sessionResponse = await fetch('http://localhost:3000/api/auth/create-session', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({ email })
//         });
//         localStorage.setItem('token', data.token);
//         localStorage.setItem('userEmail', email);
//         window.dispatchEvent(new Event('userLogin'));
//         console.log('Token stored in localStorage:', localStorage.getItem('token'));
//         setEmailError('Welcome back!');
//         setTimeout(() => {
//           setShowLoginModal(false);
//           setEmail('');
//           navigate('/profile');
//         }, 1500);
//       } 
//       else {
//         setEmailError('Email not found. Would you like to create an account?');
//       }
//     } 
//     catch (err) {
//       setEmailError('Error checking email. Please try again.');
//     }
//   };

//   return (
//     <header className="header">
//       <div className="header-content">
//         <Link to="/" className="logo">Seanag Recommends</Link>
//         <nav className="nav-links">
//           <div 
//             className="nav-link dropdown" 
//             onMouseEnter={handleMouseEnter}
//             onMouseLeave={handleMouseLeave}
//           >
//             Home Services
//             {showServicesDropdown && (
//               <div 
//                 className="dropdown-menu"
//                 onMouseEnter={handleMouseEnter}
//                 onMouseLeave={handleMouseLeave}
//               >
//                 <Link to="/appliances" className="dropdown-item">Appliances</Link>
//                 <Link to="/cleaning" className="dropdown-item">Cleaning</Link>
//                 <Link to="/utilities" className="dropdown-item">Utilities</Link>
//                 <Link to="/repairs" className="dropdown-item">Repairs</Link>
//                 <Link to="/outdoor" className="dropdown-item">Outdoor</Link>
//                 <Link to="/moving" className="dropdown-item">Moving</Link>
//               </div>
//             )}
//           </div>
//           <Link to="/financial-services" className="nav-link">Financial Services</Link>
//           <Link to="/profile" className="nav-link">Profile</Link>
//           <button 
//             className="login-button" 
//             onClick={() => setShowLoginModal(true)}
//           >
//             Login
//           </button>
//         </nav>
//       </div>

//       {showLoginModal && (
//         <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
//           <div className="modal" onClick={e => e.stopPropagation()}>
//             <button 
//               className="close-button" 
//               onClick={() => setShowLoginModal(false)}
//             >
//               ×
//             </button>
//             <h2>Welcome to Maven</h2>
//             <form onSubmit={handleEmailSubmit}>
//               <input
//                 type="email"
//                 placeholder="Enter your email"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 required
//               />
//               {emailError && <div className="error-message">{emailError}</div>}
//               <button type="submit">Continue</button>
//             </form>
//           </div>
//         </div>
//       )}
//     </header>
//   );
// };

// export default Header;


// import React, { useState } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import './Header.css';

// const Header = () => {
//   console.log('Header component rendering');
//   const navigate = useNavigate();
//   const [showLoginModal, setShowLoginModal] = useState(false);
//   const [email, setEmail] = useState('');
//   const [emailError, setEmailError] = useState('');

//   const handleEmailSubmit = async (e) => {
//     e.preventDefault();
//     setEmailError('');
    
//     try {
//       const response = await fetch('http://localhost:3000/api/auth/check-email', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ email })
//       });
      
//       const data = await response.json();
      
//       if (!response.ok) throw new Error(data.message || 'Network error');
      
//       if (data.exists) {
//         const sessionResponse = await fetch('http://localhost:3000/api/auth/create-session', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({ email })
//         });
//         localStorage.setItem('token', data.token);
//         localStorage.setItem('userEmail', email);
//         window.dispatchEvent(new Event('userLogin'));
//         console.log('Token stored in localStorage:', localStorage.getItem('token'));
//         setEmailError('Welcome back!');
//         setTimeout(() => {
//           setShowLoginModal(false);
//           setEmail('');
//           navigate('/profile');
//         }, 1500);
//       } 
//       else {
//         setEmailError('Email not found. Would you like to create an account?');
//       }
//     } 
//     catch (err) {
//       setEmailError('Error checking email. Please try again.');
//     }
//   };

//   const handleFinancialServicesClick = () => {
//     console.log('Financial Services link clicked');
//     navigate('/financial-services');
//   };

//   return (
//     <header className="header">
//       <div className="header-content">
//         <Link to="/" className="logo">Seanag Recommends</Link>
//         <nav className="nav-links">
//           <Link to="/home-services" onClick={() => console.log('Home Services clicked')}>
//             Home Services
//           </Link>
//           <Link 
//             to="/financial-services" 
//             onClick={handleFinancialServicesClick}
//             className="nav-link"
//           >
//             Financial Services
//           </Link>
//           <Link to="/profile" className="nav-link">Profile</Link>
//           <button 
//             className="login-button" 
//             onClick={() => setShowLoginModal(true)}
//           >
//             Login
//           </button>
//         </nav>
//       </div>

//       {showLoginModal && (
//         <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
//           <div className="modal" onClick={e => e.stopPropagation()}>
//             <button 
//               className="close-button" 
//               onClick={() => setShowLoginModal(false)}
//             >
//               ×
//             </button>
//             <h2>Welcome to Maven</h2>
//             <form onSubmit={handleEmailSubmit}>
//               <input
//                 type="email"
//                 placeholder="Enter your email"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 required
//               />
//               {emailError && <div className="error-message">{emailError}</div>}
//               <button type="submit">Continue</button>
//             </form>
//           </div>
//         </div>
//       )}
//     </header>
//   );
// };

// export default Header;

// // // Header.js
// // import React, { useState } from 'react';
// // import { Link } from 'react-router-dom';
// // import './Header.css';

// // const Header = () => {
// //   console.log('Header component rendering');
// //   const [showLoginModal, setShowLoginModal] = useState(false);
// //   const [email, setEmail] = useState('');
// //   const [emailError, setEmailError] = useState('');

// //   const handleEmailSubmit = async (e) => {
// //     e.preventDefault();
// //     setEmailError('');
    
// //     try {
// //       const response = await fetch('http://localhost:3000/api/auth/check-email', {
// //         method: 'POST',
// //         headers: {
// //           'Content-Type': 'application/json',
// //         },
// //         body: JSON.stringify({ email })
// //       });
      
// //       const data = await response.json();
      
// //       if (!response.ok) throw new Error(data.message || 'Network error');
      
// //       if (data.exists) {
// //         setEmailError('Welcome back!');
// //         setTimeout(() => {
// //           setShowLoginModal(false);
// //           setEmail('');
// //         }, 1500);
// //       } else {
// //         setEmailError('Email not found. Would you like to create an account?');
// //       }
// //     } catch (err) {
// //       setEmailError('Error checking email. Please try again.');
// //     }
// //   };

// //   return (
// //     <header className="header">
// //       <div className="header-content">
// //         <Link to="/" className="logo">Maven</Link>
// //         <nav className="nav-links">
// //           <Link to="/home-services">Home Services</Link>
// //           <Link to="/financial-services">Financial Services</Link>
// //           <button 
// //             className="login-button" 
// //             onClick={() => setShowLoginModal(true)}
// //           >
// //             Login
// //           </button>
// //         </nav>
// //       </div>

// //       {showLoginModal && (
// //         <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
// //           <div className="modal" onClick={e => e.stopPropagation()}>
// //             <button 
// //               className="close-button" 
// //               onClick={() => setShowLoginModal(false)}
// //             >
// //               ×
// //             </button>
// //             <h2>Welcome to Maven</h2>
// //             <form onSubmit={handleEmailSubmit}>
// //               <input
// //                 type="email"
// //                 placeholder="Enter your email"
// //                 value={email}
// //                 onChange={(e) => setEmail(e.target.value)}
// //                 required
// //               />
// //               {emailError && <div className="error-message">{emailError}</div>}
// //               <button type="submit">Continue</button>
// //             </form>
// //           </div>
// //         </div>
// //       )}
// //     </header>
// //   );
// // };

// // export default Header;