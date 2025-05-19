import React, { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { FaStar } from "react-icons/fa";
import {
    UserCircleIcon,
    EnvelopeIcon,
    UsersIcon,
    ArrowRightOnRectangleIcon,
    PencilSquareIcon,
    PlusCircleIcon,
} from "@heroicons/react/24/solid";
import "./Profile.css";

const API_URL = "https://api.seanag-recommendations.org:8080";
// const API_URL = "http://localhost:5000";

const Profile = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const { signOut } = useClerk();
    const navigate = useNavigate();
    const [recommendations, setRecommendations] = useState([]);
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isLoaded) return;

        if (!isSignedIn) {
            navigate("/");
            return;
        }

        const fetchProfileData = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    user_id: user.id,
                    email: user.primaryEmailAddress?.emailAddress,
                    firstName: user.firstName || "",
                    lastName: user.lastName || "",
                });

                const [recommendationsRes, connectionsRes] = await Promise.all([
                    fetch(`${API_URL}/api/users/me/recommendations?${params}`),
                    fetch(`${API_URL}/api/connections/check-connections`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            email: user.primaryEmailAddress?.emailAddress,
                            user_id: user.id,
                        }),
                    }),
                ]);

                if (!recommendationsRes.ok) {
                    throw new Error("Failed to fetch recommendations");
                }

                if (!connectionsRes.ok) {
                    throw new Error("Failed to fetch connections");
                }

                const recsData = await recommendationsRes.json();
                const connsData = await connectionsRes.json();

                setRecommendations(recsData.recommendations || []);
                setConnections(Array.isArray(connsData) ? connsData : []);
            } catch (err) {
                console.error("Error fetching profile data:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [isLoaded, isSignedIn, user, navigate]);

    const handleLogout = async () => {
        try {
            await signOut();
            navigate("/");
        } catch (err) {
            console.error("Error signing out:", err);
        }
    };

    if (!isLoaded || loading) {
        return (
            <div className="profile-loading-container">
                <div className="profile-spinner"></div>
                <p>Loading Profile...</p>
            </div>
        );
    }

    if (!isSignedIn) {
        return null; // useEffect will handle navigation
    }

    return (
        <div className="profile-page">
            <header className="profile-main-header">
                <div className="profile-avatar-container">
                    <UserCircleIcon className="profile-avatar-icon" />
                </div>
                <div className="profile-user-info">
                    <h1>
                        {user.firstName} {user.lastName}
                    </h1>
                    <p>
                        <EnvelopeIcon className="inline-icon" />
                        {user.primaryEmailAddress?.emailAddress}
                    </p>
                </div>
                <div className="profile-header-actions">
                    <button
                        className="profile-edit-btn"
                        onClick={() => alert("Edit profile coming soon!")}
                    >
                        <PencilSquareIcon className="btn-icon" /> Edit Profile
                    </button>
                    <button
                        className="profile-logout-btn-header"
                        onClick={handleLogout}
                    >
                        <ArrowRightOnRectangleIcon className="btn-icon" />{" "}
                        Logout
                    </button>
                </div>
            </header>

            {error && <div className="profile-error-banner">{error}</div>}

            <section className="profile-stats-bar">
                <div className="stat-item">
                    <FaStar
                        className="stat-icon"
                        style={{ color: "var(--profile-accent-yellow)" }}
                    />
                    <span>{recommendations.length}</span>
                    <p>Recommendations Made</p>
                </div>
                <div className="stat-item">
                    <UsersIcon className="stat-icon" />
                    <span>{connections.length}</span>
                    <p>Connections</p>
                </div>
            </section>

            <main className="profile-main-content">
                <section
                    className="profile-content-section"
                    id="my-recommendations"
                >
                    <div className="section-header">
                        <h2>My Recommendations</h2>
                        <button
                            className="profile-add-new-btn"
                            onClick={() => navigate("/share-recommendation")}
                        >
                            <PlusCircleIcon className="btn-icon" /> Add New
                        </button>
                    </div>
                    {loading && (
                        <div className="profile-loading-container small-spinner">
                            <div className="profile-spinner"></div>{" "}
                            <p>Loading recommendations...</p>
                        </div>
                    )}
                    {!loading && recommendations.length > 0 && (
                        <div className="profile-my-recommendations-grid">
                            {recommendations.map((rec, idx) => (
                                <div
                                    key={rec.id || idx}
                                    className="profile-my-rec-card"
                                >
                                    <h3>
                                        {rec.business_name ||
                                            "Unknown Business"}
                                    </h3>
                                    <p>
                                        {rec.recommender_message ||
                                            "No message provided."}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                    {!loading && recommendations.length === 0 && !error && (
                        <div className="profile-empty-state">
                            <FaStar
                                className="empty-state-icon"
                                style={{ color: "var(--profile-text-light)" }}
                            />
                            <p>You haven't made any recommendations yet.</p>
                            <button
                                className="profile-primary-action-btn"
                                onClick={() =>
                                    navigate("/share-recommendation")
                                }
                            >
                                Share Your First Recommendation
                            </button>
                        </div>
                    )}
                    {!loading && recommendations.length === 0 && error && (
                        <p className="profile-empty-state-error-inline">
                            Could not load recommendations. Check console for
                            details.
                        </p>
                    )}
                </section>
            </main>
        </div>
    );
};

export default Profile;
