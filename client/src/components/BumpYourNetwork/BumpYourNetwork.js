import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useMemo, useState } from 'react';
import { FaBolt, FaCheck, FaCheckCircle, FaMapMarkerAlt, FaPaperPlane, FaPlus, FaSearch, FaStar, FaUsers } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import SuggestedFollowersModal from '../SuggestedFollowersModal/SuggestedFollowersModal';
import './BumpYourNetwork.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = "http://localhost:3000";

const generateInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length > 1) {
        return parts[0][0] + parts[parts.length - 1][0];
    }
    return parts[0].slice(0, 2);
};

const getBadgeForReason = (reason, degree) => {
    const lowerReason = reason.toLowerCase();
    
    // Priority 1: Degree-specific badges
    if (lowerReason.includes('1st degree') || lowerReason.includes('directly')) {
        return { text: '1st Degree', color: 'green', icon: <FaCheckCircle /> };
    }
    if (lowerReason.includes('2nd degree') || lowerReason.includes('followed by someone')) {
        return { text: '2nd Degree', color: 'blue', icon: <FaUsers /> };
    }
    
    // Priority 2: Activity-based badges
    if (lowerReason.includes('plumber') || lowerReason.includes('recommended')) {
        return { text: 'Recent Helper', color: 'green', icon: <FaCheckCircle /> };
    }
    if (lowerReason.includes('response rate') || lowerReason.includes('responds quickly')) {
        return { text: 'Reliable', color: 'blue', icon: <FaStar /> };
    }
    if (lowerReason.includes('contractors') || lowerReason.includes('interested in')) {
        return { text: 'Similar Interest', color: 'purple', icon: <FaUsers /> };
    }
    if (lowerReason.includes('active in your area') || lowerReason.includes('same state')) {
        return { text: 'Local', color: 'orange', icon: <FaMapMarkerAlt /> };
    }
    
    // Fallback based on degree if provided
    if (degree === 1) {
        return { text: '1st Degree', color: 'green', icon: <FaCheckCircle /> };
    }
    if (degree === 2) {
        return { text: '2nd Degree', color: 'blue', icon: <FaUsers /> };
    }
    
    return { text: 'Trusted', color: 'gray', icon: <FaStar /> };
};

