import React from "react";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

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

// Helper to generate a placeholder image with the list title
function getFillerImage(title) {
    // Limit title to 22 chars with ellipsis if too long
    let displayTitle = (title || "List").trim();
    if (displayTitle.length > 22) {
        displayTitle = displayTitle.slice(0, 19) + "...";
    }
    // Encode for URL
    const encoded = encodeURIComponent(displayTitle);
    // Placehold.co supports custom text
    return `https://placehold.co/200x200?text=${encoded}`;
}

const ListCard = ({ list }) => {
    // Handler to open the list detail page in a new tab
    const openListInNewTab = (e) => {
        // Prevent default navigation if triggered by keyboard or click
        if (e) e.stopPropagation();
        window.open(`/lists/${list.id}`, "_blank", "noopener,noreferrer");
    };

    // Use cover image if present, else fallback with title
    const coverImageSrc =
        getCoverImageSrc(list.cover_image) || getFillerImage(list.title);

    return (
        <div
            className="profile-list-card"
            tabIndex={0}
            role="button"
            aria-label={`Open list ${list.title}`}
            onClick={openListInNewTab}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    openListInNewTab(e);
                }
            }}
            style={{
                width: "160px",
                borderRadius: "1.2rem",
                overflow: "hidden",
                cursor: "pointer",
                marginRight: "1.2rem",
                flex: "0 0 160px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                background: "none",
                border: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                padding: 0,
            }}
        >
            {/* Cover image with expand icon */}
            <div
                style={{
                    width: "100%",
                    height: "120px",
                    background: `url(${coverImageSrc}) center center/cover no-repeat`,
                    position: "relative",
                    padding: 0,
                }}
            >
                <button
                    className="profile-list-card-expand-btn"
                    onClick={openListInNewTab}
                    style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        zIndex: 2,
                        background: "rgba(0,0,0,0.5)",
                        border: "none",
                        borderRadius: "50%",
                        padding: 6,
                        cursor: "pointer",
                        color: "#fff",
                    }}
                    title="Open list in new tab"
                    tabIndex={-1}
                >
                    <ArrowTopRightOnSquareIcon
                        style={{ width: 18, height: 18 }}
                    />
                </button>
            </div>
            {/* Metadata below the image */}
            <div
                className="profile-list-card-info"
                style={{
                    width: "100%",
                    background: "none",
                    color: "#222",
                    padding: "0.7rem 0.8rem 0.6rem 0.8rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.15rem",
                    borderBottomLeftRadius: "1.2rem",
                    borderBottomRightRadius: "1.2rem",
                    minHeight: "60px",
                }}
            >
                <h3
                    className="profile-list-card-title"
                    style={{
                        fontSize: "1rem",
                        fontWeight: 700,
                        margin: "0 0 2px 0",
                        color: "#222",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                    title={list.title}
                >
                    {list.title}
                </h3>
                <p
                    className="profile-list-card-desc"
                    style={{
                        fontSize: "0.85rem",
                        fontWeight: 400,
                        margin: "0 0 2px 0",
                        color: "#444",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        opacity: 0.92,
                    }}
                    title={list.description}
                >
                    {list.description}
                </p>
                <div
                    className="profile-list-card-meta"
                    style={{
                        fontSize: "0.8rem",
                        fontWeight: 500,
                        opacity: 0.7,
                        display: "flex",
                        gap: "0.7rem",
                        marginTop: "0.1rem",
                        color: "#666",
                    }}
                >
                    <span>
                        {list.recommendationCount ??
                            list.recommendations?.length ??
                            0}{" "}
                        recs
                    </span>
                    <span>
                        {new Date(list.created_at).toLocaleDateString()}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ListCard;
