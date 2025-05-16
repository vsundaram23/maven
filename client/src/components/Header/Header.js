import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCaretDown, FaUsers } from 'react-icons/fa';
import './Header.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = 'http://localhost:3000';

const ProfileAvatar = ({ email }) => {
  const getInitials = () =>
    email ? email.split('@')[0].charAt(0).toUpperCase() : '?';

  return (
    <div
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: 'var(--primary-blue)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        fontWeight: 'bold',
        marginLeft: '10px'
      }}
    >
      {getInitials()}
    </div>
  );
};

const Header = () => {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showAddRecommendationModal, setShowAddRecommendationModal] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showExplore, setShowExplore] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);
  const exploreRef = useRef(null);
  const isLoggedIn = Boolean(localStorage.getItem('userEmail'));
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef(null);

  const [signUpForm, setSignUpForm] = useState({
    name: '',
    email: '',
    preferred_name: '',
    phone_number: '',
    community: ''
  });

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target) &&
        (!event.target.closest || !event.target.closest('.profile-avatar-dropdown'))
      ) {
        setShowProfileDropdown(false);
      }
      if (
        exploreRef.current &&
        !exploreRef.current.contains(event.target) &&
        (!event.target.closest || !event.target.closest('.btn-explore'))
      ) {
        setShowExplore(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        !event.target.closest('.mobile-menu-button')
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const forceOpenLogin = () => setShowLoginModal(true);
    window.addEventListener('forceLogin', forceOpenLogin);
    return () => window.removeEventListener('forceLogin', forceOpenLogin);
  }, []);

  useEffect(() => {
    const handleForceSignUp = () => {
      setShowSignUpModal(true);
    };
    window.addEventListener('forceSignUp', handleForceSignUp);
    return () => {
      window.removeEventListener('forceSignUp', handleForceSignUp);
    };
  }, []);

  const toggleExplore = e => {
    e.preventDefault();
    setShowExplore(v => !v);
    if (isMobileMenuOpen && !exploreRef.current.contains(e.target)) {
      setIsMobileMenuOpen(false);
    }
  };

  const homeServices = [
    { name: 'Repair Services',   slug: 'repair-services' },
    { name: 'Cleaning Services', slug: 'cleaning-services'   },
    { name: 'Home Renovation',   slug: 'renovation-services'    },
    { name: 'Outdoor Services',  slug: 'outdoor-services'    },
    { name: 'Moving Services',   slug: 'moving-services'     },
  ];

  const otherServices = [
    { name: 'Financial Services', slug: 'financial-services'},
    { name: 'Auto Services', slug: 'auto-services'},
  ];


  const handleMobileMenuToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMobileMenuOpen(v => !v);
    setShowExplore(false);
    setShowProfileDropdown(false);
  };

  const handleNavLinkClick = () => {
    setIsMobileMenuOpen(false);
    setShowExplore(false);
    setShowProfileDropdown(false);
  };


  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');
    try {
      const response = await fetch(`${API_URL}/api/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (!response.ok || !data.exists) {
        setEmailError('Email not found. Would you like to create an account?');
        return;
      }
      const sessionRes = await fetch(`${API_URL}/api/auth/create-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const sessionData = await sessionRes.json();
      localStorage.setItem('token', sessionData.token);

      const profileRes = await fetch(
        `${API_URL}/api/auth/users/email/${encodeURIComponent(email)}`,
        {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        }
      );
      const { user } = await profileRes.json();
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userEmail', user.email);
      window.dispatchEvent(new Event('userLogin'));
      setEmailError('Welcome back!');
      setTimeout(() => {
        setShowLoginModal(false);
        setEmail('');
        window.location.href = '/';
      }, 500);
    } catch (err) {
      console.error(err);
      setEmailError('Login failed. Please try again.');
    }
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');
    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:           signUpForm.name,
          preferred_name: signUpForm.preferred_name,
          email:          signUpForm.email,
          phone_number:   signUpForm.phone_number,
          community:      signUpForm.community
        })
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('Signup failed:', data);
        setEmailError(data.message || 'Signup failed');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('userEmail', data.user.email);
      window.dispatchEvent(new Event('userLogin'));
      setShowSignUpModal(false);
      setSignUpForm({
        name: '',
        preferred_name: '',
        email: '',
        phone_number: '',
        community: ''
      });
      window.location.href = '/';
    } catch (error) {
      console.error('Signup error:', error);
      setEmailError('Signup failed. Please try again.');
    }
  };

  const handleRecommendationSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        <Link to="/" className="logo" onClick={handleNavLinkClick}>Tried & Trusted</Link>

        <button
          className="mobile-menu-button"
          onClick={handleMobileMenuToggle}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav
          className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}
          ref={mobileMenuRef}
        >
          <div className="nav-item explore" ref={exploreRef}>
            <button className="nav-link btn-explore" onClick={toggleExplore}>
              Explore <FaCaretDown className={`caret ${showExplore ? 'open' : ''}`} />
            </button>
            {showExplore && (
              <div className="explore-panel">
                <div className="panel-column">
                  <h4>Home Services</h4>
                  {homeServices.map(item => (
                    <Link
                      key={item.slug}
                      to={`/${item.slug}`}
                      className="panel-link"
                      onClick={handleNavLinkClick}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>

                <div className="panel-column">
                  <h4>Other Services</h4>
                  {otherServices.map(item => (
                     <Link
                        key={item.slug}
                        to={`/${item.slug}`}
                        className="panel-link"
                        onClick={handleNavLinkClick}
                    >
                        {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isLoggedIn && (
             <Link to="/trustcircles" className="nav-link my-trust-circle-link" onClick={handleNavLinkClick}>
                <FaUsers style={{ marginRight: '6px' }} /> My Trust Circle
            </Link>
          )}


          {isLoggedIn ? (
            <Link to="/share-recommendation" className="add-recommendation-button styled-button" onClick={handleNavLinkClick}>
              Share Recommendation
            </Link>
          ) : (
            <button
              className="add-recommendation-button styled-button"
              onClick={() => { setShowLoginModal(true); handleNavLinkClick(); }}
            >
              Share Recommendation
            </button>
          )}

          {isLoggedIn ? (
            <div className="profile-dropdown-wrapper" ref={profileDropdownRef}>
              <div
                className="profile-avatar-dropdown"
                onClick={() => {
                    setShowProfileDropdown(v => !v);
                    if (isMobileMenuOpen) {
                         setIsMobileMenuOpen(false);
                    }
                    setShowExplore(false);
                }}
              >
                <ProfileAvatar email={localStorage.getItem('userEmail')} />
                <FaCaretDown style={{ color: 'var(--primary-blue)', marginLeft: '4px' }} />
              </div>
              {showProfileDropdown && (
                <div className="dropdown-menu profile-dropdown-menu">
                  <Link to="/profile" className="dropdown-item" onClick={handleNavLinkClick}>My Profile</Link>
                  <Link to="/logout" className="dropdown-item" onClick={(e) => {
                    e.preventDefault();
                    localStorage.removeItem('user');
                    localStorage.removeItem('userEmail');
                    localStorage.removeItem('token');
                    window.dispatchEvent(new Event('userLogout'));
                    handleNavLinkClick();
                    window.location.href = '/';
                  }}>Logout</Link>
                </div>
              )}
            </div>
          ) : (
            <button
              className="login-button nav-link"
              onClick={() => {setShowLoginModal(true); handleNavLinkClick();}}
            >
              Sign In
            </button>
          )}
        </nav>
      </div>

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="close-button" onClick={() => setShowLoginModal(false)}>
              ×
            </button>
            <h2>Welcome to Tried & Trusted</h2>
            <form onSubmit={handleEmailSubmit}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              {emailError && <div className="error-message">{emailError}</div>}
              <button type="submit">Continue</button>
            </form>
            <div className="signup-link">
              New to Tried & Trusted?{' '}
              <span onClick={() => { setShowLoginModal(false); setShowSignUpModal(true); }}>
                Sign up here!
              </span>
            </div>
          </div>
        </div>
      )}

      {showSignUpModal && (
        <div className="modal-overlay" onClick={() => setShowSignUpModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="close-button" onClick={() => setShowSignUpModal(false)}>
              ×
            </button>
            <h2>Create Account</h2>
            <form onSubmit={handleSignUpSubmit}>
              <input
                type="text"
                placeholder="Preferred Name"
                value={signUpForm.preferred_name}
                onChange={e => setSignUpForm({ ...signUpForm, preferred_name: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Full Name"
                value={signUpForm.name}
                onChange={e => setSignUpForm({ ...signUpForm, name: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={signUpForm.email}
                onChange={e => setSignUpForm({ ...signUpForm, email: e.target.value })}
                required
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={signUpForm.phone_number}
                onChange={e => setSignUpForm({ ...signUpForm, phone_number: e.target.value })}
                required
              />
              <button type="submit">Sign Up</button>
            </form>
          </div>
        </div>
      )}

      {showAddRecommendationModal && (
        <div className="modal-overlay" onClick={() => setShowAddRecommendationModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="close-button" onClick={() => setShowAddRecommendationModal(false)}>
              ×
            </button>
            <h2>Add New Recommendation</h2>
            <form onSubmit={handleRecommendationSubmit}>
              <input
                type="text"
                placeholder="Business Name"
                value={recommendationForm.business_name}
                onChange={e => setRecommendationForm({ ...recommendationForm, business_name: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Business Email"
                value={recommendationForm.email}
                onChange={e => setRecommendationForm({ ...recommendationForm, email: e.target.value })}
                required
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={recommendationForm.phone_number}
                onChange={e => setRecommendationForm({ ...recommendationForm, phone_number: e.target.value })}
                required
              />
              <textarea
                placeholder="What did you think?"
                value={recommendationForm.description}
                onChange={e => setRecommendationForm({ ...recommendationForm, description: e.target.value })}
              />
              <select
                value={recommendationForm.category}
                onChange={e => setRecommendationForm({ ...recommendationForm, category: e.target.value, subcategory: '' })}
                required
              >
                <option value="">Select Category</option>
                {Object.keys(categories).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {recommendationForm.category && (
                <select
                  value={recommendationForm.subcategory}
                  onChange={e => setRecommendationForm({ ...recommendationForm, subcategory: e.target.value })}
                  required
                >
                  <option value="">Select Subcategory</option>
                  {categories[recommendationForm.category].map(sub => (
                    <option key={sub.backend} value={sub.backend}>{sub.name}</option>
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

// import React, { useState, useEffect, useRef } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { FaCaretDown } from 'react-icons/fa';
// import './Header.css';

// const API_URL = 'https://api.seanag-recommendations.org:8080';
// // const API_URL = 'http://localhost:3000';

// const ProfileAvatar = ({ email }) => {
//   const getInitials = () =>
//     email ? email.split('@')[0].charAt(0).toUpperCase() : '?';

//   return (
//     <div
//       style={{
//         width: '32px',
//         height: '32px',
//         borderRadius: '50%',
//         backgroundColor: 'var(--primary-blue)',
//         color: 'white',
//         display: 'flex',
//         alignItems: 'center',
//         justifyContent: 'center',
//         fontSize: '16px',
//         fontWeight: 'bold',
//         marginLeft: '10px'
//       }}
//     >
//       {getInitials()}
//     </div>
//   );
// };

// const Header = () => {
//   const navigate = useNavigate();
//   const [showLoginModal, setShowLoginModal] = useState(false);
//   const [showSignUpModal, setShowSignUpModal] = useState(false);
//   const [showAddRecommendationModal, setShowAddRecommendationModal] = useState(false);
//   const [email, setEmail] = useState('');
//   const [emailError, setEmailError] = useState('');
//   const [showExploreDropdown, setShowExploreDropdown] = useState(false);
//   const [showExplore, setShowExplore] = useState(false);
//   const [closeTimeout, setCloseTimeout] = useState(null);
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
//   const mobileMenuRef = useRef(null);
//   const exploreRef = useRef(null);
//   const isLoggedIn = Boolean(localStorage.getItem('userEmail'));
//   const [showProfileDropdown, setShowProfileDropdown] = useState(false);
//   const profileDropdownRef = useRef(null);
//   const profileRef = useRef(null);
//   const [showProfile, setShowProfile] = useState(false);

//   const [signUpForm, setSignUpForm] = useState({
//     name: '',
//     email: '',
//     preferred_name: '',
//     phone_number: '',
//     community: ''
//   });

//   const [recommendationForm, setRecommendationForm] = useState({
//     business_name: '',
//     email: '',
//     phone_number: '',
//     category: '',
//     subcategory: '',
//     description: '',
//     notes: '',
//     user_email: localStorage.getItem('userEmail') || ''
//   });

//   const categories = {
//     'Home Services': [
//       { name: 'Appliances', backend: 'Appliance Services' },
//       { name: 'Cleaning', backend: 'Cleaning and Upkeep' },
//       { name: 'Utilities', backend: 'Utilities' },
//       { name: 'Repairs', backend: 'Structural Repairs' },
//       { name: 'Outdoor', backend: 'Outdoor Services' },
//       { name: 'Moving and Misc', backend: 'Moving and Misc' }
//     ],
//     'Financial Services': [
//       { name: 'Tax Preparation', backend: 'Tax Preparation' },
//       { name: 'Financial Planning', backend: 'Financial Planning' }
//     ]
//   };

//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       // close profile dropdown
//       if (
//         profileDropdownRef.current &&
//         !profileDropdownRef.current.contains(event.target)
//       ) {
//         setShowProfileDropdown(false);
//       }
//       // close explore dropdown
//       if (
//         exploreRef.current &&
//         !exploreRef.current.contains(event.target)
//       ) {
//         setShowExploreDropdown(false);
//       }
//       // close mobile nav
//       if (
//         mobileMenuRef.current &&
//         !mobileMenuRef.current.contains(event.target)
//       ) {
//         setIsMobileMenuOpen(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//       if (closeTimeout) clearTimeout(closeTimeout);
//     };
//   }, [closeTimeout]);

//   useEffect(() => {
//     const forceOpenLogin = () => setShowLoginModal(true);
//     window.addEventListener('forceLogin', forceOpenLogin);
//     return () => window.removeEventListener('forceLogin', forceOpenLogin);
//   }, []);

// useEffect(() => {
//   const handleForceSignUp = () => {
//     setShowSignUpModal(true);
//   };
//   window.addEventListener('forceSignUp', handleForceSignUp);
//   return () => {
//     window.removeEventListener('forceSignUp', handleForceSignUp);
//   };
// }, []); // Assuming setShowSignUpModal is stable (from useState)

//   useEffect(() => {
//     const onClick = e => {
//       if (exploreRef.current && !exploreRef.current.contains(e.target)) {
//         setShowExplore(false);
//       }
//       if (profileRef.current && !profileRef.current.contains(e.target)) {
//         setShowProfile(false);
//       }
//     };
//     document.addEventListener('mousedown', onClick);
//     return () => document.removeEventListener('mousedown', onClick);
//   }, []);

//   const toggleExplore = e => {
//     e.preventDefault();
//     setShowExplore(v => !v);
//   };

//   const homeServices = [
//     { name: 'Repair Services',   slug: 'repair-services' },
//     { name: 'Cleaning Services', slug: 'cleaning-services'   },
//     { name: 'Home Renovation',   slug: 'renovation-services'    },
//     { name: 'Outdoor Services',  slug: 'outdoor-services'    },
//     { name: 'Moving Services',   slug: 'moving-services'     },
//   ];
//   const otherLinks = [
//     { name: 'Financial Experts', slug: 'financial-services' },
//     { name: 'Auto Providers',      slug: 'auto-services'      },
//   ];

//   const handleMobileMenuToggle = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setIsMobileMenuOpen(v => !v);
//     setShowExploreDropdown(false);
//   };

//   const handleEmailSubmit = async (e) => {
//     e.preventDefault();
//     setEmailError('');
//     try {
//       const response = await fetch(`${API_URL}/api/auth/check-email`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ email })
//       });
//       const data = await response.json();
//       if (!response.ok || !data.exists) {
//         setEmailError('Email not found. Would you like to create an account?');
//         return;
//       }
//       const sessionRes = await fetch(`${API_URL}/api/auth/create-session`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ email })
//       });
//       const sessionData = await sessionRes.json();
//       localStorage.setItem('token', sessionData.token);

//       const profileRes = await fetch(
//         `${API_URL}/api/auth/users/email/${encodeURIComponent(email)}`,
//         {
//           credentials: 'include',            // if you rely on cookies
//           headers: { 'Accept': 'application/json' }
//         }
//       );
//       const { user } = await profileRes.json();
//       localStorage.setItem('user', JSON.stringify(user));
//       localStorage.setItem('userEmail', user.email);
//       window.dispatchEvent(new Event('userLogin'));
//       setEmailError('Welcome back!');
//       setTimeout(() => {
//         setShowLoginModal(false);
//         setEmail('');
//         window.location.href = '/';
//       }, 500);
//     } catch (err) {
//       console.error(err);
//       setEmailError('Login failed. Please try again.');
//     }
//   };

//   const handleSignUpSubmit = async (e) => {
//     e.preventDefault();
//     setEmailError('');
//     try {
//       const response = await fetch(`${API_URL}/api/auth/signup`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           name:           signUpForm.name,
//           preferred_name: signUpForm.preferred_name,
//           email:          signUpForm.email,
//           phone_number:   signUpForm.phone_number,
//           community:      signUpForm.community
//         })
//       });
//       const data = await response.json();
//       if (!response.ok) {
//         console.error('Signup failed:', data);
//         setEmailError(data.message || 'Signup failed');
//         return;
//       }
//       localStorage.setItem('token', data.token);
//       localStorage.setItem('user', JSON.stringify(data.user));
//       localStorage.setItem('userEmail', data.user.email);
//       window.dispatchEvent(new Event('userLogin'));
//       setShowSignUpModal(false);
//       setSignUpForm({
//         name: '',
//         preferred_name: '',
//         email: '',
//         phone_number: '',
//         community: ''
//       });
//       window.location.href = '/';
//     } catch (error) {
//       console.error('Signup error:', error);
//       setEmailError('Signup failed. Please try again.');
//     }
//   };

//   const handleRecommendationSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const response = await fetch(`${API_URL}/api/recommendations`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(recommendationForm)
//       });
//       if (!response.ok) throw new Error('Failed to add recommendation');
//       setShowAddRecommendationModal(false);
//       setRecommendationForm({
//         business_name: '',
//         email: '',
//         phone_number: '',
//         category: '',
//         subcategory: '',
//         description: '',
//         notes: '',
//         user_email: localStorage.getItem('userEmail')
//       });
//     } catch (error) {
//       console.error('Error adding recommendation:', error);
//     }
//   };

//   return (
//     <header className="header">
//       <div className="header-content">
//         <Link to="/" className="logo">Tried & Trusted</Link>

//         <button
//           className="mobile-menu-button"
//           onClick={handleMobileMenuToggle}
//           style={{ position: 'relative', zIndex: 2000 }}
//         >
//           <span></span>
//           <span></span>
//           <span></span>
//         </button>

//         <nav
//           className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}
//           ref={mobileMenuRef}
//         >
//           {/* ← Explore dropdown */}
//           {/* <div
//             className="nav-link dropdown explore-trigger"
//             onClick={toggleExplore}
//             ref={exploreRef}
//           >
//             Explore <FaCaretDown style={{ marginLeft: '4px' }} />
//             {showExploreDropdown && (
//               <div className="dropdown-menu explore-menu">
//                 {Object.entries(categories).map(([groupName, subs]) => (
//                   <div key={groupName} className="category-group">
//                     <h4>{groupName}</h4>
//                     {subs.map(sub => (
//                       <Link
//                         key={sub.backend}
//                         to={`/${sub.backend.replace(/\s+/g, '-').toLowerCase()}`}
//                         className="dropdown-item"
//                       >
//                         {sub.name}
//                       </Link>
//                     ))}
//                   </div>
//                 ))}
//                 <div className="category-group">
//                   <h4>Auto Services</h4>
//                   <Link to="/auto-services" className="dropdown-item">
//                     All Auto Services
//                   </Link>
//                 </div>
//               </div>
//             )}
//           </div> */}
//           <div className="nav-item explore" ref={exploreRef}>
//             <button className="btn-explore" onClick={toggleExplore}>
//               Explore <FaCaretDown className={`caret ${showExplore ? 'open' : ''}`} />
//             </button>
//             {showExplore && (
//               <div className="explore-panel">
//                 {/* Home Services column */}
//                 <div className="panel-column">
//                   <h4>Home Services</h4>
//                   {homeServices.map(item => (
//                     <Link
//                       key={item.slug}
//                       to={`/${item.slug}`}
//                       className="panel-link"
//                       onClick={() => setShowExplore(false)}
//                     >
//                       {item.name}
//                     </Link>
//                   ))}
//                 </div>

//                 {/* Financial Services column */}
//                 <div className="panel-column">
//                   <h4>Financial Experts</h4>
//                   <Link
//                     to="/financial-services"
//                     className="panel-link"
//                     onClick={() => setShowExplore(false)}
//                   >
//                     Financial Services
//                   </Link>
//                 </div>

//                 {/* Auto Services column */}
//                 <div className="panel-column">
//                   <h4>Auto Providers</h4>
//                   <Link
//                     to="/auto-services"
//                     className="panel-link"
//                     onClick={() => setShowExplore(false)}
//                   >
//                     Auto Services
//                   </Link>
//                 </div>
//               </div>
//             )}
//           </div>

//           {isLoggedIn ? (
//             <Link to="/share-recommendation" className="add-recommendation-button">
//               Share a Recommendation
//             </Link>
//           ) : (
//             <button
//               className="add-recommendation-button"
//               onClick={() => setShowLoginModal(true)}
//             >
//               Share a Recommendation
//             </button>
//           )}

//           {isLoggedIn ? (
//             <div className="profile-dropdown-wrapper" ref={profileDropdownRef}>
//               <div
//                 className="profile-avatar-dropdown"
//                 onClick={() => setShowProfileDropdown(v => !v)}
//               >
//                 <ProfileAvatar email={localStorage.getItem('userEmail')} />
//                 <FaCaretDown style={{ color: 'var(--primary-blue)', marginLeft: '4px' }} />
//               </div>
//               {showProfileDropdown && (
//                 <div className="dropdown-menu profile-dropdown-menu">
//                   <Link to="/profile" className="dropdown-item">My Profile</Link>
//                   <Link to="/trustcircles" className="dropdown-item">Trust Circle</Link>
//                 </div>
//               )}
//             </div>
//           ) : (
//             <button
//               className="login-button"
//               onClick={() => setShowLoginModal(true)}
//             >
//               Sign In
//             </button>
//           )}
//         </nav>
//       </div>

//       {/* ——— Login Modal ——— */}
//       {showLoginModal && (
//         <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
//           <div className="modal" onClick={e => e.stopPropagation()}>
//             <button className="close-button" onClick={() => setShowLoginModal(false)}>
//               ×
//             </button>
//             <h2>Welcome to Tried & Trusted</h2>
//             <form onSubmit={handleEmailSubmit}>
//               <input
//                 type="email"
//                 placeholder="Enter your email"
//                 value={email}
//                 onChange={e => setEmail(e.target.value)}
//                 required
//               />
//               {emailError && <div className="error-message">{emailError}</div>}
//               <button type="submit">Continue</button>
//             </form>
//             <div className="signup-link">
//               New to Tried & Trusted?{' '}
//               <span onClick={() => { setShowLoginModal(false); setShowSignUpModal(true); }}>
//                 Sign up here!
//               </span>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ——— Sign-Up Modal ——— */}
//       {showSignUpModal && (
//         <div className="modal-overlay" onClick={() => setShowSignUpModal(false)}>
//           <div className="modal" onClick={e => e.stopPropagation()}>
//             <button className="close-button" onClick={() => setShowSignUpModal(false)}>
//               ×
//             </button>
//             <h2>Create Account</h2>
//             <form onSubmit={handleSignUpSubmit}>
//               <input
//                 type="text"
//                 placeholder="Preferred Name"
//                 value={signUpForm.preferred_name}
//                 onChange={e => setSignUpForm({ ...signUpForm, preferred_name: e.target.value })}
//                 required
//               />
//               <input
//                 type="text"
//                 placeholder="Full Name"
//                 value={signUpForm.name}
//                 onChange={e => setSignUpForm({ ...signUpForm, name: e.target.value })}
//                 required
//               />
//               <input
//                 type="email"
//                 placeholder="Email"
//                 value={signUpForm.email}
//                 onChange={e => setSignUpForm({ ...signUpForm, email: e.target.value })}
//                 required
//               />
//               <input
//                 type="tel"
//                 placeholder="Phone Number"
//                 value={signUpForm.phone_number}
//                 onChange={e => setSignUpForm({ ...signUpForm, phone_number: e.target.value })}
//                 required
//               />
//               <button type="submit">Sign Up</button>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* ——— Add Recommendation Modal ——— */}
//       {showAddRecommendationModal && (
//         <div className="modal-overlay" onClick={() => setShowAddRecommendationModal(false)}>
//           <div className="modal" onClick={e => e.stopPropagation()}>
//             <button className="close-button" onClick={() => setShowAddRecommendationModal(false)}>
//               ×
//             </button>
//             <h2>Add New Recommendation</h2>
//             <form onSubmit={handleRecommendationSubmit}>
//               <input
//                 type="text"
//                 placeholder="Business Name"
//                 value={recommendationForm.business_name}
//                 onChange={e => setRecommendationForm({ ...recommendationForm, business_name: e.target.value })}
//                 required
//               />
//               <input
//                 type="email"
//                 placeholder="Business Email"
//                 value={recommendationForm.email}
//                 onChange={e => setRecommendationForm({ ...recommendationForm, email: e.target.value })}
//                 required
//               />
//               <input
//                 type="tel"
//                 placeholder="Phone Number"
//                 value={recommendationForm.phone_number}
//                 onChange={e => setRecommendationForm({ ...recommendationForm, phone_number: e.target.value })}
//                 required
//               />
//               <textarea
//                 placeholder="What did you think?"
//                 value={recommendationForm.description}
//                 onChange={e => setRecommendationForm({ ...recommendationForm, description: e.target.value })}
//               />
//               <select
//                 value={recommendationForm.category}
//                 onChange={e => setRecommendationForm({ ...recommendationForm, category: e.target.value, subcategory: '' })}
//                 required
//               >
//                 <option value="">Select Category</option>
//                 {Object.keys(categories).map(cat => (
//                   <option key={cat} value={cat}>{cat}</option>
//                 ))}
//               </select>
//               {recommendationForm.category && (
//                 <select
//                   value={recommendationForm.subcategory}
//                   onChange={e => setRecommendationForm({ ...recommendationForm, subcategory: e.target.value })}
//                   required
//                 >
//                   <option value="">Select Subcategory</option>
//                   {categories[recommendationForm.category].map(sub => (
//                     <option key={sub.backend} value={sub.backend}>{sub.name}</option>
//                   ))}
//                 </select>
//               )}
//               <button type="submit">Submit Recommendation</button>
//             </form>
//           </div>
//         </div>
//       )}
//     </header>
//   );
// };

// export default Header;

// const ProfileAvatar = ({ email }) => {
//   const getInitials = () => {
//     return email ? email.split('@')[0].charAt(0).toUpperCase() : '?';
//   };

//   return (
//     <div 
//       style={{
//         width: '32px',
//         height: '32px',
//         borderRadius: '50%',
//         backgroundColor: 'var(--primary-blue)', // ← use the darker blue
//         color: 'white',
//         display: 'flex',
//         alignItems: 'center',
//         justifyContent: 'center',
//         fontSize: '16px',
//         fontWeight: 'bold',
//         marginLeft: '10px'
//       }}
//     >
//       {getInitials()}
//     </div>
//   );
// };

// const Header = () => {
//   const navigate = useNavigate();
//   const [showLoginModal, setShowLoginModal] = useState(false);
//   const [showSignUpModal, setShowSignUpModal] = useState(false);
//   const [showAddRecommendationModal, setShowAddRecommendationModal] = useState(false);
//   const [email, setEmail] = useState('');
//   const [emailError, setEmailError] = useState('');
//   const [showServicesDropdown, setShowServicesDropdown] = useState(false);
//   const [closeTimeout, setCloseTimeout] = useState(null);
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
//   const mobileMenuRef = useRef(null);
//   const isLoggedIn = localStorage.getItem('userEmail');
//   const [showProfileDropdown, setShowProfileDropdown] = useState(false);
//   const profileDropdownRef = useRef(null);


//   const [signUpForm, setSignUpForm] = useState({
//     name: '',
//     email: '',
//     preferred_name: '',
//     phone_number: '',
//     community: ''
//   });

//   const [recommendationForm, setRecommendationForm] = useState({
//     business_name: '',
//     email: '',
//     phone_number: '',
//     category: '',
//     subcategory: '',
//     description: '',
//     notes: '',
//     user_email: localStorage.getItem('userEmail') || ''
//   });

//   const categories = {
//     'Home Services': [
//       { name: 'Appliances', backend: 'Appliance Services' },
//       { name: 'Cleaning', backend: 'Cleaning and Upkeep' },
//       { name: 'Utilities', backend: 'Utilities' },
//       { name: 'Repairs', backend: 'Structural Repairs' },
//       { name: 'Outdoor', backend: 'Outdoor Services' },
//       { name: 'Moving and Misc', backend: 'Moving and Misc' }
//     ],
//     'Financial Services': [
//       { name: 'Tax Preparation', backend: 'Tax Preparation' },
//       { name: 'Financial Planning', backend: 'Financial Planning' }
//     ]
//   };

//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       // Don't trigger if clicking the button
//       if (event.target.closest('.mobile-menu-button')) return;
      
//       if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
//         setIsMobileMenuOpen(false);
//       }
//     };
  
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//       if (closeTimeout) clearTimeout(closeTimeout);
//     };
//   }, [closeTimeout]);
  
//   useEffect(() => {
//     const forceOpenLogin = () => {
//       console.log('forceLogin event triggered — opening login modal');
//       setShowLoginModal(true);
//     };
  
//     window.addEventListener('forceLogin', forceOpenLogin);
//     return () => window.removeEventListener('forceLogin', forceOpenLogin);
//   }, []);

//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (
//         profileDropdownRef.current &&
//         !profileDropdownRef.current.contains(event.target)
//       ) {
//         setShowProfileDropdown(false);
//       }
//     };
  
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//     };
//   }, []);

//   // useEffect(() => {
//   //   const handleClickOutside = (event) => {
//   //     if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
//   //       setIsMobileMenuOpen(false);
//   //     }
//   //   };

//   //   document.addEventListener('mousedown', handleClickOutside);
//   //   return () => {
//   //     document.removeEventListener('mousedown', handleClickOutside);
//   //     if (closeTimeout) clearTimeout(closeTimeout);
//   //   };
//   // }, [closeTimeout]);

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

//   const handleEmailSubmit = async (e) => {
//     e.preventDefault();
//     setEmailError('');
  
//     try {
//       // 1) check-email → get token + user stub
//       const response = await fetch(`${API_URL}/api/auth/check-email`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ email })
//       });
//       const data = await response.json();
  
//       if (!response.ok || !data.exists) {
//         setEmailError('Email not found. Would you like to create an account?');
//         return;
//       }
  
//       // 2) create-session → get token
//       const sessionRes = await fetch(`${API_URL}/api/auth/create-session`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ email })
//       });
//       const sessionData = await sessionRes.json();
//       localStorage.setItem('token', sessionData.token);
  
//       // 3) fetch full user record by email
//       const profileRes = await fetch(
//         `/api/auth/users/email/${encodeURIComponent(email)}`,
//         {
//           credentials: 'include',            // if you rely on cookies
//           headers: { 'Accept': 'application/json' }
//         }
//       );
//       const { user } = await profileRes.json();
  
//       // 4) store the full user in localStorage
//       localStorage.setItem('user', JSON.stringify(user));
//       localStorage.setItem('userEmail', user.email); // optional legacy
  
//       // 5) notify everyone you’re logged in
//       window.dispatchEvent(new Event('userLogin'));
  
//       // 6) close modal, navigate, show success
//       setEmailError('Welcome back!');
//       setTimeout(() => {
//         setShowLoginModal(false);
//         setEmail('');
//         navigate('/');
//       }, 500);
  
//     } catch (err) {
//       console.error(err);
//       setEmailError('Login failed. Please try again.');
//     }
//   };

//   const handleSignUpSubmit = async (e) => {
//     e.preventDefault();
//     setEmailError('');
  
//     try {
//       const response = await fetch(`${API_URL}/api/auth/signup`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           name:            signUpForm.name,
//           preferred_name:  signUpForm.preferred_name,
//           email:           signUpForm.email,
//           phone_number:    signUpForm.phone_number,
//           community:       signUpForm.community
//         })
//       });
//       const data = await response.json();
  
//       if (!response.ok) {
//         console.error('Signup failed:', data);
//         setEmailError(data.message || 'Signup failed');
//         return;
//       }
  
//       // on success, persist token + user
//       localStorage.setItem('token', data.token);
//       localStorage.setItem('user', JSON.stringify(data.user));
//       localStorage.setItem('userEmail', data.user.email);
//       window.dispatchEvent(new Event('userLogin'));
  
//       // reset & navigate
//       setShowSignUpModal(false);
//       setSignUpForm({
//         name: '',
//         preferred_name: '',
//         email: '',
//         phone_number: '',
//         community: ''
//       });
//       navigate('/');
//     } catch (error) {
//       console.error('Network or code error signing up:', error);
//       setEmailError('Signup failed. Please try again.');
//     }
//   };

//   const handleRecommendationSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const response = await fetch(`${API_URL}/api/recommendations`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(recommendationForm)
//       });
      
//       if (!response.ok) throw new Error('Failed to add recommendation');
      
//       setShowAddRecommendationModal(false);
//       setRecommendationForm({
//         business_name: '',
//         email: '',
//         phone_number: '',
//         category: '',
//         subcategory: '',
//         description: '',
//         notes: '',
//         user_email: localStorage.getItem('userEmail')
//       });
//     } catch (error) {
//       console.error('Error adding recommendation:', error);
//     }
//   };

//   const handleMobileMenuToggle = (e) => {
//     console.log('Toggle clicked, current state:', isMobileMenuOpen);
//     e.preventDefault();
//     e.stopPropagation();
//     // setIsMobileMenuOpen(!isMobileMenuOpen);
//     // setShowServicesDropdown(false);
//     if (isMobileMenuOpen) {
//       setIsMobileMenuOpen(false);
//     } else {
//       setIsMobileMenuOpen(true);
//     }
//     setShowServicesDropdown(false);
//   };

//   return (
//     <header className="header">
//       <div className="header-content">
//         <Link to="/" className="logo">Tried & Trusted</Link>
        
//         <button 
//           className="mobile-menu-button"
//           onClick={handleMobileMenuToggle}
//           style={{ position: 'relative', zIndex: 2000 }}
//         >
//           <span></span>
//           <span></span>
//           <span></span>
//         </button>

//         <nav className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`} ref={mobileMenuRef}>
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
//                 <Link to="/appliances" className="dropdown-item">Repair Services</Link>
//                 <Link to="/cleaning" className="dropdown-item">Cleaning Services</Link>
//                 {/* <Link to="/utilities" className="dropdown-item">Utilities</Link> */}
//                 <Link to="/repairs" className="dropdown-item">Home Renovation</Link>
//                 <Link to="/outdoor" className="dropdown-item">Outdoor Services</Link>
//                 <Link to="/moving" className="dropdown-item">Moving Services</Link>
//               </div>
//             )}
//           </div>
//           <Link to="/financial-services" className="nav-link">Financial Services</Link>
//           <Link to="/auto-services"      className="nav-link">Auto Services</Link>
//           {isLoggedIn ? (
//             <Link to="/share-recommendation" className="add-recommendation-button">
//               Share a Recommendation
//             </Link>
//           ) : (
//             <button 
//               className="add-recommendation-button"
//               onClick={() => setShowLoginModal(true)}
//             >
//               Share a Recommendation
//             </button>
//           )}
//           {isLoggedIn ? (
//             <div className="profile-dropdown-wrapper" ref={profileDropdownRef}>
//               <div 
//                 className="profile-avatar-dropdown"
//                 onClick={() => setShowProfileDropdown(prev => !prev)}
//               >
//                 <ProfileAvatar email={localStorage.getItem('userEmail')} />
//                 <FaCaretDown style={{ color: 'var(--primary-blue)', marginLeft: '4px' }} />
//               </div>
//               {showProfileDropdown && (
//                 <div className="dropdown-menu profile-dropdown-menu">
//                   <Link to="/profile" className="dropdown-item">My Profile</Link>
//                   <Link to="/trustcircles" className="dropdown-item">Trust Circles</Link>
//                 </div>
//               )}
//             </div>
//           ) : (
//             <button 
//               className="login-button"
//               onClick={() => setShowLoginModal(true)}
//             >
//               Sign In
//             </button>
//           )}
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
//             <h2>Welcome to Tried & Trusted</h2>
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
//             <div className="signup-link">
//               New to Tried & Trusted? <span onClick={() => {
//                 setShowLoginModal(false);
//                 setShowSignUpModal(true);
//               }}>Sign up here!</span>
//             </div>
//           </div>
//         </div>
//       )}

//       {showSignUpModal && (
//         <div className="modal-overlay" onClick={() => setShowSignUpModal(false)}>
//           <div className="modal" onClick={e => e.stopPropagation()}>
//             <button className="close-button" onClick={() => setShowSignUpModal(false)}>×</button>
//             <h2>Create Account</h2>
//             <form onSubmit={handleSignUpSubmit}>
//               <input
//                 type="text"
//                 placeholder="Preferred Name"
//                 value={signUpForm.preferred_name}
//                 onChange={e => setSignUpForm({ ...signUpForm, preferred_name: e.target.value })}
//                 required
//               />
//               <input
//                 type="text"
//                 placeholder="Full Name"
//                 value={signUpForm.name}
//                 onChange={e => setSignUpForm({ ...signUpForm, name: e.target.value })}
//                 required
//               />
//               <input
//                 type="email"
//                 placeholder="Email"
//                 value={signUpForm.email}
//                 onChange={e => setSignUpForm({ ...signUpForm, email: e.target.value })}
//                 required
//               />
//               <input
//                 type="tel"
//                 placeholder="Phone Number"
//                 value={signUpForm.phone_number}
//                 onChange={e => setSignUpForm({ ...signUpForm, phone_number: e.target.value })}
//                 required
//               />
//               <button type="submit">Sign Up</button>
//             </form>
//           </div>
//         </div>
//       )}

//       {showAddRecommendationModal && (
//         <div className="modal-overlay" onClick={() => setShowAddRecommendationModal(false)}>
//           <div className="modal" onClick={e => e.stopPropagation()}>
//             <button 
//               className="close-button" 
//               onClick={() => setShowAddRecommendationModal(false)}
//             >
//               ×
//             </button>
//             <h2>Add New Recommendation</h2>
//             <form onSubmit={handleRecommendationSubmit}>
//               <input
//                 type="text"
//                 placeholder="Business Name"
//                 value={recommendationForm.business_name}
//                 onChange={(e) => setRecommendationForm({
//                   ...recommendationForm,
//                   business_name: e.target.value
//                 })}
//                 required
//               />
//               <input
//                 type="email"
//                 placeholder="Business Email"
//                 value={recommendationForm.email}
//                 onChange={(e) => setRecommendationForm({
//                   ...recommendationForm,
//                   email: e.target.value
//                 })}
//                 required
//               />
//               <input
//                 type="tel"
//                 placeholder="Phone Number"
//                 value={recommendationForm.phone_number}
//                 onChange={(e) => setRecommendationForm({
//                   ...recommendationForm,
//                   phone_number: e.target.value
//                 })}
//                 required
//               />
//               <textarea
//                 placeholder="What did you think?"
//                 value={recommendationForm.description}
//                 onChange={(e) => setRecommendationForm({
//                   ...recommendationForm,
//                   description: e.target.value
//                 })}
//               />
//               <select
//                 value={recommendationForm.category}
//                 onChange={(e) => setRecommendationForm({
//                   ...recommendationForm,
//                   category: e.target.value,
//                   subcategory: ''
//                 })}
//                 required
//               >
//                 <option value="">Select Category</option>
//                 {Object.keys(categories).map(category => (
//                   <option key={category} value={category}>{category}</option>
//                 ))}
//               </select>
//               {recommendationForm.category && (
//                 <select
//                   value={recommendationForm.subcategory}
//                   onChange={(e) => setRecommendationForm({
//                     ...recommendationForm,
//                     subcategory: e.target.value
//                   })}
//                   required
//                 >
//                   <option value="">Select Subcategory</option>
//                   {categories[recommendationForm.category].map(sub => (
//                     <option key={sub.backend} value={sub.backend}>
//                       {sub.name}
//                     </option>
//                   ))}
//                 </select>
//               )}
//               <button type="submit">Submit Recommendation</button>
//             </form>
//           </div>
//         </div>
//       )}
//     </header>
//   );
// };

// export default Header;