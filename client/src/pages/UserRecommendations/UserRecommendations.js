import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
import './UserRecommendations.css';

// const API_URL = 'http://localhost:3000';
const API_URL = 'https://api.seanag-recommendations.org:8080';

const StarRating = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="star-rating">
      {[...Array(fullStars)].map((_, i) => (
        <FaStar key={`full-${i}`} className="filled" />
      ))}
      {hasHalf && <FaStar className="half" />}
      {[...Array(emptyStars)].map((_, i) => (
        <FaStar key={`empty-${i}`} className="empty" />
      ))}
    </div>
  );
};

const UserRecommendations = () => {
  const { id } = useParams();
  const [recommendations, setRecommendations] = useState([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/${id}/recommendations`);
        const data = await res.json();
        setRecommendations(data.recommendations || []);
        setUserName(data.userName || 'User');
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecs();
  }, [id]);

  if (loading) return <div className="appliance-services-container">Loading recommendations...</div>;

  return (
    <div className="appliance-services-container">
      <h1 className="section-heading">Recommendations by {userName}</h1>

      {recommendations.length === 0 ? (
        <p className="no-recommendations">This user hasn't recommended any providers yet.</p>
      ) : (
        <ul className="provider-list">
          {recommendations.map((provider) => (
            <li key={provider.id} className="provider-card">
              <div className="card-header">
                <h2 className="card-title">{provider.business_name}</h2>
                <div className="badge-group">
                  <span className="profile-badge">{provider.service_type}</span>
                  <span className="profile-badge">{provider.category}</span>
                </div>
              </div>

              <p className="card-description">{provider.description || 'No description available'}</p>

              <div className="action-buttons">
                <a
                  href={`/provider/${provider.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="primary-button"
                >
                  View Profile
                </a>
                <button
                  className="secondary-button"
                  onClick={() => {
                    if (provider.phone_number) {
                      window.location.href = `sms:${provider.phone_number}?body=Hi ${provider.business_name}, I saw a recommendation about you on Tried & Trusted and would like to connect!`;
                    } else if (provider.email) {
                      window.location.href = `mailto:${provider.email}?subject=Request%20for%20Consultation&body=Hi%20${provider.business_name},%20I%20found%20you%20on%20Tried%20%26%20Trusted%20and%20would%20like%20to%20connect.`;
                    } else {
                      alert("No contact information available.");
                    }
                  }}
                >
                  Request a Consultation
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UserRecommendations;
