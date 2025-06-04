import React, { useState, useEffect } from 'react';

const InviteMembersModal = ({ isOpen, onClose, onSubmit, communityName, generatedLink, error, loading }) => {
    const [expiresAt, setExpiresAt] = useState('');
    const [maxUses, setMaxUses] = useState('');
    const [linkCopied, setLinkCopied] = useState(false);
  
    useEffect(() => {
      if (isOpen) {
        // Reset form when modal opens, but preserve any externally set defaults if needed
        setExpiresAt('');
        setMaxUses('');
        setLinkCopied(false);
      }
    }, [isOpen]);
  
    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit({
        expires_at: expiresAt || null, // Send null if empty
        max_uses: maxUses ? parseInt(maxUses, 10) : null, // Send null or parsed int
      });
    };
  
    const handleCopyLink = () => {
      navigator.clipboard.writeText(generatedLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    };
  
    if (!isOpen) return null;
  
    return (
      <div className="modal-overlay">
        <div className="modal-content invite-members-modal-content"> {/* Add a specific class */}
          <h2>Invite Members to {communityName}</h2>
          {generatedLink ? (
            <div className="generated-link-section">
              <p>Share this link with people you want to invite:</p>
              <div className="invite-link-display">
                <input type="text" value={generatedLink} readOnly />
                <button onClick={handleCopyLink} className="copy-button">
                  {linkCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <button onClick={onClose} className="primary-button modal-close-btn">Close</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="expiresAt">Expires At (Optional):</label>
                <input
                  type="datetime-local"
                  id="expiresAt"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="maxUses">Max Uses (Optional, 0 or empty for unlimited):</label>
                <input
                  type="number"
                  id="maxUses"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="e.g., 1 for single use"
                  min="0"
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="modal-buttons">
                <button type="button" onClick={onClose} className="cancel-button" disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="submit-button" disabled={loading}>
                  {loading ? 'Generating...' : 'Generate Invite Link'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

  export default InviteMembersModal;