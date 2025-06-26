import React, { useEffect, useState } from 'react';
import { FaStar } from 'react-icons/fa';
import './ReviewModal.css';

const ReviewModal = ({ isOpen, onClose, onSubmit, provider }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
        setRating(0);
        setHover(0);
        setReview('');
        setTags([]);
        setTagInput('');
        setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rating) {
      setError('Please select a rating');
      return;
    }

    let finalTags = [...tags];
    if (tagInput.trim()) {
      const remainingTags = tagInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag && !finalTags.includes(tag));
      finalTags = [...finalTags, ...remainingTags];
    }
    
    onSubmit({ rating, review, tags: finalTags });
    onClose();
  };

  const handleTagInputChange = (e) => {
    const value = e.target.value;
    if (value.includes(',')) {
      const parts = value.split(',');
      const lastPart = parts.pop();
      const tagsToAdd = parts
        .map(tag => tag.trim())
        .filter(tag => tag && !tags.includes(tag));
      
      if (tagsToAdd.length > 0) {
        setTags([...tags, ...tagsToAdd]);
      }
      setTagInput(lastPart);
    } else {
      setTagInput(value);
    }
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!tagInput.trim()) return;
      
      const newTags = tagInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag && !tags.includes(tag));
      
      if (newTags.length > 0) {
        setTags([...tags, ...newTags]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  if (!isOpen || !provider) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Review {provider.business_name || provider.name}</h2>
        <form onSubmit={handleSubmit}>
          <div className="rating-container">
            <label>Rate your experience: <span className="required">*</span></label>
            <div className="stars">
              {[...Array(5)].map((_, index) => (
                <FaStar
                  key={index}
                  className={index < (hover || rating) ? 'star active' : 'star'}
                  onClick={() => setRating(index + 1)}
                  onMouseEnter={() => setHover(index + 1)}
                  onMouseLeave={() => setHover(rating)}
                />
              ))}
            </div>
            {error && <div className="error-message">{error}</div>}
          </div>
          <div className="review-input">
            <label>Tell us about your experience:</label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Optional: Share your thoughts..."
              rows={4}
            />
          </div>
          <div className="tag-input-group">
            <label>Add tags (press Enter or , to add):</label>
            <input
              type="text"
              value={tagInput}
              onChange={handleTagInputChange}
              onKeyDown={handleTagKeyDown}
              placeholder="e.g. fast, professional"
            />
            <div className="tag-container modal-tag-container">
              {tags.map((tag, idx) => (
                <span key={idx} className="tag-badge">
                  {tag}
                  <span className="remove-tag" onClick={() => removeTag(tag)}>×</span>
                </span>
              ))}
            </div>
          </div>
          <div className="modal-buttons">
            <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
            <button type="submit" className="submit-button">Submit Review</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal; 