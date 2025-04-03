import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import './Home.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';

const Home = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const location = useLocation();

  const fullText = 'Find recs, fast.';

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
  }, [displayText, fullText, isTyping]);

  const pages = [
    { category: 'Appliances', services: ['A/C', 'Furniture'], path: '/appliances' },
    { category: 'Cleaning', services: ['Carpets', 'Deep Cleaning', 'Gutter Cleaning'], path: '/cleaning' },
    { category: 'Utilities', services: ['Electrician', 'Plumbing'], path: '/utilities' },
    { category: 'Repairs', services: ['Wood Floor', 'Construction', 'Cabinet'], path: '/repairs' },
    { category: 'Outdoor', services: ['Landscaping', 'Fencing'], path: '/outdoor' },
    { category: 'Moving', services: ['Movers', 'Handyman', 'Painting'], path: '/moving' },
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
      if (event.target.closest('.search-wrapper input')) return;
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePageSelect = (path) => {
    setShowDropdown(false);
    navigate(path);
  };

  // Only show the hero on the homepage
  if (location.pathname !== '/') return null;

  return (
    <div className="home">
      <div className="hero-container">
        <h1 className="typewriter-title">{displayText}<span className="cursor"></span></h1>
        <p className="subtitle">Where trusted people share trusted service providers.</p>
        <div className="search-wrapper">
          <input
            type="text"
            placeholder={isMobile ? "Search services..." : "Search for home services, financial advisors..."}
            onClick={() => setShowDropdown(!showDropdown)}
            readOnly
          />
          <button className="search-button">→</button>
          {showDropdown && (
            <div className={`search-dropdown ${isMobile ? 'mobile' : ''}`} ref={dropdownRef}>
              {pages.map(page => (
                <div key={page.path} className="dropdown-item" onClick={() => handlePageSelect(page.path)}>
                <span className="dropdown-line">
                  <span className="category-name">{page.category}:</span>{' '}
                  <span className="services-inline">
                    {isMobile
                      ? page.services.join(', ').substring(0, 30) + (page.services.join(', ').length > 30 ? '...' : '')
                      : page.services.join(', ')}
                  </span>
                </span>
              </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;