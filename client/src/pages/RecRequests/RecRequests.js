import { useUser } from '@clerk/clerk-react';
import React, { useCallback, useEffect, useState } from 'react';
import { FaAngleDown, FaAngleUp, FaTrash } from 'react-icons/fa';
import './RecRequests.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = 'http://localhost:3000';


const RecRequests = () => {
    const { user, isLoaded, isSignedIn } = useUser();
    const [activeTab, setActiveTab] = useState('asks');
    const [inboundRequests, setInboundRequests] = useState([]);
    const [outboundRequests, setOutboundRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedAsks, setExpandedAsks] = useState({});
    const [responses, setResponses] = useState({});
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [askToDelete, setAskToDelete] = useState(null);

    const fetchInboundRequests = useCallback(async () => {
        if (!user) return;
        try {
            const response = await fetch(`${API_URL}/api/bump/asks/inbound?recipient_id=${user.id}`);
            if (!response.ok) throw new Error('Failed to fetch inbound requests');
            const data = await response.json();
            setInboundRequests(data.requests || []);
        } catch (err) {
            setError('Could not load inbound requests.');
            console.error(err);
        }
    }, [user]);

    const fetchOutboundRequests = useCallback(async () => {
        if (!user) return;
        try {
            const response = await fetch(`${API_URL}/api/bump/asks/outbound?asker_id=${user.id}`);
            if (!response.ok) throw new Error('Failed to fetch outbound requests');
            const data = await response.json();
            setOutboundRequests(data.requests || []);
        } catch (err) {
            setError('Could not load outbound requests.');
            console.error(err);
        }
    }, [user]);

    useEffect(() => {
        const fetchRequests = async () => {
            setLoading(true);
            setError('');
            await Promise.all([fetchInboundRequests(), fetchOutboundRequests()]);
            setLoading(false);
        };
        if (isLoaded && isSignedIn) {
            fetchRequests();
        } else if (isLoaded && !isSignedIn) {
            setLoading(false);
        }
    }, [isLoaded, isSignedIn, fetchInboundRequests, fetchOutboundRequests]);

    const handleDecline = async (askId) => {
        if (!user) return;
        try {
            const response = await fetch(`${API_URL}/api/bump/asks/decline`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ask_id: askId, user_id: user.id })
            });
            if (!response.ok) throw new Error('Failed to decline');
            setInboundRequests(prev => prev.filter(req => req.id !== askId));
        } catch (error) {
            console.error("Error declining ask:", error);
        }
    };

    const handleDeleteClick = (ask) => {
        setAskToDelete(ask);
        setShowConfirmation(true);
    };

    const confirmDelete = async () => {
        if (!askToDelete || !user) return;

        try {
            const response = await fetch(`${API_URL}/api/bump/asks/${askToDelete.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id }),
            });

            if (!response.ok) {
                throw new Error('Failed to delete the ask.');
            }

            setOutboundRequests(prev => prev.filter(req => req.id !== askToDelete.id));
        } catch (err) {
            setError(err.message);
            console.error(err);
        } finally {
            setShowConfirmation(false);
            setAskToDelete(null);
        }
    };

    const renderInboundRequestCard = (ask) => {
        const isExpanded = expandedAsks[ask.id];

        return (
            <div key={ask.id} className="request-card inbound">
                 <div className="card-header">
                    <div>
                        <p className="card-title">"{ask.title}"</p>
                        <p className="card-date">From <strong>{ask.asker_name}</strong> on {new Date(ask.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="card-status-chip" data-status={ask.status}>{ask.status}</div>
                </div>
                <div className="card-body">
                    {ask.description && <p><strong>Context:</strong> {ask.description}</p>}
                </div>

                {/* If pending, show respond/decline buttons */}
                {ask.status === 'pending' && (
                    <div className="card-footer">
                         <button className="btn btn-secondary" onClick={() => handleDecline(ask.id)}>Decline</button>
                         <button className="btn btn-primary" onClick={() => { alert('Respond functionality to be implemented'); }}>Respond</button>
                    </div>
                )}

                {/* If responded, show a button to view your answer */}
                {ask.status === 'responded' && ask.responses && ask.responses.length > 0 && (
                     <div className="card-footer">
                        <button className="toggle-responses-button" onClick={() => setExpandedAsks(prev => ({ ...prev, [ask.id]: !isExpanded }))}>
                            {isExpanded ? 'Hide Your Answer' : 'Show Your Answer'}
                            {isExpanded ? <FaAngleUp /> : <FaAngleDown />}
                        </button>
                     </div>
                )}

                {/* If expanded and responded, show the responses */}
                {isExpanded && ask.status === 'responded' && (
                    <div className="responses-container">
                        {(ask.responses || []).map((response, index) => (
                            <div key={index} className="response-item">
                                <p><strong>You</strong> ({new Date(response.created_at).toLocaleString()}):</p>
                                <p>{response.text}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    const renderOutboundRequestCard = (ask) => {
        const isExpanded = expandedAsks[ask.id];

        return (
            <div key={ask.id} className="request-card outbound">
                <div className="card-header">
                    <div>
                        <p className="card-title">"{ask.title}"</p>
                        <p className="card-date">
                            Sent to <strong>{ask.recipient_names.join(', ')}</strong> on {new Date(ask.created_at).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="card-status-chip" data-status={ask.status}>{ask.status}</div>
                </div>
                
                {ask.description && (
                    <div className="card-body">
                        <p><strong>Your Additional Context:</strong> {ask.description}</p>
                    </div>
                )}
                
                <div className="card-footer">
                    <button className="delete-ask-button" onClick={() => handleDeleteClick(ask)}>
                        <FaTrash /> Delete
                    </button>
                    <button className="toggle-responses-button" onClick={() => toggleResponses(ask.id)}>
                        {isExpanded ? 'Hide Responses' : `Show Responses (${ask.responses.length})`}
                        {isExpanded ? <FaAngleUp /> : <FaAngleDown />}
                    </button>
                </div>
                {isExpanded && (
                    <div className="responses-container">
                        {renderResponses(ask.id)}
                    </div>
                )}
            </div>
        );
    };

    const toggleResponses = async (askId) => {
        const isCurrentlyExpanded = !!expandedAsks[askId];

        setExpandedAsks(prev => ({ ...prev, [askId]: !isCurrentlyExpanded }));

        if (!isCurrentlyExpanded && !responses[askId]) {
            try {
                const response = await fetch(`${API_URL}/api/bump/asks/${askId}/responses`);
                if (!response.ok) throw new Error('Failed to fetch responses');
                const data = await response.json();
                setResponses(prev => ({...prev, [askId]: data.responses || []}));
            } catch (error) {
                console.error('Error fetching responses:', error);
                setResponses(prev => ({...prev, [askId]: []}));
            }
        }
    };

    const renderResponses = (askId) => {
        const askResponses = responses[askId];
        if (!askResponses) return <p>Loading responses...</p>;
        if (askResponses.length === 0) return <p>No responses yet.</p>;

        return askResponses.map(response => (
            <div key={response.id} className="response-item">
                <p><strong>{response.user_name}</strong> ({new Date(response.created_at).toLocaleString()}):</p>
                <p>{response.text}</p>
            </div>
        ));
    };

    if (loading) return <div className="loading-container">Loading requests...</div>;
    if (error) return <div className="error-container">{error}</div>;

    if (!isSignedIn) {
        return <div className="rec-requests-container"><p>Please sign in to view your recommendation requests.</p></div>
    }

    return (
        <div className="rec-requests-container">
            <h1>Recommendation Requests</h1>
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'asks' ? 'active' : ''}`}
                    onClick={() => setActiveTab('asks')}
                >
                    Your Asks ({outboundRequests.length})
                </button>
                <button
                    className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
                    onClick={() => setActiveTab('requests')}
                >
                    Your Answers ({inboundRequests.length})
                </button>
            </div>

            <div className="requests-list">
                {activeTab === 'asks' ? (
                    outboundRequests.length > 0 ? (
                        outboundRequests.map(renderOutboundRequestCard)
                    ) : (
                        <p>You haven't sent any asks yet.</p>
                    )
                ) : (
                    inboundRequests.length > 0 ? (
                        inboundRequests.map(renderInboundRequestCard)
                    ) : (
                        <p>You have no pending recommendation requests.</p>
                    )
                )}
            </div>

            {showConfirmation && (
                <div className="confirmation-modal-overlay">
                    <div className="confirmation-modal">
                        <h3>Confirm Deletion</h3>
                        <p>Are you sure you want to delete this ask? This action cannot be undone.</p>
                        <div className="confirmation-modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowConfirmation(false)}>Cancel</button>
                            <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecRequests;
