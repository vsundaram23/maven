import React, { useEffect, useState, useCallback, useRef } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { FaStar, FaStarHalfAlt } from "react-icons/fa";
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
    UserCircleIcon,
    EnvelopeIcon,
    UsersIcon,
    ArrowRightOnRectangleIcon,
    PencilSquareIcon,
    PlusCircleIcon,
    CameraIcon,
    CheckCircleIcon,
    XCircleIcon,
    BuildingOffice2Icon,
    ChatBubbleLeftEllipsisIcon,
    EllipsisVerticalIcon,
    ShareIcon,
    CalendarDaysIcon,
    CropIcon 
} from "@heroicons/react/24/solid";
import "./Profile.css";

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = "http://localhost:5000";
// const API_URL = "http://localhost:3000";

function getCroppedImg(image, crop, fileName) {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) {
                reject(new Error('Canvas is empty'));
                return;
            }
            blob.name = fileName;
            resolve(blob);
        }, 'image/jpeg', 0.95); 
    });
}


const StarRating = ({ rating }) => {
  const numRating = parseFloat(rating) || 0;
  const fullStars = Math.floor(numRating);
  const hasHalf = numRating - fullStars >= 0.4;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="profile-star-display">
      {[...Array(fullStars)].map((_, i) => <FaStar key={`full-${i}`} className="profile-star-icon filled" />)}
      {hasHalf && <FaStarHalfAlt key={`half-${Date.now()}-sr`} className="profile-star-icon filled" />}
      {[...Array(emptyStars)].map((_, i) => <FaStar key={`empty-${i}`} className="profile-star-icon empty" />)}
    </div>
  );
};

