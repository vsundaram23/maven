import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser, SignInButton } from "@clerk/clerk-react";
import "./InvitePage.css";

const API_URL = "https://api.seanag-recommendations.org:8080";
// const API_URL = "http://localhost:3000";

const InvitePage = () => {
    const { tokenString } = useParams();
    const navigate = useNavigate();
    const { isLoaded, isSignedIn, user } = useUser();
    const [inviteDetails, setInviteDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchInviteDetails = async () => {
            try {
                const response = await fetch(
                    `${API_URL}/api/invites/${tokenString}`
                );
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "Failed to fetch invite details"
                    );
                }

                setInviteDetails(data.details);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (tokenString) {
            fetchInviteDetails();
        }
    }, [tokenString]);

    const handleAcceptInvite = async () => {
        if (!isSignedIn || !user) {
            return; // Clerk SignIn button will handle this case
        }

        try {
            setLoading(true);
            const response = await fetch(
                `${API_URL}/api/invites/${tokenString}/accept`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        actingUserClerkId: user.id,
                        email: user.primaryEmailAddress?.emailAddress,
                        firstName: user.firstName,
                        lastName: user.lastName,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to accept invite");
            }

            // Redirect to the community page
            navigate(`/community/${data.community_id}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="invite-page loading">Loading invite details...</div>
        );
    }

    // Handle error cases
    return (
        <div className="invite-page">
            <div className="invite-card">
                {error && error.includes("Already a member") ? (
                    <div className="already-member">
                        <h2>Already a Member!</h2>
                        <div className="community-info">
                            <p>
                                You're already a member of{" "}
                                <strong>{inviteDetails?.community_name}</strong>
                            </p>
                            {inviteDetails?.community_description && (
                                <p className="community-description">
                                    {inviteDetails.community_description}
                                </p>
                            )}
                        </div>
                        <button
                            className="view-communities-btn"
                            onClick={() => navigate("/trustcircles")}
                        >
                            View My Communities
                        </button>
                    </div>
                ) : error ? (
                    <div className="error-state">
                        <h2>Error</h2>
                        <p>{error}</p>
                        <button
                            className="return-home-btn"
                            onClick={() => navigate("/")}
                        >
                            Return Home
                        </button>
                    </div>
                ) : (
                    <div>
                        <p>
                            You've been invited to join{" "}
                            <strong>{inviteDetails?.community_name}</strong>
                        </p>
                        {inviteDetails?.community_description && (
                            <p className="community-description">
                                {inviteDetails.community_description}
                            </p>
                        )}
                        <p className="invited-by">
                            Invited by: {inviteDetails?.invited_by_name}
                        </p>

                        {isSignedIn ? (
                            <button
                                className="accept-invite-btn"
                                onClick={handleAcceptInvite}
                                disabled={loading}
                            >
                                Accept Invite
                            </button>
                        ) : (
                            <SignInButton mode="modal">
                                <button className="accept-invite-btn">
                                    Sign in to Accept
                                </button>
                            </SignInButton>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvitePage;
