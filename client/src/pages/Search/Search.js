import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FaPhone, FaEnvelope, FaHeart } from 'react-icons/fa';
import './Search.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';

const Search = () => {
  const location = useLocation();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const params = new URLSearchParams(location.search);
  const query = params.get('q');
  const noResults = params.get('noResults') === 'true';
  const [likedProviders, setLikedProviders] = useState({});

  useEffect(() => {
    if (!query || noResults) {
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/providers/search?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        setResults(data.providers || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching search results:', err);
        setLoading(false);
      });
  }, [query, noResults]);

  const handleLike = (id) => {
    setLikedProviders(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="search-page">
      <h1 className="search-heading">Results for “{query}”:</h1>

      {loading ? (
        <p className="search-loading">Loading results...</p>
      ) : noResults || results.length === 0 ? (
        <div className="no-results">
          <p>No trusted providers found for your search.</p>
          <button className="bump-network-button" onClick={() => alert("Coming soon: Bump your network!")}>
            Bump Your Network
          </button>
        </div>
      ) : (
        <ul className="provider-list">
          {results.map((provider) => (
            <li key={provider.id} className="provider-card">
              <div className="card-header">
                <h2 className="card-title">{provider.business_name || provider.name}</h2>
                {provider.service_type && (
                  <span className="badge">{provider.service_type}</span>
                )}
              </div>

              <p className="card-description">{provider.description}</p>

              <div className="card-meta">
                {provider.phone_number && (
                  <span className="meta-item"><FaPhone /> {provider.phone_number}</span>
                )}
                {provider.email && (
                  <span className="meta-item"><FaEnvelope /> {provider.email}</span>
                )}
              </div>

              {provider.recommended_by_name && (
                <div className="recommended-row">
                  <span className="recommended-label">Recommended by:</span>
                  <span className="recommended-name">{provider.recommended_by_name}</span>

                  <button
                    className={`heart-button ${likedProviders[provider.id] ? 'liked' : ''}`}
                    onClick={() => handleLike(provider.id)}
                  >
                    <FaHeart />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Search;
