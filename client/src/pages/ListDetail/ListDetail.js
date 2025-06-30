import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeftIcon,
    TrashIcon,
    ArrowPathIcon,
    XCircleIcon,
} from "@heroicons/react/24/outline";
import { API_URL } from "../../utils/constants";
import ProfileRecommendationCard from "../../components/Profile/ProfileRecommendationCard";
import { useUser } from "@clerk/clerk-react";
import "./ListDetail.css";

const ListDetail = () => {
    const { listId } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();
    const [list, setList] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    useEffect(() => {
        if (!user) return;
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

    // Delete list
    const handleDeleteList = async () => {
        setIsDeleting(true);
        setDeleteError("");
        try {
            const res = await fetch(
                `${API_URL}/api/recommendations/lists/${listId}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        user_id: user.id,
                        email:
                            user.primaryEmailAddress?.emailAddress ||
                            user.emailAddresses?.[0]?.emailAddress ||
                            "",
                    }),
                }
            );
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to delete list");
            }
            setShowDeleteModal(false);
            navigate("/profile");
        } catch (err) {
            setDeleteError(err.message || "Could not delete list.");
        } finally {
            setIsDeleting(false);
        }
    };

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
                        <div
                            style={{
                                marginBottom: "2rem",
                                position: "relative",
                            }}
                        >
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
                            {/* Delete button */}
                            <button
                                className="btn btn-danger list-delete-btn"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    position: "absolute",
                                    top: 0,
                                    right: 0,
                                    fontWeight: 600,
                                    fontSize: "1rem",
                                    padding: "0.4rem 1.1rem",
                                }}
                                onClick={() => setShowDeleteModal(true)}
                            >
                                <TrashIcon style={{ width: 18, height: 18 }} />
                                Delete List
                            </button>
                        </div>
                        {recommendations.length === 0 ? (
                            <div>No recommendations in this list.</div>
                        ) : (
                            <ul className="provider-list">
                                {recommendations.map((rec) => (
                                    <ProfileRecommendationCard
                                        key={rec.id}
                                        rec={rec}
                                    />
                                ))}
                            </ul>
                        )}
                    </>
                )}

                {/* Delete Modal */}
                {showDeleteModal && (
                    <div className="profile-edit-modal-overlay">
                        <div className="profile-edit-modal-content">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="profile-edit-modal-close-btn"
                            >
                                &times;
                            </button>
                            <h2 className="profile-edit-modal-title">
                                Delete List
                            </h2>
                            <div className="profile-delete-modal-body">
                                <div className="profile-delete-modal-warning">
                                    <TrashIcon className="warning-icon" />
                                    <p>
                                        Are you sure you want to delete this
                                        list? This action cannot be undone.
                                    </p>
                                </div>
                                {deleteError && (
                                    <div className="profile-edit-modal-message error">
                                        <XCircleIcon />
                                        <span>{deleteError}</span>
                                    </div>
                                )}
                                <div className="profile-edit-modal-button-row">
                                    <button
                                        className="profile-edit-modal-btn cancel-btn"
                                        onClick={() =>
                                            setShowDeleteModal(false)
                                        }
                                        disabled={isDeleting}
                                    >
                                        <XCircleIcon /> Cancel
                                    </button>
                                    <button
                                        className="profile-edit-modal-btn delete-btn"
                                        onClick={handleDeleteList}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? (
                                            <>
                                                <ArrowPathIcon className="animate-spin" />
                                                Deleting...
                                            </>
                                        ) : (
                                            <>
                                                <TrashIcon />
                                                Delete
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ListDetail;
