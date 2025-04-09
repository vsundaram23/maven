import React, { useState, useEffect } from 'react';
import { FaPhone, FaEnvelope, FaStar } from 'react-icons/fa';
import { fetchMovingProviders } from '../../services/providerService';
import './MovingServices.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';

const ReviewModal = ({ isOpen, onClose, onSubmit, provider }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rating) {
      setError('Please select a rating');
      return;
    }
    onSubmit({ rating, review });
    setRating(0);
    setReview('');
    onClose();
  };

  if (!isOpen || !provider) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Review {provider.business_name}</h2>
        <form onSubmit={handleSubmit}>
          <div className="rating-container">
            <label>Rate your experience: <span className="required">*</span></label>
            <div className="stars">
              {[...Array(5)].map((_, index) => (
                <FaStar
                  key={index}
                  className={index < (hover || rating) ? 'star active' : 'star'}
                  onClick={() => setRating(index + 1)}
                  onMouseEnter={() => setHover(index + 1)}
                  onMouseLeave={() => setHover(rating)}
                />
              ))}
            </div>
            {error && <div className="error-message">{error}</div>}
          </div>
          <div className="review-input">
            <label>Tell us about your experience:</label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Optional: Share your thoughts..."
              rows={4}
            />
          </div>
          <div className="modal-buttons">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="submit-button">
              Submit Review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MovingServices = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);

  useEffect(() => {
    const getProviders = async () => {
      try {
        setLoading(true);
        const data = await fetchMovingProviders();
        setProviders(data); // No filtering — backend returns relevant data
      } catch (err) {
        setError('Failed to fetch providers');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    getProviders();
  }, []);

  const handleReviewSubmit = async (reviewData) => {
    const userEmail = localStorage.getItem('userEmail');
    if (!selectedProvider) return;

    try {
      await fetch(`${API_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: selectedProvider.id,
          provider_email: selectedProvider.email || '',
          email: userEmail,
          rating: reviewData.rating,
          content: reviewData.review
        })
      });
    } catch (err) {
      console.error('Error submitting review:', err);
    }
  };

  const handleConsultation = (provider) => {
    if (provider.phone_number) {
      window.location.href = `sms:${provider.phone_number}?body=Hi ${provider.business_name}, ${provider.recommended_by_name} recommended you, and I’d like to request a consultation.`;
    } else if (provider.email) {
      window.location.href = `mailto:${provider.email}?subject=Request%20for%20Consultation&body=Hi%20${provider.business_name},%20I%E2%80%99d%20like%20to%20request%20a%20consultation%20via%20Tried%20%26%20Trusted.`;
    } else {
      alert("Thanks for requesting a consultation. We'll reach out to you shortly.");
    }
  };

  if (loading) return <div className="loading-spinner">Loading...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;
  if (!providers.length) return <div className="no-data">No moving service providers found</div>;

  return (
    <div className="moving-services-container">
      <h1 className="section-heading">Top Moving Service Providers</h1>
      <ul className="provider-list">
        {providers.map((provider) => (
          <li key={provider.id || Math.random()} className="provider-card">
            <div className="card-header">
              <h2 className="card-title">{provider.business_name}</h2>
              <span className="badge">Moving Services</span>
            </div>

            <p className="card-description">
              {provider.description || 'No description available'}
            </p>

            {provider.recommended_by_name && (
              <div className="recommended-row">
                <span className="recommended-label">Recommended by:</span>
                <span className="recommended-name">{provider.recommended_by_name}</span>
              </div>
            )}

            <div className="action-buttons">
              <button className="primary-button" onClick={() => handleConsultation(provider)}>
                Request a Consultation
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  setSelectedProvider(provider);
                  setIsReviewModalOpen(true);
                }}
              >
                Have you used this service?
              </button>
            </div>
          </li>
        ))}
      </ul>

      {isReviewModalOpen && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onSubmit={handleReviewSubmit}
          provider={selectedProvider}
        />
      )}
    </div>
  );
};

export default MovingServices;
