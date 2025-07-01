import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeftIcon,
    TrashIcon,
    ArrowPathIcon,
    XCircleIcon,
    PencilSquareIcon, // <-- Add this import
} from "@heroicons/react/24/outline";
import { API_URL } from "../../utils/constants";
import ProfileRecommendationCard from "../../components/Profile/ProfileRecommendationCard";
import { useUser } from "@clerk/clerk-react";
import EditRecommendationModal from "../../components/Profile/EditRecommendationModal";
import "./ListDetail.css";

// Helper to get cover image src from JSONB
function getCoverImageSrc(coverImage) {
    if (!coverImage) return null;
    try {
        // If coverImage is a string, parse it
        const imgObj =
            typeof coverImage === "string"
                ? JSON.parse(coverImage)
                : coverImage;
        if (!imgObj.data) return null;
        // Handle Buffer (array) or base64 string
        const imageData = imgObj.data?.data || imgObj.data;
        if (Array.isArray(imageData)) {
            const bytes = new Uint8Array(imageData);
            const binary = bytes.reduce(
                (acc, byte) => acc + String.fromCharCode(byte),
                ""
            );
            const base64String = window.btoa(binary);
            return `data:${imgObj.contentType};base64,${base64String}`;
        }
        if (typeof imageData === "string") {
            return `data:${imgObj.contentType};base64,${imageData}`;
        }
        return null;
    } catch (e) {
        return null;
    }
}

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
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentEditingRec, setCurrentEditingRec] = useState(null);

    // Trust circles state for EditRecommendationModal
    const [userTrustCircles, setUserTrustCircles] = useState([]);
    const [trustCirclesLoading, setTrustCirclesLoading] = useState(false);
    const [trustCirclesError, setTrustCirclesError] = useState("");

    // Use the same endpoint and logic as Profile.js
    const fetchUserTrustCircles = async () => {
        if (!user?.primaryEmailAddress?.emailAddress) return [];
        setTrustCirclesLoading(true);
        setTrustCirclesError("");
        try {
            const email = encodeURIComponent(
                user.primaryEmailAddress.emailAddress
            );
            const res = await fetch(
                `${API_URL}/api/communities/user/${email}/communities`
            );
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(
                    errorData.message || "Failed to fetch user trust circles."
                );
            }
            const data = await res.json();
            const formattedCircles = Array.isArray(data)
                ? data.map((tc) => ({ id: tc.id, name: tc.name }))
                : [];
            setUserTrustCircles(formattedCircles);
            return formattedCircles;
        } catch (err) {
            setTrustCirclesError(
                err.message || "Could not load trust circles."
            );
            setUserTrustCircles([]);
            return [];
        } finally {
            setTrustCirclesLoading(false);
        }
    };

    // Fetch trust circles on mount
    useEffect(() => {
        if (user) {
            fetchUserTrustCircles();
        }
    }, [user]);

    // Refresh recommendations after edit
    const fetchListAndRecs = async () => {
        setLoading(true);
        setError("");
        try {
            const url = `${API_URL}/api/lists/${listId}?user_id=${
                user.id
            }&email=${encodeURIComponent(
                user.primaryEmailAddress?.emailAddress ||
                    user.emailAddresses?.[0]?.emailAddress ||
                    ""
            )}`;
            const listRes = await fetch(url);
            if (!listRes.ok) throw new Error("Failed to fetch list details");
            const listData = await listRes.json();
            setList(listData.list || {});
            setRecommendations(listData.recommendations || []);
        } catch (err) {
            setError(err.message || "Could not load list.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user) return;
        fetchListAndRecs();
    }, [listId, user]);

    // Delete list
    const handleDeleteList = async () => {
        setIsDeleting(true);
        setDeleteError("");
        try {
            const res = await fetch(
                `${API_URL}/api/lists/${listId}`,
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

    const isOwner = !!(
        list &&
        (list.isOwner || (user && list.user_id === user.id))
    );

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
                            {list?.cover_image && (
                                <div
                                    className="list-detail-cover-image-wrapper"
                                    style={{ position: "relative" }}
                                >
                                    <img
                                        className="list-detail-cover-image"
                                        src={getCoverImageSrc(list.cover_image)}
                                        alt="List cover"
                                    />
                                    {isOwner && (
                                        <button
                                            className="list-detail-edit-cover-btn"
                                            title="Edit cover image"
                                            style={{
                                                position: "absolute",
                                                top: 16,
                                                right: 16,
                                                background:
                                                    "rgba(255,255,255,0.85)",
                                                border: "none",
                                                borderRadius: "50%",
                                                padding: 8,
                                                cursor: "pointer",
                                                boxShadow:
                                                    "0 2px 8px rgba(0,0,0,0.10)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                transition: "background 0.2s",
                                            }}
                                            onClick={() => {
                                                // TODO: Open your cover image edit modal here
                                                alert(
                                                    "Edit cover image (implement modal)"
                                                );
                                            }}
                                        >
                                            <PencilSquareIcon
                                                style={{
                                                    width: 22,
                                                    height: 22,
                                                    color: "#1a365d",
                                                }}
                                            />
                                        </button>
                                    )}
                                </div>
                            )}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "1rem",
                                    marginTop: "0.5rem",
                                    marginBottom: "0.5rem",
                                }}
                            >
                                <h1
                                    style={{
                                        fontSize: "2rem",
                                        fontWeight: 800,
                                        color: "#1a365d",
                                        margin: 0,
                                        flex: 1,
                                        lineHeight: 1.2,
                                        wordBreak: "break-word",
                                    }}
                                >
                                    {list.title}
                                </h1>
                                {/* Only show Delete button if owner */}
                                {isOwner && (
                                    <button
                                        className="btn btn-danger list-delete-btn"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                            fontWeight: 600,
                                            fontSize: "1rem",
                                            padding: "0.4rem 1.1rem",
                                            marginLeft: "1rem",
                                            whiteSpace: "nowrap",
                                        }}
                                        onClick={() => setShowDeleteModal(true)}
                                    >
                                        <TrashIcon
                                            style={{ width: 18, height: 18 }}
                                        />
                                        Delete List
                                    </button>
                                )}
                            </div>
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
                                        onEdit={
                                            isOwner
                                                ? (rec) => {
                                                      setCurrentEditingRec(rec);
                                                      setIsEditModalOpen(true);
                                                  }
                                                : undefined
                                        }
                                        user={user}
                                        onRefreshList={fetchListAndRecs}
                                    />
                                ))}
                            </ul>
                        )}
                        {/* {!isOwner && (
                            <div style={{ color: "#888", marginBottom: "1rem" }}>
                                You do not have permission to edit or delete this
                                list.
                            </div>
                        )} */}
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

                {/* Edit Modal */}
                {isEditModalOpen && currentEditingRec && user && isOwner && (
                    <EditRecommendationModal
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        recommendationToEdit={currentEditingRec}
                        onSaveSuccess={fetchListAndRecs}
                        userEmail={user.primaryEmailAddress?.emailAddress}
                        clerkUserId={user.id}
                        apiBaseUrl={API_URL}
                        userTrustCirclesProp={userTrustCircles}
                        trustCirclesLoadingProp={trustCirclesLoading}
                        trustCirclesErrorProp={trustCirclesError}
                        fetchUserTrustCirclesFunc={fetchUserTrustCircles}
                    />
                )}
            </div>
        </div>
    );
};

export default ListDetail;
