import React, { useState, useEffect } from 'react';
import { FaPhone, FaEnvelope, FaStar } from 'react-icons/fa';
import { fetchMovingProviders } from '../../services/providerService';
import './MovingServices.css';

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

  if (!isOpen) return null;

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
        const movingProviders = data.filter(
            provider => provider.service_type === 'Moving and Misc'
          );
        setProviders(movingProviders);
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
      const response = await fetch('http://localhost:3000/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider_id: selectedProvider.id,
          provider_email: reviewData.providerEmail,
          email: userEmail,
          rating: reviewData.rating,
          content: reviewData.review
        })
      });

      if (!response.ok) throw new Error('Failed to submit review');
    } catch (err) {
      console.error('Error submitting review:', err);
    }
  };

  const handlePhoneClick = (phoneNumber) => {
    if (phoneNumber) window.location.href = `tel:${phoneNumber}`;
  };

  const handleEmailClick = (email) => {
    if (email) window.location.href = `mailto:${email}`;
  };

  if (loading) return <div className="loading-spinner">Loading...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;
  if (providers.length === 0) return <div className="no-data">No moving service providers found</div>;

  return (
    <div className="moving-services-container">
      <div className="category-tabs">
        <button className="tab active">
          All Services
        </button>
      </div>
      <div className="providers-grid">
        {providers.map(provider => (
          <div className="financial-service-card" key={provider.id}>
            <div className="card-content">
              <div className="card-header">
                <h2 className="card-title">{provider.business_name}</h2>
                <div className="contact-icons">
                  {provider.phone_number?.trim() && (
                    <FaPhone 
                      className="contact-icon phone-icon"
                      size={16}
                      onClick={() => handlePhoneClick(provider.phone_number)}
                      title="Call provider"
                    />
                  )}
                  {provider.email?.trim() && (
                    <FaEnvelope 
                      className="contact-icon email-icon"
                      size={16}
                      onClick={() => handleEmailClick(provider.email)}
                      title="Email provider"
                    />
                  )}
                </div>
              </div>
              <div className="card-subtitle">{provider.role}</div>
              <div className="card-service-type">{provider.service_type}</div>
              <div className="card-description">{provider.description}</div>
              <div className="recommended-section">
                <div className="recommended-by">
                  Recommended by: {provider.recommended_by_name}
                </div>
              </div>
              <button 
                className="service-button"
                onClick={() => {
                  setSelectedProvider(provider);
                  setIsReviewModalOpen(true);
                }}
              >
                Have you used this service?
              </button>
            </div>
          </div>
        ))}
      </div>
      {isReviewModalOpen && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onSubmit={(reviewData) => handleReviewSubmit({
            ...reviewData,
            providerEmail: selectedProvider.email
          })}
          provider={selectedProvider}
        />
      )}
    </div>
  );
};

export default MovingServices;
