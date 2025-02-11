import React, { useState } from 'react';
import './AuthPage.css';
import { useNavigate } from 'react-router-dom';

const AuthPage = () => {
  const navigate = useNavigate();
  
  const onLoginSuccess = () => {
    navigate('/select-circle');
  };

  return (
    <div className="auth-page">
      <h1>Welcome to Tried & Trusted</h1>
      {/* Use your existing login form component here */}
    </div>
  );
};

export default AuthPage;
