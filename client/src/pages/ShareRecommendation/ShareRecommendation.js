import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { StarIcon as OutlineStarIcon, TagIcon, GlobeAltIcon, PhoneIcon, UsersIcon, UserCircleIcon, SparklesIcon, DocumentTextIcon, CheckCircleIcon, XCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { StarIcon as SolidStarIcon } from '@heroicons/react/24/solid';
import './ShareRecommendation.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';
const INTRO_TEXT = "Share trusted recommendations with your circle. Let's add one now...";
const TYPEWRITER_SPEED = 40;

const PUBLISH_OPTIONS = [
  { value: 'Full Trust Circle', label: 'Entire Trust Circle', icon: UsersIcon },
  { value: 'Specific Trust Circles', label: 'Specific Trust Circles', icon: UserCircleIcon }, // Changed icon
  { value: 'Public', label: 'Public', icon: GlobeAltIcon },
];

// Placeholder - replace with actual data fetching
const MOCK_TRUST_CIRCLES = [
  { id: 'tc1', name: 'Family' },
  { id: 'tc2', name: 'Close Friends' },
  { id: 'tc3', name: 'Work Colleagues - Tech' },
  { id: 'tc4', name: 'Neighborhood Group' },
];

const StarDisplay = ({ active, onClick, onMouseEnter, onMouseLeave }) => {
  if (active) {
    return <SolidStarIcon className="star-icon filled" onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} aria-hidden="true" />;
  }
  return <OutlineStarIcon className="star-icon" onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} aria-hidden="true" />;
};


