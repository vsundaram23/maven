import React from "react";
import "./EditListModal.css";

// Helper to determine if visibility is being expanded
function isVisibilityExpansion(rec, listVisibility, listCommunities) {
    // Map visibilities to a numeric level for comparison
    const levels = { private: 0, communities: 1, connections: 2, public: 3 };
    const recLevel = levels[rec.visibility] ?? 0;
    const listLevel = levels[listVisibility] ?? 0;

    // If list is more open than rec, expansion
    if (listLevel > recLevel) return true;

    // If both are communities, check if list has any new communities
    if (rec.visibility === "communities" && listVisibility === "communities") {
        const recComms = Array.isArray(rec.community_ids)
            ? rec.community_ids
            : [];
        const listComms = Array.isArray(listCommunities) ? listCommunities : [];
        // If list has any community not in rec, that's an expansion
        return listComms.some((id) => !recComms.includes(id));
    }

    // If rec is not shared with all list communities, that's an expansion
    if (rec.visibility === "communities" && listVisibility === "communities") {
        const recComms = Array.isArray(rec.community_ids)
            ? rec.community_ids
            : [];
        const listComms = Array.isArray(listCommunities) ? listCommunities : [];
        return listComms.some((id) => !recComms.includes(id));
    }

    return false;
}

const EditListModal = ({
    isOpen,
    onClose,
    list,
    userRecommendations,
    userTrustCircles,
    onSave,
    loading,
    error,
    formState,
    setFormState,
    onVisibilityChange,
    onRecommendationToggle,
    onTrustCircleToggle,
    visibilityOptions,
    trustCirclesLoading,
    trustCirclesError,
    onConfirmVisibilityChange,
}) => {
    const [localError, setLocalError] = React.useState("");

    if (!isOpen) return null;

    // Helper for trust circle selection
    const handleTrustCircleChange = (circleId) => {
        let selected = formState.trustCircleIds || [];
        if (selected.includes(circleId)) {
            selected = selected.filter((id) => id !== circleId);
        } else {
            selected = [...selected, circleId];
        }
        setFormState({ ...formState, trustCircleIds: selected });
    };

    // Enhanced handler for recommendation selection
    const handleRecToggle = (rec) => {
        let selected = formState.recommendationIds || [];
        const isChecked = selected.includes(rec.id);

        // Only check for expansion when adding (not removing)
        if (!isChecked) {
            const listVis = formState.visibility;
            const listComms = formState.trustCircleIds || [];

            if (isVisibilityExpansion(rec, listVis, listComms)) {
                let msg =
                    "Adding this recommendation will expand its visibility to match the list.";
                if (listVis === "public") {
                    msg =
                        "This recommendation will become public if added to this list. Continue?";
                } else if (listVis === "connections") {
                    msg =
                        "This recommendation will be shared with your full trust circle if added to this list. Continue?";
                } else if (listVis === "communities") {
                    msg =
                        "This recommendation will be shared with additional communities if added to this list. Continue?";
                }
                if (!window.confirm(msg)) {
                    return;
                }
            }
        }

        // Proceed with add/remove
        if (isChecked) {
            selected = selected.filter((id) => id !== rec.id);
        } else {
            selected = [...selected, rec.id];
        }
        setFormState({ ...formState, recommendationIds: selected });
    };

    // Save handler with trust circle validation
    const handleSubmit = (e) => {
        e.preventDefault();
        setLocalError("");
        if (
            formState.visibility === "specific" &&
            (!formState.trustCircleIds || formState.trustCircleIds.length === 0)
        ) {
            setLocalError("Please select at least one trust circle.");
            return;
        }
        onSave();
    };

    return (
        <div className="edit-list-modal-overlay">
            <div className="edit-list-modal-content">
                <button
                    className="edit-list-modal-close-btn"
                    onClick={onClose}
                    aria-label="Close"
                >
                    &times;
                </button>
                <h2 className="edit-list-modal-title">Edit List</h2>

                <form onSubmit={handleSubmit}>
                    <label className="edit-list-label">
                        Title
                        <input
                            className="edit-list-input"
                            type="text"
                            value={formState.title}
                            onChange={(e) =>
                                setFormState({
                                    ...formState,
                                    title: e.target.value,
                                })
                            }
                            required
                        />
                    </label>

                    <label className="edit-list-label">
                        Description
                        <textarea
                            className="edit-list-textarea"
                            value={formState.description}
                            onChange={(e) =>
                                setFormState({
                                    ...formState,
                                    description: e.target.value,
                                })
                            }
                            rows={3}
                        />
                    </label>

                    <label className="edit-list-label">
                        Visibility
                        <select
                            className="edit-list-select"
                            value={formState.visibility}
                            onChange={(e) => onVisibilityChange(e.target.value)}
                        >
                            {visibilityOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    {formState.visibility === "specific" && (
                        <div className="edit-list-trust-circles">
                            <div className="edit-list-label">
                                Select Trust Circles
                            </div>
                            {trustCirclesLoading ? (
                                <div>Loading circles...</div>
                            ) : trustCirclesError ? (
                                <div className="edit-list-error">
                                    {trustCirclesError}
                                </div>
                            ) : (
                                <div className="edit-list-trust-circles-list">
                                    {userTrustCircles.map((circle) => (
                                        <label
                                            key={circle.id}
                                            className="edit-list-checkbox-label"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formState.trustCircleIds?.includes(
                                                    circle.id
                                                )}
                                                onChange={() =>
                                                    handleTrustCircleChange(
                                                        circle.id
                                                    )
                                                }
                                            />
                                            {circle.name}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div
                        className="edit-list-label"
                        style={{ marginTop: "1.2rem" }}
                    >
                        Recommendations in this list
                    </div>
                    <div className="edit-list-recommendations-list">
                        {loading ? (
                            <div className="edit-list-spinner-container">
                                <div className="edit-list-spinner"></div>
                                <span
                                    style={{
                                        marginLeft: 10,
                                        color: "#888",
                                    }}
                                >
                                    Loading recommendations...
                                </span>
                            </div>
                        ) : (
                            userRecommendations.map((rec) => (
                                <label
                                    key={rec.id}
                                    className="edit-list-checkbox-label"
                                >
                                    <input
                                        type="checkbox"
                                        checked={formState.recommendationIds?.includes(
                                            rec.id
                                        )}
                                        onChange={() => handleRecToggle(rec)}
                                    />
                                    {rec.title || rec.business_name}
                                </label>
                            ))
                        )}
                    </div>

                    {(localError || error) && (
                        <div className="edit-list-error">
                            {localError || error}
                        </div>
                    )}

                    <div className="edit-list-modal-actions">
                        <button
                            type="submit"
                            className="edit-list-modal-save-btn"
                            disabled={loading}
                        >
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                            type="button"
                            className="edit-list-modal-cancel-btn"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditListModal;
