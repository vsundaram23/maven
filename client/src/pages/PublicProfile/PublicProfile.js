import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { FaStar } from "react-icons/fa";
import { EnvelopeIcon, UsersIcon as UsersIconSolid, UserCircleIcon, ChatBubbleLeftEllipsisIcon, CalendarDaysIcon } from "@heroicons/react/24/solid";
import "../Profile/Profile.css"; // Using the original Profile.css

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = "http://localhost:3000";

const StarRatingDisplay = ({ rating }) => {
    const numRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalf = numRating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

    return (
        <div className="as-star-rating">
            {[...Array(fullStars)].map((_, i) => (
                <FaStar key={`full-${i}`} className="as-star-icon filled" />
            ))}
            {hasHalf && <FaStar key="half" className="as-star-icon half" />}
            {[...Array(emptyStars)].map((_, i) => (
                <FaStar key={`empty-${i}`} className="as-star-icon empty" />
            ))}
        </div>
    );
};

const PublicRecommendationCard = ({ rec }) => {
    const formatDate = (dateString) =>
        !dateString
            ? "Date not available"
            : new Date(dateString).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            });

    return (
        <li className="profile-my-rec-card">
            <div className="profile-my-rec-card-header">
                <h2 className="profile-my-rec-card-title">{rec.business_name || "Unknown Business"}</h2>
            </div>
            <div className="profile-my-rec-review-summary">
                {typeof rec.average_rating === "number" ? (
                    <>
                        <StarRatingDisplay rating={rec.average_rating} />
                        <span className="profile-my-rec-rating-score-text">
                            {(parseFloat(rec.average_rating) || 0).toFixed(1)} (
                            {parseInt(rec.total_reviews, 10) || 0} Reviews)
                        </span>
                    </>
                ) : (
                    <>
                        <StarRatingDisplay rating={0} />
                        <span className="profile-my-rec-rating-score-text">0.0 (0 Reviews)</span>
                    </>
                )}
            </div>
            <p className="profile-my-rec-card-description">
                <ChatBubbleLeftEllipsisIcon className="inline-icon" />
                {rec.recommender_message || "No detailed message provided."}
            </p>
            {Array.isArray(rec.tags) && rec.tags.length > 0 && (
                <div className="profile-my-rec-tag-container">
                    {rec.tags.map((tag, idx) => (
                        <span key={idx} className="profile-my-rec-tag-badge">
                            {tag}
                        </span>
                    ))}
                </div>
            )}
            <div className="profile-my-rec-card-footer">
                <div className="profile-my-rec-date">
                    <CalendarDaysIcon className="inline-icon" />
                    Recommended on: {formatDate(rec.date_of_recommendation || rec.created_at)}
                </div>
            </div>
        </li>
    );
};


const PublicProfile = () => {
    const { userId } = useParams();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchPublicProfileData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/api/users/public-profile/${userId}`);
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || "Could not fetch profile.");
            }
            const data = await response.json();
            setProfileData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchPublicProfileData();
    }, [fetchPublicProfileData]);

    if (loading) {
        return <div className="profile-loading-container"><div className="profile-spinner"></div><p>Loading Profile...</p></div>;
    }

    if (error) {
        return <div className="profile-error-banner">{error}</div>;
    }

    if (!profileData) {
        return <div className="profile-empty-state"><p>User not found.</p></div>;
    }

    const { userName, userBio, email, recommendations, connections, profileImage } = profileData;

    return (
        <div className="profile-page">
            <header className="profile-main-header">
                <div className="profile-avatar-section">
                    <div className="profile-avatar-display-wrapper profile-avatar-container">
                        {profileImage ? (
                            <img src={`${API_URL}${profileImage}`} alt={userName} className="profile-avatar-image" onError={(e) => { e.target.onerror = null; e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                        ) : null}
                         <UserCircleIcon className="profile-avatar-icon profile-avatar-icon-fallback" style={{ display: profileImage ? 'none' : 'flex' }}/>
                    </div>
                </div>
                <div className="profile-user-info">
                    <h1>{userName || "User"}</h1>
                    {email && (
                        <p>
                            <EnvelopeIcon className="inline-icon" />
                            {email}
                        </p>
                    )}
                    {userBio && <p className="profile-user-bio">{userBio}</p>}
                </div>
            </header>

            <section className="profile-stats-bar">
                <div className="stat-item">
                    <FaStar className="stat-icon" style={{ color: "var(--profile-accent-yellow)" }} />
                    <span>{recommendations ? recommendations.length : 0}</span>
                    <p>Recommendations Made</p>
                </div>
                <div className="stat-item">
                    <UsersIconSolid className="stat-icon" />
                    <span>{connections || 0}</span>
                    <p>Connections</p>
                </div>
            </section>

            <main className="profile-main-content">
                <section className="profile-content-section" id="my-recommendations">
                    <div className="section-header">
                        <h2>{userName}'s Recommendations</h2>
                    </div>
                    {recommendations && recommendations.length > 0 ? (
                        <ul className="profile-my-recommendations-list">
                            {recommendations.map((rec) => (
                                <PublicRecommendationCard key={rec.id} rec={rec} />
                            ))}
                        </ul>
                    ) : (
                        <div className="profile-empty-state">
                            <FaStar className="empty-state-icon" style={{ color: "var(--profile-text-light)" }} />
                            <p>This user hasn't made any recommendations yet.</p>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default PublicProfile;