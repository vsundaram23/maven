import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './TrustCircles.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';

const TrustCircles = () => {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allCommunities, setAllCommunities] = useState([]);
  const [joinedCommunities, setJoinedCommunities] = useState([]);
  const [joinRequests, setJoinRequests] = useState({});
  const navigate = useNavigate();

  const fetchTrustCircle = async () => {
    const storedEmail = localStorage.getItem('userEmail');
    if (!storedEmail) {
      console.warn('No userEmail in localStorage');
      window.dispatchEvent(new Event('forceLogin'));
      navigate('/');
      return;
    }

    setEmail(storedEmail);
    setLoading(true);

    try {
      // 1. Fetch connected users
      const response = await fetch(`${API_URL}/api/connections/check-connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: storedEmail })
      });

      if (!response.ok) throw new Error('Failed to fetch accepted connections');
      const data = await response.json();
      setUsers(data);

      // 2. Fetch user object (id, etc.)
      const userRes = await fetch(`${API_URL}/api/communities/user/email/${storedEmail}`);
      if (!userRes.ok) throw new Error('Failed to fetch user by email');
      const userData = await userRes.json();
      setUserId(userData.id);

      // 3. Fetch all communities
      const allRes = await fetch(`${API_URL}/api/communities/all`);
      const allData = await allRes.json();
      setAllCommunities(Array.isArray(allData) ? allData : []);

      // 4. Fetch joined communities for this user
      const joinedRes = await fetch(`${API_URL}/api/communities/user/${storedEmail}/communities`);
      const joinedData = await joinedRes.json();
      setJoinedCommunities(Array.isArray(joinedData) ? joinedData : []);

      // 5. For any communities this user created, fetch pending requests
      for (const community of allData) {
        if (community.created_by === userData.id) {
          const reqRes = await fetch(`${API_URL}/api/communities/${community.id}/requests?user_id=${userData.id}`);
          const reqData = await reqRes.json();
          setJoinRequests((prev) => ({ ...prev, [community.id]: reqData }));
        }
      }

    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const requestToJoinCommunity = async (communityId) => {
    try {
      await fetch(`${API_URL}/api/communities/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, community_id: communityId })
      });
      alert('Requested to join community!');
      fetchTrustCircle(); // Refresh
    } catch (err) {
      console.error('Error requesting to join:', err);
    }
  };

  const approveMembership = async (communityId, targetUserId) => {
    try {
      await fetch(`${API_URL}/api/communities/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ community_id: communityId, user_id: targetUserId })
      });
      alert('User approved!');
      fetchTrustCircle(); // Refresh
    } catch (err) {
      console.error('Error approving member:', err);
    }
  };

  useEffect(() => {
    fetchTrustCircle();
  }, [navigate]);

  return (
    <div className="trust-circles-container">
      <h1 className="trust-circles-header">Personal Trust Circle</h1>

      {loading ? (
        <p>Loading your connections...</p>
      ) : users.length === 0 ? (
        <p>No connections found.</p>
      ) : (
        <div className="user-grid">
          {users.map((user) => (
            <div className="user-card" key={user.email}>
              <div className="user-name">{user.name}</div>
              <div className="user-email">{user.email}</div>
              <div className="status connected">Connected</div>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-header">My Trust Circles</h2>
      {joinedCommunities.length === 0 ? (
        <p>You haven’t joined any communities yet.</p>
      ) : (
        <div className="community-list">
          {joinedCommunities.map((community) => (
            <div className="community-card" key={community.id}>
              <div className="community-name">{community.name}</div>
              <div className="community-description">{community.description}</div>
              <div className="status connected">Member</div>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-header">Available Communities</h2>
      {allCommunities.length === 0 ? (
        <p>No communities available.</p>
      ) : (
        <div className="community-list">
          {allCommunities.map((community) => (
            <div className="community-card" key={community.id}>
              <div className="community-name">{community.name}</div>
              <div className="community-description">{community.description}</div>

              <button
                className="action-button"
                onClick={() => requestToJoinCommunity(community.id)}
              >
                Request to Join
              </button>

              {community.created_by === userId && joinRequests[community.id]?.length > 0 && (
                <div className="pending-requests">
                  <h4>Pending Requests:</h4>
                  {joinRequests[community.id].map((req) => (
                    <div key={req.user_id} className="request-entry">
                      <span>{req.name} ({req.email})</span>
                      <button
                        className="approve-button"
                        onClick={() => approveMembership(community.id, req.user_id)}
                      >
                        Approve
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrustCircles;




// import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import './TrustCircles.css';

// const API_URL = 'https://api.seanag-recommendations.org:8080';

// const TrustCircles = () => {
//   const [users, setUsers] = useState([]);
//   const [email, setEmail] = useState('');
//   const [loading, setLoading] = useState(true);
//   const [communities, setCommunities] = useState([]);
//   const [userId, setUserId] = useState(null);
//   const [joinRequests, setJoinRequests] = useState({});
//   const navigate = useNavigate();

//   const fetchCommunities = async (storedEmail) => {
//     const userRes = await fetch(`${API_URL}/api/users/email/${storedEmail}`);
//     const userData = await userRes.json();
//     setUserId(userData.id);
  
//     const res = await fetch(`${API_URL}/api/community/all`);
//     const data = await res.json();
//     setCommunities(data);
  
//     // For each community, check for join requests (if creator)
//     data.forEach(async (community) => {
//       if (community.created_by === userData.id) {
//         const reqRes = await fetch(`${API_URL}/api/community/${community.id}/requests?user_id=${userData.id}`);
//         const reqData = await reqRes.json();
//         setJoinRequests((prev) => ({ ...prev, [community.id]: reqData }));
//       }
//     });
//   };
  
//   useEffect(() => {
//     const storedEmail = localStorage.getItem('userEmail');
//     if (storedEmail) fetchCommunities(storedEmail);
//   }, []);

//   const fetchTrustCircle = async () => {
//     const storedEmail = localStorage.getItem('userEmail');
//     if (!storedEmail) {
//       console.warn('No userEmail in localStorage');
//       window.dispatchEvent(new Event('forceLogin'));
//       navigate('/');
//       return;
//     }

//     setEmail(storedEmail);
//     setLoading(true); // NEW

//     try {
//       const response = await fetch(`${API_URL}/api/connections/check-connections`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ email: storedEmail })
//       });

//       if (!response.ok) throw new Error('Failed to fetch accepted connections');

//       const data = await response.json();
//       console.log('Fetched connections:', data);
//       setUsers(data);
//     } catch (err) {
//       console.error('Error loading connections:', err);
//     } finally {
//         setLoading(false); // NEW
//     }
//   };

//   useEffect(() => {
//     fetchTrustCircle();
//   }, [navigate]);

//   return (
//     <div className="trust-circles-container">
//       <h1 className="trust-circles-header">Personal Trust Circle</h1>

//       {loading ? (
//         <p>Loading your connections...</p>
//       ) : users.length === 0 ? (
//         <p>No connections found.</p>
//       ) : (
//         <div className="user-grid">
//           {users.map((user) => (
//             <div className="user-card" key={user.email}>
//               <div className="user-name">{user.name}</div>
//               <div className="user-email">{user.email}</div>
//               <div className="status connected">Connected</div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default TrustCircles;

