import React from "react";
import "./AddToListModal.css";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const AddToListModal = ({
    isOpen,
    onClose,
    userRecommendations,
    recommendationsInList,
    list,
    addLoading,
    addError,
    addSelectedIds,
    setAddSelectedIds,
    addSearchTerm,
    setAddSearchTerm,
    onAddSelected,
}) => {
    if (!isOpen) return null;

    const recsInListIds = new Set(recommendationsInList.map((r) => r.id));

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

    return (
        <div className="add-to-list-modal-overlay">
            <div className="add-to-list-modal-content">
                <button
                    className="add-to-list-modal-close-btn"
                    onClick={onClose}
                    aria-label="Close"
                >
                    &times;
                </button>
                <h3 className="add-to-list-modal-title">
                    Add Recommendations to List
                </h3>
                <div className="add-to-list-modal-search-row">
                    <MagnifyingGlassIcon
                        style={{ width: 20, height: 20, color: "#888" }}
                    />
                    <input
                        className="add-to-list-modal-search"
                        type="text"
                        placeholder="Search your recommendations..."
                        value={addSearchTerm}
                        onChange={(e) => setAddSearchTerm(e.target.value)}
                    />
                </div>
                <div className="add-to-list-modal-list">
                    {filteredAddRecs.length === 0 ? (
                        <div className="add-to-list-modal-empty">
                            No recommendations found.
                        </div>
                    ) : (
                        filteredAddRecs.map((rec) => {
                            const inList = recsInListIds.has(rec.id);
                            return (
                                <label
                                    key={rec.id}
                                    className={`add-to-list-modal-checkbox-label${
                                        inList ? " in-list" : ""
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        disabled={inList || addLoading}
                                        checked={addSelectedIds.includes(
                                            rec.id
                                        )}
                                        onChange={() =>
                                            handleAddRecToggle(rec.id)
                                        }
                                    />
                                    <span>
                                        {rec.title || rec.business_name}
                                        {inList && (
                                            <span className="add-to-list-modal-badge">
                                                Already in list
                                            </span>
                                        )}
                                    </span>
                                </label>
                            );
                        })
                    )}
                </div>
                {addError && (
                    <div className="add-to-list-modal-error">{addError}</div>
                )}
                <button
                    className="add-to-list-modal-btn"
                    onClick={onAddSelected}
                    disabled={addLoading || addSelectedIds.length === 0}
                >
                    {addLoading ? "Adding..." : "Add Selected"}
                </button>
            </div>
        </div>
    );
};

export default AddToListModal;
