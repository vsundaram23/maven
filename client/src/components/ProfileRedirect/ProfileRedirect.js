import { useUser } from '@clerk/clerk-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'https://api.seanag-recommendations.org:8080';

const ProfileRedirect = () => {
    const navigate = useNavigate();
    const { user, isLoaded, isSignedIn } = useUser();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const redirectToUserProfile = async () => {
            if (!isLoaded) return;
            
            if (!isSignedIn) {
                navigate('/');
                return;
            }

            try {
                const response = await fetch(`${API_URL}/api/users/me/recommendations?user_id=${user.id}&email=${user.primaryEmailAddress?.emailAddress}`);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch user data');
                }
                
                const data = await response.json();
                
                if (data.success && data.userUsername) {
                    // Redirect to the unified profile page with the user's username
                    navigate(`/pro/${data.userUsername}`, { replace: true });
                } else {
                    // Fallback: if no username, still need to handle this case
                    // You might want to redirect to a setup page or show an error
                    setError('Username not found. Please complete your profile setup.');
                }
            } catch (err) {
                console.error('Error fetching user profile:', err);
                setError('Failed to load profile. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        redirectToUserProfile();
    }, [user, isLoaded, isSignedIn, navigate]);

    if (loading) {
        return (
            <div className="profile-loading-container">
                <div className="profile-spinner"></div>
                <p>Redirecting to your profile...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="profile-error-banner">
                {error}
            </div>
        );
    }

    return null;
};

export default ProfileRedirect; 