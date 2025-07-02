import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeftIcon,
    TrashIcon,
    ArrowPathIcon,
    XCircleIcon,
    PencilSquareIcon, // <-- Add this import
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { API_URL } from "../../utils/constants";
import RecommendationCard from "../../components/RecommendationCard/RecommendationCard";
import ProfileRecommendationCard from "../../components/Profile/ProfileRecommendationCard";
import { useUser } from "@clerk/clerk-react";
import EditRecommendationModal from "../../components/Profile/EditRecommendationModal";
import EditListModal from "../../components/EditListModal/EditListModal";
import AddToListModal from "../../components/AddToListModal/AddToListModal"; // <-- Add this import
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
    const [userRecommendations, setUserRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentEditingRec, setCurrentEditingRec] = useState(null);
    const [isEditListModalOpen, setIsEditListModalOpen] = useState(false);
    const [editListForm, setEditListForm] = useState({
        title: "",
        description: "",
        visibility: "connections",
        trustCircleIds: [],
        recommendationIds: [],
    });
    const [editListLoading, setEditListLoading] = useState(false);
    const [editListError, setEditListError] = useState(""); // <-- Add state for edit list error

    // Trust circles state for EditRecommendationModal
    const [userTrustCircles, setUserTrustCircles] = useState([]);
    const [trustCirclesLoading, setTrustCirclesLoading] = useState(false);
    const [trustCirclesError, setTrustCirclesError] = useState("");

    // --- Add Recommendations Section State ---
    const [addSearchTerm, setAddSearchTerm] = useState("");
    const [addSelectedIds, setAddSelectedIds] = useState([]);
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState("");
    const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false); // <-- Add state for AddToListModal

    // --- Remove Recommendations Section State ---
    const [isDeleteRecsMode, setIsDeleteRecsMode] = useState(false);
    const [selectedRecsToDelete, setSelectedRecsToDelete] = useState([]);
    const [deleteRecsLoading, setDeleteRecsLoading] = useState(false);
    const [deleteRecsError, setDeleteRecsError] = useState("");

    // --- Add Recommendations Section Logic ---
    const recsInListIds = new Set(recommendations.map((r) => r.id));

    // Search/filter logic (match on title, business_name, service, city, etc.)
    const filteredAddRecs = userRecommendations.filter((rec) => {
        const search = addSearchTerm.trim().toLowerCase();
        if (!search) return true;
        const fields = [
            rec.title,
            rec.business_name,
            rec.service,
            rec.city,
            rec.state,
            rec.notes,
        ];
        return fields.some((f) => f && f.toLowerCase().includes(search));
    });

    // Handle checkbox toggle
    const handleAddRecToggle = (recId) => {
        setAddSelectedIds((prev) =>
            prev.includes(recId)
                ? prev.filter((id) => id !== recId)
                : [...prev, recId]
        );
    };

    // Visibility expansion logic (reuse your isVisibilityExpansion helper)
    function isVisibilityExpansion(rec, listVisibility, listCommunities) {
        const levels = {
            private: 0,
            connections: 1,
            communities: 2,
            public: 3,
        };
        const recLevel = levels[rec.visibility] ?? 0;
        const listLevel = levels[listVisibility] ?? 0;
        if (listLevel > recLevel) return true;
        if (
            rec.visibility === "communities" &&
            (listVisibility === "communities" || listVisibility === "specific")
        ) {
            const recComms = Array.isArray(rec.community_ids)
                ? rec.community_ids
                : [];
            const listComms = Array.isArray(list.trust_circle_ids)
                ? list.trust_circle_ids
                : [];
            return listComms.some((id) => !recComms.includes(id));
        }
        return false;
    }

    // Handle Add Selected
    const handleAddSelectedRecs = async () => {
        setAddLoading(true);
        setAddError("");
        try {
            // Find recs that will have visibility expanded
            const recsToAdd = userRecommendations.filter((rec) =>
                addSelectedIds.includes(rec.id)
            );
            const expanded = recsToAdd.filter((rec) =>
                isVisibilityExpansion(
                    rec,
                    list.visibility,
                    list.trust_circle_ids || []
                )
            );
            if (expanded.length > 0) {
                const msg =
                    "The following recommendations will have their visibility expanded to match the list:\n\n" +
                    expanded
                        .map(
                            (rec) =>
                                `${
                                    rec.title || rec.business_name || rec.id
                                } (currently: ${rec.visibility})`
                        )
                        .join("\n") +
                    "\n\nContinue?";
                if (!window.confirm(msg)) {
                    setAddLoading(false);
                    return;
                }
            }

            // Call backend to add recs to list (and update their visibility if needed)
            const res = await fetch(
                `${API_URL}/api/lists/${list.id}/add-recommendations`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        recommendationIds: addSelectedIds,
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
                throw new Error(
                    data.message || "Failed to add recommendations."
                );
            }
            setAddSelectedIds([]);
            setAddSearchTerm("");
            await fetchListAndRecs();
            setIsAddToListModalOpen(false); // Close modal after adding
        } catch (err) {
            setAddError(err.message || "Could not add recommendations.");
        } finally {
            setAddLoading(false);
        }
    };

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

    // Fetch user recommendations
    const fetchUserRecommendations = async () => {
        try {
            const res = await fetch(
                `${API_URL}/api/recommendations/user/${user.id}`
            );
            if (!res.ok) throw new Error("Failed to fetch recommendations.");
            const data = await res.json();
            setUserRecommendations(data.recommendations || []);
        } catch (err) {
            setUserRecommendations([]);
        }
    };

    useEffect(() => {
        if (!user) return;
        fetchListAndRecs();
        fetchUserRecommendations();
    }, [listId, user]);

    // Delete list
    const handleDeleteList = async () => {
        setIsDeleting(true);
        setDeleteError("");
        try {
            const res = await fetch(`${API_URL}/api/lists/${listId}`, {
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
            });
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

    const openEditListModal = () => {
        setEditListForm({
            title: list.title || "",
            description: list.description || "",
            visibility: list.visibility || "connections",
            trustCircleIds: list.trust_circle_ids || [],
            recommendationIds: recommendations.map((rec) => rec.id),
        });
        setEditListError("");
        fetchUserRecommendations();
        setIsEditListModalOpen(true);
    };

    const handleEditListSave = async () => {
        setEditListLoading(true);
        setEditListError("");
        try {
            const res = await fetch(`${API_URL}/api/lists/${list.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: editListForm.title,
                    description: editListForm.description,
                    visibility: editListForm.visibility,
                    trustCircleIds: editListForm.trustCircleIds,
                    recommendationIds: editListForm.recommendationIds,
                    user_id: user.id,
                    email:
                        user.primaryEmailAddress?.emailAddress ||
                        user.emailAddresses?.[0]?.emailAddress ||
                        "",
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to update list.");
            }
            setIsEditListModalOpen(false);
            await fetchListAndRecs(); // Refresh list details
        } catch (err) {
            setEditListError(err.message || "Could not update list.");
        } finally {
            setEditListLoading(false);
        }
    };

    const [listMenuOpen, setListMenuOpen] = useState(false);
    const listMenuRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                listMenuRef.current &&
                !listMenuRef.current.contains(event.target)
            ) {
                setListMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
                                                    "Edit cover image (coming soon!)"
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
                                {isOwner && (
                                    <div
                                        className="profile-my-rec-dropdown-wrapper"
                                        ref={listMenuRef}
                                        style={{ position: "relative" }}
                                    >
                                        <button
                                            className="profile-my-rec-three-dots-button"
                                            onClick={() =>
                                                setListMenuOpen((open) => !open)
                                            }
                                            title="List options"
                                        >
                                            ⋮
                                        </button>
                                        {listMenuOpen && (
                                            <div className="profile-my-rec-dropdown-menu">
                                                <button
                                                    className="profile-my-rec-dropdown-item"
                                                    onClick={() => {
                                                        setListMenuOpen(false);
                                                        openEditListModal();
                                                    }}
                                                >
                                                    <PencilSquareIcon /> Edit
                                                    List
                                                </button>
                                                <button
                                                    className="profile-my-rec-dropdown-item"
                                                    onClick={() => {
                                                        setListMenuOpen(false);
                                                        setIsAddToListModalOpen(
                                                            true
                                                        );
                                                    }}
                                                >
                                                    + Add Recommendations
                                                </button>
                                                <button
                                                    className="profile-my-rec-dropdown-item"
                                                    onClick={() => {
                                                        setListMenuOpen(false);
                                                        setIsDeleteRecsMode(
                                                            true
                                                        );
                                                        setSelectedRecsToDelete(
                                                            []
                                                        );
                                                    }}
                                                >
                                                    − Remove Recommendations
                                                </button>
                                                <button
                                                    className="profile-my-rec-dropdown-item delete-action"
                                                    onClick={() => {
                                                        setListMenuOpen(false);
                                                        setShowDeleteModal(
                                                            true
                                                        );
                                                    }}
                                                >
                                                    <TrashIcon />
                                                    <span className="delete-text">
                                                        Delete List
                                                    </span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
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
                                {recommendations.map((rec) =>
                                    isOwner ? (
                                        <ProfileRecommendationCard
                                            key={rec.id}
                                            rec={rec}
                                            onEdit={
                                                !isDeleteRecsMode
                                                    ? (rec) => {
                                                          setCurrentEditingRec(
                                                              rec
                                                          );
                                                          setIsEditModalOpen(
                                                              true
                                                          );
                                                      }
                                                    : undefined
                                            }
                                            user={user}
                                            onRefreshList={fetchListAndRecs}
                                            showDeleteCheckbox={
                                                isDeleteRecsMode
                                            }
                                            checked={selectedRecsToDelete.includes(
                                                rec.id
                                            )}
                                            onCheckboxChange={() => {
                                                setSelectedRecsToDelete(
                                                    (prev) =>
                                                        prev.includes(rec.id)
                                                            ? prev.filter(
                                                                  (id) =>
                                                                      id !==
                                                                      rec.id
                                                              )
                                                            : [...prev, rec.id]
                                                );
                                            }}
                                            disableActions={isDeleteRecsMode}
                                        />
                                    ) : (
                                        <RecommendationCard
                                            key={rec.id}
                                            rec={rec}
                                            // You may want to pass these props or adjust as needed:
                                            onWriteReview={() => {}}
                                            onLike={() => {}}
                                            isLikedByCurrentUser={false}
                                            loggedInUserId={user?.id}
                                            currentUserName={user?.firstName}
                                            comments={rec.comments || []}
                                            onCommentAdded={() => {}}
                                        />
                                    )
                                )}
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
                {/* Edit List Modal */}
                {isEditListModalOpen && (
                    <EditListModal
                        isOpen={isEditListModalOpen}
                        onClose={() => setIsEditListModalOpen(false)}
                        list={list}
                        userRecommendations={userRecommendations} // Replace with all user recs in next step
                        userTrustCircles={userTrustCircles}
                        onSave={handleEditListSave}
                        loading={editListLoading}
                        error={editListError}
                        formState={editListForm}
                        setFormState={setEditListForm}
                        onVisibilityChange={(val) =>
                            setEditListForm((f) => ({ ...f, visibility: val }))
                        }
                        onRecommendationToggle={(rec) => {
                            const recId = rec.id || rec;
                            setEditListForm((f) => {
                                const ids = f.recommendationIds.includes(recId)
                                    ? f.recommendationIds.filter(
                                          (id) => id !== recId
                                      )
                                    : [...f.recommendationIds, recId];
                                return { ...f, recommendationIds: ids };
                            });
                        }}
                        onTrustCircleToggle={(id) => {
                            setEditListForm((f) => {
                                const ids = f.trustCircleIds.includes(id)
                                    ? f.trustCircleIds.filter(
                                          (tcid) => tcid !== id
                                      )
                                    : [...f.trustCircleIds, id];
                                return { ...f, trustCircleIds: ids };
                            });
                        }}
                        visibilityOptions={[
                            { value: "public", label: "Public" },
                            {
                                value: "connections",
                                label: "Full Trust Circle",
                            },
                            {
                                value: "specific",
                                label: "Specific Trust Circles",
                            },
                        ]}
                        trustCirclesLoading={trustCirclesLoading}
                        trustCirclesError={trustCirclesError}
                        onConfirmVisibilityChange={() => {}} // To be implemented
                    />
                )}
                <AddToListModal
                    isOpen={isAddToListModalOpen}
                    onClose={() => setIsAddToListModalOpen(false)}
                    userRecommendations={userRecommendations}
                    recommendationsInList={recommendations}
                    list={list}
                    addLoading={addLoading}
                    addError={addError}
                    addSelectedIds={addSelectedIds}
                    setAddSelectedIds={setAddSelectedIds}
                    addSearchTerm={addSearchTerm}
                    setAddSearchTerm={setAddSearchTerm}
                    onAddSelected={handleAddSelectedRecs}
                />
            </div>
            {isDeleteRecsMode && (
                <div
                    style={{
                        position: "sticky",
                        bottom: 0,
                        background: "#fff",
                        padding: "1rem",
                        borderTop: "1px solid #e5e7eb",
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "1rem",
                        zIndex: 10,
                        marginTop: "1rem",
                    }}
                >
                    <button
                        className="profile-edit-modal-btn cancel-btn"
                        onClick={() => {
                            setIsDeleteRecsMode(false);
                            setSelectedRecsToDelete([]);
                        }}
                        disabled={deleteRecsLoading}
                    >
                        <XCircleIcon /> Cancel
                    </button>
                    <button
                        className="profile-edit-modal-btn delete-btn"
                        onClick={async () => {
                            setDeleteRecsLoading(true);
                            setDeleteRecsError("");
                            try {
                                const res = await fetch(
                                    `${API_URL}/api/lists/${list.id}/remove-recommendations`,
                                    {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                            recommendationIds:
                                                selectedRecsToDelete,
                                            user_id: user.id,
                                            email:
                                                user.primaryEmailAddress
                                                    ?.emailAddress ||
                                                user.emailAddresses?.[0]
                                                    ?.emailAddress ||
                                                "",
                                        }),
                                    }
                                );
                                const data = await res.json();
                                if (!res.ok || !data.success)
                                    throw new Error(
                                        data.message ||
                                            "Failed to remove recommendations."
                                    );
                                setIsDeleteRecsMode(false);
                                setSelectedRecsToDelete([]);
                                await fetchListAndRecs();
                            } catch (err) {
                                setDeleteRecsError(
                                    err.message ||
                                        "Could not remove recommendations."
                                );
                            } finally {
                                setDeleteRecsLoading(false);
                            }
                        }}
                        disabled={
                            deleteRecsLoading ||
                            selectedRecsToDelete.length === 0
                        }
                    >
                        {deleteRecsLoading ? (
                            <>
                                <ArrowPathIcon className="animate-spin" />{" "}
                                Deleting...
                            </>
                        ) : (
                            <>
                                <TrashIcon /> Delete Selected
                            </>
                        )}
                    </button>
                    {deleteRecsError && (
                        <div
                            className="profile-edit-modal-message error"
                            style={{ marginLeft: "1rem" }}
                        >
                            <XCircleIcon /> <span>{deleteRecsError}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ListDetail;