const BumpYourNetwork = ({ isOpen, onClose, query: propQuery, currentUser, isPage = false }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const query = location.state?.query || propQuery;

    const [suggestedRecommenders, setSuggestedRecommenders] = useState([]);
    const [selectedRecommenders, setSelectedRecommenders] = useState(new Set());
    const [isLoading, setIsLoading] = useState(false); // Loader is only for the page view
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(null);
    const [step, setStep] = useState('suggest');
    const [context, setContext] = useState('');
    const [dataFetched, setDataFetched] = useState(false);
    const [following, setFollowing] = useState([]);
    const [followingSearch, setFollowingSearch] = useState("");
    const [followingScores, setFollowingScores] = useState({});
    
    // New state for suggested followers modal
    const [showSuggestedFollowersModal, setShowSuggestedFollowersModal] = useState(false);
    const [suggestedFollowers, setSuggestedFollowers] = useState([]);
    const [isLoadingSuggestedFollowers, setIsLoadingSuggestedFollowers] = useState(false);
    const [hasConnections, setHasConnections] = useState(true);
    const [userState, setUserState] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const filteredSuggestedRecommenders = useMemo(() => {
        if (!followingSearch.trim()) {
            return suggestedRecommenders;
        }
        const searchLower = followingSearch.toLowerCase();
        return suggestedRecommenders.filter(user =>
            (user.name || '').toLowerCase().includes(searchLower) ||
            (user.reason || '').toLowerCase().includes(searchLower)
        );
    }, [followingSearch, suggestedRecommenders]);

    const selectedCount = useMemo(() => selectedRecommenders.size, [selectedRecommenders]);

    const filteredFollowing = useMemo(() => {
        if (!followingSearch.trim()) {
            return [];
        }
        const searchLower = followingSearch.toLowerCase();
        const suggestedIds = new Set(suggestedRecommenders.map(r => r.id));
        return following.filter(user =>
            !suggestedIds.has(user.id) &&
            (user.name || '').toLowerCase().includes(searchLower)
        );
    }, [followingSearch, following, suggestedRecommenders]);

    useEffect(() => {
        const shouldFetch = (isPage && !isLoading && !dataFetched) || (isOpen && !isPage && !dataFetched);

        if (shouldFetch && currentUser?.id) {
            const fetchSuggestions = async () => {
                setDataFetched(true);
                setError(null);
                try {
                    const response = await fetch(`${API_URL}/api/bump/asks/suggest-recommenders`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            asker_id: currentUser.id,
                            ask_details: { query }
                        })
                    });

                    if (!response.ok) {
                        const mockRecommenders = [
                            { id: 'user_1', name: 'Alice Smith', reason: 'Recommended a plumber last month', score: 98, has_profile_image: true },
                            { id: 'user_2', name: 'Bob Johnson', reason: 'High response rate', score: 95, has_profile_image: false },
                            { id: 'user_3', name: 'Charlie Brown', reason: 'Also interested in "Contractors"', score: 87, has_profile_image: true },
                            { id: 'user_4', name: 'Diana Prince', reason: 'Recently active in your area', score: 92, has_profile_image: false },
                        ];
                        setSuggestedRecommenders(mockRecommenders);
                        setSelectedRecommenders(new Set(mockRecommenders.map(r => r.id)));
                    } else {
                        const data = await response.json();
                        const recommenders = data.recommenders || [];
                        setSuggestedRecommenders(recommenders);
                        setSelectedRecommenders(new Set(recommenders.map(r => r.id)));
                    }
                } catch (err) {
                    setError('Could not load suggestions. Using mock data as fallback.');
                    const mockRecommenders = [
                        { id: 'user_1', name: 'Alice Smith', reason: 'Recommended a plumber last month', score: 98, has_profile_image: true },
                        { id: 'user_2', name: 'Bob Johnson', reason: 'High response rate', score: 95, has_profile_image: false },
                        { id: 'user_3', name: 'Charlie Brown', reason: 'Also interested in "Contractors"', score: 87, has_profile_image: true },
                        { id: 'user_4', name: 'Diana Prince', reason: 'Recently active in your area', score: 92, has_profile_image: false },
                    ];
                    setSuggestedRecommenders(mockRecommenders);
                    setSelectedRecommenders(new Set(mockRecommenders.map(r => r.id)));
                }
            };

            const fetchUserState = async () => {
                try {
                    const userEmail = currentUser?.primaryEmailAddress?.emailAddress;
                    if (!userEmail) {
                        console.warn('No user email available for fetching state');
                        return '';
                    }

                    const preferredNameResponse = await fetch(`${API_URL}/api/users/preferred-name?email=${encodeURIComponent(userEmail)}`);
                    
                    if (preferredNameResponse.ok) {
                        const userData = await preferredNameResponse.json();
                        const state = userData.state || '';
                        console.log('User state fetched:', state);
                        setUserState(state);
                        return state;
                    } else {
                        console.warn('Failed to fetch user state from getPreferredName');
                        return '';
                    }
                } catch (error) {
                    console.error('Error fetching user state:', error);
                    return '';
                }
            };

            const fetchFollowing = async () => {
                try {
                    const res = await fetch(`${API_URL}/api/connections/following?user_id=${currentUser.id}`);
                    if (res.ok) {
                        const data = await res.json();
                        const followingArray = Array.isArray(data) ? data : [];
                        setFollowing(followingArray);
                        
                        // Check if user has any connections (people they are following)
                        if (followingArray.length === 0) {
                            setHasConnections(false);
                            return false; // No connections
                        } else {
                            setHasConnections(true);
                            return true; // Has connections
                        }
                    } else {
                        console.error("Failed to fetch following.");
                        setFollowing([]);
                        setHasConnections(false);
                        return false;
                    }
                } catch (err) {
                    console.error("Error fetching following:", err);
                    setFollowing([]);
                    setHasConnections(false);
                    return false;
                }
            };

            // Execute in sequence: fetch user state first, then following, then suggested followers if needed
            const executeSequentially = async () => {
                const state = await fetchUserState();
                const hasFollowing = await fetchFollowing();
                
                // If user has no connections, just prepare the data but don't show modal yet
                if (!hasFollowing) {
                    console.log('No connections found, preparing suggested followers for state:', state);
                    await fetchSuggestedFollowersWithState(state, false); // Don't show modal automatically
                }
            };

            fetchSuggestions();
            executeSequentially();
        }
    }, [isOpen, isPage, query, currentUser, isLoading, dataFetched]);

    const fetchSuggestedFollowersWithState = async (state, showModal = true) => {
        setIsLoadingSuggestedFollowers(true);
        try {
            // Fetch suggested followers using the provided state
            console.log('Fetching suggested followers for state:', state);
            const response = await fetch(`${API_URL}/api/connections/top-recommenders?state=${encodeURIComponent(state)}&userId=${currentUser.id}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Suggested followers response:', data);
                // The API returns the users array directly, not wrapped in a 'users' property
                setSuggestedFollowers(Array.isArray(data) ? data : []);
                if (showModal) {
                    setShowSuggestedFollowersModal(true);
                }
            } else {
                console.log('Failed to fetch suggested followers:', response.status);
                setSuggestedFollowers([]);
            }
        } catch (error) {
            console.error('Error fetching suggested followers:', error);
            setSuggestedFollowers([]);
        } finally {
            setIsLoadingSuggestedFollowers(false);
        }
    };

    useEffect(() => {
        const getScoreForFollower = async (followerId) => {
            try {
                const response = await fetch(`${API_URL}/api/bump/asks/calculate-score`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        asker_id: currentUser.id,
                        ask_details: { query },
                        recipient_id: followerId
                    })
                });
                if (!response.ok) throw new Error("Could not calculate score");
                const data = await response.json();
                return data.score;
            } catch (err) {
                console.error(`Failed to fetch match score for ${followerId}:`, err);
                const followingUser = following.find(f => f.id === followerId);
                return followingUser ? Math.round(followingUser.user_score) || 'N/A' : 'N/A';
            }
        };

        if (!followingSearch.trim()) {
            setFollowingScores({});
            return;
        }

        const identifier = setTimeout(() => {
            const fetchScoresForCurrentFilter = async () => {
                const suggestedIds = new Set(suggestedRecommenders.map(r => r.id));
                const currentlyFiltered = following.filter(followingUser =>
                    !suggestedIds.has(followingUser.id) &&
                    (followingUser.name || '').toLowerCase().includes(followingSearch.toLowerCase())
                );

                currentlyFiltered.forEach(followingUser => {
                     setFollowingScores(prevScores => {
                        if (prevScores[followingUser.id] === undefined) {
                            getScoreForFollower(followingUser.id).then(score => {
                                setFollowingScores(prev => ({ ...prev, [followingUser.id]: score ?? 'N/A' }));
                            });
                            return { ...prevScores, [followingUser.id]: '...' };
                        }
                        return prevScores;
                    });
                });
            };
            fetchScoresForCurrentFilter();
        }, 300);

        return () => clearTimeout(identifier);
            }, [followingSearch, following, suggestedRecommenders, currentUser, query]);

    const handleSelectAllToggle = () => {
        if (selectedRecommenders.size === suggestedRecommenders.length) {
            setSelectedRecommenders(new Set());
        } else {
            setSelectedRecommenders(new Set(suggestedRecommenders.map(r => r.id)));
        }
    };
    
    const allSelected = useMemo(
        () => suggestedRecommenders.length > 0 && selectedRecommenders.size === suggestedRecommenders.length,
        [suggestedRecommenders, selectedRecommenders]
    );

    const handleFollowUser = async (userId) => {
        try {
            const response = await fetch(`${API_URL}/api/connections/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromUserId: currentUser.id,  // Clerk ID of current user
                    toUserId: userId             // Internal DB ID of user to follow
                })
            });

            if (response.ok) {
                // Remove the followed user from suggested followers list
                setSuggestedFollowers(prev => prev.filter(user => user.id !== userId));
                
                // Find the followed user data
                const followedUser = suggestedFollowers.find(user => user.id === userId);
                if (followedUser) {
                    // Add to following list
                    setFollowing(prev => [...prev, followedUser]);
                    setHasConnections(true);
                    
                    // Refresh the suggested recommenders to include the new connection
                    await refreshSuggestedRecommenders();
                }
                
                // If this was the last suggested follower, close the modal
                if (suggestedFollowers.length <= 1) {
                    setShowSuggestedFollowersModal(false);
                }
            } else {
                console.error('Failed to follow user');
            }
        } catch (error) {
            console.error('Error following user:', error);
        }
    };

    const refreshSuggestedRecommenders = async () => {
        try {
            const response = await fetch(`${API_URL}/api/bump/asks/suggest-recommenders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    asker_id: currentUser.id,
                    ask_details: { query }
                })
            });

            if (response.ok) {
                const data = await response.json();
                const recommenders = data.recommenders || [];
                setSuggestedRecommenders(recommenders);
                setSelectedRecommenders(new Set(recommenders.map(r => r.id)));
            }
        } catch (error) {
            console.error('Error refreshing suggested recommenders:', error);
        }
    };

    const handleModalClose = async () => {
        setShowSuggestedFollowersModal(false);
        
        // Refresh following list to ensure all new connections are reflected
        try {
            const res = await fetch(`${API_URL}/api/connections/following?user_id=${currentUser.id}`);
            if (res.ok) {
                const data = await res.json();
                const followingArray = Array.isArray(data) ? data : [];
                setFollowing(followingArray);
                
                if (followingArray.length > 0) {
                    setHasConnections(true);
                    // Also refresh suggested recommenders if we now have connections
                    await refreshSuggestedRecommenders();
                }
            }
        } catch (error) {
            console.error('Error refreshing following on modal close:', error);
        }
    };

    const handleSendAsk = async () => {
        if (selectedRecommenders.size === 0) return;
        setIsSending(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/api/bump/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    asker_id: currentUser.id,
                    selected_recipients: Array.from(selectedRecommenders),
                    ask_details: { query, context }
                })
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ message: 'Could not send ask.' }));
                throw new Error(errData.message || "Failed to send ask.");
            }
            setShowSuccessModal(true);
        } catch (err) {
            console.error("Failed to send ask:", err);
            setError(err.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    const fetchMatchScoreForFollower = async (followerId) => {
        try {
            const response = await fetch(`${API_URL}/api/bump/asks/calculate-score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    asker_id: currentUser.id,
                    ask_details: { query },
                    recipient_id: followerId
                })
            });
            if (!response.ok) throw new Error("Could not calculate score");
            const data = await response.json();
            const score = data.score;

            setSuggestedRecommenders(prev =>
                prev.map(r =>
                    r.id === followerId ? { ...r, score: score } : r
                )
            );
        } catch (err) {
            console.error("Failed to fetch match score:", err);
            setSuggestedRecommenders(prev =>
                prev.map(r =>
                    r.id === followerId ? { ...r, score: Math.round(following.find(f => f.id === followerId)?.user_score) || 94 } : r
                )
            );
        }
    };

    const handleAddFollowingAsRecommender = (followingUser) => {
        const newRecommender = {
            id: followingUser.id,
            name: followingUser.name,
            reason: 'You follow them directly (1st degree).',
            score: '...', // Will be fetched after adding
            has_profile_image: followingUser.has_profile_image,
            degree: 1,
        };
        setSuggestedRecommenders(prev => [newRecommender, ...prev]);
        setSelectedRecommenders(prev => new Set(prev).add(followingUser.id));
        setFollowingSearch('');
        fetchMatchScoreForFollower(followingUser.id);
    };

    if (isPage && isLoading) {
        return null;
    }

    // Page view
    if (isPage) {
        return (
            <div className="bump-network-page-premium bump-redesign">
                <motion.div
                    className="premium-hero"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="hero-icon-wrapper">
                        <FaUsers className="hero-icon" />
                    </div>
                    <h2 className="hero-title">Hmmm... Let's Ask Your Network</h2>
                    <p className="hero-subtitle">
                        We couldn't find anything in your Trust Circle for "{query}". But reach out to these trusted contacts for personalized recommendations:
                    </p>
                </motion.div>

                <motion.div 
                    className="controls-container"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                >
                    <div className="controls-header">
                        <div className="selection-status">
                            <FaCheckCircle className="selection-icon" />
                            <span>{selectedCount} of {suggestedRecommenders.length} selected</span>
                        </div>
                        <button onClick={handleSelectAllToggle} className="deselect-button">
                            <FaBolt />
                            {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>

                    <div className="search-wrapper">
                        <FaSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search through your Trust Circle..."
                            value={followingSearch}
                            onChange={(e) => setFollowingSearch(e.target.value)}
                            className="search-input"
                        />
                    </div>
                     {filteredFollowing.length > 0 && (
                        <div className="follower-search-results">
                            {filteredFollowing.map(followingUser => (
                                <div key={followingUser.id} className="follower-result-item" onClick={() => handleAddFollowingAsRecommender(followingUser)}>
                                    <div className="avatar-wrapper small">
                                        {followingUser.has_profile_image ? (
                                            <img src={`${API_URL}/api/users/${followingUser.id}/profile/image`} alt={followingUser.name} className="avatar-image" />
                                        ) : (
                                            <div className="avatar-initials">{generateInitials(followingUser.name)}</div>
                                        )}
                                    </div>
                                    <div className="follower-info">
                                        <span className="follower-name">{followingUser.name}</span>
                                    </div>
                                    <div className="follower-add-action">
                                        <FaPlus />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                <motion.div
                    className="context-container"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.5 }}
                >
                    <div className="original-query-box">
                        <span className="query-label">REQUEST</span>
                        <p className="query-text">"{query}"</p>
                    </div>
                    <textarea
                        className="context-textarea"
                        placeholder="Add optional context to help your network (e.g., timeline, budget, specific needs...)"
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                    />
                </motion.div>

                <div className="contacts-list">
                    <AnimatePresence>
                        {filteredSuggestedRecommenders.map((user) => {
                            const isSelected = selectedRecommenders.has(user.id);
                            const badge = getBadgeForReason(user.reason, user.degree);
                            
                            return (
                                <motion.div
                                    key={user.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className={`contact-card ${isSelected ? 'selected' : ''}`}
                                    onClick={() => setSelectedRecommenders(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(user.id)) newSet.delete(user.id);
                                        else newSet.add(user.id);
                                        return newSet;
                                    })}
                                >
                                    <div className="contact-card-content">
                                        <div className="avatar-section">
                                            <div className="avatar-wrapper">
                                                {user.has_profile_image ? (
                                                    <img src={`${API_URL}/api/users/${user.id}/profile/image`} alt={user.name} className="avatar-image" />
                                                ) : (
                                                    <div className="avatar-initials">{generateInitials(user.name)}</div>
                                                )}
                                                <div className="trust-score">{user.score}</div>
                                                {isSelected && (
                                                    <div className="selected-icon-wrapper">
                                                        <FaCheckCircle className="selected-icon" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="info-section">
                                            <div className="info-header">
                                                <div className="info-header-main">
                                                    <h3 className="contact-name">{user.name}</h3>
                                                    <p className="contact-description">{user.reason}</p>
                                                </div>
                                                <div className={`degree-badge badge-${badge.color}`}>
                                                    {badge.text}
                                                </div>
                                            </div>

                                            <div className="match-score">
                                                <FaStar className="star-icon" />
                                                <span className="match-score-text">Match Score: {user.score}%</span>
                                                <div className="match-score-bar-container">
                                                    <div className="match-score-bar" style={{ width: `${user.score}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
                
                <motion.div 
                    className="actions-footer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    <button
                        className="send-request-button"
                        disabled={selectedCount === 0 || isSending}
                        onClick={handleSendAsk}
                    >
                        {isSending ? 'Sending...' : `Send Requests (${selectedCount} selected)`}
                    </button>
                </motion.div>

                <SuggestedFollowersModal
                    isOpen={showSuggestedFollowersModal}
                    onClose={handleModalClose}
                    suggestedFollows={suggestedFollowers}
                    loading={isLoadingSuggestedFollowers}
                    onFollow={handleFollowUser}
                    title="Want to Bump Your Network?"
                    subtitle="First, let's build your Trust Circle! Follow trusted recommenders to unlock network recommendations."
                />

                {/* Success Modal */}
                {showSuccessModal && (
                    <div className="success-modal-overlay">
                        <div className="success-modal">
                            <div className="success-modal-icon">
                                <FaPaperPlane />
                            </div>
                            <h3>Request Sent Successfully!</h3>
                            <p>
                                Your request for recommendations about "{query}" has been sent to {selectedCount} {selectedCount === 1 ? 'contact' : 'contacts'}.
                            </p>
                            <p>
                                You'll receive responses directly from your network members who can help with your request.
                            </p>
                            <div className="success-modal-actions">
                                <button 
                                    className="btn btn-primary modal-btn"
                                    onClick={() => {
                                        setShowSuccessModal(false);
                                        if (isPage) {
                                            navigate('/');
                                        } else {
                                            onClose();
                                        }
                                    }}
                                >
                                    <FaCheck />
                                    Got it!
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }
    
    // This part is for the original modal, which is no longer used based on the new design.
    // I'm leaving a simplified version in case it's needed elsewhere.
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="bump-modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close-x" onClick={onClose}>×</button>
                <div className="modal-buttons">
                    <button className="cancel-button" onClick={onClose}>Cancel</button>
                    <button className="submit-button" onClick={handleSendAsk} disabled={isSending || selectedCount === 0}>
                        {isSending ? 'Sending...' : 'Ask Your Network'}
                    </button>
                </div>
            </div>
            <SuggestedFollowersModal
                isOpen={showSuggestedFollowersModal}
                onClose={handleModalClose}
                suggestedFollows={suggestedFollowers}
                loading={isLoadingSuggestedFollowers}
                onFollow={handleFollowUser}
                title="Want to Bump Your Network?"
                subtitle="First, let's build your Trust Circle! Follow trusted recommenders to unlock network recommendations."
            />

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="success-modal-overlay">
                    <div className="success-modal">
                        <div className="success-modal-icon">
                            <FaPaperPlane />
                        </div>
                        <h3>Request Sent Successfully!</h3>
                        <p>
                            Your request for recommendations about "{query}" has been sent to {selectedCount} {selectedCount === 1 ? 'contact' : 'contacts'}.
                        </p>
                        <p>
                            You'll receive responses directly from your network members who can help with your request.
                        </p>
                        <div className="success-modal-actions">
                            <button 
                                className="btn btn-primary modal-btn"
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    onClose();
                                }}
                            >
                                <FaCheck />
                                Got it!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BumpYourNetwork;