const MyRecommendationCard = ({ rec }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const formatDate = (dateString) => {
        if (!dateString) return 'Date not available';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    const handleEdit = () => {
        alert('Edit functionality for individual recommendations coming soon!');
        setDropdownOpen(false);
    };

    const handleShare = () => {
        alert('Share functionality for individual recommendations coming soon!');
        setDropdownOpen(false);
    };
    
    const handleAddTags = () => {
        alert('Adding/editing tags for individual recommendations coming soon!');
    };

    const displayCommunityRating = rec.average_rating ? parseFloat(rec.average_rating).toFixed(1) : null;
    const communityTotalReviews = rec.total_reviews || 0;

    return (
        <div className="profile-my-rec-card">
            <div className="profile-my-rec-card-header">
                <div className="profile-my-rec-title-section">
                    <BuildingOffice2Icon className="profile-my-rec-building-icon" />
                    <h3 className="profile-my-rec-business-name">{rec.business_name || 'Unknown Business'}</h3>
                </div>
                <div className="profile-my-rec-actions-menu">
                    {(parseFloat(rec.average_rating) || 0) >= 4.5 && (
                        <span className="profile-my-rec-top-rated-badge">Top Rated</span>
                    )}
                    <div className="profile-my-rec-dropdown-wrapper">
                        <button
                            className="profile-my-rec-three-dots-button"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            aria-label="Options"
                        >
                            <EllipsisVerticalIcon style={{ width: '20px', height: '20px' }} />
                        </button>
                        {dropdownOpen && (
                            <div className="profile-my-rec-dropdown-menu">
                                <button className="profile-my-rec-dropdown-item" onClick={handleEdit}>
                                    <PencilSquareIcon /> Edit My Recommendation
                                </button>
                                <button className="profile-my-rec-dropdown-item" onClick={handleShare}>
                                    <ShareIcon /> Share Recommendation
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {typeof rec.average_rating === 'number' && (
              <div className="profile-my-rec-review-summary">
                <StarRating rating={rec.average_rating} />
                <span className="profile-my-rec-review-score">
                  {displayCommunityRating} ({communityTotalReviews} Community Reviews)
                </span>
              </div>
            )}

            {rec.recommender_message && (
                <p className="profile-my-rec-message">
                    <ChatBubbleLeftEllipsisIcon className="inline-icon" />
                    {rec.recommender_message}
                </p>
            )}

            {Array.isArray(rec.tags) && rec.tags.length > 0 && (
                <div className="profile-my-rec-tag-container">
                    {rec.tags.map((tag, idx) => (
                        <span key={idx} className="profile-my-rec-tag-badge">{tag}</span>
                    ))}
                    <button
                        className="profile-my-rec-add-tag-button"
                        onClick={handleAddTags}
                        aria-label="Add a tag"
                    >+</button>
                </div>
            )}
            {(Array.isArray(rec.tags) && rec.tags.length === 0) && (
                <div className="profile-my-rec-tag-container">
                    <span className="profile-my-rec-no-tags-text">No tags added yet.</span>
                    <button
                        className="profile-my-rec-add-tag-button"
                        onClick={handleAddTags}
                        aria-label="Add a tag"
                    >+</button>
                </div>
            )}

            <div className="profile-my-rec-footer">
                <div className="profile-my-rec-date">
                    <CalendarDaysIcon className="inline-icon" />
                    My Recommendation on: {formatDate(rec.date_of_recommendation || rec.created_at)}
                </div>
                 <button className="profile-my-rec-primary-action-button" onClick={handleEdit}>
                    <PencilSquareIcon className="btn-icon" /> Edit My Rec
                </button>
            </div>
        </div>
    );
};

const Profile = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const { signOut } = useClerk(); 
    const navigate = useNavigate();

    const [recommendations, setRecommendations] = useState([]);
    const [connections, setConnections] = useState([]);
    const [profileUserData, setProfileUserData] = useState(null);
    
    const [userBio, setUserBio] = useState('');
    const [profileImage, setProfileImage] = useState(''); 
    
    const [editingBio, setEditingBio] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const [imgSrcForCropper, setImgSrcForCropper] = useState('');
    const imgRef = useRef(null);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const [originalFile, setOriginalFile] = useState(null);
    
    const [sortOption, setSortOption] = useState('date_of_recommendation'); 
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const ASPECT_RATIO = 1;
    const MIN_DIMENSION = 150;

    const getClerkUserQueryParams = useCallback(() => {
        if (!user) return "";
        return new URLSearchParams({
            user_id: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            phoneNumber: user.primaryPhoneNumber?.phoneNumber || ""
        }).toString();
    }, [user]);

    const fetchProfileData = useCallback(async () => {
        if (!isLoaded || !isSignedIn || !user) return;
        setLoading(true);
        setError(null);
        try {
            const queryParams = getClerkUserQueryParams();
            if (!queryParams) {
                throw new Error("User details not available for API query.");
            }

            const profileResPromise = fetch(`${API_URL}/api/users/me/recommendations?${queryParams}`);
            const connectionsResPromise = fetch(`${API_URL}/api/connections/check-connections?${queryParams}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ email: user.primaryEmailAddress?.emailAddress, user_id: user.id }),
            });
            
            const [profileRes, connectionsRes] = await Promise.all([profileResPromise, connectionsResPromise]);

            if (!profileRes.ok) {
                const errData = await profileRes.json().catch(() => ({}));
                throw new Error(errData.message || "Failed to fetch profile data and recommendations");
            }
            const profileData = await profileRes.json();
            
            setProfileUserData(profileData);
            setRecommendations(profileData.recommendations || []);
            setUserBio(profileData.userBio || '');
            setEditingBio(profileData.userBio || '');
            
            const baseImageUrl = `${API_URL}/api/users/me/profile/image`;
            const imageQuery = getClerkUserQueryParams(); 
            if (imageQuery) {
                setProfileImage(`${baseImageUrl}?${imageQuery}&timestamp=${new Date().getTime()}`);
            }

            if (!connectionsRes.ok) {
                console.warn("Failed to fetch connections, proceeding without them.");
                setConnections([]);
            } else {
                const connsData = await connectionsRes.json();
                setConnections(Array.isArray(connsData) ? connsData : []);
            }
        } catch (err) {
            console.error("Error fetching profile data:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [isLoaded, isSignedIn, user, getClerkUserQueryParams]);

    useEffect(() => {
        if (isSignedIn && user) {
            fetchProfileData();
        } else if (isLoaded && !isSignedIn) {
            navigate("/");
        }
    }, [isSignedIn, user, isLoaded, fetchProfileData, navigate]);
    
    const sortedRecommendations = React.useMemo(() => {
        let sortableItems = [...recommendations];
        if (sortOption === 'topRated' && sortableItems.every(item => typeof item.average_rating === 'number')) {
            sortableItems.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0) || (b.total_reviews || 0) - (a.total_reviews || 0));
        } else if (sortOption === 'date_of_recommendation') {
             sortableItems.sort((a, b) => new Date(b.date_of_recommendation || 0) - new Date(a.date_of_recommendation || 0));
        }
        return sortableItems;
    }, [recommendations, sortOption]);

    const handleLogout = async () => {
        try {
            await signOut();
            navigate("/");
        } catch (err) {
            console.error("Error signing out:", err);
        }
    };

    const handleEditToggle = () => {
        if (isEditing) {
            setEditingBio(userBio);
            setImgSrcForCropper('');
            setCompletedCrop(null);
            setOriginalFile(null);
            setCrop(undefined);
        } else {
            setEditingBio(userBio || '');
        }
        setIsEditing(!isEditing);
    };
    
    const onImageLoad = (e) => {
        const { width, height } = e.currentTarget;
        const cropWidthInPercent = (MIN_DIMENSION / width) * 100;
        const crop = makeAspectCrop(
            { unit: '%', width: cropWidthInPercent },
            ASPECT_RATIO,
            width,
            height
        );
        const centeredCrop = centerCrop(crop, width, height);
        setCrop(centeredCrop);
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setOriginalFile(file);
            setCrop(undefined); 
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImgSrcForCropper(reader.result?.toString() || '');
            });
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = async () => {
        if (!user) {
            setError("User not found. Cannot save profile.");
            return;
        }
        setError(null);
        setSaving(true);

        const formData = new FormData();
        formData.append('bio', editingBio);
        formData.append('firstName', user.firstName || ""); 
        formData.append('lastName', user.lastName || "");
        
        let fileToUpload = null;
        if (completedCrop && imgRef.current && originalFile) {
            try {
                const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop, originalFile.name);
                fileToUpload = new File([croppedImageBlob], originalFile.name, { type: croppedImageBlob.type });
            } catch (cropError) {
                console.error("Error cropping image:", cropError);
                setError("Failed to crop image. Please try again.");
                setSaving(false);
                return;
            }
        }

        if (fileToUpload) {
            formData.append('profileImageFile', fileToUpload);
        }
        
        try {
            const queryParams = getClerkUserQueryParams();
            if (!queryParams) {
                throw new Error("User details not available for API query.");
            }

            const response = await fetch(`${API_URL}/api/users/me/profile?${queryParams}`, {
                method: 'PUT',
                body: formData
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to update profile.");
            }

            setUserBio(data.user.bio || '');
            setEditingBio(data.user.bio || '');
            
            const newTimestamp = new Date().getTime();
            const baseImageUrl = `${API_URL}/api/users/me/profile/image`;
            const imageQuery = getClerkUserQueryParams();
            if(imageQuery) {
                const updatedImageUrl = `${baseImageUrl}?${imageQuery}&timestamp=${newTimestamp}`;
                setProfileImage(updatedImageUrl);
            }
            
            setImgSrcForCropper('');
            setCompletedCrop(null);
            setOriginalFile(null);
            setIsEditing(false);
            
            if (profileUserData) {
                setProfileUserData(prev => ({...prev, userName: data.user.name, userBio: data.user.bio}));
            }

        } catch (err) {
            console.error("Error saving profile:", err);
            setError(`Failed to save profile: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };
    
    const onAvatarOrPreviewError = (e) => {
        e.target.style.display = 'none'; 
        const fallbackParent = e.target.closest('.profile-avatar-display-wrapper') || e.target.closest('.profile-avatar-cropper-wrapper');
        if (fallbackParent) {
            const fallbackIcon = fallbackParent.querySelector('.profile-avatar-icon-fallback, .profile-avatar-icon-editing');
            if (fallbackIcon) {
                fallbackIcon.style.display = 'flex';
            }
        }
    };

    if (!isLoaded || (loading && !profileUserData && isSignedIn)) {
        return (
            <div className="profile-loading-container">
                <div className="profile-spinner"></div>
                <p>Loading Profile...</p>
            </div>
        );
    }

    if (!isSignedIn && isLoaded) {
         return null; 
    }
    
    if (!user && isLoaded && isSignedIn) {
        return (
             <div className="profile-page">
                <div className="profile-main-content" style={{ textAlign: 'center', paddingTop: '5rem' }}>
                    <h1 style={{color: 'var(--profile-primary-color)'}}>Profile Access Denied</h1>
                    <p className="profile-error-banner" style={{margin: '1rem auto', maxWidth: '600px'}}>
                        User information is not available. Please try logging in again.
                    </p>
                    <button className="profile-primary-action-btn" onClick={() => navigate('/login')}>
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-page">
            <header className="profile-main-header">
                <div className="profile-avatar-section">
                    {isEditing ? (
                        <div className="profile-avatar-cropper-wrapper">
                            <input
                                type="file"
                                id="profileImageUploadInput"
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            {!imgSrcForCropper && (
                                <div 
                                    className="profile-avatar-container" 
                                    onClick={() => document.getElementById('profileImageUploadInput')?.click()}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {profileImage ? 
                                        <img src={profileImage} alt="Current profile" className="profile-avatar-image" onError={onAvatarOrPreviewError}/> 
                                        : <UserCircleIcon className="profile-avatar-icon profile-avatar-icon-fallback"/> 
                                    }
                                    <div className="profile-avatar-edit-overlay">
                                        <CameraIcon style={{ width: '24px', height: '24px' }}/>
                                    </div>
                                </div>
                            )}
                            {imgSrcForCropper && (
                                <div className="cropper-container">
                                   <ReactCrop
                                        crop={crop}
                                        onChange={(pixelCrop, percentCrop) => setCrop(percentCrop)}
                                        onComplete={(c) => setCompletedCrop(c)}
                                        aspect={ASPECT_RATIO}
                                        minWidth={MIN_DIMENSION}
                                        minHeight={MIN_DIMENSION}
                                        circularCrop={true}
                                    >
                                        <img
                                            ref={imgRef}
                                            src={imgSrcForCropper}
                                            alt="Crop me"
                                            onLoad={onImageLoad}
                                            style={{ maxHeight: '300px' }}
                                        />
                                    </ReactCrop>
                                    <button 
                                        className="profile-change-photo-btn-cropper"
                                        onClick={() => document.getElementById('profileImageUploadInput')?.click()}
                                    >
                                        <CameraIcon className="btn-icon"/> Change Photo
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="profile-avatar-display-wrapper profile-avatar-container">
                            {profileImage ? (
                                <img 
                                    src={profileImage} 
                                    alt={profileUserData?.userName || user?.firstName || "User"} 
                                    className="profile-avatar-image" 
                                    onError={onAvatarOrPreviewError}
                                />
                            ) : null}
                            <UserCircleIcon 
                                className="profile-avatar-icon profile-avatar-icon-fallback" 
                                style={{ display: profileImage ? 'none' : 'flex' }}
                            />
                        </div>
                    )}
                </div>

                <div className="profile-user-info">
                    <h1>
                        {profileUserData?.userName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "User"}
                    </h1>
                    <p>
                        <EnvelopeIcon className="inline-icon" />
                        {user?.primaryEmailAddress?.emailAddress}
                    </p>
                    {isEditing ? (
                        <textarea
                            className="profile-bio-textarea"
                            value={editingBio}
                            onChange={(e) => setEditingBio(e.target.value)}
                            placeholder="Tell us about yourself..."
                            rows={3}
                        />
                    ) : (
                        userBio && <p className="profile-user-bio">{userBio}</p>
                    )}
                </div>

                <div className="profile-header-actions">
                    {isEditing ? (
                        <>
                            <button className="profile-save-btn" onClick={handleSaveProfile} disabled={saving}>
                                <CheckCircleIcon className="btn-icon" /> {saving ? "Saving..." : "Save Changes"}
                            </button>
                            <button className="profile-cancel-btn" onClick={handleEditToggle} disabled={saving}>
                                <XCircleIcon className="btn-icon" /> Cancel
                            </button>
                        </>
                    ) : (
                        <button className="profile-edit-btn" onClick={handleEditToggle}>
                            <PencilSquareIcon className="btn-icon" /> Edit Profile
                        </button>
                    )}
                    <button className="profile-logout-btn-header" onClick={handleLogout} disabled={saving || isEditing}>
                        <ArrowRightOnRectangleIcon className="btn-icon" /> Logout
                    </button>
                </div>
            </header>

            {error && <div className="profile-error-banner">{error}</div>}

            <section className="profile-stats-bar">
                <div className="stat-item">
                    <FaStar className="stat-icon" style={{ color: "var(--profile-accent-yellow)" }} />
                    <span>{sortedRecommendations.length}</span>
                    <p>Recommendations Made</p>
                </div>
                <div className="stat-item">
                    <UsersIcon className="stat-icon" />
                    <span>{connections.length}</span>
                    <p>Connections</p>
                </div>
            </section>

            <main className="profile-main-content">
                <section className="profile-content-section" id="my-recommendations">
                    <div className="section-header">
                        <h2>My Recommendations</h2>
                        <button className="profile-add-new-btn" onClick={() => navigate("/share-recommendation")}>
                            <PlusCircleIcon className="btn-icon" /> Add New
                        </button>
                    </div>
                    {loading && sortedRecommendations.length === 0 && (
                        <div className="profile-loading-container small-spinner">
                            <div className="profile-spinner"></div>
                            <p>Loading recommendations...</p>
                        </div>
                    )}
                    {!loading && sortedRecommendations.length > 0 && (
                        <div className="profile-my-recommendations-grid">
                            {sortedRecommendations.map((rec) => (
                                <MyRecommendationCard key={rec.id} rec={rec} />
                            ))}
                        </div>
                    )}
                    {!loading && sortedRecommendations.length === 0 && !error && (
                        <div className="profile-empty-state">
                            <FaStar className="empty-state-icon" style={{ color: "var(--profile-text-light)" }} />
                            <p>You haven't made any recommendations yet.</p>
                            <button className="profile-primary-action-btn" onClick={() => navigate("/share-recommendation")}>
                                Share Your First Recommendation
                            </button>
                        </div>
                    )}
                     {!loading && sortedRecommendations.length === 0 && error && (
                        <p className="profile-empty-state-error-inline">
                           Could not load recommendations. {error}
                        </p>
                    )}
                </section>
            </main>
        </div>
    );
};

export default Profile;

// working 5/19 => advanced functionality, post clerk
// import React, { useEffect, useState, useCallback } from "react";
// import { useUser, useClerk } from "@clerk/clerk-react";
// import { useNavigate } from "react-router-dom";
// import { FaStar, FaStarHalfAlt } from "react-icons/fa";
// import {
//     UserCircleIcon,
//     EnvelopeIcon,
//     UsersIcon,
//     ArrowRightOnRectangleIcon,
//     PencilSquareIcon,
//     PlusCircleIcon,
//     CameraIcon,
//     CheckCircleIcon,
//     XCircleIcon,
//     BuildingOffice2Icon,
//     ChatBubbleLeftEllipsisIcon,
//     EllipsisVerticalIcon,
//     ShareIcon,
//     CalendarDaysIcon
// } from "@heroicons/react/24/solid";
// import "./Profile.css";

// const API_URL = "http://localhost:3000";

// const StarRating = ({ rating }) => {
//   const numRating = parseFloat(rating) || 0;
//   const fullStars = Math.floor(numRating);
//   const hasHalf = numRating - fullStars >= 0.4;
//   const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

//   return (
//     <div className="profile-star-display">
//       {[...Array(fullStars)].map((_, i) => <FaStar key={`full-${i}`} className="profile-star-icon filled" />)}
//       {hasHalf && <FaStarHalfAlt key={`half-${Date.now()}-sr`} className="profile-star-icon filled" />}
//       {[...Array(emptyStars)].map((_, i) => <FaStar key={`empty-${i}`} className="profile-star-icon empty" />)}
//     </div>
//   );
// };

// const MyRecommendationCard = ({ rec }) => {
//     const [dropdownOpen, setDropdownOpen] = useState(false);

//     const formatDate = (dateString) => {
//         if (!dateString) return 'Date not available';
//         return new Date(dateString).toLocaleDateString('en-US', {
//             year: 'numeric', month: 'long', day: 'numeric'
//         });
//     };

//     const handleEdit = () => {
//         alert('Edit functionality for individual recommendations coming soon!');
//         setDropdownOpen(false);
//     };

//     const handleShare = () => {
//         alert('Share functionality for individual recommendations coming soon!');
//         setDropdownOpen(false);
//     };
    
//     const handleAddTags = () => {
//         alert('Adding/editing tags for individual recommendations coming soon!');
//     };

//     const displayCommunityRating = rec.average_rating ? parseFloat(rec.average_rating).toFixed(1) : null;
//     const communityTotalReviews = rec.total_reviews || 0;

//     return (
//         <div className="profile-my-rec-card">
//             <div className="profile-my-rec-card-header">
//                 <div className="profile-my-rec-title-section">
//                     <BuildingOffice2Icon className="profile-my-rec-building-icon" />
//                     <h3 className="profile-my-rec-business-name">{rec.business_name || 'Unknown Business'}</h3>
//                 </div>
//                 <div className="profile-my-rec-actions-menu">
//                     {(parseFloat(rec.average_rating) || 0) >= 4.5 && (
//                         <span className="profile-my-rec-top-rated-badge">Top Rated</span>
//                     )}
//                     <div className="profile-my-rec-dropdown-wrapper">
//                         <button
//                             className="profile-my-rec-three-dots-button"
//                             onClick={() => setDropdownOpen(!dropdownOpen)}
//                             aria-label="Options"
//                         >
//                             <EllipsisVerticalIcon style={{ width: '20px', height: '20px' }} />
//                         </button>
//                         {dropdownOpen && (
//                             <div className="profile-my-rec-dropdown-menu">
//                                 <button className="profile-my-rec-dropdown-item" onClick={handleEdit}>
//                                     <PencilSquareIcon /> Edit My Recommendation
//                                 </button>
//                                 <button className="profile-my-rec-dropdown-item" onClick={handleShare}>
//                                     <ShareIcon /> Share Recommendation
//                                 </button>
//                             </div>
//                         )}
//                     </div>
//                 </div>
//             </div>

//             {typeof rec.average_rating === 'number' && (
//               <div className="profile-my-rec-review-summary">
//                 <StarRating rating={rec.average_rating} />
//                 <span className="profile-my-rec-review-score">
//                   {displayCommunityRating} ({communityTotalReviews} Community Reviews)
//                 </span>
//               </div>
//             )}

//             {rec.recommender_message && (
//                 <p className="profile-my-rec-message">
//                     <ChatBubbleLeftEllipsisIcon className="inline-icon" />
//                     {rec.recommender_message}
//                 </p>
//             )}

//             {Array.isArray(rec.tags) && rec.tags.length > 0 && (
//                 <div className="profile-my-rec-tag-container">
//                     {rec.tags.map((tag, idx) => (
//                         <span key={idx} className="profile-my-rec-tag-badge">{tag}</span>
//                     ))}
//                     <button
//                         className="profile-my-rec-add-tag-button"
//                         onClick={handleAddTags}
//                         aria-label="Add a tag"
//                     >+</button>
//                 </div>
//             )}
//             {(Array.isArray(rec.tags) && rec.tags.length === 0) && (
//                 <div className="profile-my-rec-tag-container">
//                     <span className="profile-my-rec-no-tags-text">No tags added yet.</span>
//                     <button
//                         className="profile-my-rec-add-tag-button"
//                         onClick={handleAddTags}
//                         aria-label="Add a tag"
//                     >+</button>
//                 </div>
//             )}

//             <div className="profile-my-rec-footer">
//                 <div className="profile-my-rec-date">
//                     <CalendarDaysIcon className="inline-icon" />
//                     My Recommendation on: {formatDate(rec.date_of_recommendation || rec.created_at)}
//                 </div>
//                  <button className="profile-my-rec-primary-action-button" onClick={handleEdit}>
//                     <PencilSquareIcon className="btn-icon" /> Edit My Rec
//                 </button>
//             </div>
//         </div>
//     );
// };

// const Profile = () => {
//     const { isLoaded, isSignedIn, user } = useUser();
//     const { signOut } = useClerk(); 
//     const navigate = useNavigate();

//     const [recommendations, setRecommendations] = useState([]);
//     const [connections, setConnections] = useState([]);
//     const [profileUserData, setProfileUserData] = useState(null);
    
//     const [userBio, setUserBio] = useState('');
//     const [profileImage, setProfileImage] = useState('');
//     const [editingProfileImagePreview, setEditingProfileImagePreview] = useState('');
//     const [selectedFile, setSelectedFile] = useState(null);
//     const [isEditing, setIsEditing] = useState(false);
//     const [editingBio, setEditingBio] = useState('');
    
//     const [sortOption, setSortOption] = useState('date_of_recommendation'); 

//     const [loading, setLoading] = useState(true);
//     const [saving, setSaving] = useState(false);
//     const [error, setError] = useState(null);

//     const getClerkUserQueryParams = useCallback(() => {
//         if (!user) return "";
//         return new URLSearchParams({
//             user_id: user.id,
//             email: user.primaryEmailAddress?.emailAddress,
//             firstName: user.firstName || "",
//             lastName: user.lastName || "",
//             phoneNumber: user.primaryPhoneNumber?.phoneNumber || ""
//         }).toString();
//     }, [user]);

//     const fetchProfileData = useCallback(async () => {
//         if (!isLoaded || !isSignedIn || !user) return;
//         setLoading(true);
//         setError(null);
//         try {
//             const queryParams = getClerkUserQueryParams();
//             if (!queryParams) {
//                 throw new Error("User details not available for API query.");
//             }

//             const profileResPromise = fetch(`${API_URL}/api/users/me/recommendations?${queryParams}`);
//             const connectionsResPromise = fetch(`${API_URL}/api/connections/check-connections?${queryParams}`, {
//                 method: "POST",
//                 headers: { 
//                     "Content-Type": "application/json",
//                 },
//                  body: JSON.stringify({ 
//                      email: user.primaryEmailAddress?.emailAddress,
//                      user_id: user.id,
//                  }),
//             });
            
//             const [profileRes, connectionsRes] = await Promise.all([profileResPromise, connectionsResPromise]);

//             if (!profileRes.ok) {
//                 const errData = await profileRes.json().catch(() => ({}));
//                 throw new Error(errData.message || "Failed to fetch profile data and recommendations");
//             }
//             const profileData = await profileRes.json();
            
//             setProfileUserData(profileData);
//             setRecommendations(profileData.recommendations || []);
//             setUserBio(profileData.userBio || '');
//             setEditingBio(profileData.userBio || '');
            
//             const baseImageUrl = `${API_URL}/api/users/me/profile/image`;
//             const imageQuery = getClerkUserQueryParams(); 
//             if (imageQuery) {
//                 setProfileImage(`${baseImageUrl}?${imageQuery}&timestamp=${new Date().getTime()}`);
//                 setEditingProfileImagePreview(`${baseImageUrl}?${imageQuery}&timestamp=${new Date().getTime()}`);
//             }


//             if (!connectionsRes.ok) {
//                 console.warn("Failed to fetch connections, proceeding without them.");
//                 setConnections([]);
//             } else {
//                 const connsData = await connectionsRes.json();
//                 setConnections(Array.isArray(connsData) ? connsData : []);
//             }

//         } catch (err) {
//             console.error("Error fetching profile data:", err);
//             setError(err.message);
//         } finally {
//             setLoading(false);
//         }
//     }, [isLoaded, isSignedIn, user, getClerkUserQueryParams]);

//     useEffect(() => {
//         if (isSignedIn && user) {
//             fetchProfileData();
//         } else if (isLoaded && !isSignedIn) {
//             navigate("/");
//         }
//     }, [isSignedIn, user, isLoaded, fetchProfileData, navigate]);
    
//     const sortedRecommendations = React.useMemo(() => {
//         let sortableItems = [...recommendations];
//         if (sortOption === 'topRated' && sortableItems.every(item => typeof item.average_rating === 'number')) {
//             sortableItems.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0) || (b.total_reviews || 0) - (a.total_reviews || 0));
//         } else if (sortOption === 'date_of_recommendation') {
//              sortableItems.sort((a, b) => new Date(b.date_of_recommendation || 0) - new Date(a.date_of_recommendation || 0));
//         }
//         return sortableItems;
//     }, [recommendations, sortOption]);

//     const handleLogout = async () => {
//         try {
//             await signOut();
//             navigate("/");
//         } catch (err) {
//             console.error("Error signing out:", err);
//         }
//     };

//     const handleEditToggle = () => {
//         if (isEditing) {
//             setEditingBio(userBio);
//             if (profileImage) { 
//                 setEditingProfileImagePreview(profileImage);
//             }
//             setSelectedFile(null);
//         } else {
//             setEditingBio(userBio || '');
//             if (profileImage) {
//                 setEditingProfileImagePreview(profileImage);
//             }
//         }
//         setIsEditing(!isEditing);
//     };

//     const handleFileChange = (event) => {
//         const file = event.target.files[0];
//         if (file) {
//             setSelectedFile(file);
//             setEditingProfileImagePreview(URL.createObjectURL(file));
//         }
//     };

//     const handleSaveProfile = async () => {
//         if (!user) {
//             setError("User not found. Cannot save profile.");
//             return;
//         }
//         setError(null);
//         setSaving(true);

//         const formData = new FormData();
//         formData.append('bio', editingBio);
//         formData.append('firstName', user.firstName || ""); 
//         formData.append('lastName', user.lastName || "");
        
//         if (selectedFile) {
//             formData.append('profileImageFile', selectedFile);
//         }
        
//         try {
//             const queryParams = getClerkUserQueryParams();
//             if (!queryParams) {
//                 throw new Error("User details not available for API query.");
//             }

//             const response = await fetch(`${API_URL}/api/users/me/profile?${queryParams}`, {
//                 method: 'PUT',
//                 body: formData
//             });

//             const data = await response.json();

//             if (!response.ok || !data.success) {
//                 throw new Error(data.message || "Failed to update profile.");
//             }

//             setUserBio(data.user.bio || '');
//             setEditingBio(data.user.bio || '');
            
//             const newTimestamp = new Date().getTime();
//             const baseImageUrl = `${API_URL}/api/users/me/profile/image`;
//             const imageQuery = getClerkUserQueryParams();
//             if(imageQuery) {
//                 const updatedImageUrl = `${baseImageUrl}?${imageQuery}&timestamp=${newTimestamp}`;
//                 setProfileImage(updatedImageUrl);
//                 setEditingProfileImagePreview(updatedImageUrl);
//             }
            
//             setSelectedFile(null);
//             setIsEditing(false);
            
//             if (profileUserData) {
//                 setProfileUserData(prev => ({...prev, userName: data.user.name, userBio: data.user.bio}));
//             }

//         } catch (err) {
//             console.error("Error saving profile:", err);
//             setError(`Failed to save profile: ${err.message}`);
//         } finally {
//             setSaving(false);
//         }
//     };
    
//     const onImageError = (e) => {
//         e.target.style.display = 'none';
//         const fallback = e.target.nextElementSibling;
//         if (fallback && fallback.classList.contains('profile-avatar-icon-fallback')) {
//             fallback.style.display = 'flex';
//         }
//     };
    
//     const onPreviewImageError = (e) => {
//         e.target.style.display = 'none';
//         const fallback = e.target.nextElementSibling;
//          if (fallback && fallback.classList.contains('profile-avatar-icon-editing-fallback')) {
//             fallback.style.display = 'flex';
//         }
//     };

//     if (!isLoaded || (loading && !profileUserData && isSignedIn)) {
//         return (
//             <div className="profile-loading-container">
//                 <div className="profile-spinner"></div>
//                 <p>Loading Profile...</p>
//             </div>
//         );
//     }

//     if (!isSignedIn && isLoaded) {
//          return null; 
//     }
    
//     if (!user && isLoaded && isSignedIn) {
//         return (
//              <div className="profile-page">
//                 <div className="profile-main-content" style={{ textAlign: 'center', paddingTop: '5rem' }}>
//                     <h1 style={{color: 'var(--profile-primary-color)'}}>Profile Access Denied</h1>
//                     <p className="profile-error-banner" style={{margin: '1rem auto', maxWidth: '600px'}}>
//                         User information is not available. Please try logging in again.
//                     </p>
//                     <button className="profile-primary-action-btn" onClick={() => navigate('/login')}>
//                         Go to Login
//                     </button>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="profile-page">
//             <header className="profile-main-header">
//                 <div
//                     className="profile-avatar-container"
//                     onClick={isEditing ? () => document.getElementById('profileImageUploadInput')?.click() : undefined}
//                     style={isEditing ? { cursor: 'pointer', position: 'relative' } : {position: 'relative'}}
//                 >
//                     {isEditing ? (
//                         <>
//                             {editingProfileImagePreview && editingProfileImagePreview.startsWith('blob:') ? (
//                                 <img 
//                                     src={editingProfileImagePreview} 
//                                     alt="Profile Preview" 
//                                     className="profile-avatar-image preview" 
//                                 />
//                             ) : editingProfileImagePreview ? (
//                                  <img 
//                                     src={editingProfileImagePreview} 
//                                     alt="Profile Preview" 
//                                     className="profile-avatar-image preview" 
//                                     onError={onPreviewImageError}
//                                 />
//                             ) : null }
//                              <UserCircleIcon 
//                                 className="profile-avatar-icon-editing-fallback profile-avatar-icon editing" 
//                                 style={{ display: editingProfileImagePreview ? 'none' : 'flex' }}
//                             />
//                             <div className="profile-avatar-edit-overlay">
//                                 <CameraIcon style={{ width: '24px', height: '24px' }}/>
//                             </div>
//                         </>
//                     ) : (
//                         <>
//                             {profileImage ? (
//                                 <img 
//                                     src={profileImage} 
//                                     alt={profileUserData?.userName || user?.firstName || "User"} 
//                                     className="profile-avatar-image" 
//                                     onError={onImageError}
//                                 />
//                             ) : null}
//                             <UserCircleIcon 
//                                 className="profile-avatar-icon-fallback profile-avatar-icon" 
//                                 style={{ display: profileImage ? 'none' : 'flex' }}
//                             />
//                         </>
//                     )}
//                 </div>

//                 <div className="profile-user-info">
//                     <h1>
//                         {profileUserData?.userName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "User"}
//                     </h1>
//                     <p>
//                         <EnvelopeIcon className="inline-icon" />
//                         {user?.primaryEmailAddress?.emailAddress}
//                     </p>
//                     {isEditing ? (
//                         <>
//                             <textarea
//                                 className="profile-bio-textarea"
//                                 value={editingBio}
//                                 onChange={(e) => setEditingBio(e.target.value)}
//                                 placeholder="Tell us about yourself..."
//                                 rows={3}
//                             />
//                             <input
//                                 type="file"
//                                 id="profileImageUploadInput"
//                                 style={{ display: 'none' }}
//                                 accept="image/*"
//                                 onChange={handleFileChange}
//                             />
//                         </>
//                     ) : (
//                         userBio && <p className="profile-user-bio">{userBio}</p>
//                     )}
//                 </div>

//                 <div className="profile-header-actions">
//                     {isEditing ? (
//                         <>
//                             <button className="profile-save-btn" onClick={handleSaveProfile} disabled={saving}>
//                                 <CheckCircleIcon className="btn-icon" /> {saving ? "Saving..." : "Save Changes"}
//                             </button>
//                             <button className="profile-cancel-btn" onClick={handleEditToggle} disabled={saving}>
//                                 <XCircleIcon className="btn-icon" /> Cancel
//                             </button>
//                         </>
//                     ) : (
//                         <button className="profile-edit-btn" onClick={handleEditToggle}>
//                             <PencilSquareIcon className="btn-icon" /> Edit Profile
//                         </button>
//                     )}
//                     <button className="profile-logout-btn-header" onClick={handleLogout} disabled={saving || isEditing}>
//                         <ArrowRightOnRectangleIcon className="btn-icon" /> Logout
//                     </button>
//                 </div>
//             </header>

//             {error && <div className="profile-error-banner">{error}</div>}

//             <section className="profile-stats-bar">
//                 <div className="stat-item">
//                     <FaStar className="stat-icon" style={{ color: "var(--profile-accent-yellow)" }} />
//                     <span>{sortedRecommendations.length}</span>
//                     <p>Recommendations Made</p>
//                 </div>
//                 <div className="stat-item">
//                     <UsersIcon className="stat-icon" />
//                     <span>{connections.length}</span>
//                     <p>Connections</p>
//                 </div>
//             </section>

//             <main className="profile-main-content">
//                 <section className="profile-content-section" id="my-recommendations">
//                     <div className="section-header">
//                         <h2>My Recommendations</h2>
//                         <button className="profile-add-new-btn" onClick={() => navigate("/share-recommendation")}>
//                             <PlusCircleIcon className="btn-icon" /> Add New
//                         </button>
//                     </div>
//                     {loading && sortedRecommendations.length === 0 && (
//                         <div className="profile-loading-container small-spinner">
//                             <div className="profile-spinner"></div>
//                             <p>Loading recommendations...</p>
//                         </div>
//                     )}
//                     {!loading && sortedRecommendations.length > 0 && (
//                         <div className="profile-my-recommendations-grid">
//                             {sortedRecommendations.map((rec) => (
//                                 <MyRecommendationCard key={rec.id} rec={rec} />
//                             ))}
//                         </div>
//                     )}
//                     {!loading && sortedRecommendations.length === 0 && !error && (
//                         <div className="profile-empty-state">
//                             <FaStar className="empty-state-icon" style={{ color: "var(--profile-text-light)" }} />
//                             <p>You haven't made any recommendations yet.</p>
//                             <button className="profile-primary-action-btn" onClick={() => navigate("/share-recommendation")}>
//                                 Share Your First Recommendation
//                             </button>
//                         </div>
//                     )}
//                      {!loading && sortedRecommendations.length === 0 && error && (
//                         <p className="profile-empty-state-error-inline">
//                            Could not load recommendations. {error}
//                         </p>
//                     )}
//                 </section>
//             </main>
//         </div>
//     );
// };

// export default Profile;

//working 5/19 post clerk
// import React, { useEffect, useState } from "react";
// import { useUser, useClerk } from "@clerk/clerk-react";
// import { useNavigate } from "react-router-dom";
// import { FaStar } from "react-icons/fa";
// import {
//     UserCircleIcon,
//     EnvelopeIcon,
//     UsersIcon,
//     ArrowRightOnRectangleIcon,
//     PencilSquareIcon,
//     PlusCircleIcon,
// } from "@heroicons/react/24/solid";
// import "./Profile.css";

// const API_URL = "https://api.seanag-recommendations.org:8080";
// // const API_URL = "http://localhost:5000";

// const Profile = () => {
//     const { isLoaded, isSignedIn, user } = useUser();
//     const { signOut } = useClerk();
//     const navigate = useNavigate();
//     const [recommendations, setRecommendations] = useState([]);
//     const [connections, setConnections] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);

//     useEffect(() => {
//         if (!isLoaded) return;

//         if (!isSignedIn) {
//             navigate("/");
//             return;
//         }

//         const fetchProfileData = async () => {
//             setLoading(true);
//             try {
//                 const params = new URLSearchParams({
//                     user_id: user.id,
//                     email: user.primaryEmailAddress?.emailAddress,
//                     firstName: user.firstName || "",
//                     lastName: user.lastName || "",
//                 });

//                 const [recommendationsRes, connectionsRes] = await Promise.all([
//                     fetch(`${API_URL}/api/users/me/recommendations?${params}`),
//                     fetch(`${API_URL}/api/connections/check-connections`, {
//                         method: "POST",
//                         headers: { "Content-Type": "application/json" },
//                         body: JSON.stringify({
//                             email: user.primaryEmailAddress?.emailAddress,
//                             user_id: user.id,
//                         }),
//                     }),
//                 ]);

//                 if (!recommendationsRes.ok) {
//                     throw new Error("Failed to fetch recommendations");
//                 }

//                 if (!connectionsRes.ok) {
//                     throw new Error("Failed to fetch connections");
//                 }

//                 const recsData = await recommendationsRes.json();
//                 const connsData = await connectionsRes.json();

//                 setRecommendations(recsData.recommendations || []);
//                 setConnections(Array.isArray(connsData) ? connsData : []);
//             } catch (err) {
//                 console.error("Error fetching profile data:", err);
//                 setError(err.message);
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchProfileData();
//     }, [isLoaded, isSignedIn, user, navigate]);

//     const handleLogout = async () => {
//         try {
//             await signOut();
//             navigate("/");
//         } catch (err) {
//             console.error("Error signing out:", err);
//         }
//     };

//     if (!isLoaded || loading) {
//         return (
//             <div className="profile-loading-container">
//                 <div className="profile-spinner"></div>
//                 <p>Loading Profile...</p>
//             </div>
//         );
//     }

//     if (!isSignedIn) {
//         return null; // useEffect will handle navigation
//     }

//     return (
//         <div className="profile-page">
//             <header className="profile-main-header">
//                 <div className="profile-avatar-container">
//                     <UserCircleIcon className="profile-avatar-icon" />
//                 </div>
//                 <div className="profile-user-info">
//                     <h1>
//                         {user.firstName} {user.lastName}
//                     </h1>
//                     <p>
//                         <EnvelopeIcon className="inline-icon" />
//                         {user.primaryEmailAddress?.emailAddress}
//                     </p>
//                 </div>
//                 <div className="profile-header-actions">
//                     <button
//                         className="profile-edit-btn"
//                         onClick={() => alert("Edit profile coming soon!")}
//                     >
//                         <PencilSquareIcon className="btn-icon" /> Edit Profile
//                     </button>
//                     <button
//                         className="profile-logout-btn-header"
//                         onClick={handleLogout}
//                     >
//                         <ArrowRightOnRectangleIcon className="btn-icon" />{" "}
//                         Logout
//                     </button>
//                 </div>
//             </header>

//             {error && <div className="profile-error-banner">{error}</div>}

//             <section className="profile-stats-bar">
//                 <div className="stat-item">
//                     <FaStar
//                         className="stat-icon"
//                         style={{ color: "var(--profile-accent-yellow)" }}
//                     />
//                     <span>{recommendations.length}</span>
//                     <p>Recommendations Made</p>
//                 </div>
//                 <div className="stat-item">
//                     <UsersIcon className="stat-icon" />
//                     <span>{connections.length}</span>
//                     <p>Connections</p>
//                 </div>
//             </section>

//             <main className="profile-main-content">
//                 <section
//                     className="profile-content-section"
//                     id="my-recommendations"
//                 >
//                     <div className="section-header">
//                         <h2>My Recommendations</h2>
//                         <button
//                             className="profile-add-new-btn"
//                             onClick={() => navigate("/share-recommendation")}
//                         >
//                             <PlusCircleIcon className="btn-icon" /> Add New
//                         </button>
//                     </div>
//                     {loading && (
//                         <div className="profile-loading-container small-spinner">
//                             <div className="profile-spinner"></div>{" "}
//                             <p>Loading recommendations...</p>
//                         </div>
//                     )}
//                     {!loading && recommendations.length > 0 && (
//                         <div className="profile-my-recommendations-grid">
//                             {recommendations.map((rec, idx) => (
//                                 <div
//                                     key={rec.id || idx}
//                                     className="profile-my-rec-card"
//                                 >
//                                     <h3>
//                                         {rec.business_name ||
//                                             "Unknown Business"}
//                                     </h3>
//                                     <p>
//                                         {rec.recommender_message ||
//                                             "No message provided."}
//                                     </p>
//                                 </div>
//                             ))}
//                         </div>
//                     )}
//                     {!loading && recommendations.length === 0 && !error && (
//                         <div className="profile-empty-state">
//                             <FaStar
//                                 className="empty-state-icon"
//                                 style={{ color: "var(--profile-text-light)" }}
//                             />
//                             <p>You haven't made any recommendations yet.</p>
//                             <button
//                                 className="profile-primary-action-btn"
//                                 onClick={() =>
//                                     navigate("/share-recommendation")
//                                 }
//                             >
//                                 Share Your First Recommendation
//                             </button>
//                         </div>
//                     )}
//                     {!loading && recommendations.length === 0 && error && (
//                         <p className="profile-empty-state-error-inline">
//                             Could not load recommendations. Check console for
//                             details.
//                         </p>
//                     )}
//                 </section>
//             </main>
//         </div>
//     );
// };

// export default Profile;
