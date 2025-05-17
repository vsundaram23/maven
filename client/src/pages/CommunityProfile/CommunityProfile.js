import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './CommunityProfile.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = 'http://localhost:3000';

const CommunityProfile = () => {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const [communityDetails, setCommunityDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const fetchCommunityData = useCallback(async (currentUserId) => {
    setLoading(true);
    setError('');
    try {
      let url = `${API_URL}/api/communities/${communityId}/details`;
      if (currentUserId) {
        url += `?user_id=${currentUserId}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Failed to fetch community details (status: ${response.status})`);
      }
      const data = await response.json();
      setCommunityDetails(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    const storedUserEmail = localStorage.getItem('userEmail');
    if (storedUserEmail) {
      const fetchUserIdAndData = async () => {
        let userId = null;
        try {
          const userRes = await fetch(`${API_URL}/api/communities/user/email/${storedUserEmail}`);
          if (userRes.ok) {
            const userData = await userRes.json();
            setCurrentUser(userData);
            userId = userData.id;
          } else {
            console.warn('Could not fetch current user ID, proceeding as guest for community details.');
            setCurrentUser(null);
          }
        } catch (err) {
          console.error("Error fetching current user details for profile page:", err);
          setCurrentUser(null);
        }
        fetchCommunityData(userId);
      };
      fetchUserIdAndData();
    } else {
      fetchCommunityData(null);
    }
  }, [communityId, fetchCommunityData]);

  const handleRequestToJoin = async () => {
    if (!currentUser || !currentUser.id) {
      alert('You must be logged in to request to join a community.');
      window.dispatchEvent(new Event('forceLogin'));
      return;
    }
    if (!communityDetails) return;

    setIsRequesting(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/communities/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id, community_id: communityDetails.id })
      });
      if (!response.ok) {
         const errData = await response.json();
         throw new Error(errData.error || 'Failed to send join request.');
      }
      alert('Request to join community sent!');
      setCommunityDetails(prevDetails => ({
        ...prevDetails,
        currentUserStatus: 'requested'
      }));
    } catch (err) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsRequesting(false);
    }
  };

  if (loading) {
    return <div className="profile-loading">Loading community details...</div>;
  }

  if (error) {
    return <div className="profile-error">Error: {error}</div>;
  }

  if (!communityDetails) {
    return <div className="profile-empty">Community not found.</div>;
  }

  const {
    name,
    description,
    creator_name,
    created_at,
    member_count,
    recommendation_count,
    isOwner,
    currentUserStatus
  } = communityDetails;

  const canRequestToJoin = currentUser && currentUserStatus === 'none';
  const isMember = currentUserStatus === 'approved';
  const hasRequested = currentUserStatus === 'requested';

  return (
    <div className="community-profile-page">
      <header className="profile-header">
        <h1>{name}</h1>
        {isOwner && <span className="status-badge owner-badge">You are the Owner</span>}
        {isMember && !isOwner && <span className="status-badge member-badge">Member</span>}
      </header>

      <section className="profile-details-section">
        <div className="detail-item description">
          <p>{description || 'No description provided.'}</p>
        </div>
        <div className="detail-grid">
          <div className="detail-item">
            <strong>Created By:</strong> {creator_name || 'N/A'}
          </div>
          <div className="detail-item">
            <strong>Date Created:</strong> {new Date(created_at).toLocaleDateString()}
          </div>
          <div className="detail-item">
            <strong>Members:</strong> {member_count}
          </div>
          <div className="detail-item">
            <strong>Recommendations:</strong> {recommendation_count}
          </div>
        </div>
      </section>

      <section className="profile-actions-section">
        {currentUser ? (
          <>
            {isOwner && (
              <button className="button-admin-tools" onClick={() => alert('Admin tools (e.g., edit, manage members) - TBD')}>
                Admin Tools
              </button>
            )}
            {canRequestToJoin && (
              <button
                className="button-join"
                onClick={handleRequestToJoin}
                disabled={isRequesting}
              >
                {isRequesting ? 'Sending Request...' : 'Request to Join Community'}
              </button>
            )}
            {hasRequested && (
              <p className="status-info">Your request to join is pending approval.</p>
            )}
            {isMember && (
              <button className="button-view-recommendations" onClick={() => alert('View recommendations in this community - launching soon!')}>
                View Recommendations
              </button>
            )}
          </>
        ) : (
          <p className="status-info">
            <button className="button-link-styled" onClick={() => window.dispatchEvent(new Event('forceLogin'))}>Sign in</button> to join or interact with this community.
          </p>
        )}
      </section>

      <section className="profile-recommendations-list">
        <h2>Recommendations in {name}</h2>
        <p>(Recommendation list feature launching soon - stay tuned!)</p>
      </section>
    </div>
  );
};

export default CommunityProfile;
