import { AnimatePresence, motion } from "framer-motion";
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
    <AnimatePresence>
      {showRatingInfo && (
        <div className="trust-score-modal-wrapper">
          <motion.div
            className="trust-score-modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 500 }}
          >
            <div className="trust-score-modal-header">
              <h3>How Trust Score is Calculated</h3>
              <button 
                className="trust-score-modal-close"
                onClick={() => setShowRatingInfo(false)}
              >
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
                Build your trust score by actively participating in the community. 
                Share quality recommendations and connect with others to level up!
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
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
                <motion.circle
                  cx="65"
                  cy="65"
                  r="60"
                  stroke="url(#trustGradient)"
                  strokeWidth="10"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={strokeDasharray}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
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
                <AnimatePresence mode="wait">
                  <motion.div
                    key={score}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.2, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="trust-score-center-content"
                  >
                    <div className="trust-score-total-number">{score}</div>
                    <div className="trust-score-total-label">TOTAL POINTS</div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right side - Level Info */}
          <div className="trust-score-info-section">
            <div className="trust-score-level-header">
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 2, ease: "easeInOut" }}
                className="trust-score-icon"
              >
                {getTrustIcon()}
              </motion.div>
              <AnimatePresence mode="wait">
                <motion.h3
                  key={level}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="trust-score-level-text"
                >
                  Level {level}
                </motion.h3>
              </AnimatePresence>
            </div>

            <div className="trust-score-stats">
              {pointsToNextLevel > 0 && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="trust-score-next-level"
                >
                  {pointsToNextLevel} points to Level {level + 1}
                </motion.div>
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

      <RatingInfoModal />
    </div>
  );
};

export default TrustScoreWheel; 