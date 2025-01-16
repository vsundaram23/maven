// CommentModal.js
import React, { useState, useEffect } from 'react';
import { FaComment, FaTimes, FaUser } from 'react-icons/fa';
import './CommentModal.css';

const CommentModal = ({ isOpen, onClose, provider }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/reviews/${provider.id}`);
        const data = await response.json();
        setReviews(data);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchReviews();
    }
  }, [isOpen, provider.id]);

  if (!isOpen) return null;

  return (
    <div className="comment-modal-overlay">
      <div className="comment-modal-content">
        <div className="comment-modal-header">
          <h2>Reviews for {provider.business_name}</h2>
          <FaTimes className="close-icon" onClick={onClose} />
        </div>
        <div className="comments-container">
          {loading ? (
            <div className="loading">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="no-reviews">No reviews yet</div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="comment-card">
                <div className="comment-header">
                  <div className="user-info">
                    <FaUser className="user-icon" />
                    <span className="username">{review.user_name}</span>
                  </div>
                  <div className="review-date">
                    {new Date(review.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="rating">
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                </div>
                <div className="comment-content">{review.content}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentModal;
