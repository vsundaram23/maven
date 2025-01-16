import React from 'react';
import './FinancialServices.css';

const FinancialServices = ({ provider }) => {
    return (
      <div className="provider-tile">
        <h3>{provider.business_name}</h3>
        <p className="role">{provider.role}</p>
        <p className="service-type">{provider.service_type}</p>
        <p className="recommender">Recommended by: {provider.recommended_by_name}</p>
      </div>
    );
  };
  
  export default FinancialServices;