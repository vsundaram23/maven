import React, { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import "./TrustCircles.css";

const API_URL = "https://api.seanag-recommendations.org:8080";
// const API_URL = "http://localhost:5000";

const PersonAddIcon = () => (
    <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="currentColor"
        style={{ marginRight: "8px" }}
    >
        <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
);
const GroupAddIcon = () => (
    <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="currentColor"
        style={{ marginRight: "8px" }}
    >
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
);
const LaunchIcon = () => (
    <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="currentColor"
        style={{ marginLeft: "6px" }}
    >
        <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
    </svg>
);
const SearchIcon = () => (
    <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="currentColor"
        style={{ marginRight: "8px" }}
    >
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
);
const HourglassTopIcon = () => (
    <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="currentColor"
        style={{ marginRight: "8px" }}
    >
        <path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16.01l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zM8 4h8v3.5l-4 4-4-4V4z" />
    </svg>
);

const TrustCircles = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const navigate = useNavigate();

    if (!isLoaded) {
        return <div className="loading-message">Loading...</div>;
    }

    if (!isSignedIn) {
        navigate("/");
        return null;
    }

    const [currentUser, setCurrentUser] = useState(null);
    const [individualConnections, setIndividualConnections] = useState([]);
    const [myCommunities, setMyCommunities] = useState([]);
    const [availableCommunities, setAvailableCommunities] = useState([]);
    const [joinRequests, setJoinRequests] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showAddPersonModal, setShowAddPersonModal] = useState(false);
    const [newPersonEmail, setNewPersonEmail] = useState("");

    const [showCreateCommunityModal, setShowCreateCommunityModal] =
        useState(false);
    const [newCommunityName, setNewCommunityName] = useState("");
    const [newCommunityDescription, setNewCommunityDescription] = useState("");

    const [activeTab, setActiveTab] = useState("myTrust");

    const fetchCurrentUserAndData = useCallback(async () => {
        if (!user || !user.primaryEmailAddress?.emailAddress) {
            console.warn("No user email available");
            navigate("/");
            return;
        }

        const userEmail = user.primaryEmailAddress.emailAddress;

        setLoading(true);
        setError("");

        try {
            // Update API calls to use Clerk user data
            const params = new URLSearchParams({
                user_id: user.id,
                email: userEmail,
            });

            const userRes = await fetch(
                `${API_URL}/api/communities/user/email/${userEmail}?${params.toString()}`
            );
            if (!userRes.ok) throw new Error("Failed to fetch user details.");
            const userData = await userRes.json();
            setCurrentUser(userData);

            const connectionsResponse = await fetch(
                `${API_URL}/api/connections/check-connections`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: userEmail }),
                }
            );
            if (!connectionsResponse.ok)
                throw new Error("Failed to fetch individual connections.");
            const connectionsData = await connectionsResponse.json();
            const uniqueConnections = Array.from(
                new Set(connectionsData.map((u) => u.email))
            ).map((email) => connectionsData.find((u) => u.email === email));
            setIndividualConnections(uniqueConnections);

            const myCommRes = await fetch(
                `${API_URL}/api/communities/user/${userEmail}/communities`
            );
            if (!myCommRes.ok)
                throw new Error("Failed to fetch your communities.");
            let myCommData = await myCommRes.json();
            myCommData = Array.isArray(myCommData) ? myCommData : [];
            if (Array.isArray(myCommData)) {
                const uniqueMyComms = [];
                const seenIds = new Set();
                for (const community of myCommData) {
                    if (
                        community &&
                        community.id &&
                        !seenIds.has(community.id)
                    ) {
                        uniqueMyComms.push(community);
                        seenIds.add(community.id);
                    }
                }
                myCommData = uniqueMyComms;
            } else {
                myCommData = [];
            }
            myCommData = myCommData.map((c) => ({
                ...c,
                recommendations:
                    c.recommendation_count || Math.floor(Math.random() * 25),
            }));
            setMyCommunities(myCommData);

            const allCommRes = await fetch(
                `${API_URL}/api/communities/all${
                    userData && userData.id ? `?user_id=${userData.id}` : ""
                }`
            );
            if (!allCommRes.ok)
                throw new Error("Failed to fetch available communities.");
            let allCommData = await allCommRes.json();
            allCommData = Array.isArray(allCommData) ? allCommData : [];
            allCommData = allCommData.map((c) => ({
                ...c,
                memberCount:
                    c.member_count || Math.floor(Math.random() * 100) + 5,
            }));
            setAvailableCommunities(allCommData);

            const ownedCommunityIds = myCommData
                .filter((c) => c.created_by === userData.id)
                .map((c) => c.id);
            const requests = {};
            for (const communityId of ownedCommunityIds) {
                const reqRes = await fetch(
                    `${API_URL}/api/communities/${communityId}/requests?user_id=${userData.id}`
                );
                if (reqRes.ok) {
                    const reqData = await reqRes.json();
                    requests[communityId] = Array.isArray(reqData)
                        ? reqData
                        : [];
                } else {
                    console.warn(
                        `Failed to fetch requests for community ${communityId}`
                    );
                    requests[communityId] = [];
                }
            }
            setJoinRequests(requests);
        } catch (err) {
            console.error("Error loading Trust Circle data:", err);
            setError(err.message || "Could not load data. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [navigate, user]);

    useEffect(() => {
        fetchCurrentUserAndData();
    }, [fetchCurrentUserAndData]);

    const handleAddIndividualConnection = async (e) => {
        e.preventDefault();
        if (!newPersonEmail.trim() || !currentUser) return;
        alert(
            `Simulated: Connection request sent to ${newPersonEmail}. Implement the backend call.`
        );
        setNewPersonEmail("");
        setShowAddPersonModal(false);
    };

    const handleCreateCommunity = async (e) => {
        e.preventDefault();
        if (!newCommunityName.trim() || !currentUser) return;
        try {
            const response = await fetch(`${API_URL}/api/communities/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newCommunityName,
                    description: newCommunityDescription,
                    created_by: currentUser.id,
                }),
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Failed to create community.");
            }
            alert("Community created successfully!");
            setNewCommunityName("");
            setNewCommunityDescription("");
            setShowCreateCommunityModal(false);
            fetchCurrentUserAndData();
        } catch (err) {
            console.error("Error creating community:", err);
            alert(`Error creating community: ${err.message}`);
        }
    };

    const handleRequestToJoinCommunity = async (communityId) => {
        if (!currentUser) return;
        try {
            const response = await fetch(`${API_URL}/api/communities/request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    community_id: communityId,
                }),
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Failed to request join.");
            }
            alert("Request to join community sent!");
            fetchCurrentUserAndData();
        } catch (err) {
            console.error("Error requesting to join community:", err);
            alert(`Error: ${err.message}`);
        }
    };

    const handleApproveMembership = async (communityId, targetUserId) => {
        if (!currentUser) {
            alert("Current user not found. Cannot approve membership.");
            return;
        }
        try {
            const response = await fetch(`${API_URL}/api/communities/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    community_id: communityId,
                    user_id: targetUserId,
                    approver_id: currentUser.id,
                }),
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(
                    errData.error || "Failed to approve membership."
                );
            }
            alert("Membership approved!");
            fetchCurrentUserAndData();
        } catch (err) {
            console.error("Error approving membership:", err);
            alert(`Error: ${err.message}`);
        }
    };

    const navigateToCommunity = (communityId) => {
        navigate(`/community/${communityId}`);
    };

    if (loading) {
        return (
            <div className="loading-message">Loading your Trust Circle...</div>
        );
    }

    if (error) {
        return (
            <div className="empty-message" style={{ color: "red" }}>
                Error: {error}
            </div>
        );
    }

    return (
        <div className="trust-circles-page-container">
            <header>
                <h1 className="trust-circles-main-header">
                    Manage Your Trust Network
                </h1>
                <p className="trust-circles-sub-header">
                    Connect with individuals and communities to build your
                    trusted circle for recommendations and insights.
                </p>
            </header>

            <div className="tabs">
                <button
                    className={`tab-button ${
                        activeTab === "myTrust" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("myTrust")}
                >
                    My Trust Circle
                </button>
                <button
                    className={`tab-button ${
                        activeTab === "discover" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("discover")}
                >
                    Discover Communities
                </button>
            </div>

            {activeTab === "myTrust" && (
                <div className="tab-content">
                    <section className="section-container">
                        <div className="section-title-container">
                            <h2 className="section-title">
                                Individual Connections
                            </h2>
                            <div className="section-actions">
                                <button
                                    className="button button-primary button-small icon-button"
                                    onClick={() => setShowAddPersonModal(true)}
                                >
                                    <PersonAddIcon /> Add Connection
                                </button>
                            </div>
                        </div>
                        {individualConnections.length === 0 ? (
                            <p className="empty-message">
                                You haven't added any individual connections
                                yet.{" "}
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setShowAddPersonModal(true);
                                    }}
                                >
                                    Add your first connection
                                </a>
                                .
                            </p>
                        ) : (
                            <div className="grid-layout">
                                {individualConnections.map((user) => (
                                    <div className="card" key={user.email}>
                                        <div className="card-content">
                                            <span className="status-badge status-connected">
                                                Connected
                                            </span>
                                            <h3 className="card-title">
                                                {user.name}
                                            </h3>
                                            <p className="card-subtitle">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="section-container">
                        <div className="section-title-container">
                            <h2 className="section-title">My Communities</h2>
                            <div className="section-actions">
                                <button
                                    className="button button-success button-small icon-button"
                                    onClick={() =>
                                        setShowCreateCommunityModal(true)
                                    }
                                >
                                    <GroupAddIcon /> Create Community
                                </button>
                                <button
                                    className="button button-outline button-small icon-button"
                                    onClick={() => setActiveTab("discover")}
                                >
                                    <SearchIcon /> Discover More
                                </button>
                            </div>
                        </div>
                        {myCommunities.length === 0 ? (
                            <p className="empty-message">
                                You are not a member of any communities yet.{" "}
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveTab("discover");
                                    }}
                                >
                                    Discover communities
                                </a>{" "}
                                to join or{" "}
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setShowCreateCommunityModal(true);
                                    }}
                                >
                                    create your own
                                </a>
                                .
                            </p>
                        ) : (
                            <div className="grid-layout">
                                {myCommunities.map((community) => (
                                    <div className="card" key={community.id}>
                                        <div className="card-content">
                                            {community.created_by ===
                                            currentUser?.id ? (
                                                <span className="status-badge status-owner">
                                                    Owner
                                                </span>
                                            ) : (
                                                <span className="status-badge status-member">
                                                    Member
                                                </span>
                                            )}
                                            <h3 className="card-title">
                                                {community.name}
                                            </h3>
                                            <p className="card-description">
                                                {community.description}
                                            </p>
                                            <p className="card-info">
                                                {community.recommendations}{" "}
                                                Recommendations
                                            </p>
                                        </div>
                                        <div className="card-actions">
                                            <button
                                                className="button button-outline"
                                                onClick={() =>
                                                    navigateToCommunity(
                                                        community.id
                                                    )
                                                }
                                            >
                                                View Community <LaunchIcon />
                                            </button>
                                            {community.created_by ===
                                                currentUser?.id &&
                                                joinRequests[community.id] &&
                                                joinRequests[community.id]
                                                    .length > 0 && (
                                                    <div className="pending-requests-section">
                                                        <h4 className="pending-requests-title">
                                                            Pending Join
                                                            Requests (
                                                            {
                                                                joinRequests[
                                                                    community.id
                                                                ].length
                                                            }
                                                            ):
                                                        </h4>
                                                        {joinRequests[
                                                            community.id
                                                        ]
                                                            .slice(0, 2)
                                                            .map((req) => (
                                                                <div
                                                                    key={
                                                                        req.user_id
                                                                    }
                                                                    className="request-item"
                                                                >
                                                                    <span className="request-item-info">
                                                                        {
                                                                            req.name
                                                                        }{" "}
                                                                        (
                                                                        {
                                                                            req.email
                                                                        }
                                                                        )
                                                                    </span>
                                                                    <button
                                                                        className="button button-success button-small"
                                                                        onClick={() =>
                                                                            handleApproveMembership(
                                                                                community.id,
                                                                                req.user_id
                                                                            )
                                                                        }
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        {joinRequests[
                                                            community.id
                                                        ].length > 2 && (
                                                            <p
                                                                style={{
                                                                    fontSize:
                                                                        "0.8rem",
                                                                    textAlign:
                                                                        "center",
                                                                    marginTop:
                                                                        "5px",
                                                                }}
                                                            >
                                                                +{" "}
                                                                {joinRequests[
                                                                    community.id
                                                                ].length -
                                                                    2}{" "}
                                                                more...
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {activeTab === "discover" && (
                <div className="tab-content">
                    <section className="section-container">
                        <div className="section-title-container">
                            <h2 className="section-title">
                                Discover & Join Communities
                            </h2>
                            <div className="section-actions">
                                <button
                                    className="button button-success button-small icon-button"
                                    onClick={() =>
                                        setShowCreateCommunityModal(true)
                                    }
                                >
                                    <GroupAddIcon /> Create New Community
                                </button>
                            </div>
                        </div>
                        {availableCommunities.filter(
                            (community) =>
                                community.user_membership_status !==
                                    "approved" &&
                                community.created_by !== currentUser?.id
                        ).length === 0 ? (
                            <p className="empty-message">
                                No new communities to discover or join at the
                                moment.
                            </p>
                        ) : (
                            <div className="grid-layout">
                                {availableCommunities
                                    .filter(
                                        (community) =>
                                            community.user_membership_status !==
                                                "approved" &&
                                            community.created_by !==
                                                currentUser?.id
                                    )
                                    .map((community) => (
                                        <div
                                            className="card"
                                            key={community.id}
                                        >
                                            <div className="card-content">
                                                <h3 className="card-title">
                                                    {community.name}
                                                </h3>
                                                <p className="card-description">
                                                    {community.description}
                                                </p>
                                                <p className="card-info">
                                                    {community.memberCount}{" "}
                                                    members
                                                </p>
                                            </div>
                                            <div className="card-actions">
                                                {community.user_membership_status ===
                                                "requested" ? (
                                                    <button
                                                        className="button button-small icon-button status-requested"
                                                        disabled
                                                    >
                                                        <HourglassTopIcon />{" "}
                                                        Request Sent
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="button button-primary"
                                                        onClick={() =>
                                                            handleRequestToJoinCommunity(
                                                                community.id
                                                            )
                                                        }
                                                        disabled={!currentUser}
                                                    >
                                                        Request to Join
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {showAddPersonModal && (
                <div
                    className="modal-backdrop"
                    onClick={() => setShowAddPersonModal(false)}
                >
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="modal-header">
                            Add Individual Connection
                        </h3>
                        <form onSubmit={handleAddIndividualConnection}>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="Enter email of person to connect with"
                                value={newPersonEmail}
                                onChange={(e) =>
                                    setNewPersonEmail(e.target.value)
                                }
                                required
                            />
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="button button-secondary"
                                    onClick={() => setShowAddPersonModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="button button-primary"
                                >
                                    Send Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showCreateCommunityModal && (
                <div
                    className="modal-backdrop"
                    onClick={() => setShowCreateCommunityModal(false)}
                >
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="modal-header">Create New Community</h3>
                        <form onSubmit={handleCreateCommunity}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Community Name"
                                value={newCommunityName}
                                onChange={(e) =>
                                    setNewCommunityName(e.target.value)
                                }
                                required
                            />
                            <textarea
                                className="form-textarea"
                                placeholder="Community Description (optional)"
                                value={newCommunityDescription}
                                onChange={(e) =>
                                    setNewCommunityDescription(e.target.value)
                                }
                            />
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="button button-secondary"
                                    onClick={() =>
                                        setShowCreateCommunityModal(false)
                                    }
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="button button-success"
                                >
                                    Create Community
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrustCircles;
