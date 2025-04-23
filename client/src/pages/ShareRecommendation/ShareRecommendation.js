// src/pages/ShareRecommendation/ShareRecommendation.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ShareRecommendation.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';

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
    contact: '',
    email: '',
    phone_number: '',
    website: '',
    price_tier: '',
    price_exact: '',
    description: '',
    experience: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
                    value={form.contact}
                    onChange={handleChange('contact')}
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
                <div className="price-tier-buttons">
                  {['$', '$$', '$$$'].map(t => (
                    <button
                      key={t}
                      type="button"
                      className={form.price_tier === t ? 'selected' : ''}
                      onClick={() => handleTier(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  className="price-input"
                  placeholder="Exact price (optional)"
                  value={form.price_exact}
                  onChange={handleChange('price_exact')}
                  min="0"
                  step="0.01"
                />
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
                    value={form.experience}
                    onChange={handleChange('experience')}
                    required
                  />
                </div>
              </section>
            )}

            {/* Step 7 */}
            {form.experience && (
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



// working 4/23
// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import './ShareRecommendation.css';

// const API_URL = 'https://api.seanag-recommendations.org:8080';

// const categories = {
//   'Home Services': [
//     { name: 'Appliances', backend: 'Appliance Services' },
//     { name: 'Cleaning', backend: 'Cleaning and Upkeep' },
//     { name: 'Utilities', backend: 'Utilities' },
//     { name: 'Repairs', backend: 'Structural Repairs' },
//     { name: 'Outdoor', backend: 'Outdoor Services' },
//     { name: 'Moving and Misc', backend: 'Moving and Misc' },
//   ],
//   'Financial Services': [
//     { name: 'Tax Preparation', backend: 'Tax Preparation' },
//     { name: 'Financial Planning', backend: 'Financial Planning' },
//   ]
// };

// const ShareRecommendation = () => {
//   const navigate = useNavigate();
//   const [form, setForm] = useState({
//     business_name: '',
//     email: '',
//     phone_number: '',
//     category: '',
//     subcategory: '',
//     description: '',
//     user_email: localStorage.getItem('userEmail') || ''
//   });
//   const [message, setMessage] = useState('');

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setMessage('');

//     try {
//       const response = await fetch(`${API_URL}/api/recommendations`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(form)
//       });

//       if (!response.ok) throw new Error('Failed to add recommendation');

//       setMessage('Recommendation submitted successfully!');
//       setTimeout(() => navigate('/'), 2000);
//     } catch (error) {
//       console.error('Error:', error);
//       setMessage('There was an issue. Please try again.');
//     }
//   };

//   return (
//     <div className="recommendation-wrapper">
//       <div className="recommendation-card">
//         <h1>Share a Trusted Recommendation</h1>
//         <p>Help others by recommending someone you've worked with and trust.</p>
//         <form onSubmit={handleSubmit}>
//           <input
//             type="text"
//             placeholder="Business Name"
//             value={form.business_name}
//             onChange={(e) => setForm({ ...form, business_name: e.target.value })}
//             required
//           />
//           <input
//             type="email"
//             placeholder="Business Email"
//             value={form.email}
//             onChange={(e) => setForm({ ...form, email: e.target.value })}
//             required
//           />
//           <input
//             type="tel"
//             placeholder="Phone Number"
//             value={form.phone_number}
//             onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
//             required
//           />
//           <textarea
//             placeholder="What did you think?"
//             value={form.description}
//             onChange={(e) => setForm({ ...form, description: e.target.value })}
//           />
//           <select
//             value={form.category}
//             onChange={(e) => setForm({ ...form, category: e.target.value, subcategory: '' })}
//             required
//           >
//             <option value="">Select Category</option>
//             {Object.keys(categories).map((cat) => (
//               <option key={cat} value={cat}>{cat}</option>
//             ))}
//           </select>
//           {form.category && (
//             <select
//               value={form.subcategory}
//               onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
//               required
//             >
//               <option value="">Select Subcategory</option>
//               {categories[form.category].map((sub) => (
//                 <option key={sub.backend} value={sub.backend}>{sub.name}</option>
//               ))}
//             </select>
//           )}
//           <button type="submit">Submit Recommendation</button>
//           {message && <div className="submit-message">{message}</div>}
//         </form>
//       </div>
//     </div>
//   );
// };

// export default ShareRecommendation;