import React, { useState } from "react";
import "./TrustScoreWheel.css";

const TrustScoreWheel = ({ score, showDebug = false }) => {
  const [showRatingInfo, setShowRatingInfo] = useState(false);
  const level = Math.floor(score / 100);
  const progressInLevel = score % 100;
  const progressPercentage = progressInLevel;
  const pointsToNextLevel = 100 - progressInLevel;

  // Animation values
  const circumference = 2 * Math.PI * 60;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  const getTrustIcon = () => {
    if (level >= 10) return "🏆";
    if (level >= 5) return "⭐";
    return "🔥";
  };

  const RatingInfoModal = () => (
    <div className="trust-score-modal-wrapper" onClick={() => setShowRatingInfo(false)}>
      <div className="trust-score-modal" onClick={(e) => e.stopPropagation()}>
        <div className="trust-score-modal-header">
          <h3>How Trust Points are Calculated</h3>
          <button className="trust-score-modal-close" onClick={() => setShowRatingInfo(false)}>
            ×
          </button>
        </div>
        <div className="trust-score-modal-content">
          <div className="trust-score-points-breakdown">
            <div className="trust-score-point-item">
              <span className="trust-score-point-value">+10 points</span>
              <span className="trust-score-point-action">Adding a recommendation</span>
            </div>
            <div className="trust-score-point-item">
              <span className="trust-score-point-value">+5 points</span>
              <span className="trust-score-point-action">Joining a community</span>
            </div>
            <div className="trust-score-point-item">
              <span className="trust-score-point-value">+2 points</span>
              <span className="trust-score-point-action">For every follower</span>
            </div>
          </div>
          <p className="trust-score-modal-description">
            Build your trust points by actively participating in the community. 
            Share quality recommendations and connect with others to level up!
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="trust-score-wheel-container">
      <div className="trust-score-card-horizontal">
        {/* Background decoration */}
        <div className="trust-score-bg-decoration" />

        <div className="trust-score-content-horizontal">
          {/* Left side - Progress Circle */}
          <div className="trust-score-circle-section">
            <div className="trust-score-circle-container">
              <svg width="130" height="130" className="trust-score-svg">
                {/* Background circle */}
                <circle
                  cx="65"
                  cy="65"
                  r="60"
                  stroke="#e2e8f0"
                  strokeWidth="10"
                  fill="none"
                  className="trust-score-bg-circle"
                />
                {/* Progress circle */}
                <circle
                  cx="65"
                  cy="65"
                  r="60"
                  stroke="url(#trustGradient)"
                  strokeWidth="10"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="trust-score-progress-circle"
                  transform="rotate(-90 65 65)"
                />
                {/* Gradient definition */}
                <defs>
                  <linearGradient id="trustGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1A365D" />
                    <stop offset="50%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#1A365D" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center content - Total Points */}
              <div className="trust-score-center">
                <div className="trust-score-center-content">
                  <div className="trust-score-total-number">{score}</div>
                  <div className="trust-score-total-label">TOTAL POINTS</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Level Info */}
          <div className="trust-score-info-section">
            <div className="trust-score-level-header">
              <div className="trust-score-icon">
                {getTrustIcon()}
              </div>
              <h3 className="trust-score-level-text">
                Level {level}
              </h3>
            </div>

            <div className="trust-score-stats">
              {pointsToNextLevel > 0 && (
                <div className="trust-score-next-level">
                  {pointsToNextLevel} points to Level {level + 1}
                </div>
              )}
            </div>

            {/* How it's calculated link */}
            <button 
              className="trust-score-info-button"
              onClick={() => setShowRatingInfo(true)}
            >
              <span>ℹ️</span>
              How is this calculated?
            </button>
          </div>
        </div>
      </div>

      {showDebug && (
        <div className="trust-score-debug">
          Debug: Score={score}, Level={level}, Progress={progressPercentage}%
        </div>
      )}

      {showRatingInfo && <RatingInfoModal />}
    </div>
  );
};

export default TrustScoreWheel; 