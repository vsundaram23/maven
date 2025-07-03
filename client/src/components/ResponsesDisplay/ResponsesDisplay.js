import React, { useEffect, useState } from 'react';
import './ResponsesDisplay.css'; // Assuming CSS file is named this way

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = 'http://localhost:3000';

const ResponsesDisplay = ({ isOpen, onClose, askId }) => {
    const [responses, setResponses] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen || !askId) {
            return;
        }

        const fetchResponses = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API_URL}/api/bump/asks/${askId}/responses`);
                if (!res.ok) {
                    throw new Error('Failed to fetch responses.');
                }
                const data = await res.json();
                setResponses(data.responses || []);
            } catch (err) {
                console.error("Error fetching responses:", err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchResponses();
    }, [isOpen, askId]);

    if (!isOpen) return null;

    return (
        <div className="comments-display-overlay" onClick={onClose}>
            <div className="comments-display-content" onClick={(e) => e.stopPropagation()}>
                <div className="comments-display-header">
                    <h2>Responses</h2>
                    <span className="close-icon" onClick={onClose}>×</span>
                </div>
                
                <div className="comments-container">
                    {isLoading ? (
                        <div className="loading">Loading responses...</div>
                    ) : error ? (
                        <div className="error-state">{error}</div>
                    ) : responses.length > 0 ? (
                        responses.map((response) => (
                            <div key={response.id} className="comment-card">
                                <div className="comment-header">
                                    <div className="user-info">
                                        <span className="username">{response.preferred_name || 'Anonymous'}</span>
                                    </div>
                                    <span className="comment-date">
                                        {new Date(response.responded_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="comment-content">{response.response_text}</div>
                            </div>
                        ))
                    ) : (
                        <div className="no-comments">No responses yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResponsesDisplay; 