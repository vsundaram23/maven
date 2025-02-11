import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import './Home.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';

const Home = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const isMobile = useMediaQuery({ maxWidth: 768 });

  const pages = [
    { 
      category: 'Appliances',
      services: ['A/C', 'Furniture'],
      path: '/appliances'
    },
    {
      category: 'Cleaning',
      services: ['Carpets', 'Deep Cleaning', 'Gutter Cleaning'],
      path: '/cleaning'
    },
    {
      category: 'Utilities',
      services: ['Electrician', 'Plumbing'],
      path: '/utilities'
    },
    {
      category: 'Repairs',
      services: ['Wood Floor', 'Construction', 'Cabinet'],
      path: '/repairs'
    },
    {
      category: 'Outdoor',
      services: ['Landscaping', 'Fencing'],
      path: '/outdoor'
    },
    {
      category: 'Moving',
      services: ['Movers', 'Handyman', 'Painting'],
      path: '/moving'
    }
  ];

  useEffect(() => {
    fetch(`${API_URL}/api/providers`)
      .then(res => res.json())
      .then(data => {
        setProviders(data.providers);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching providers:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.closest('.search-wrapper input')) {
        return;
      }
      
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
  
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePageSelect = (path) => {
    setShowDropdown(false);
    navigate(path);
  };

  return (
    <div className="home">
      <div className="hero-container">
        <div className="glass-card">
          <h1 className="title-animation">
            {isMobile ? 'SEANAG Recommends' : 'Seattle Nagarathar Recommendations'}
          </h1>
          <p className="subtitle-animation">
            Trusted recommendations from the SEANAG community.
          </p>
          
          <div className="search-wrapper">
            <input
              type="text"
              placeholder={isMobile ? "Search services..." : "Search for home services, financial advisors..."}
              onClick={() => setShowDropdown(!showDropdown)}
              readOnly
            />
            {showDropdown && (
              <div className={`search-dropdown ${isMobile ? 'mobile' : ''}`} ref={dropdownRef}>
                {pages.map(page => (
                  <div 
                    key={page.path} 
                    className="dropdown-item" 
                    onClick={() => handlePageSelect(page.path)}
                  >
                    <span className="category-name">{page.category}: </span>
                    <span className="services-list">
                      {isMobile 
                        ? page.services.join(', ').substring(0, 30) + (page.services.join(', ').length > 30 ? '...' : '')
                        : page.services.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

// // Home.js
// import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import './Home.css';

// const API_URL = 'https://api.seanag-recommendations.org:8080';


// const Home = () => {
//   const [providers, setProviders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const navigate = useNavigate();

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

//   const handleScroll = () => {
//     window.scrollTo({
//       top: window.innerHeight,
//       behavior: 'smooth'
//     });
//   };

//   return (
//     <div className="home">
//       <div className="hero-container">
//         <div className="glass-card">
//           <h1 className="title-animation">Seattle Nagarathar Recommendations</h1>
//           <p className="subtitle-animation">Trusted recommendations from the Seattle Nagarathar Community.</p>
//           <div className="scroll-indicator" onClick={handleScroll}>
//             <span className="arrow"></span>
//           </div>
//         </div>

//         <div className="service-container">
//           {loading ? (
//             <div className="loader"></div>
//           ) : (
//             <>
//               <div 
//                 className="service-card" 
//                 onClick={() => navigate('/home-services')}
//               >
//                 <div className="card-content">
//                   <h2>Home Services</h2>
//                   <p>Find vetted professionals for your home</p>
//                 </div>
//                 <div className="card-overlay"></div>
//               </div>

//               <div 
//                 className="service-card"
//                 onClick={() => navigate('/financial-services')}
//               >
//                 <div className="card-content">
//                   <h2>Financial Services</h2>
//                   <p>Connect with trusted financial advisors</p>
//                 </div>
//                 <div className="card-overlay"></div>
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Home;


// import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import './Home.css';

// const Home = () => {
//   const [providers, setProviders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const navigate = useNavigate();

//   useEffect(() => {
//     fetch('http://localhost:3000/api/providers')
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

//   return (
//     <div className="home">
//       <div className="hero-container">
//         <div className="glass-card">
//           <h1>Seattle Nagarathar Recommenations</h1>
//           <p>Trusted recommendations from the Seattle Nagarathar Community.</p>
//         </div>

//         <div className="service-container">
//           {loading ? (
//             <div>Loading...</div>
//           ) : (
//             <>
//               <div 
//                 className="service-card" 
//                 onClick={() => navigate('/home-services')}
//                 style={{ cursor: 'pointer' }}
//               >
//                 <div className="card-content">
//                   <h2>Home Services</h2>
//                   <p>Find vetted professionals for your home</p>
//                 </div>
//                 <div className="card-overlay"></div>
//               </div>

//               <div 
//                 className="service-card"
//                 onClick={() => navigate('/financial-services')}
//                 style={{ cursor: 'pointer' }}
//               >
//                 <div className="card-content">
//                   <h2>Financial Services</h2>
//                   <p>Connect with trusted financial advisors</p>
//                 </div>
//                 <div className="card-overlay"></div>
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Home;
