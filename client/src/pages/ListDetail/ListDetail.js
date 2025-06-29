import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { API_URL } from "../../utils/constants";
import ProfileRecommendationCard from "../../components/Profile/ProfileRecommendationCard";
import { useUser } from "@clerk/clerk-react"; // or your auth provider

const ListDetail = () => {
    const { listId } = useParams();
    const navigate = useNavigate();
    const { user } = useUser(); // get user from context/provider
    const [list, setList] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!user) return; // Wait for user to load
        const fetchListAndRecs = async () => {
            setLoading(true);
            setError("");
            try {
                const url = `${API_URL}/api/recommendations/lists/${listId}?user_id=${
                    user.id
                }&email=${encodeURIComponent(
                    user.primaryEmailAddress?.emailAddress ||
                        user.emailAddresses?.[0]?.emailAddress ||
                        ""
                )}`;
                const listRes = await fetch(url);
                if (!listRes.ok)
                    throw new Error("Failed to fetch list details");
                const listData = await listRes.json();
                setList(listData.list || {});
                setRecommendations(listData.recommendations || []);
            } catch (err) {
                setError(err.message || "Could not load list.");
            } finally {
                setLoading(false);
            }
        };
        fetchListAndRecs();
    }, [listId, user]);

    return (
        <div
            className="profile-page-container"
            style={{ minHeight: "100vh", background: "#f7f8fa" }}
        >
            <div
                style={{
                    maxWidth: 800,
                    margin: "0 auto",
                    padding: "2rem 1rem",
                }}
            >
                <button
                    onClick={() => navigate("/profile")}
                    style={{
                        background: "none",
                        border: "none",
                        color: "#1a365d",
                        fontWeight: 600,
                        fontSize: "1rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                        marginBottom: "1.5rem",
                    }}
                >
                    <ArrowLeftIcon style={{ width: 22, height: 22 }} />
                    Back to Profile
                </button>
                {loading ? (
                    <div className="profile-loading-container small-spinner">
                        <div className="profile-spinner"></div>
                        <p>Loading list...</p>
                    </div>
                ) : error ? (
                    <div className="profile-error-banner">{error}</div>
                ) : (
                    <>
                        <div style={{ marginBottom: "2rem" }}>
                            <h1
                                style={{
                                    fontSize: "2rem",
                                    fontWeight: 800,
                                    color: "#1a365d",
                                    marginBottom: "0.5rem",
                                }}
                            >
                                {list.title}
                            </h1>
                            <div
                                style={{
                                    color: "#555",
                                    fontSize: "1.1rem",
                                    marginBottom: "0.5rem",
                                }}
                            >
                                {list.description}
                            </div>
                            <div style={{ color: "#888", fontSize: "0.95rem" }}>
                                Created:{" "}
                                {list.created_at
                                    ? new Date(
                                          list.created_at
                                      ).toLocaleDateString()
                                    : ""}
                                {" • "}
                                {list.recommendationCount ??
                                    list.recommendations?.length ??
                                    recommendations.length}{" "}
                                recs
                            </div>
                        </div>
                        {recommendations.length === 0 ? (
                            <div>No recommendations in this list.</div>
                        ) : (
                            <ul className="provider-list">
                                {recommendations.map((rec) => (
                                    <ProfileRecommendationCard
                                        key={rec.id}
                                        rec={rec}
                                        // You may want to pass user, onEdit, etc. if needed
                                    />
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ListDetail;
