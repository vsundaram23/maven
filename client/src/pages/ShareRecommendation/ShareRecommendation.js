import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ShareRecommendation.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';

const categories = {
  'Home Services': [
    { name: 'Appliances', backend: 'Appliance Services' },
    { name: 'Cleaning', backend: 'Cleaning and Upkeep' },
    { name: 'Utilities', backend: 'Utilities' },
    { name: 'Repairs', backend: 'Structural Repairs' },
    { name: 'Outdoor', backend: 'Outdoor Services' },
    { name: 'Moving and Misc', backend: 'Moving and Misc' },
  ],
  'Financial Services': [
    { name: 'Tax Preparation', backend: 'Tax Preparation' },
    { name: 'Financial Planning', backend: 'Financial Planning' },
  ]
};

const ShareRecommendation = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    business_name: '',
    email: '',
    phone_number: '',
    category: '',
    subcategory: '',
    description: '',
    user_email: localStorage.getItem('userEmail') || ''
  });
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/api/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (!response.ok) throw new Error('Failed to add recommendation');

      setMessage('Recommendation submitted successfully!');
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      console.error('Error:', error);
      setMessage('There was an issue. Please try again.');
    }
  };

  return (
    <div className="recommendation-wrapper">
      <div className="recommendation-card">
        <h1>Share a Trusted Recommendation</h1>
        <p>Help others by recommending someone you've worked with and trust.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Business Name"
            value={form.business_name}
            onChange={(e) => setForm({ ...form, business_name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Business Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="tel"
            placeholder="Phone Number"
            value={form.phone_number}
            onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            required
          />
          <textarea
            placeholder="What did you think?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value, subcategory: '' })}
            required
          >
            <option value="">Select Category</option>
            {Object.keys(categories).map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {form.category && (
            <select
              value={form.subcategory}
              onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
              required
            >
              <option value="">Select Subcategory</option>
              {categories[form.category].map((sub) => (
                <option key={sub.backend} value={sub.backend}>{sub.name}</option>
              ))}
            </select>
          )}
          <button type="submit">Submit Recommendation</button>
          {message && <div className="submit-message">{message}</div>}
        </form>
      </div>
    </div>
  );
};

export default ShareRecommendation;