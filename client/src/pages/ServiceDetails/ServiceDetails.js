import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReviewSection from '../../components/ReviewSection/ReviewSection';
import './ServiceDetails.css';

const API_URL = 'http://34.214.248.192:8080';

const ServiceDetails = () => {
  const { id } = useParams();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/providers/${id}`)
      .then(res => res.json())
      .then(data => {
        setProvider(data.provider);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching provider details:', err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!provider) return <div>Provider not found</div>;

  return (
    <div className="service-details">
      <div className="provider-header">
        <div className="container">
          <div className="provider-info-detailed">
            <h1>{provider.business_name}</h1>
            <div className="provider-meta">
              <span className="category">{provider.category}</span>
              <span className="rating">★ {provider.average_rating}</span>
              <span className="reviews">({provider.total_reviews} reviews)</span>
            </div>
            <div className="trust-score">
              Trust Score: {provider.trust_score}
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="provider-content">
          <div className="main-content">
            <section className="about-section">
              <h2>About</h2>
              <p>{provider.description}</p>
            </section>
            
            <ReviewSection providerId={id} />
          </div>

          <div className="sidebar">
            <div className="contact-card">
              <h3>Contact Information</h3>
              <button className="contact-button">Message Provider</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetails;
