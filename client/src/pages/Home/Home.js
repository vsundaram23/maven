import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import './Home.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';

const Home = () => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userName, setUserName] = useState('');
  const [providerCount, setProviderCount] = useState(null);
  const navigate = useNavigate();
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const location = useLocation();

  const fullText = 'Find services,';

  useEffect(() => {
    const email = localStorage.getItem('userEmail');
    if (email) {
      const firstName = email.split('@')[0];
      setUserName(firstName.charAt(0).toUpperCase() + firstName.slice(1));
    }
  }, []);

  useEffect(() => {
    if (isTyping) {
      const timeout = setTimeout(() => {
        setDisplayText(fullText.substring(0, displayText.length + 1));
        if (displayText.length === fullText.length - 1) {
          setIsTyping(false);
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [displayText, isTyping]);

  useEffect(() => {
    fetch(`${API_URL}/api/providers/count`)
      .then(res => res.json())
      .then(data => setProviderCount(data.count))
      .catch(err => console.error('Failed to fetch provider count:', err));
  }, []);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/providers/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (data && Array.isArray(data.providers) && data.providers.length > 0) {
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      } else {
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}&noResults=true`);
      }
    } catch (err) {
      console.error("Search failed:", err);
    }
  };

  if (location.pathname !== '/') return null;

  return (
    <motion.div 
      className="home"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 1 }}
    >
      <motion.div 
        className="hero-container"
        initial={{ y: 30, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.2, duration: 0.8 }}
      >
        {/* Uncomment to show personalized welcome */}
        {/* {userName && (
          <motion.p 
            className="welcome-tagline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Welcome back, {userName} 👋
          </motion.p>
        )} */}

        <h1 className="typewriter-title">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {displayText}
          </motion.span>
          <span className="highlight-box">fast.</span>
        </h1>

        <p className="subtitle">Where trusted people share trusted service providers.</p>

        <form className="search-wrapper" onSubmit={handleSearch}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isMobile ? "Search services..." : "Search for home services, financial advisors..."}
            className="search-input"
          />
          <button type="submit" className="search-button">→</button>
        </form>

        {providerCount !== null && (
          <motion.div 
            className="live-counter"
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 1, duration: 0.6 }}
          >
            <p className="provider-count">
              <CountUp end={providerCount} duration={2} separator="," /> recommendations shared this week
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Home;


// import React, { useEffect, useState /*, useRef */ } from 'react';
// import { useNavigate, useLocation } from 'react-router-dom';
// import { useMediaQuery } from 'react-responsive';
// import './Home.css';

// const API_URL = 'https://api.seanag-recommendations.org:8080';

// const Home = () => {
//   const [providers, setProviders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   // const [showDropdown, setShowDropdown] = useState(false);
//   const [displayText, setDisplayText] = useState('');
//   const [isTyping, setIsTyping] = useState(true);
//   const [searchQuery, setSearchQuery] = useState('');
//   const navigate = useNavigate();
//   // const dropdownRef = useRef(null);
//   const isMobile = useMediaQuery({ maxWidth: 768 });
//   const location = useLocation();

//   const fullText = 'Find services, fast.';

//   useEffect(() => {
//     if (isTyping) {
//       const timeout = setTimeout(() => {
//         setDisplayText(fullText.substring(0, displayText.length + 1));
//         if (displayText.length === fullText.length - 1) {
//           setIsTyping(false);
//         }
//       }, 100);
//       return () => clearTimeout(timeout);
//     }
//   }, [displayText, fullText, isTyping]);

//   /*
//   const pages = [
//     { category: 'Appliances', services: ['A/C', 'Furniture'], path: '/appliances' },
//     { category: 'Cleaning', services: ['Carpets', 'Deep Cleaning', 'Gutter Cleaning'], path: '/cleaning' },
//     { category: 'Utilities', services: ['Electrician', 'Plumbing'], path: '/utilities' },
//     { category: 'Repairs', services: ['Wood Floor', 'Construction', 'Cabinet'], path: '/repairs' },
//     { category: 'Outdoor', services: ['Landscaping', 'Fencing'], path: '/outdoor' },
//     { category: 'Moving', services: ['Movers', 'Handyman', 'Painting'], path: '/moving' },
//   ];
//   */

//   useEffect(() => {
//     fetch(`${API_URL}/api/providers`)
//       .then(res => res.json())
//       .then(data => {
//         setProviders(data.providers);
//         setLoading(false);
//       })
//       .catch(err => {
//         console.error('Error fetching providers:', err);
//         setLoading(false);
//       });
//   }, []);

//   /*
//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (event.target.closest('.search-wrapper input')) return;
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//         setShowDropdown(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   const handlePageSelect = (path) => {
//     setShowDropdown(false);
//     navigate(path);
//   };
//   */

//   const handleSearch = async (e) => {
//     if (e) e.preventDefault();
  
//     if (!searchQuery.trim()) return;
  
//     try {
//       const res = await fetch(`${API_URL}/api/providers/search?q=${encodeURIComponent(searchQuery.trim())}`);
//       const data = await res.json();
  
//       // SAFELY access providers array
//       if (data && Array.isArray(data.providers) && data.providers.length > 0) {
//         navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
//       } else {
//         navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}&noResults=true`);
//       }
//     } catch (err) {
//       console.error("Search failed:", err);
//     }
//   };
  

//   // Only show the hero on the homepage
//   if (location.pathname !== '/') return null;

//   return (
//     <div className="home">
//       <div className="hero-container">
//         <h1 className="typewriter-title">
//           Find services,<span className="highlight-box"> fast.</span>
//         </h1>
//         <p className="subtitle">Where trusted people share trusted service providers.</p>
//         <form className="search-wrapper" onSubmit={handleSearch}>
//           <input
//             type="text"
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//             placeholder={isMobile ? "Search services..." : "Search for home services, financial advisors..."}
//             className="search-input"
//           />
//           <button type="submit" className="search-button">→</button>

//           {/*
//           {showDropdown && (
//             <div className={`search-dropdown ${isMobile ? 'mobile' : ''}`} ref={dropdownRef}>
//               {pages.map(page => (
//                 <div key={page.path} className="dropdown-item" onClick={() => handlePageSelect(page.path)}>
//                   <span className="dropdown-line">
//                     <span className="category-name">{page.category}:</span>{' '}
//                     <span className="services-inline">
//                       {isMobile
//                         ? page.services.join(', ').substring(0, 30) + (page.services.join(', ').length > 30 ? '...' : '')
//                         : page.services.join(', ')}
//                     </span>
//                   </span>
//                 </div>
//               ))}
//             </div>
//           )}
//           */}
//         </form>
//       </div>
//     </div>
//   );
// };

// export default Home;


// import React, { useEffect, useState, useRef } from 'react';
// import { useNavigate, useLocation } from 'react-router-dom';
// import { useMediaQuery } from 'react-responsive';
// import './Home.css';

// const API_URL = 'https://api.seanag-recommendations.org:8080';

// const Home = () => {
//   const [providers, setProviders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [showDropdown, setShowDropdown] = useState(false);
//   const [displayText, setDisplayText] = useState('');
//   const [isTyping, setIsTyping] = useState(true);
//   const navigate = useNavigate();
//   const dropdownRef = useRef(null);
//   const isMobile = useMediaQuery({ maxWidth: 768 });
//   const location = useLocation();

//   const fullText = 'Find services, fast.';

//   useEffect(() => {
//     if (isTyping) {
//       const timeout = setTimeout(() => {
//         setDisplayText(fullText.substring(0, displayText.length + 1));
//         if (displayText.length === fullText.length - 1) {
//           setIsTyping(false);
//         }
//       }, 100);
//       return () => clearTimeout(timeout);
//     }
//   }, [displayText, fullText, isTyping]);

//   const pages = [
//     { category: 'Appliances', services: ['A/C', 'Furniture'], path: '/appliances' },
//     { category: 'Cleaning', services: ['Carpets', 'Deep Cleaning', 'Gutter Cleaning'], path: '/cleaning' },
//     { category: 'Utilities', services: ['Electrician', 'Plumbing'], path: '/utilities' },
//     { category: 'Repairs', services: ['Wood Floor', 'Construction', 'Cabinet'], path: '/repairs' },
//     { category: 'Outdoor', services: ['Landscaping', 'Fencing'], path: '/outdoor' },
//     { category: 'Moving', services: ['Movers', 'Handyman', 'Painting'], path: '/moving' },
//   ];

//   useEffect(() => {
//     fetch(`${API_URL}/api/providers`)
//       .then(res => res.json())
//       .then(data => {
//         setProviders(data.providers);
//         setLoading(false);
//       })
//       .catch(err => {
//         console.error('Error fetching providers:', err);
//         setLoading(false);
//       });
//   }, []);

//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (event.target.closest('.search-wrapper input')) return;
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//         setShowDropdown(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   const handlePageSelect = (path) => {
//     setShowDropdown(false);
//     navigate(path);
//   };

//   // Only show the hero on the homepage
//   if (location.pathname !== '/') return null;

//   return (
//     <div className="home">
//       <div className="hero-container">
//       <h1 className="typewriter-title">
//         Find services,<span className="highlight-box"> fast.</span>
//       </h1>
//         <p className="subtitle">Where trusted people share trusted service providers.</p>
//         <div className="search-wrapper">
//           <input
//             type="text"
//             placeholder={isMobile ? "Search services..." : "Search for home services, financial advisors..."}
//             onClick={() => setShowDropdown(!showDropdown)}
//             readOnly
//           />
//           <button className="search-button">→</button>
//           {showDropdown && (
//             <div className={`search-dropdown ${isMobile ? 'mobile' : ''}`} ref={dropdownRef}>
//               {pages.map(page => (
//                 <div key={page.path} className="dropdown-item" onClick={() => handlePageSelect(page.path)}>
//                 <span className="dropdown-line">
//                   <span className="category-name">{page.category}:</span>{' '}
//                   <span className="services-inline">
//                     {isMobile
//                       ? page.services.join(', ').substring(0, 30) + (page.services.join(', ').length > 30 ? '...' : '')
//                       : page.services.join(', ')}
//                   </span>
//                 </span>
//               </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Home;