export default function ShareRecommendation() {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('userEmail');

  const [mode, setMode] = useState('single');
  const [typewriterText, setTypewriterText] = useState('');
  const [typewriterIndex, setTypewriterIndex] = useState(0);

  const [businessName, setBusinessName] = useState('');
  const [providerContactName, setProviderContactName] = useState(''); // New state
  const [recommendationBlurb, setRecommendationBlurb] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [website, setWebsite] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [publishScope, setPublishScope] = useState('Full Trust Circle');
  const [selectedTrustCircles, setSelectedTrustCircles] = useState([]); // New state
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userTrustCircles, setUserTrustCircles] = useState(MOCK_TRUST_CIRCLES); // New state for actual circles


  useEffect(() => { if (!userEmail) navigate('/login'); }, [userEmail, navigate]);
  useEffect(() => { setTypewriterIndex(0); setTypewriterText(''); }, [mode]);
  useEffect(() => {
     if (mode === 'single' && typewriterIndex < INTRO_TEXT.length) {
      const timeoutId = setTimeout(() => { setTypewriterText((prev) => prev + INTRO_TEXT.charAt(typewriterIndex)); setTypewriterIndex((prev) => prev + 1); }, TYPEWRITER_SPEED);
      return () => clearTimeout(timeoutId);
    }
     if(typewriterIndex >= INTRO_TEXT.length) {
        const cursor = document.querySelector('#share-recommendation-page .intro-typewriter .cursor');
        if (cursor) cursor.style.animation = 'none';
     }
  }, [typewriterIndex, mode]);

  const requiredFieldsComplete = businessName && recommendationBlurb && rating > 0;

  const handleStarClick = (n) => setRating(n);
  const handleTagKeyDown = (e) => { if (e.key === 'Enter' && tagInput.trim()) { e.preventDefault(); const newTag = tagInput.trim().toLowerCase(); if (newTag && !tags.includes(newTag)) { setTags(prevTags => [...prevTags, newTag]); } setTagInput(''); } };
  const removeTag = (tagToRemove) => { setTags(prevTags => prevTags.filter(tag => tag !== tagToRemove)); };

  const handlePublishScopeChange = (e) => {
    setPublishScope(e.target.value);
    if (e.target.value !== 'Specific Trust Circles') {
      setSelectedTrustCircles([]);
    }
  };

  const handleTrustCircleToggle = (circleId) => {
    setSelectedTrustCircles(prev =>
      prev.includes(circleId) ? prev.filter(id => id !== circleId) : [...prev, circleId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requiredFieldsComplete || isSubmitting) return;
    if (publishScope === 'Specific Trust Circles' && selectedTrustCircles.length === 0) {
      setMessage('error:Please select at least one specific trust circle to share with.');
      return;
    }
    setIsSubmitting(true);
    setMessage('');
    const payload = {
      user_email: userEmail,
      business_name: businessName,
      provider_contact_name: providerContactName || null,
      recommender_message: recommendationBlurb,
      rating: rating,
      website: website || null,
      phone_number: phoneNumber || null,
      tags: tags,
      publish_scope: publishScope,
      ...(publishScope === 'Specific Trust Circles' && { trust_circle_ids: selectedTrustCircles }),
    };
    try {
      const res = await fetch(`${API_URL}/api/recommendations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const errorData = await res.json().catch(() => ({ message: 'Network or server error' })); throw new Error(errorData.message || `Request failed with status ${res.status}`); }
      setMessage("success:Recommendation submitted for review successfully! You'll be notified when it has been posted. Redirecting...");
      setTimeout(() => navigate('/'), 2500);
    } catch (error) { console.error("Submission Error:", error); setMessage(`error: ${error.message}`); setIsSubmitting(false); }
  };

  const renderSingleForm = () => (
    <>
      <div className="intro-typewriter"><SparklesIcon className="intro-icon" /><p>{typewriterText}<span className="cursor"></span></p></div>
      <form onSubmit={handleSubmit} className="recommendation-form">
        <section className="form-section required-section">
          <h2 className="section-title"><span className="section-number">1</span>Core Recommendation</h2>
          <div className="form-grid">
            <div className="form-group span-2"><label htmlFor="businessName">Service Provider Name *</label><input id="businessName" type="text" placeholder="e.g., Stellar Plumbing Co." value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className={businessName ? 'has-value' : ''} /></div>
            <div className="form-group span-2"><label htmlFor="recommendationBlurb">Your Experience *</label><textarea id="recommendationBlurb" placeholder="What made them great? (Service used, timing, price thoughts, etc.)" value={recommendationBlurb} onChange={(e) => setRecommendationBlurb(e.target.value)} required rows={5} className={recommendationBlurb ? 'has-value' : ''} /></div>
            <div className="form-group span-2 rating-group"><label>Your Rating *</label><div className="star-rating">{[1, 2, 3, 4, 5].map(n => (<StarDisplay key={n} active={n <= (hoverRating || rating)} onClick={() => handleStarClick(n)} onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(0)} />))}</div></div>
          </div>
        </section>
        <div className={`optional-section-wrapper ${requiredFieldsComplete ? 'visible' : ''}`}>
          <div className="optional-section-intro"><SparklesIcon className="intro-icon mini"/> Nicely done! Add extra details? (Optional)</div>
          <section className="form-section optional-section">
            <h2 className="section-title"><span className="section-number">2</span>Additional Info</h2>
            <div className="form-grid">
              <div className="form-group"><label htmlFor="providerContactName"><UserCircleIcon/> Provider Contact Name</label><input id="providerContactName" type="text" placeholder="e.g., Jane Doe" value={providerContactName} onChange={(e) => setProviderContactName(e.target.value)} className={providerContactName ? 'has-value' : ''} /></div>
              <div className="form-group"><label htmlFor="website"><GlobeAltIcon/> Website</label><input id="website" type="url" placeholder="https://provider.com" value={website} onChange={(e) => setWebsite(e.target.value)} className={website ? 'has-value' : ''} /></div>
              <div className="form-group span-2"><label htmlFor="phoneNumber"><PhoneIcon/> Phone Number</label><input id="phoneNumber" type="tel" placeholder="(555) 123-4567" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className={phoneNumber ? 'has-value' : ''} /></div>
              <div className="form-group span-2 tag-input-group"><label htmlFor="tags"><TagIcon/> Tags (Press Enter)</label><input id="tags" type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="e.g., reliable, fast, good value" /><div className="tag-container">{tags.map((tag, i) => (<span key={i} className="tag-pill">{tag}<span className="remove-tag" onClick={() => removeTag(tag)}>×</span></span>))}</div></div>
            </div>
          </section>
          <section className="form-section publish-section">
            <h2 className="section-title"><span className="section-number">3</span>Share With</h2>
            <div className="publish-options-grid">{PUBLISH_OPTIONS.map(option => (<label key={option.value} className={`publish-option ${publishScope === option.value ? 'selected' : ''}`}><input type="radio" name="publishScope" value={option.value} checked={publishScope === option.value} onChange={handlePublishScopeChange} className="sr-only" /><option.icon className="publish-icon" /><span>{option.label}</span>{publishScope === option.value && <CheckCircleIcon className="selected-check"/>}</label>))}</div>
            {publishScope === 'Specific Trust Circles' && (
              <div className="trust-circle-select-wrapper">
                <label htmlFor="trustCircleSelect" className="trust-circle-label">Select specific circles:</label>
                <div className="trust-circle-checkbox-group">
                  {userTrustCircles.map(circle => (
                    <label key={circle.id} className="trust-circle-checkbox-item">
                      <input type="checkbox" value={circle.id} checked={selectedTrustCircles.includes(circle.id)} onChange={() => handleTrustCircleToggle(circle.id)} />
                      <span>{circle.name}</span>
                    </label>
                  ))}
                  {userTrustCircles.length === 0 && <p className="no-trust-circles-message">You don't have any specific trust circles yet. Create one in your profile!</p>}
                </div>
              </div>
            )}
          </section>
          <div className="button-row"><button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Sharing...' : 'Share Recommendation'}<CheckCircleIcon /></button></div>
        </div>
        {message && (<div className={`message ${message.startsWith('error') ? 'error' : 'success'} ${message ? 'visible' : ''}`}>{message.startsWith('error') ? <XCircleIcon /> : <CheckCircleIcon />}<span>{message.substring(message.indexOf(':') + 1)}</span></div>)}
      </form>
    </>
  );

  const renderCsvImport = () => ( <div className="csv-import-section"> <DocumentTextIcon className="csv-icon" /> <h2>Import Recommendations via CSV</h2> <p>This feature is coming soon! Prepare your CSV file with columns like: </p> <code>Business Name, Your Experience, Rating (1-5), Provider Contact Name (Optional), Website (Optional), Phone (Optional), Tags (comma-separated, Optional), Publish Scope (Public/Specific Trust Circles/Entire Trust Circle, Optional), Trust Circle IDs (comma-separated if Specific Trust Circles, Optional)</code> <div className="form-group"><label htmlFor="csvFile" className="btn btn-secondary">Choose CSV File (Coming Soon)</label><input type="file" id="csvFile" accept=".csv" disabled style={{ display: 'none' }} /></div> </div> );

  return (
    <div id="share-recommendation-page">
      <div className="recommendation-wrapper modern-ui">
        <div className="recommendation-container">
          <div className="mode-switcher">
            <button className={`mode-button ${mode === 'single' ? 'active' : ''}`} onClick={() => setMode('single')}><SparklesIcon /> Add Single</button>
            <button className={`mode-button ${mode === 'csv' ? 'active' : ''}`} onClick={() => setMode('csv')}><DocumentTextIcon /> Import CSV</button>
          </div>
          {mode === 'single' ? renderSingleForm() : renderCsvImport()}
        </div>
      </div>
    </div>
  );
}

// // src/pages/ShareRecommendation/ShareRecommendation.js

// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import './ShareRecommendation.css';

// const API_URL = 'https://api.seanag-recommendations.org:8080';
// // const API_URL = 'http://localhost:3000';

// // primary service types
// const serviceTypes = [
//   { label: 'Home Service', value: 'Home Services' },
//   { label: 'Financial Service', value: 'Financial Services' },
//   { label: 'Auto Service', value: 'Auto Services' },
// ];

// // subcategories for home and financial
// const homeSubcats = [
//   'Repair Services',
//   'Cleaning Services',
//   'Home Renovation',
//   'Outdoor Services',
//   'Moving Services',
// ];
// const financialSubcats = [
//   'Tax Preparation',
//   'Financial Planning',
// ];

// const totalSteps = 7;

// export default function ShareRecommendation() {
//   const navigate = useNavigate();
//   const userEmail = localStorage.getItem('userEmail');

//   // redirect if not logged in
//   useEffect(() => {
//     if (!userEmail) navigate('/login');
//   }, [userEmail, navigate]);

//   // form + UI state
//   const [activeTab, setActiveTab]     = useState('single');
//   const [serviceType, setServiceType] = useState('');
//   const [form, setForm] = useState({
//     category: '',
//     subcategory: '',
//     business_name: '',
//     business_contact: '',
//     email: '',
//     phone_number: '',
//     website: '',
//     price_exact: '',
//     price_paid:  '',
//     description: '',
//     recommender_message: '',
//     rating: 0,
//     tags: [],
//     user_email: userEmail
//   });
//   const [tagInput, setTagInput]       = useState('');
//   const [hoverRating, setHoverRating] = useState(0);
//   const [message, setMessage]         = useState('');

//   // compute available subcats based on serviceType
//   const subcats = serviceType === 'Home Services'
//     ? homeSubcats
//     : serviceType === 'Financial Services'
//       ? financialSubcats
//       : [];

//   // determine current step for progress bar
//   const currentStep = (() => {
//     if (!serviceType)                   return 1;
//     if (!form.subcategory)               return 2;
//     if (!form.business_name)             return 3;
//     if (!form.price_tier && !form.price_exact) return 4;
//     if (!form.description)               return 5;
//     if (!form.experience)                return 6;
//     if (form.rating === 0)               return 7;
//     return 7;
//   })();
//   const percent = Math.round((currentStep / totalSteps) * 100);

//   // handlers
//   const handleTabClick = (tab) => {
//     if (tab === 'csv') {
//       alert("We're getting ready to deploy this feature. Stay tuned!");
//       return;
//     }
//     setActiveTab('single');
//   };

//   const handleServiceSelect = (value) => {
//     setServiceType(value);
//     setForm(f => ({
//       ...f,
//       category: value,
//       // auto‐assign subcategory for Auto Services
//       subcategory: value === 'Auto Services' ? value : ''
//     }));
//   };

//   const handleSubcatSelect = (sub) => {
//     setForm(f => ({ ...f, subcategory: sub }));
//   };

//   const handleChange = (field) => (e) => {
//     setForm(f => ({ ...f, [field]: e.target.value }));
//   };

//   const handleTier = (tier) => {
//     setForm(f => ({ ...f, price_tier: tier }));
//   };

//   const handleStarClick = (n) => {
//     setForm(f => ({ ...f, rating: n }));
//   };

//   const handleTagKeyDown = (e) => {
//     if (e.key === 'Enter') {
//       e.preventDefault();
//       const trimmed = tagInput.trim();
//       if (trimmed && !form.tags.includes(trimmed)) {
//         setForm(f => ({ ...f, tags: [...f.tags, trimmed] }));
//       }
//       setTagInput('');
//     }
//   };

//   const removeTag = (tag) => {
//     setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));
//   };

//   const payload = {
//     ...form,
//     price_paid: form.price_exact || null,
//   };
  

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setMessage('');
//     try {
//       const res = await fetch(`${API_URL}/api/recommendations`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//       });
//       if (!res.ok) throw new Error();
//       setMessage('success');
//       setTimeout(() => navigate('/'), 2000);
//     } catch {
//       setMessage('error');
//     }
//   };

//   return (
//     <div className="recommendation-wrapper">
//       <div className="recommendation-container">

//         {/* tabs */}
//         <div className="tabs">
//           <div
//             className={activeTab === 'single' ? 'tab tab-active' : 'tab'}
//             onClick={() => handleTabClick('single')}
//           >
//             Single Recommendation
//           </div>
//           <div
//             className={activeTab === 'csv' ? 'tab tab-active' : 'tab'}
//             onClick={() => handleTabClick('csv')}
//           >
//             CSV Import
//           </div>
//         </div>

//         {/* progress */}
//         <div className="progress-bar">
//           <div className="progress" style={{ width: `${percent}%` }} />
//         </div>

//         {activeTab === 'single' && (
//           <form onSubmit={handleSubmit}>

//             {/* Step 1 */}
//             <section className="form-section">
//               <h2>1. Choose Service Type</h2>
//               <div className="options">
//                 {serviceTypes.map((svc,i) => (
//                   <button
//                     key={svc.value}
//                     type="button"
//                     className={`option ${serviceType === svc.value ? 'selected' : ''}`}
//                     style={{ animationDelay: `${i * 0.1}s` }}
//                     onClick={() => handleServiceSelect(svc.value)}
//                   >
//                     {svc.label}
//                   </button>
//                 ))}
//               </div>
//             </section>

//             {/* Step 2 (only if there are subcats) */}
//             {subcats.length > 0 && (
//               <section className="form-section">
//                 <h2>2. Select Specific Service</h2>
//                 <div className="options">
//                   {subcats.map((sub,i) => (
//                     <button
//                       key={sub}
//                       type="button"
//                       className={`option ${form.subcategory === sub ? 'selected' : ''}`}
//                       style={{ animationDelay: `${i * 0.1}s` }}
//                       onClick={() => handleSubcatSelect(sub)}
//                     >
//                       {sub}
//                     </button>
//                   ))}
//                 </div>
//               </section>
//             )}

//             {/* Step 3 */}
//             {form.subcategory && (
//               <section className="form-section">
//                 <h2>3. Business Information</h2>
//                 <div className="form-group">
//                   <input
//                     type="text"
//                     placeholder="Business Name"
//                     value={form.business_name}
//                     onChange={handleChange('business_name')}
//                     required
//                   />
//                 </div>
//                 <div className="form-group">
//                   <input
//                     type="text"
//                     placeholder="Business Contact"
//                     value={form.business_contact}
//                     onChange={handleChange('business_contact')}
//                     required
//                   />
//                 </div>
//                 <div className="form-group">
//                   <input
//                     type="email"
//                     placeholder="Business Email (optional)"
//                     value={form.email}
//                     onChange={handleChange('email')}
//                   />
//                 </div>
//                 <div className="form-group">
//                   <input
//                     type="tel"
//                     placeholder="Business Phone (optional)"
//                     value={form.phone_number}
//                     onChange={handleChange('phone_number')}
//                   />
//                 </div>
//                 <div className="form-group">
//                   <input
//                     type="url"
//                     placeholder="Website (optional)"
//                     value={form.website}
//                     onChange={handleChange('website')}
//                   />
//                 </div>
//               </section>
//             )}

//             {/* Step 4 */}
//             {form.business_name && (
//               <section className="form-section">
//                 <h2>4. Price</h2>

//                 {/* Tier buttons (unchanged) */}
//                 <div className="price-tier-buttons">
//                   {['$', '$$', '$$$'].map(t => (
//                     <button
//                       key={t}
//                       type="button"
//                       className={form.price_tier === t ? 'selected' : ''}
//                       onClick={() => setForm(f => ({ ...f, price_tier: t }))}
//                     >
//                       {t}
//                     </button>
//                   ))}
//                 </div>

//                 {/* Exact price input */}
//                 <div className="form-group">
//                   <label>Exact price paid (optional)</label>
//                   <input
//                     type="number"
//                     placeholder="e.g. 125.50"
//                     value={form.price_exact}
//                     onChange={e => setForm(f => ({ ...f, price_exact: e.target.value }))}
//                     min="0"
//                     step="0.01"
//                   />
//                 </div>
//               </section>
//             )}

//             {/* Step 5 */}
//             {form.price_tier && (
//               <section className="form-section">
//                 <h2>5. Description</h2>
//                 <div className="form-group">
//                   <textarea
//                     placeholder="What does this provider do?"
//                     value={form.description}
//                     onChange={handleChange('description')}
//                     required
//                   />
//                 </div>
//               </section>
//             )}

//             {/* Step 6 */}
//             {form.description && (
//               <section className="form-section">
//                 <h2>6. Your Experience</h2>
//                 <div className="form-group">
//                   <textarea
//                     placeholder="How was your experience?"
//                     value={form.recommender_message}
//                     onChange={handleChange('recommender_message')}
//                     required
//                   />
//                 </div>
//               </section>
//             )}

//             {/* Step 7 */}
//             {form.recommender_message && (
//               <section className="form-section">
//                 <h2>7. Rating & Tags</h2>
//                 <div className="star-rating">
//                   {[1,2,3,4,5].map(n => (
//                     <span
//                       key={n}
//                       className={n <= (hoverRating || form.rating) ? 'star selected' : 'star'}
//                       onClick={() => handleStarClick(n)}
//                       onMouseEnter={() => setHoverRating(n)}
//                       onMouseLeave={() => setHoverRating(0)}
//                     >
//                       ★
//                     </span>
//                   ))}
//                 </div>
//                 <div className="tag-input-group">
//                   <label>Add tags (press Enter):</label>
//                   <input
//                     type="text"
//                     value={tagInput}
//                     onChange={e => setTagInput(e.target.value)}
//                     onKeyDown={handleTagKeyDown}
//                     placeholder="e.g. fast, professional"
//                   />
//                   <div className="tag-container">
//                     {form.tags.map((tag,i) => (
//                       <span key={i} className="tag-pill">
//                         {tag}
//                         <span className="remove-tag" onClick={() => removeTag(tag)}>×</span>
//                       </span>
//                     ))}
//                   </div>
//                 </div>
//               </section>
//             )}

//             {/* Submit */}
//             {form.rating > 0 && (
//               <div className="button-row">
//                 <button type="submit" className="btn btn-primary">
//                   Share Recommendation
//                 </button>
//               </div>
//             )}

//             {message && (
//               <div className={`message ${message}`}>
//                 {message === 'success'
//                   ? 'Recommendation submitted successfully!'
//                   : 'There was an issue. Please try again.'}
//               </div>
//             )}
//           </form>
//         )}
//       </div>
//     </div>
//   );
// }