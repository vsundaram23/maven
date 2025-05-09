import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCaretDown } from 'react-icons/fa';
import './Header.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';

const ProfileAvatar = ({ email }) => {
  const getInitials = () => {
    return email ? email.split('@')[0].charAt(0).toUpperCase() : '?';
  };

  return (
    <div 
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: 'var(--primary-blue)', // ← use the darker blue
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
  const [showServicesDropdown, setShowServicesDropdown] = useState(false);
  const [closeTimeout, setCloseTimeout] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);
  const isLoggedIn = localStorage.getItem('userEmail');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef(null);


  const [signUpForm, setSignUpForm] = useState({
    name: '',
    email: '',
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
      // Don't trigger if clicking the button
      if (event.target.closest('.mobile-menu-button')) return;
      
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };
  
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (closeTimeout) clearTimeout(closeTimeout);
    };
  }, [closeTimeout]);
  
  useEffect(() => {
    const forceOpenLogin = () => {
      console.log('forceLogin event triggered — opening login modal');
      setShowLoginModal(true);
    };
  
    window.addEventListener('forceLogin', forceOpenLogin);
    return () => window.removeEventListener('forceLogin', forceOpenLogin);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target)
      ) {
        setShowProfileDropdown(false);
      }
    };
  
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
  //       setIsMobileMenuOpen(false);
  //     }
  //   };

  //   document.addEventListener('mousedown', handleClickOutside);
  //   return () => {
  //     document.removeEventListener('mousedown', handleClickOutside);
  //     if (closeTimeout) clearTimeout(closeTimeout);
  //   };
  // }, [closeTimeout]);

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

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');
    
    try {
      // Fetch request to check if email exists
      const response = await fetch(`${API_URL}/api/auth/check-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });
  
      const data = await response.json();
      
      if (!response.ok || !data.exists) {
        setEmailError('Email not found. Would you like to create an account?');
        return;
      }
  
      // If email exists, create a session for the user
      const sessionResponse = await fetch(`${API_URL}/api/auth/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });
  
      const sessionData = await sessionResponse.json();
  
      // Storing data in localStorage after successful login
      localStorage.setItem('token', sessionData.token);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userId', data.id);
  
      // Dispatch login event and close modal
      window.dispatchEvent(new Event('userLogin'));
      setEmailError('Welcome back!');
      setTimeout(() => {
        setShowLoginModal(false);
        setEmail('');
        navigate('/profile');
      }, 1500);
    } catch (err) {
      console.error('Error checking email:', err);
      setEmailError('Error checking email. Please try again.');
    }
  };

  // const handleEmailSubmit = async (e) => {
  //   e.preventDefault();
  //   setEmailError('');
    
  //   try {
  //     const response = await fetch(`${API_URL}/api/auth/check-email`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({ email })
  //     });
      
  //     const data = await response.json();
      
  //     if (!response.ok) throw new Error(data.message || 'Network error');
      
  //     if (data.exists) {
  //       const sessionResponse = await fetch(`${API_URL}/api/auth/create-session`, {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //         body: JSON.stringify({ email })
  //       });
  //       localStorage.setItem('token', data.token);
  //       localStorage.setItem('userEmail', email);
  //       localStorage.setItem('userId', data.user.id);
  //       window.dispatchEvent(new Event('userLogin'));
  //       setEmailError('Welcome back!');
  //       setTimeout(() => {
  //         setShowLoginModal(false);
  //         setEmail('');
  //         navigate('/profile');
  //       }, 1500);
  //     } else {
  //       setEmailError('Email not found. Would you like to create an account?');
  //     }
  //   } catch (err) {
  //     setEmailError('Error checking email. Please try again.');
  //   }
  // };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signUpForm)
      });
      
      if (!response.ok) throw new Error('Failed to sign up');
      
      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('userEmail', signUpForm.email);
      window.dispatchEvent(new Event('userLogin'));
      setShowSignUpModal(false);
      setSignUpForm({ name: '', email: '', community: '' });
      navigate('/profile');
    } catch (error) {
      console.error('Error signing up:', error);
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

  const handleMobileMenuToggle = (e) => {
    console.log('Toggle clicked, current state:', isMobileMenuOpen);
    e.preventDefault();
    e.stopPropagation();
    // setIsMobileMenuOpen(!isMobileMenuOpen);
    // setShowServicesDropdown(false);
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    } else {
      setIsMobileMenuOpen(true);
    }
    setShowServicesDropdown(false);
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">Tried & Trusted</Link>
        
        <button 
          className="mobile-menu-button"
          onClick={handleMobileMenuToggle}
          style={{ position: 'relative', zIndex: 2000 }}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`} ref={mobileMenuRef}>
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
                <Link to="/appliances" className="dropdown-item">Repair Services</Link>
                <Link to="/cleaning" className="dropdown-item">Cleaning Services</Link>
                {/* <Link to="/utilities" className="dropdown-item">Utilities</Link> */}
                <Link to="/repairs" className="dropdown-item">Home Renovation</Link>
                <Link to="/outdoor" className="dropdown-item">Outdoor Services</Link>
                <Link to="/moving" className="dropdown-item">Moving Services</Link>
              </div>
            )}
          </div>
          <Link to="/financial-services" className="nav-link">Financial Services</Link>
          <Link to="/auto-services"      className="nav-link">Auto Services</Link>
          {/* <Link to="/trustcircles" className="nav-link">Trust Circles</Link> */}
          {/* <button 
            className="add-recommendation-button"
            onClick={() => isLoggedIn ? setShowAddRecommendationModal(true) : setShowLoginModal(true)}
          >
            Share a Recommendation
          </button> */}
          {isLoggedIn ? (
            <Link to="/share-recommendation" className="add-recommendation-button">
              Share a Recommendation
            </Link>
          ) : (
            <button 
              className="add-recommendation-button"
              onClick={() => setShowLoginModal(true)}
            >
              Share a Recommendation
            </button>
          )}
          {isLoggedIn ? (
            <div className="profile-dropdown-wrapper" ref={profileDropdownRef}>
              <div 
                className="profile-avatar-dropdown"
                onClick={() => setShowProfileDropdown(prev => !prev)}
              >
                <ProfileAvatar email={localStorage.getItem('userEmail')} />
                <FaCaretDown style={{ color: 'var(--primary-blue)', marginLeft: '4px' }} />
              </div>
              {showProfileDropdown && (
                <div className="dropdown-menu profile-dropdown-menu">
                  <Link to="/profile" className="dropdown-item">My Profile</Link>
                  <Link to="/trustcircles" className="dropdown-item">Trust Circles</Link>
                </div>
              )}
            </div>
          ) : (
            <button 
              className="login-button"
              onClick={() => setShowLoginModal(true)}
            >
              Sign In
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
            <h2>Welcome to Tried & Trusted</h2>
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
            <div className="signup-link">
              New to Tried & Trusted? <span onClick={() => {
                setShowLoginModal(false);
                setShowSignUpModal(true);
              }}>Sign up here!</span>
            </div>
          </div>
        </div>
      )}

      {showSignUpModal && (
        <div className="modal-overlay" onClick={() => setShowSignUpModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button 
              className="close-button" 
              onClick={() => setShowSignUpModal(false)}
            >
              ×
            </button>
            <h2>Create Account</h2>
            <form onSubmit={handleSignUpSubmit}>
              <input
                type="text"
                placeholder="Name"
                value={signUpForm.name}
                onChange={(e) => setSignUpForm({
                  ...signUpForm,
                  name: e.target.value
                })}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={signUpForm.email}
                onChange={(e) => setSignUpForm({
                  ...signUpForm,
                  email: e.target.value
                })}
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
                placeholder="What did you think?"
                value={recommendationForm.description}
                onChange={(e) => setRecommendationForm({
                  ...recommendationForm,
                  description: e.target.value
                })}
              />
              {/* <textarea
                placeholder="Additional Notes"
                value={recommendationForm.notes}
                onChange={(e) => setRecommendationForm({
                  ...recommendationForm,
                  notes: e.target.value
                })}
              /> */}
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