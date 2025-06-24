import React, { useState } from 'react';
import { FaComment, FaEllipsisH, FaEnvelope, FaStar } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import './MemberCard.css';

const MemberCard = ({ member, hideContactActions = false }) => {
    const [imageFailed, setImageFailed] = useState(false);
    const primarySrc = member.profile_image_url || member.profile_image || member.avatarUrl;
    const fallbackUiAvatarSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        member.name || member.email || "NA"
    )}&background=random&color=fff&size=60&font-size=0.33`;

    const handleImageError = (e) => {
        if (e.target.src === primarySrc && primarySrc !== fallbackUiAvatarSrc) {
            e.target.src = fallbackUiAvatarSrc;
        } else {
            setImageFailed(true);
        }
    };

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

    const cleanAltText = (name, email) => {
        const text = name || email || "Community Member";
        return text.replace(/(\r\n|\n|\r)/gm, " ");
    };

    let avatarContent;
    if (imageFailed) {
        avatarContent = (
            <div className="member-avatar member-avatar-initials-fallback">
                <span>{getInitials(member.name, member.email)}</span>
            </div>
        );
    } else {
        avatarContent = (
            <img
                src={primarySrc || fallbackUiAvatarSrc}
                alt={cleanAltText(member.name, member.email)}
                className="member-avatar"
                onError={handleImageError}
            />
        );
    }

    const displayName = member.name || member.email || "";

    return (
        <div className="member-item-card">
            {avatarContent}
            <div className="member-details">
                <div className="member-name-container">
                    {member.username ? (
                        <Link
                            to={`/pro/${member.username}`}
                            className="member-name-link"
                        >
                            {displayName}
                        </Link>
                    ) : (
                        <span className="member-name">{displayName}</span>
                    )}
                </div>

                <div className="member-tags">
                    <span className="member-tag trust-points-tag">
                        <FaStar style={{ marginRight: "4px" }} />
                        {member.user_score || member.trust_points || 0} Trust
                        Points
                    </span>
                </div>
            </div>
            {!hideContactActions && (
                <div className="member-actions-icons">
                    {member.phone_number && (
                        <a
                            href={`sms:${member.phone_number.replace(/\D/g, "")}`}
                            className="member-action-icon-button"
                            title="Send Text Message"
                        >
                            <FaComment />
                        </a>
                    )}
                    {member.email && (
                        <a
                            href={`mailto:${member.email}`}
                            className="member-action-icon-button"
                            title="Send Email"
                        >
                            <FaEnvelope />
                        </a>
                    )}
                    <button
                        className="member-action-icon-button"
                        title="More options"
                    >
                        <FaEllipsisH />
                    </button>
                </div>
            )}
        </div>
    );
};

export default MemberCard; 