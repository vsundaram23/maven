import { useUser } from "@clerk/clerk-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../utils/constants";

// A lightweight component that simply resolves the current user's preferred
// username (as exposed by the backend) then performs a client-side redirect
// to `/pro/{username}`. This lets the legacy `/profile` link continue to work
// while ensuring we always land on the unified PublicProfile page.
export default function ProfileRedirect() {
    const { user, isLoaded } = useUser();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoaded) return; // wait for Clerk

        // If the user is not signed in just bounce to home/login
        if (!user) {
            navigate("/", { replace: true });
            return;
        }

        // Helper to fetch the backend-defined username for the current user
        async function resolveAndRedirect() {
            try {
                const res = await fetch(
                    `${API_URL}/api/users/me/recommendations?user_id=${user.id}&email=${user.primaryEmailAddress?.emailAddress}`
                );

                if (!res.ok) throw new Error("Failed to resolve username");

                const data = await res.json();
                const username =
                    data.userUsername || data.user_name || data.userName;

                if (username) {
                    navigate(`/pro/${username}`, { replace: true });
                } else {
                    // Fallback – no username yet, stay on /profile for now.
                    console.warn("No username returned for current user");
                }
            } catch (err) {
                console.error("Error redirecting to user profile:", err);
            }
        }

        resolveAndRedirect();
    }, [isLoaded, user, navigate]);

    // Simple placeholder while redirecting
    return null;
} 