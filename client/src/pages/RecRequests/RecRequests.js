import { useUser } from '@clerk/clerk-react';
import React, { useEffect, useState } from 'react';
import { FaCheckCircle, FaClock, FaEnvelopeOpenText, FaUser } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import ResponsesDisplay from '../../components/ResponsesDisplay/ResponsesDisplay';
import './RecRequests.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = 'http://localhost:3000';

const STATUS_ICONS = {
    pending: <FaClock />,
    responded: <FaCheckCircle />,
};

const RecRequests = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const navigate = useNavigate();

    const [activeList, setActiveList] = useState('inbound');
    const [respondingToId, setRespondingToId] = useState(null);
    const [responseText, setResponseText] = useState('');
    const [viewingAskId, setViewingAskId] = useState(null);
    const [newAskText, setNewAskText] = useState('');
    const [inboundRequests, setInboundRequests] = useState([]);
    const [outboundRequests, setOutboundRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showHistoricalInbound, setShowHistoricalInbound] = useState(false);
    const [showHistoricalOutbound, setShowHistoricalOutbound] = useState(false);

    useEffect(() => {
        const fetchBoth = async () => {
            if (!isLoaded) return;
            if (!isSignedIn || !user) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setError(null); // Clear previous errors
            try {
                const inboundParams = new URLSearchParams({ recipient_id: user.id });
                const outboundParams = new URLSearchParams({ asker_id: user.id });
                const [inResp, outResp] = await Promise.all([
                    fetch(`${API_URL}/api/bump/asks/inbound?${inboundParams.toString()}`),
                    fetch(`${API_URL}/api/bump/asks/outbound?${outboundParams.toString()}`),
                ]);

                if (!inResp.ok) {
                    const errorData = await inResp.json();
                    throw new Error(errorData.error || `Inbound request failed with status: ${inResp.status}`);
                }
                if (!outResp.ok) {
                    const errorData = await outResp.json();
                    throw new Error(errorData.error || `Outbound request failed with status: ${outResp.status}`);
                }

                const inData = await inResp.json();
                const outData = await outResp.json();
                setInboundRequests(Array.isArray(inData.requests) ? inData.requests : []);
                setOutboundRequests(Array.isArray(outData.requests) ? outData.requests : []);
            } catch (err) {
                console.error('Error fetching requests:', err);
                setError(err.message || 'Something went wrong');
            } finally {
                setIsLoading(false);
            }
        };
        fetchBoth();
    }, [isLoaded, isSignedIn, user]);

    const handleDecline = async (askId) => {
        if (!isSignedIn || !user) return;
        try {
            const resp = await fetch(`${API_URL}/api/bump/asks/decline`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ask_id: askId, user_id: user.id })
            });
            if (!resp.ok) throw new Error('Failed to decline request');
            setInboundRequests(prev => prev.filter(r => r.id !== askId));
        } catch (err) {
            console.error('Decline error:', err);
            alert('Unable to decline request.');
        }
    };

    const handleStartResponse = (askId) => {
        setRespondingToId(askId);
        setResponseText(''); 
    };

    const handleSubmitResponse = async () => {
        if (!responseText.trim() || !respondingToId || !user) return;

        try {
            const resp = await fetch(`${API_URL}/api/bump/asks/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ask_id: respondingToId, 
                    user_id: user.id,
                    text: responseText,
                })
            });

            if (!resp.ok) throw new Error('Failed to submit response');
            
            const newResponse = await resp.json();

            setInboundRequests(prev => 
                prev.map(req => {
                    if (req.id === respondingToId) {
                        const updatedResponses = Array.isArray(req.responses) 
                            ? [...req.responses, newResponse] 
                            : [newResponse];
                        return { ...req, status: 'responded', responses: updatedResponses };
                    }
                    return req;
                })
            );
            
            setRespondingToId(null);
            setResponseText('');

        } catch (err) {
            console.error('Response submission error:', err);
            alert('Unable to submit response.');
        }
    };

    const handleRespond = (ask) => {
        navigate(`/share-recommendation?askId=${ask.id}`);
    };

    const handleAskNetwork = () => {
        if (newAskText.trim()) {
            navigate('/bump-your-network', { state: { query: newAskText } });
        }
    };

    const renderInbound = () => {
        const pendingRequests = inboundRequests.filter(r => r.status === 'pending');
        const respondedRequests = inboundRequests.filter(r => r.status !== 'pending');

        return (
            <>
                <div className="tab-description">Requests from others asking for your recommendations</div>
                <div className="requests-list">
                    {pendingRequests.length === 0 && <div className="requests-empty">You have no new incoming requests.</div>}
                    {pendingRequests.map((ask) => {
                        const locationDisplay = [ask.asker_location, ask.asker_state].filter(Boolean).join(', ');
                        return (
                            <div key={ask.id} className="request-card hoverable">
                                <div className="ask-top">
                                    <div className="request-header-row">
                                        <div className="request-header-left">
                                            <div className="avatar">{ask.asker_name ? ask.asker_name.charAt(0) : '?'}</div>
                                            <div>
                                                <div className="name">{ask.asker_name || 'Unknown'}</div>
                                                <div className="date">{new Date(ask.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div className="badges">
                                            <span className="badge badge-outline status"><span className="icon">{STATUS_ICONS[ask.status] || null}</span>{ask.status}</span>
                                        </div>
                                    </div>
                                    <div className="request-body">
                                        <div className="ask-section">
                                            <span className="ask-section-title">Your Original Ask:</span>
                                            <p className="ask-section-content">{ask.title || 'N/A'}</p>
                                        </div>
                                        {ask.description && (
                                            <div className="ask-section">
                                                <span className="ask-section-title">Additional Context:</span>
                                                <p className="ask-section-content">{ask.description}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="request-footer">
                                        <span className="location">📍 {locationDisplay || 'Unknown'}</span>
                                        <div className="actions">
                                            {ask.status === 'pending' && (
                                                <>
                                                    <button className="btn-outline" onClick={() => handleDecline(ask.id)}>Decline</button>
                                                    <button className="btn-primary" onClick={() => handleStartResponse(ask.id)}>Respond</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {respondingToId === ask.id && (
                                    <div className="response-form-container">
                                        <textarea
                                            className="response-textarea"
                                            placeholder="Write your response..."
                                            value={responseText}
                                            onChange={(e) => setResponseText(e.target.value)}
                                            autoFocus
                                        />
                                        <div className="response-actions">
                                            <button className="btn-outline" onClick={() => setRespondingToId(null)}>Cancel</button>
                                            <button className="btn-primary" onClick={handleSubmitResponse}>Submit Response</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {respondedRequests.length > 0 && (
                    <div className="historical-section">
                        <div className="historical-requests-toggle" onClick={() => setShowHistoricalInbound(!showHistoricalInbound)}>
                            <span>{showHistoricalInbound ? 'Hide' : 'Show'} Responded Requests ({respondedRequests.length})</span>
                            <span className={`toggle-chevron ${showHistoricalInbound ? 'open' : ''}`}>&#9660;</span>
                        </div>

                        {showHistoricalInbound && (
                            <div className="requests-list historical-requests-list">
                                {respondedRequests.map((ask) => {
                                    const locationDisplay = [ask.asker_location, ask.asker_state].filter(Boolean).join(', ');
                                    return (
                                        <div key={ask.id} className="request-card hoverable">
                                            <div className="ask-top">
                                                 <div className="request-header-row">
                                                    <div className="request-header-left">
                                                        <div className="avatar">{ask.asker_name ? ask.asker_name.charAt(0) : '?'}</div>
                                                        <div>
                                                            <div className="name">{ask.asker_name || 'Unknown'}</div>
                                                            <div className="date">{new Date(ask.created_at).toLocaleDateString()}</div>
                                                        </div>
                                                    </div>
                                                    <div className="badges">
                                                        <span className="badge badge-outline status"><span className="icon">{STATUS_ICONS[ask.status] || null}</span>{ask.status}</span>
                                                    </div>
                                                </div>
                                                <div className="request-body">
                                                    <div className="ask-section">
                                                        <span className="ask-section-title">Your Original Ask:</span>
                                                        <p className="ask-section-content">{ask.title || 'N/A'}</p>
                                                    </div>
                                                    {ask.description && (
                                                        <div className="ask-section">
                                                            <span className="ask-section-title">Additional Context:</span>
                                                            <p className="ask-section-content">{ask.description}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="request-footer">
                                                    <span className="location">📍 {locationDisplay || 'Unknown'}</span>
                                                </div>
                                            </div>
                                            {ask.status === 'responded' && ask.responses && ask.responses.length > 0 && (
                                                <div className="responses-preview-section">
                                                    <div className="responses-preview-title">Your Response(s)</div>
                                                    {ask.responses.map((response, index) => (
                                                        <div key={index} className="response-preview-item">
                                                            <div className="response-preview-header">
                                                                <span className="response-preview-author">{response.user_name || 'You'}</span>
                                                                <span className="response-preview-date">
                                                                    {new Date(response.created_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <p className="response-preview-text">{response.text}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </>
        )
    };

    const renderOutbound = () => {
        const pendingRequests = outboundRequests.filter(r => r.status !== 'responded');
        const respondedRequests = outboundRequests.filter(r => r.status === 'responded');

        return (
            <>
                <div className="tab-description">Requests you've sent to others</div>
                <div className="requests-list">
                    {pendingRequests.length === 0 && <div className="requests-empty">You have no new outgoing requests.</div>}
                    {pendingRequests.map((ask) => (
                        <div key={ask.id} className="request-card hoverable">
                             <div className="ask-top">
                                <div className="request-header-row">
                                    <div className="request-header-left">
                                        <div className="avatar">{ask.recipient_names && ask.recipient_names[0] ? ask.recipient_names[0].charAt(0) : '?'}</div>
                                        <div>
                                            <div className="name">To: {ask.recipient_names ? ask.recipient_names.join(', ') : 'Recipients'}</div>
                                            <div className="date">{new Date(ask.created_at).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="badges">
                                        <span className="badge badge-outline status"><span className="icon">{STATUS_ICONS[ask.status] || null}</span>{ask.status}</span>
                                    </div>
                                </div>
                                <div className="request-body">
                                    <div className="ask-section">
                                        <span className="ask-section-title">Your Original Ask:</span>
                                        <p className="ask-section-content">{ask.title || 'N/A'}</p>
                                    </div>
                                    {ask.description && (
                                        <div className="ask-section">
                                            <span className="ask-section-title">Additional Context:</span>
                                            <p className="ask-section-content">{ask.description}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="request-footer">
                                    {/* No actions for pending outbound */}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {respondedRequests.length > 0 && (
                     <div className="historical-section">
                        <div className="historical-requests-toggle" onClick={() => setShowHistoricalOutbound(!showHistoricalOutbound)}>
                            <span>{showHistoricalOutbound ? 'Hide' : 'Show'} Responded Requests ({respondedRequests.length})</span>
                            <span className={`toggle-chevron ${showHistoricalOutbound ? 'open' : ''}`}>&#9660;</span>
                        </div>

                        {showHistoricalOutbound && (
                            <div className="requests-list historical-requests-list">
                                {respondedRequests.map((ask) => (
                                    <div key={ask.id} className="request-card hoverable">
                                        <div className="ask-top">
                                            <div className="request-header-row">
                                                <div className="request-header-left">
                                                    <div className="avatar">{ask.recipient_names && ask.recipient_names[0] ? ask.recipient_names[0].charAt(0) : '?'}</div>
                                                    <div>
                                                        <div className="name">To: {ask.recipient_names ? ask.recipient_names.join(', ') : 'Recipients'}</div>
                                                        <div className="date">{new Date(ask.created_at).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                                <div className="badges">
                                                    <span className="badge badge-outline status"><span className="icon">{STATUS_ICONS[ask.status] || null}</span>{ask.status}</span>
                                                </div>
                                            </div>
                                            <div className="request-body">
                                                <div className="ask-section">
                                                    <span className="ask-section-title">Your Original Ask:</span>
                                                    <p className="ask-section-content">{ask.title || 'N/A'}</p>
                                                </div>
                                                {ask.description && (
                                                    <div className="ask-section">
                                                        <span className="ask-section-title">Additional Context:</span>
                                                        <p className="ask-section-content">{ask.description}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="request-footer">
                                                <div className="actions">
                                                    {ask.status === 'responded' && (
                                                        <button className="btn-primary" onClick={() => setViewingAskId(ask.id)}>View All Responses</button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {ask.status === 'responded' && ask.responses && ask.responses.length > 0 && (
                                            <div className="responses-preview-section">
                                                <div className="responses-preview-title">Response(s) Received</div>
                                                {ask.responses.map((response, index) => (
                                                    <div key={index} className="response-preview-item">
                                                        <div className="response-preview-header">
                                                            <span className="response-preview-author">{response.user_name || 'Anonymous'}</span>
                                                            <span className="response-preview-date">
                                                                {new Date(response.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <p className="response-preview-text">{response.text}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </>
        )
    };

    if (isLoading) return <div className="requests-loading">Loading requests...</div>;
    if (error) return <div className="requests-error">{error}</div>;

    const pendingInboundCount = inboundRequests.filter(r => r.status === 'pending').length;
    const pendingOutboundCount = outboundRequests.filter(r => r.status !== 'responded').length;

    return (
        <div className="requests-page">
            <div className="page-header">
                <h1 className="page-title">Recommendation Requests</h1>
                <p className="page-sub">Manage your incoming and outgoing recommendation requests</p>
            </div>

            <div className="new-ask-section">
                <h2 className="new-ask-title">Want to ask your Trust Circle for a Rec?</h2>
                <div className="new-ask-input-container">
                    <input
                        type="text"
                        className="new-ask-input"
                        placeholder="e.g., 'Looking for a great plumber in Seattle'"
                        value={newAskText}
                        onChange={(e) => setNewAskText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && newAskText.trim() && handleAskNetwork()}
                    />
                    <button
                        className="new-ask-button"
                        onClick={handleAskNetwork}
                        disabled={!newAskText.trim()}
                    >
                        Ask My Network
                    </button>
                </div>
            </div>
            
            <div className="requests-container">
                <div className="list-selector">
                    <div
                        className={`selector-item ${activeList === 'inbound' ? 'active' : ''}`}
                        onClick={() => setActiveList('inbound')}
                    >
                        <FaEnvelopeOpenText className="selector-icon" />
                        <span className="selector-title">Inbound</span>
                        <span className="selector-count">({pendingInboundCount})</span>
                    </div>
                    <div
                        className={`selector-item ${activeList === 'outbound' ? 'active' : ''}`}
                        onClick={() => setActiveList('outbound')}
                    >
                        <FaUser className="selector-icon" />
                        <span className="selector-title">Outbound</span>
                        <span className="selector-count">({pendingOutboundCount})</span>
                    </div>
                </div>

                <div className="list-content">
                    {activeList === 'inbound' ? renderInbound() : renderOutbound()}
                </div>
            </div>
            <ResponsesDisplay 
                isOpen={!!viewingAskId}
                onClose={() => setViewingAskId(null)}
                askId={viewingAskId}
            />
        </div>
    );
};

export default RecRequests;
