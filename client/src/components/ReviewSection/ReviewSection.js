import React, { useState, useEffect } from 'react';
import './ReviewSection.css';

const ReviewSection = ({ providerId }) => {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, content: '' });

  useEffect(() => {
    // Fetch reviews for this provider
    fetch(`http://localhost:3000/api/providers/${providerId}/reviews`)
      .then(res => res.json())
      .then(data => setReviews(data.reviews))
      .catch(err => console.error('Error fetching reviews:', err));
  }, [providerId]);

  const handleSubmitReview = (e) => {
    e.preventDefault();
    // Add review to database
    fetch(`http://localhost:3000/api/providers/${providerId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newReview),
    })
      .then(res => res.json())
      .then(data => {
        setReviews([...reviews, data.review]);
        setNewReview({ rating: 5, content: '' });
      })
      .catch(err => console.error('Error posting review:', err));
  };

  return (
    <div className="review-section">
      <h2>Reviews</h2>
      
      <div className="write-review">
        <h3>Write a Review</h3>
        <form onSubmit={handleSubmitReview}>
          <div className="rating-select">
            {[5,4,3,2,1].map(num => (
              <button
                key={num}
                type="button"
                className={`rating-star ${newReview.rating >= num ? 'active' : ''}`}
                onClick={() => setNewReview({...newReview, rating: num})}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={newReview.content}
            onChange={(e) => setNewReview({...newReview, content: e.target.value})}
            placeholder="Share your experience..."
            required
          />
          <button type="submit" className="submit-review">Post Review</button>
        </form>
      </div>

      <div className="reviews-list">
        {reviews.map(review => (
          <div key={review.id} className="review-card">
            <div className="review-header">
              <img 
                src={review.user.profile_image || '/default-avatar.png'} 
                alt={review.user.name}
                className="reviewer-image"
              />
              <div className="reviewer-info">
                <h4>{review.user.name}</h4>
                <div className="review-rating">
                  {'★'.repeat(review.rating)}
                  {'☆'.repeat(5-review.rating)}
                </div>
              </div>
              <div className="review-date">
                {new Date(review.created_at).toLocaleDateString()}
              </div>
            </div>
            <p className="review-content">{review.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewSection;
