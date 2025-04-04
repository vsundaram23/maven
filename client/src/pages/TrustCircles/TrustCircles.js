import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './TrustCircles.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';

const TrustCircles = () => {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchTrustCircle = async () => {
    const storedEmail = localStorage.getItem('userEmail');
    if (!storedEmail) {
      console.warn('No userEmail in localStorage');
      window.dispatchEvent(new Event('forceLogin'));
      navigate('/');
      return;
    }

    setEmail(storedEmail);
    setLoading(true); // NEW

    try {
      const response = await fetch(`${API_URL}/api/connections/check-connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: storedEmail })
      });

      if (!response.ok) throw new Error('Failed to fetch accepted connections');

      const data = await response.json();
      console.log('Fetched connections:', data);
      setUsers(data);
    } catch (err) {
      console.error('Error loading connections:', err);
    } finally {
        setLoading(false); // NEW
    }
  };

  useEffect(() => {
    fetchTrustCircle();
  }, [navigate]);

  return (
    <div className="trust-circles-container">
      <h1 className="trust-circles-header">Your Personal Trust Circle</h1>

      {loading ? (
        <p>Loading your connections...</p>
      ) : users.length === 0 ? (
        <p>No connections found.</p>
      ) : (
        <div className="user-grid">
          {users.map((user) => (
            <div className="user-card" key={user.email}>
              <div className="user-name">{user.name}</div>
              <div className="user-email">{user.email}</div>
              <div className="status connected">Connected</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrustCircles;

