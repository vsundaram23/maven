// src/components/AuroraBackground/AuroraBackground.js (or your chosen path)
import React from 'react';
import './AuroraBackground.css'; // We'll create this CSS file next

const AuroraBackground = () => {
  return (
    <div className="aurora-background-container">
      <div className="aurora-blob blob-1"></div>
      <div className="aurora-blob blob-2"></div>
      <div className="aurora-blob blob-3"></div>
      <div className="aurora-blob blob-4"></div>
    </div>
  );
};

export default AuroraBackground;