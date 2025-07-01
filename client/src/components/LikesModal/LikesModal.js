import React from 'react';
import { FaHeart, FaUserCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import './LikesModal.css';

const LikesModal = ({ isOpen, onClose, likers, isLoading, providerName, API_URL }) => {
  if (!isOpen) return null;

  const totalLikes = likers.length;

  return (
    <div className="likes-modal-overlay" onClick={onClose}>
      <div className="likes-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="likes-modal-header">
          <h2 className="likes-modal-title">{providerName}</h2>
          <button className="likes-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="likes-modal-body">
          {totalLikes > 0 && (
            <div className="likes-summary">
              <FaHeart className="likes-heart-icon" />
              <span>
                {totalLikes} {totalLikes === 1 ? 'person has' : 'people have'} liked this recommendation
              </span>
            </div>
          )}

          {isLoading ? (
            <p>Loading...</p>
          ) : likers && likers.length > 0 ? (
            <ul className="likers-list">
              {likers.map((liker) => (
                <li key={liker.id}>
                  <Link to={`/pro/${liker.username}`} className="liker-item">
                    {liker.has_profile_image ? (
                      <img src={`${API_URL}/api/users/${liker.id}/profile/image`} alt={liker.name} className="liker-avatar" />
                    ) : (
                      <FaUserCircle className="liker-avatar-default" />
                    )}
                    <div className="liker-info">
                      <span className="liker-name">{liker.name || liker.preferred_name}</span>
                      <span className="liker-username">@{liker.username}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No one has liked this yet.</p>
          )}

          <div className="like-prompt">
            <FaHeart className="like-prompt-icon" />
            <span>Show your appreciation by liking recommendations you trust</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LikesModal; 