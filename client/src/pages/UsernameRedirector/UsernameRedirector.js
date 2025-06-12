import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = "http://localhost:3000";

const UsernameRedirector = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    useEffect(() => {
        // A list of your app's actual routes.
        // This helps prevent this component from trying to look up a user named "login", for example.
        const knownRoutes = [
            'profile', 'login', 'search', 'pwa', 'financial-services', 'auto-services', 
            'repair-services', 'cleaning-services', 'utilities', 'renovation-services', 
            'outdoor-services', 'moving-services', 'trustcircles', 'provider', 
            'share-recommendation', 'user', 'community', 'invite'
        ];

        // If the path is a known route, do nothing. This check is a safeguard.
        // The real protection comes from placing this route last in App.js.
        if (knownRoutes.includes(username)) return;

        const findUserAndRedirect = async () => {
            try {
                const response = await fetch(`${API_URL}/api/users/pro/${username}`);
                if (!response.ok) throw new Error('User not found');
                
                const data = await response.json();
                if (data.success && data.userId) {
                    // Success! Redirect to the real profile page.
                    // 'replace: true' ensures the user can use the back button correctly.
                    navigate(`/profile/${data.userId}`, { replace: true });
                } else {
                    throw new Error('User not found');
                }
            } catch (err) {
                setError(`A profile for "${username}" could not be found.`);
            }
        };

        findUserAndRedirect();
    }, [username, navigate]);

    if (error) {
        return <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2em' }}>{error}</div>;
    }

    // You can show a loading spinner here for a better user experience
    return <div className="profile-loading-container"><div className="profile-spinner"></div></div>;
};

export default UsernameRedirector;