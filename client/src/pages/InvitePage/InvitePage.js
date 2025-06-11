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
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [currentUrl, setCurrentUrl] = useState("");

    useEffect(() => {
        setCurrentUrl(window.location.href);
    }, []);

    useEffect(() => {
        const fetchInviteDetails = async () => {
            if (!tokenString) {
                setError("No invite token provided.");
                setLoading(false);
                return;
            }
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
        fetchInviteDetails();
    }, [tokenString]);

    const handleAcceptInvite = async () => {
        if (!isSignedIn || !user) return;
        if (!termsAccepted) {
            setError("Please accept the terms to continue.");
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(
                `${API_URL}/api/invites/${tokenString}/accept`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
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
            navigate(`/community/${data.community_id}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const renderContent = () => {
        if (loading) {
            return <div className="invite-loader"></div>;
        }

        if (error && error.includes("Already a member")) {
            return (
                <>
                    <div className="invite-info">
                        <h1 className="invite-title">You're already in!</h1>
                        <p className="invite-description">
                            You are already a member of the{" "}
                            <strong>{inviteDetails?.community_name}</strong>{" "}
                            community.
                        </p>
                    </div>
                    <div className="invite-action-card">
                        <button
                            className="invite-action-button"
                            onClick={() => navigate("/trustcircles")}
                        >
                            View My Communities
                        </button>
                    </div>
                </>
            );
        }

        if (error) {
            return (
                <>
                    <div className="invite-info">
                        <h1 className="invite-title">Something went wrong</h1>
                        <p className="invite-description">{error}</p>
                    </div>
                    <div className="invite-action-card">
                        <button
                            className="invite-action-button"
                            onClick={() => navigate("/")}
                        >
                            Return Home
                        </button>
                    </div>
                </>
            );
        }

        return (
            <>
                <div className="invite-info">
                    <p className="invite-brand">Tried & Trusted</p>
                    <h1 className="invite-title">
                        <strong>{inviteDetails?.invited_by_name}</strong> has
                        invited you to the{" "}
                        <strong>{inviteDetails?.community_name}</strong>{" "}
                        community.
                    </h1>
                    <p className="invite-description">
                        {inviteDetails?.community_description}
                    </p>
                </div>
                <div className="invite-action-card">
                    {isSignedIn ? (
                        <>
                            <h2 className="action-title">
                                Accept Your Invitation
                            </h2>
                            <div className="user-display">
                                <img
                                    src={user.imageUrl}
                                    alt="Your profile"
                                    className="user-avatar"
                                />
                                <div className="user-details">
                                    <span className="user-name">
                                        {user.fullName}
                                    </span>
                                    <span className="user-email">
                                        {user.primaryEmailAddress?.emailAddress}
                                    </span>
                                </div>
                            </div>
                            <div className="terms-agreement">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={termsAccepted}
                                    onChange={(e) =>
                                        setTermsAccepted(e.target.checked)
                                    }
                                />
                                <label htmlFor="terms">
                                    I agree to the{" "}
                                    <a href="/terms" target="_blank">
                                        Terms of Service
                                    </a>{" "}
                                    and{" "}
                                    <a href="/privacy" target="_blank">
                                        Privacy Policy
                                    </a>
                                    .
                                </label>
                            </div>
                            <button
                                className="invite-action-button"
                                onClick={handleAcceptInvite}
                                disabled={loading || !termsAccepted}
                            >
                                {loading
                                    ? "Joining..."
                                    : "Accept & Join Community"}
                            </button>
                        </>
                    ) : (
                        <>
                            <h2 className="action-title">Sign In To Accept</h2>
                            <p className="action-subtitle">
                                Create an account or sign in to join the
                                community.
                            </p>
                            <SignInButton
                                mode="modal"
                                fallbackRedirectUrl={currentUrl}
                                signUpFallbackRedirectUrl={currentUrl}
                            >
                                <button className="invite-action-button">
                                    Sign In / Sign Up
                                </button>
                            </SignInButton>
                            <div className="clerk-notice">
                                Secure sign-in is handled by our partner, Clerk.
                            </div>
                        </>
                    )}
                </div>
            </>
        );
    };

    return (
        <div className="invite-page-container">
            <div className="invite-page-grid">{renderContent()}</div>
        </div>
    );
};

export default InvitePage;

// import { useState, useEffect } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { useUser, SignInButton } from "@clerk/clerk-react";
// import "./InvitePage.css";

// const API_URL = "https://api.seanag-recommendations.org:8080";
// // const API_URL = "http://localhost:3000";

// const InvitePage = () => {
//     const { tokenString } = useParams();
//     const navigate = useNavigate();
//     const { isLoaded, isSignedIn, user } = useUser();
//     const [inviteDetails, setInviteDetails] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState("");

//     useEffect(() => {
//         const fetchInviteDetails = async () => {
//             try {
//                 const response = await fetch(
//                     `${API_URL}/api/invites/${tokenString}`
//                 );
//                 const data = await response.json();

//                 if (!response.ok) {
//                     throw new Error(
//                         data.error || "Failed to fetch invite details"
//                     );
//                 }

//                 setInviteDetails(data.details);
//             } catch (err) {
//                 setError(err.message);
//             } finally {
//                 setLoading(false);
//             }
//         };

//         if (tokenString) {
//             fetchInviteDetails();
//         }
//     }, [tokenString]);

//     const handleAcceptInvite = async () => {
//         if (!isSignedIn || !user) {
//             return; // Clerk SignIn button will handle this case
//         }

//         try {
//             setLoading(true);
//             const response = await fetch(
//                 `${API_URL}/api/invites/${tokenString}/accept`,
//                 {
//                     method: "POST",
//                     headers: {
//                         "Content-Type": "application/json",
//                     },
//                     body: JSON.stringify({
//                         actingUserClerkId: user.id,
//                         email: user.primaryEmailAddress?.emailAddress,
//                         firstName: user.firstName,
//                         lastName: user.lastName,
//                     }),
//                 }
//             );

//             const data = await response.json();

//             if (!response.ok) {
//                 throw new Error(data.error || "Failed to accept invite");
//             }

//             // Redirect to the community page
//             navigate(`/community/${data.community_id}`);
//         } catch (err) {
//             setError(err.message);
//         } finally {
//             setLoading(false);
//         }
//     };

//     if (loading) {
//         return (
//             <div className="invite-page loading">Loading invite details...</div>
//         );
//     }

//     // Handle error cases
//     return (
//         <div className="invite-page">
//             <div className="invite-card">
//                 {error && error.includes("Already a member") ? (
//                     <div className="already-member">
//                         <h2>Already a Member!</h2>
//                         <div className="community-info">
//                             <p>
//                                 You're already a member of{" "}
//                                 <strong>{inviteDetails?.community_name}</strong>
//                             </p>
//                             {inviteDetails?.community_description && (
//                                 <p className="community-description">
//                                     {inviteDetails.community_description}
//                                 </p>
//                             )}
//                         </div>
//                         <button
//                             className="view-communities-btn"
//                             onClick={() => navigate("/trustcircles")}
//                         >
//                             View My Communities
//                         </button>
//                     </div>
//                 ) : error ? (
//                     <div className="error-state">
//                         <h2>Error</h2>
//                         <p>{error}</p>
//                         <button
//                             className="return-home-btn"
//                             onClick={() => navigate("/")}
//                         >
//                             Return Home
//                         </button>
//                     </div>
//                 ) : (
//                     <div>
//                         <p>
//                             You've been invited to join{" "}
//                             <strong>{inviteDetails?.community_name}</strong>
//                         </p>
//                         {inviteDetails?.community_description && (
//                             <p className="community-description">
//                                 {inviteDetails.community_description}
//                             </p>
//                         )}
//                         <p className="invited-by">
//                             Invited by: {inviteDetails?.invited_by_name}
//                         </p>

//                         {isSignedIn ? (
//                             <button
//                                 className="accept-invite-btn"
//                                 onClick={handleAcceptInvite}
//                                 disabled={loading}
//                             >
//                                 Accept Invite
//                             </button>
//                         ) : (
//                             <SignInButton mode="modal">
//                                 <button className="accept-invite-btn">
//                                     Sign in to Accept
//                                 </button>
//                             </SignInButton>
//                         )}
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// };

// export default InvitePage;
