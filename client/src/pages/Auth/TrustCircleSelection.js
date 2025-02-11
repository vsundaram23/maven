import React from 'react';
import './TrustCircleSelection.css';
import { useNavigate } from 'react-router-dom';

const TrustCircleSelection = () => {
  const navigate = useNavigate();
  
  const handleCircleSelection = (circle) => {
    localStorage.setItem('trustCircle', circle);
    navigate('/');
  };

  return (
    <div className="trust-circle-selection">
      <h1>Select Your Trust Circle</h1>
      {/* Add your trust circle selection UI here */}
    </div>
  );
};

export default TrustCircleSelection;
