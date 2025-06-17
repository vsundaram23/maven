import {
    CheckCircleIcon,
    DevicePhoneMobileIcon,
    DocumentDuplicateIcon,
    EnvelopeIcon,
    ShareIcon
} from "@heroicons/react/24/solid";
import React, { useEffect, useState } from 'react';
import './ShareProfileModal.css';

const ShareProfileModal = ({ 
    isOpen, 
    onClose, 
    profileData, 
    userEmail,
    customProfileUrl = null,
    customTitle = null,
    customSubtitle = null 
}) => {
    const [selectedContactMethod, setSelectedContactMethod] = useState('sms');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const [showCopiedMessage, setShowCopiedMessage] = useState(false);

    // Allow custom profile URL or generate default using actual username from API
    const userName = profileData?.userUsername || profileData?.userName || userEmail?.split('@')[0] || 'user';
    const profileUrl = customProfileUrl || `${window.location.origin}/pro/${userName}`;
    
    // Allow custom title/subtitle or use defaults
    const modalTitle = customTitle || "Share Your Profile";
    const modalSubtitle = customSubtitle || "Let others discover your trusted recommendations";
    
    const defaultMessage = `Hey! Check out ${profileData?.userName || 'my'} trusted recommendations on Trust Circle: ${profileUrl}`;

    useEffect(() => {
        if (isOpen) {
            setCustomMessage(defaultMessage);
            // Reset form when modal opens
            setRecipientPhone('');
            setRecipientEmail('');
            setSelectedContactMethod('sms');
            setShowCopiedMessage(false);
        }
    }, [isOpen, defaultMessage]);

    const handleCopyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(profileUrl);
            setShowCopiedMessage(true);
            setTimeout(() => setShowCopiedMessage(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = profileUrl;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setShowCopiedMessage(true);
                setTimeout(() => setShowCopiedMessage(false), 2000);
            } catch (fallbackErr) {
                console.error('Fallback copy failed: ', fallbackErr);
            }
            document.body.removeChild(textArea);
        }
    };

    const handleSMSShare = () => {
        if (!recipientPhone.trim()) {
            alert('Please enter a phone number');
            return;
        }
        const cleanPhone = recipientPhone.replace(/\D/g, '');
        const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(customMessage)}`;
        window.location.href = smsUrl;
    };

    const handleEmailShare = () => {
        if (!recipientEmail.trim()) {
            alert('Please enter an email address');
            return;
        }
        const subject = `Check out ${profileData?.userName || 'my'} trusted recommendations`;
        const emailUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(customMessage)}`;
        window.location.href = emailUrl;
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${profileData?.userName || 'User'}'s Trust Circle Profile`,
                    text: customMessage,
                    url: profileUrl,
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Error sharing:', err);
                }
            }
        }
    };

    const formatPhoneNumber = (value) => {
        // Remove all non-digits
        const phoneNumber = value.replace(/\D/g, '');
        
        // Format as (XXX) XXX-XXXX
        if (phoneNumber.length >= 6) {
            return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
        } else if (phoneNumber.length >= 3) {
            return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
        } else {
            return phoneNumber;
        }
    };

    const handlePhoneChange = (e) => {
        const formatted = formatPhoneNumber(e.target.value);
        setRecipientPhone(formatted);
    };

    if (!isOpen) return null;

    return (
        <div className="share-profile-modal-overlay">
            <div className="share-profile-modal-content">
                <button onClick={onClose} className="share-profile-modal-close-btn">
                    &times;
                </button>
                
                <div className="share-modal-header">
                    <ShareIcon className="share-modal-icon" />
                    <h2 className="share-modal-title">{modalTitle}</h2>
                    <p className="share-modal-subtitle">{modalSubtitle}</p>
                </div>

                <div className="share-url-section">
                    <label className="share-input-label">Profile URL</label>
                    <div className="share-url-container">
                        <input 
                            type="text" 
                            value={profileUrl} 
                            readOnly 
                            className="share-url-input"
                        />
                        <button 
                            onClick={handleCopyToClipboard}
                            className="share-copy-btn"
                            title="Copy to clipboard"
                        >
                            {showCopiedMessage ? <CheckCircleIcon /> : <DocumentDuplicateIcon />}
                        </button>
                    </div>
                    {showCopiedMessage && (
                        <span className="share-copied-message">✓ Copied to clipboard!</span>
                    )}
                </div>

                <div className="share-methods-section">
                    <h3 className="share-section-title">Choose sharing method</h3>
                    <div className="share-method-tabs">
                        <button 
                            className={`share-method-tab ${selectedContactMethod === 'sms' ? 'active' : ''}`}
                            onClick={() => setSelectedContactMethod('sms')}
                        >
                            <DevicePhoneMobileIcon className="tab-icon" />
                            Text Message
                        </button>
                        <button 
                            className={`share-method-tab ${selectedContactMethod === 'email' ? 'active' : ''}`}
                            onClick={() => setSelectedContactMethod('email')}
                        >
                            <EnvelopeIcon className="tab-icon" />
                            Email
                        </button>
                        {navigator.share && (
                            <button 
                                className="share-method-tab"
                                onClick={handleNativeShare}
                            >
                                <ShareIcon className="tab-icon" />
                                More Options
                            </button>
                        )}
                    </div>
                </div>

                {selectedContactMethod === 'sms' && (
                    <div className="share-contact-section">
                        <label className="share-input-label">Phone Number</label>
                        <input
                            type="tel"
                            value={recipientPhone}
                            onChange={handlePhoneChange}
                            placeholder="(555) 123-4567"
                            className="share-contact-input"
                            maxLength="14"
                        />
                    </div>
                )}

                {selectedContactMethod === 'email' && (
                    <div className="share-contact-section">
                        <label className="share-input-label">Email Address</label>
                        <input
                            type="email"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            placeholder="friend@example.com"
                            className="share-contact-input"
                        />
                    </div>
                )}

                <div className="share-message-section">
                    <label className="share-input-label">Your Message</label>
                    <textarea
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        rows={4}
                        className="share-message-input"
                        placeholder="Add a personal message..."
                        maxLength="500"
                    />
                    <div className="share-message-counter">
                        {customMessage.length}/500 characters
                    </div>
                </div>

                <div className="share-action-buttons">
                    <button 
                        onClick={onClose}
                        className="share-btn share-btn-cancel"
                    >
                        Cancel
                    </button>
                    {selectedContactMethod === 'sms' && (
                        <button 
                            onClick={handleSMSShare}
                            className="share-btn share-btn-primary"
                            disabled={!recipientPhone.trim() || !customMessage.trim()}
                        >
                            <DevicePhoneMobileIcon className="btn-icon" />
                            Send Text
                        </button>
                    )}
                    {selectedContactMethod === 'email' && (
                        <button 
                            onClick={handleEmailShare}
                            className="share-btn share-btn-primary"
                            disabled={!recipientEmail.trim() || !customMessage.trim()}
                        >
                            <EnvelopeIcon className="btn-icon" />
                            Send Email
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShareProfileModal; 