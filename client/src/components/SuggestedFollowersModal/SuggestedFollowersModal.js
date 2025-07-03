import React, { useState } from 'react';
import { FaSearch, FaStar, FaUserPlus } from 'react-icons/fa';
import './SuggestedFollowersModal.css';

const SparkleIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'white' }}>
        <path d="M12 2L9.88 7.12L4 8L8.47 12.34L7.24 18L12 15.31L16.76 18L15.53 12.34L20 8L14.12 7.12L12 2Z" fill="currentColor"/>
    </svg>
);

const getInitials = (name, email) => {
    if (name) {
        const names = name.split(" ").filter((n) => n);
        if (names.length > 1) {
            return (names[0][0] + names[names.length - 1][0]).toUpperCase();
        } else if (names.length === 1 && names[0].length > 1) {
            return names[0].substring(0, 2).toUpperCase();
        } else if (names.length === 1 && names[0].length) {
            return names[0][0].toUpperCase();
        }
    }
    if (email && email.length > 0) return email[0].toUpperCase();
    return "U";
};

const UserListItem = ({ user, onFollow }) => {
    const [imageFailed, setImageFailed] = useState(false);
    const primarySrc = user.profile_image_url || user.profile_image || user.avatarUrl;
    const fallbackUiAvatarSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user.name || user.email || "NA"
    )}&background=random&color=fff&size=60&font-size=0.33`;

    const handleImageError = (e) => {
        if (e.target.src === primarySrc && primarySrc !== fallbackUiAvatarSrc) {
            e.target.src = fallbackUiAvatarSrc;
        } else {
            setImageFailed(true);
        }
    };
    
    const displayName = user.name || user.email || "";

    let avatarContent;
    if (imageFailed) {
        avatarContent = (
            <div className="avatar-sfm-initials">
                <span>{getInitials(user.name, user.email)}</span>
            </div>
        );
    } else {
        avatarContent = (
            <img
                src={primarySrc || fallbackUiAvatarSrc}
                alt={displayName}
                className="avatar-sfm"
                onError={handleImageError}
            />
        );
    }

    return (
        <div className="suggestion-item-sfm">
            {avatarContent}
            <div className="user-info-sfm">
                <span className="user-name-sfm">{displayName}</span>
                <span className="trust-points-sfm">
                    <FaStar style={{ color: '#FDBF00', marginRight: '4px' }} />
                    {user.user_score || user.trust_points || 0} Trust Points
                </span>
            </div>
            <button
                className="follow-button-sfm"
                onClick={() => onFollow(user.id)}
            >
                <FaUserPlus style={{ marginRight: '6px' }} /> Follow
            </button>
        </div>
    );
};

const SuggestedFollowersModal = ({
    isOpen,
    onClose,
    suggestedFollows,
    loading,
    onFollow,
    title = "Suggested For You",
    subtitle = "Discover trusted recommenders in your network"
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const filteredSuggestions = suggestedFollows.filter(user => {
        const name = user.name || '';
        const email = user.email || '';
        return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               email.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="modal-backdrop-sfm" onClick={onClose}>
            <div className="modal-content-sfm" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header-sfm">
                    <div className="modal-header-icon-sfm">
                        <SparkleIcon />
                    </div>
                    <div className="modal-header-text-sfm">
                        <h2>{title}</h2>
                        <p>{subtitle}</p>
                    </div>
                    <button className="close-button-sfm" onClick={onClose}>
                        &times;
                    </button>
                </div>
                
                <div className="search-bar-sfm">
                    <FaSearch className="search-icon-sfm" />
                    <input
                        type="text"
                        placeholder="Search recommenders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="user-list-sfm">
                    {loading ? (
                        <div className="loading-message">Loading suggestions...</div>
                    ) : filteredSuggestions.length > 0 ? (
                        filteredSuggestions.map((user) => (
                           <UserListItem key={user.id} user={user} onFollow={onFollow} />
                        ))
                    ) : (
                        <p className="empty-message">No new suggestions for you right now.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SuggestedFollowersModal; 