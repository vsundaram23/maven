import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './CommunityProfile.css';
import { FaUserTie, FaCalendarAlt, FaUsers, FaStar, FaSearch, FaEdit, FaSignInAlt, FaUserPlus, FaEye, FaUserCheck, FaHourglassHalf, FaTools} from 'react-icons/fa';

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = 'http://localhost:3000';

const IconText = ({ icon, text, className = "" }) => (
  <div className={`icon-text-item ${className}`}>
    {icon}
    <span>{text}</span>
  </div>
);

// RecommendationCard component is no longer used for now, can be kept for future use or removed
// const RecommendationCard = ({ rec }) => (
//   <div className="recommendation-item-card">
//     <h4 className="recommendation-title">{rec.title}</h4>
//     <p className="recommendation-content">{rec.content}</p>
//     <div className="recommendation-meta">
//       <span>Category: {rec.category}</span>
//       <span>By: {rec.createdBy}</span>
//       <span>Upvotes: {rec.upvotes}</span>
//       <span>Date: {new Date(rec.date).toLocaleDateString()}</span>
//     </div>
//   </div>
// );

const MemberCard = ({ member }) => (
  <div className="member-item-card">
    <img src={member.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random&color=fff`} alt={member.name} className="member-avatar" />
    <span className="member-name">{member.name}</span>
  </div>
);


const CommunityProfile = () => {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const [communityDetails, setCommunityDetails] = useState(null);
  // Recommendations state can be simplified for now
  // const [recommendations, setRecommendations] = useState([]);
  // const [filteredRecommendations, setFilteredRecommendations] = useState([]);
  const [members, setMembers] = useState([]);
  // const [searchTerm, setSearchTerm] = useState(''); // Search term not needed for placeholder
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [activeTab, setActiveTab] = useState('recommendations');

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

      // MOCK MEMBERS (Remove/replace when API is ready)
      const mockMembers = [
        { id: 101, name: "Jane Doe", avatarUrl: `https://i.pravatar.cc/40?u=jane` },
        { id: 102, name: "John Smith", avatarUrl: `https://i.pravatar.cc/40?u=john` },
        { id: 103, name: "Alice Brown", avatarUrl: `https://i.pravatar.cc/40?u=alice` },
        { id: 104, name: "Bob Green", avatarUrl: `https://i.pravatar.cc/40?u=bob` },
        { id: 105, name: "Charlie White", avatarUrl: `https://i.pravatar.cc/40?u=charlie` },
      ];
      setMembers(mockMembers);

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
            setCurrentUser(null);
          }
        } catch (err) {
          setCurrentUser(null);
        }
        fetchCommunityData(userId);
      };
      fetchUserIdAndData();
    } else {
      fetchCommunityData(null);
    }
  }, [communityId, fetchCommunityData]);

  // Search useEffect no longer needed if recommendations are a placeholder
  // useEffect(() => {
  //   if (!searchTerm) {
  //     setFilteredRecommendations(recommendations);
  //     return;
  //   }
  //   const lowerSearchTerm = searchTerm.toLowerCase();
  //   const filtered = recommendations.filter(rec =>
  //     (rec.title && rec.title.toLowerCase().includes(lowerSearchTerm)) ||
  //     (rec.content && rec.content.toLowerCase().includes(lowerSearchTerm)) ||
  //     (rec.category && rec.category.toLowerCase().includes(lowerSearchTerm)) ||
  //     (rec.createdBy && rec.createdBy.toLowerCase().includes(lowerSearchTerm))
  //   );
  //   setFilteredRecommendations(filtered);
  // }, [searchTerm, recommendations]);

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
    return <div className="page-loading-state"><div className="profile-spinner"></div>Loading community...</div>;
  }

  if (error) {
    return <div className="page-error-state">Error: {error}</div>;
  }

  if (!communityDetails) {
    return <div className="page-empty-state">Community not found.</div>;
  }

  const {
    name,
    description,
    creator_name,
    created_at,
    member_count,
    recommendation_count, // This count might be 0 or reflect future data
    isOwner,
    currentUserStatus
  } = communityDetails;

  const canRequestToJoin = currentUser && currentUserStatus === 'none';
  const isMember = currentUserStatus === 'approved';
  const hasRequested = currentUserStatus === 'requested';

  const renderActionButtons = () => {
    if (!currentUser) {
      return (
        <button className="btn btn-primary-outline" onClick={() => window.dispatchEvent(new Event('forceLogin'))}>
          <FaSignInAlt /> Sign in to Interact
        </button>
      );
    }
    if (isOwner) {
      return (
        <button className="btn btn-secondary" onClick={() => alert('Admin tools - TBD')}>
          <FaEdit /> Admin Tools
        </button>
      );
    }
    if (isMember) {
      return <span className="status-chip member"><FaUserCheck /> Member</span>;
    }
    if (hasRequested) {
      return <span className="status-chip pending"><FaHourglassHalf /> Request Pending</span>;
    }
    if (canRequestToJoin) {
      return (
        <button
          className="btn btn-primary"
          onClick={handleRequestToJoin}
          disabled={isRequesting}
        >
          <FaUserPlus /> {isRequesting ? 'Sending...' : 'Request to Join'}
        </button>
      );
    }
    return null;
  };

  return (
    <div className="community-profile-page-wrapper">
      <div className="community-info-card">
        <div className="info-card-header">
          <h1 className="community-title">{name}</h1>
          <div className="info-card-actions">
            {renderActionButtons()}
          </div>
        </div>
        <p className="community-description-card">{description || 'No description provided.'}</p>
        <div className="community-stats-grid">
          <IconText icon={<FaUserTie size={18} />} text={`Created by ${creator_name || 'N/A'}`} />
          <IconText icon={<FaCalendarAlt size={16} />} text={`Since ${new Date(created_at).toLocaleDateString()}`} />
          <IconText icon={<FaUsers size={18} />} text={`${member_count} Members`} />
          <IconText icon={<FaStar size={18} />} text={`${recommendation_count} Recommendations`} />
        </div>
      </div>

      <div className="community-content-area">
        <div className="tabs">
          <button
            className={`tab-button ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            Recommendations
          </button>
          <button
            className={`tab-button ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            Members ({members.length})
          </button>
        </div>

        {activeTab === 'recommendations' && (
          <div className="recommendations-section">
            {/* Search bar can be hidden or commented out if feature is not ready
            <div className="search-bar-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search recommendations..."
                className="recommendation-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled // Optionally disable if placeholder is shown
              />
            </div>
            */}
            <div className="feature-placeholder">
              <FaTools className="placeholder-icon" />
              <p className="placeholder-text">We're working hard to release this feature - stay tuned!</p>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="members-section">
            {/* {members.length > 0 ? (
              <div className="members-list">
                {members.map(member => <MemberCard key={member.id} member={member} />)}
              </div>
            ) : (
              <p className="no-results-message">No members to display in this community yet.</p>
            )} */}
            <div className="feature-placeholder">
              <FaTools className="placeholder-icon" />
              <p className="placeholder-text">We're working hard to release this feature - stay tuned!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityProfile;