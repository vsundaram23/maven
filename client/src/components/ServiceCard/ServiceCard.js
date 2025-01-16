import React from 'react';
import './ServiceCard.css';

const ServiceCard = ({ provider }) => {
  return (
    <div className="service-card">
      <div className="trust-badge">{provider.trustScore}</div>
      <img 
        src={provider.image || '/default-business.png'} 
        alt={provider.business_name} 
        className="provider-image"
      />
      <div className="provider-info">
        <h3>{provider.business_name}</h3>
        <div className="rating">
          ★ {provider.average_rating} ({provider.total_reviews} reviews)
        </div>
        <p className="category">{provider.category}</p>
        <p className="description">{provider.description}</p>
        <div className="network-info">
          <span className="network-connections">
            {provider.network_users} connections use this service
          </span>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
