import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './Search.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';

const Search = () => {
  const location = useLocation();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const params = new URLSearchParams(location.search);
  const query = params.get('q');
  const noResults = params.get('noResults') === 'true';

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

  return (
    <div className="search-page">
      <h1 className="search-heading">Results for “{query}”</h1>

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
              <h2>{provider.business_name || provider.name}</h2>
              <p className="service-type">{provider.service_type}</p>
              <p>{provider.description}</p>
              <div className="provider-meta">
                {provider.phone_number && <span>📞 {provider.phone_number}</span>}
                {provider.email && <span>✉️ {provider.email}</span>}
                {provider.recommended_by_name && (
                  <span className="recommended-by">Recommended by {provider.recommended_by_name}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Search;
