// src/pages/ShareRecommendation/ShareRecommendation.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ShareRecommendation.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = 'http://localhost:3000';

// primary service types
const serviceTypes = [
  { label: 'Home Service', value: 'Home Services' },
  { label: 'Financial Service', value: 'Financial Services' },
  { label: 'Auto Service', value: 'Auto Services' },
];

// subcategories for home and financial
const homeSubcats = [
  'Repair Services',
  'Cleaning Services',
  'Home Renovation',
  'Outdoor Services',
  'Moving Services',
];
const financialSubcats = [
  'Tax Preparation',
  'Financial Planning',
];

const totalSteps = 7;

export default function ShareRecommendation() {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('userEmail');

  // redirect if not logged in
  useEffect(() => {
    if (!userEmail) navigate('/login');
  }, [userEmail, navigate]);

  // form + UI state
  const [activeTab, setActiveTab]     = useState('single');
  const [serviceType, setServiceType] = useState('');
  const [form, setForm] = useState({
    category: '',
    subcategory: '',
    business_name: '',
    business_contact: '',
    email: '',
    phone_number: '',
    website: '',
    price_exact: '',
    price_paid:  '',
    description: '',
    recommender_message: '',
    rating: 0,
    tags: [],
    user_email: userEmail
  });
  const [tagInput, setTagInput]       = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage]         = useState('');

  // compute available subcats based on serviceType
  const subcats = serviceType === 'Home Services'
    ? homeSubcats
    : serviceType === 'Financial Services'
      ? financialSubcats
      : [];

  // determine current step for progress bar
  const currentStep = (() => {
    if (!serviceType)                   return 1;
    if (!form.subcategory)               return 2;
    if (!form.business_name)             return 3;
    if (!form.price_tier && !form.price_exact) return 4;
    if (!form.description)               return 5;
    if (!form.experience)                return 6;
    if (form.rating === 0)               return 7;
    return 7;
  })();
  const percent = Math.round((currentStep / totalSteps) * 100);

  // handlers
  const handleTabClick = (tab) => {
    if (tab === 'csv') {
      alert("We're getting ready to deploy this feature. Stay tuned!");
      return;
    }
    setActiveTab('single');
  };

  const handleServiceSelect = (value) => {
    setServiceType(value);
    setForm(f => ({
      ...f,
      category: value,
      // auto‐assign subcategory for Auto Services
      subcategory: value === 'Auto Services' ? value : ''
    }));
  };

  const handleSubcatSelect = (sub) => {
    setForm(f => ({ ...f, subcategory: sub }));
  };

  const handleChange = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
  };

  const handleTier = (tier) => {
    setForm(f => ({ ...f, price_tier: tier }));
  };

  const handleStarClick = (n) => {
    setForm(f => ({ ...f, rating: n }));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = tagInput.trim();
      if (trimmed && !form.tags.includes(trimmed)) {
        setForm(f => ({ ...f, tags: [...f.tags, trimmed] }));
      }
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));
  };

  const payload = {
    ...form,
    price_paid: form.price_exact || null,
  };
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      setMessage('success');
      setTimeout(() => navigate('/'), 2000);
    } catch {
      setMessage('error');
    }
  };

  return (
    <div className="recommendation-wrapper">
      <div className="recommendation-container">

        {/* tabs */}
        <div className="tabs">
          <div
            className={activeTab === 'single' ? 'tab tab-active' : 'tab'}
            onClick={() => handleTabClick('single')}
          >
            Single Recommendation
          </div>
          <div
            className={activeTab === 'csv' ? 'tab tab-active' : 'tab'}
            onClick={() => handleTabClick('csv')}
          >
            CSV Import
          </div>
        </div>

        {/* progress */}
        <div className="progress-bar">
          <div className="progress" style={{ width: `${percent}%` }} />
        </div>

        {activeTab === 'single' && (
          <form onSubmit={handleSubmit}>

            {/* Step 1 */}
            <section className="form-section">
              <h2>1. Choose Service Type</h2>
              <div className="options">
                {serviceTypes.map((svc,i) => (
                  <button
                    key={svc.value}
                    type="button"
                    className={`option ${serviceType === svc.value ? 'selected' : ''}`}
                    style={{ animationDelay: `${i * 0.1}s` }}
                    onClick={() => handleServiceSelect(svc.value)}
                  >
                    {svc.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Step 2 (only if there are subcats) */}
            {subcats.length > 0 && (
              <section className="form-section">
                <h2>2. Select Specific Service</h2>
                <div className="options">
                  {subcats.map((sub,i) => (
                    <button
                      key={sub}
                      type="button"
                      className={`option ${form.subcategory === sub ? 'selected' : ''}`}
                      style={{ animationDelay: `${i * 0.1}s` }}
                      onClick={() => handleSubcatSelect(sub)}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Step 3 */}
            {form.subcategory && (
              <section className="form-section">
                <h2>3. Business Information</h2>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Business Name"
                    value={form.business_name}
                    onChange={handleChange('business_name')}
                    required
                  />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Business Contact"
                    value={form.business_contact}
                    onChange={handleChange('business_contact')}
                    required
                  />
                </div>
                <div className="form-group">
                  <input
                    type="email"
                    placeholder="Business Email (optional)"
                    value={form.email}
                    onChange={handleChange('email')}
                  />
                </div>
                <div className="form-group">
                  <input
                    type="tel"
                    placeholder="Business Phone (optional)"
                    value={form.phone_number}
                    onChange={handleChange('phone_number')}
                  />
                </div>
                <div className="form-group">
                  <input
                    type="url"
                    placeholder="Website (optional)"
                    value={form.website}
                    onChange={handleChange('website')}
                  />
                </div>
              </section>
            )}

            {/* Step 4 */}
            {form.business_name && (
              <section className="form-section">
                <h2>4. Price</h2>

                {/* Tier buttons (unchanged) */}
                <div className="price-tier-buttons">
                  {['$', '$$', '$$$'].map(t => (
                    <button
                      key={t}
                      type="button"
                      className={form.price_tier === t ? 'selected' : ''}
                      onClick={() => setForm(f => ({ ...f, price_tier: t }))}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Exact price input */}
                <div className="form-group">
                  <label>Exact price paid (optional)</label>
                  <input
                    type="number"
                    placeholder="e.g. 125.50"
                    value={form.price_exact}
                    onChange={e => setForm(f => ({ ...f, price_exact: e.target.value }))}
                    min="0"
                    step="0.01"
                  />
                </div>
              </section>
            )}

            {/* Step 5 */}
            {form.price_tier && (
              <section className="form-section">
                <h2>5. Description</h2>
                <div className="form-group">
                  <textarea
                    placeholder="What does this provider do?"
                    value={form.description}
                    onChange={handleChange('description')}
                    required
                  />
                </div>
              </section>
            )}

            {/* Step 6 */}
            {form.description && (
              <section className="form-section">
                <h2>6. Your Experience</h2>
                <div className="form-group">
                  <textarea
                    placeholder="How was your experience?"
                    value={form.recommender_message}
                    onChange={handleChange('recommender_message')}
                    required
                  />
                </div>
              </section>
            )}

            {/* Step 7 */}
            {form.recommender_message && (
              <section className="form-section">
                <h2>7. Rating & Tags</h2>
                <div className="star-rating">
                  {[1,2,3,4,5].map(n => (
                    <span
                      key={n}
                      className={n <= (hoverRating || form.rating) ? 'star selected' : 'star'}
                      onClick={() => handleStarClick(n)}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <div className="tag-input-group">
                  <label>Add tags (press Enter):</label>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="e.g. fast, professional"
                  />
                  <div className="tag-container">
                    {form.tags.map((tag,i) => (
                      <span key={i} className="tag-pill">
                        {tag}
                        <span className="remove-tag" onClick={() => removeTag(tag)}>×</span>
                      </span>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Submit */}
            {form.rating > 0 && (
              <div className="button-row">
                <button type="submit" className="btn btn-primary">
                  Share Recommendation
                </button>
              </div>
            )}

            {message && (
              <div className={`message ${message}`}>
                {message === 'success'
                  ? 'Recommendation submitted successfully!'
                  : 'There was an issue. Please try again.'}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}