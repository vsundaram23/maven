import React, { useEffect, useState, useCallback, useRef } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { FaStar, FaStarHalfAlt, FaThumbsUp } from "react-icons/fa";
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
    UserCircleIcon, EnvelopeIcon, UsersIcon as UsersIconSolid,
    ArrowRightOnRectangleIcon, PencilSquareIcon, PlusCircleIcon, CameraIcon,
    CheckCircleIcon, XCircleIcon, BuildingOffice2Icon, ChatBubbleLeftEllipsisIcon,
    EllipsisVerticalIcon, ShareIcon, CalendarDaysIcon, CropIcon,
    TagIcon, GlobeAltIcon, SparklesIcon, ArrowPathIcon, PhoneIcon,
} from "@heroicons/react/24/solid";
import { StarIcon as SolidStarIcon } from "@heroicons/react/24/solid";
import { StarIcon as OutlineStarIcon } from "@heroicons/react/24/outline";

import "./Profile.css";

const API_URL = 'https://api.seanag-recommendations.org:8080';

function getCroppedImg(image, crop, fileName) {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
        image,
        crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY,
        0, 0, canvas.width, canvas.height
    );
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) { reject(new Error('Canvas is empty')); return; }
            blob.name = fileName;
            resolve(blob);
        }, 'image/jpeg', 0.95);
    });
}

const StarRatingDisplay = ({ rating, isProfileCard }) => {
    const numRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalf = isProfileCard ? (numRating - fullStars >= 0.4) : (numRating - fullStars >= 0.5);
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    const starClass = isProfileCard ? "profile-star-icon" : "as-star-icon";

    return (
        <div className={isProfileCard ? "profile-star-display" : "as-star-rating"}>
            {[...Array(fullStars)].map((_, i) => <FaStar key={`full-${i}`} className={`${starClass} filled`} />)}
            {hasHalf && (isProfileCard ? <FaStarHalfAlt key="half" className={`${starClass} filled`} /> : <FaStar key={`half-${Date.now()}-srd`} className={`${starClass} half`} />)}
            {[...Array(emptyStars)].map((_, i) => <FaStar key={`empty-${i}`} className={`${starClass} empty`} />)}
        </div>
    );
};

const EditModalStarDisplay = ({ active, onClick, onMouseEnter, onMouseLeave }) => {
    if (active) {
        return <SolidStarIcon className="profile-edit-modal-star-icon filled" onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} aria-hidden="true" />;
    }
    return <OutlineStarIcon className="profile-edit-modal-star-icon" onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} aria-hidden="true" />;
};

const EDIT_MODAL_PUBLISH_OPTIONS = [
    { value: "Full Trust Circle", label: "Entire Trust Circle", icon: UsersIconSolid },
    { value: "Specific Trust Circles", label: "Specific Trust Circles", icon: UserCircleIcon },
    { value: "Public", label: "Public", icon: GlobeAltIcon },
];

const EditRecommendationModal = ({
    isOpen, onClose, recommendationToEdit, onSaveSuccess, userEmail, clerkUserId, apiBaseUrl,
    userTrustCirclesProp, trustCirclesLoadingProp, trustCirclesErrorProp, fetchUserTrustCirclesFunc
}) => {
    const [businessName, setBusinessName] = useState("");
    const [recommenderMessage, setRecommenderMessage] = useState("");
    const [rating, setRatingState] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState("");
    const [providerContactName, setProviderContactName] = useState("");
    const [website, setWebsite] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [publishScope, setPublishScope] = useState("Full Trust Circle");
    const [selectedTrustCircles, setSelectedTrustCircles] = useState([]);
    const [internalUserTrustCircles, setInternalUserTrustCircles] = useState([]);
    const [internalTrustCirclesLoading, setInternalTrustCirclesLoading] = useState(false);
    const [internalTrustCirclesError, setInternalTrustCirclesError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (recommendationToEdit) {
            setBusinessName(recommendationToEdit.business_name || "");
            setRecommenderMessage(recommendationToEdit.recommender_message || "");
            setRatingState(recommendationToEdit.rating || 0);
            setTags(recommendationToEdit.tags || []);
            setProviderContactName(recommendationToEdit.provider_contact_name || recommendationToEdit.business_contact || "");
            setWebsite(recommendationToEdit.website || "");
            setPhoneNumber(recommendationToEdit.phone_number || "");
            let initialPublishScope = "Full Trust Circle";
            if (recommendationToEdit.visibility === 'public') initialPublishScope = "Public";
            else if (recommendationToEdit.visibility === 'connections') {
                initialPublishScope = (Array.isArray(recommendationToEdit.trust_circle_ids) && recommendationToEdit.trust_circle_ids.length > 0) ? "Specific Trust Circles" : "Full Trust Circle";
            } else if (recommendationToEdit.publish_scope) initialPublishScope = recommendationToEdit.publish_scope;
            setPublishScope(initialPublishScope);
            setSelectedTrustCircles(recommendationToEdit.trust_circle_ids || []);
            setMessage(""); setHoverRating(0); setTagInput("");
        }
    }, [recommendationToEdit]);

    useEffect(() => {
        setInternalUserTrustCircles(userTrustCirclesProp || []);
        setInternalTrustCirclesLoading(trustCirclesLoadingProp || false);
        setInternalTrustCirclesError(trustCirclesErrorProp || "");
    }, [userTrustCirclesProp, trustCirclesLoadingProp, trustCirclesErrorProp]);

    useEffect(() => {
        if (publishScope === "Specific Trust Circles" && internalUserTrustCircles.length === 0 && !internalTrustCirclesLoading && !internalTrustCirclesError && fetchUserTrustCirclesFunc) {
            (async () => {
                setInternalTrustCirclesLoading(true); setInternalTrustCirclesError("");
                try {
                    const circles = await fetchUserTrustCirclesFunc(); setInternalUserTrustCircles(circles || []);
                } catch (err) { setInternalTrustCirclesError(err.message || "Could not load trust circles."); setInternalUserTrustCircles([]); }
                finally { setInternalTrustCirclesLoading(false); }
            })();
        }
    }, [publishScope, internalUserTrustCircles, internalTrustCirclesLoading, internalTrustCirclesError, fetchUserTrustCirclesFunc]);

    const handleStarClick = (n) => setRatingState(n);
    const handleTagKeyDown = (e) => {
        if (e.key === "Enter" && tagInput.trim()) {
            e.preventDefault(); const newTag = tagInput.trim().toLowerCase();
            if (newTag && !tags.includes(newTag)) setTags((prevTags) => [...prevTags, newTag]);
            setTagInput("");
        }
    };
    const removeTag = (tagToRemove) => setTags((prevTags) => prevTags.filter((tag) => tag !== tagToRemove));
    const handlePublishScopeChange = (e) => { const newScope = e.target.value; setPublishScope(newScope); if (newScope !== "Specific Trust Circles") setSelectedTrustCircles([]); };
    const handleTrustCircleToggle = (circleId) => setSelectedTrustCircles((prev) => prev.includes(circleId) ? prev.filter((id) => id !== circleId) : [...prev, circleId]);

    const handleSubmit = async (e) => {
        e.preventDefault(); if (isSubmitting) return;
        if (!businessName.trim() || !recommenderMessage.trim() || rating === 0) { setMessage("error:Provider Name, Your Experience, and Rating are required."); return; }
        if (publishScope === "Specific Trust Circles" && selectedTrustCircles.length === 0) { setMessage("error:Select trust circles or change publish scope."); return; }
        setIsSubmitting(true); setMessage("");
        const payload = {
            business_name: businessName.trim(), recommender_message: recommenderMessage.trim(), rating: rating, tags: tags,
            provider_contact_name: providerContactName.trim() || null, website: website.trim() || null, phone_number: phoneNumber.trim() || null,
            publish_scope: publishScope, ...(publishScope === "Specific Trust Circles" && { trust_circle_ids: selectedTrustCircles }),
        };
        try {
            const queryParams = new URLSearchParams({ user_id: clerkUserId, email: userEmail }).toString();
            const res = await fetch(`${apiBaseUrl}/api/recommendations/${recommendationToEdit.id}?${queryParams}`, {
                method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
            });
            const responseData = await res.json();
            if (!res.ok || !responseData.success) throw new Error(responseData.message || responseData.error || `Failed to update. Status: ${res.status}`);
            setMessage("success:Recommendation updated successfully!");
            if (onSaveSuccess) onSaveSuccess(responseData);
            setTimeout(() => { onClose(); }, 1500);
        } catch (error) { setMessage(`error:${error.message}`); }
        finally { setIsSubmitting(false); }
    };

    if (!isOpen) return null;
    const requiredFieldsComplete = businessName.trim() && recommenderMessage.trim() && rating > 0;

    return (
        <div className="profile-edit-modal-overlay">
            <div className="profile-edit-modal-content">
                <button onClick={onClose} className="profile-edit-modal-close-btn">&times;</button>
                <h2 className="profile-edit-modal-title">Edit Your Recommendation</h2>
                <form onSubmit={handleSubmit} className="profile-edit-modal-form">
                    <section className="profile-edit-modal-form-section">
                        <h3 className="profile-edit-modal-section-title"><span className="profile-edit-modal-section-number">1</span>Core Details</h3>
                        <div className="profile-edit-modal-form-grid">
                            <div className="profile-edit-modal-form-group span-2"><label htmlFor="editBusinessName">Service Provider Name *</label><input id="editBusinessName" type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required /></div>
                            <div className="profile-edit-modal-form-group span-2"><label htmlFor="editRecommendationBlurb">Your Experience *</label><textarea id="editRecommendationBlurb" value={recommenderMessage} onChange={(e) => setRecommenderMessage(e.target.value)} required rows={4} /></div>
                            <div className="profile-edit-modal-form-group span-2 rating-group"><label>Your Rating *</label><div className="profile-edit-modal-star-rating">{[1, 2, 3, 4, 5].map((n) => <EditModalStarDisplay key={n} active={n <= (hoverRating || rating)} onClick={() => handleStarClick(n)} onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(0)} />)}</div></div>
                        </div>
                    </section>
                    <div className="profile-edit-modal-optional-section-wrapper visible">
                        <section className="profile-edit-modal-form-section">
                            <h3 className="profile-edit-modal-section-title"><span className="profile-edit-modal-section-number">2</span>Additional Info</h3>
                            <div className="profile-edit-modal-form-grid">
                                <div className="profile-edit-modal-form-group"><label htmlFor="editProviderContactName"><UserCircleIcon /> Provider Contact</label><input id="editProviderContactName" type="text" value={providerContactName} onChange={(e) => setProviderContactName(e.target.value)} placeholder="e.g., Jane Doe" /></div>
                                <div className="profile-edit-modal-form-group"><label htmlFor="editWebsite"><GlobeAltIcon /> Website</label><input id="editWebsite" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://provider.com" /></div>
                                <div className="profile-edit-modal-form-group span-2"><label htmlFor="editPhoneNumber"><PhoneIcon /> Phone Number</label><input id="editPhoneNumber" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="(555) 123-4567" /></div>
                                <div className="profile-edit-modal-form-group span-2 tag-input-group"><label htmlFor="editTags"><TagIcon /> Tags (Press Enter)</label><input id="editTags" type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="e.g., reliable, fast" /><div className="profile-edit-modal-tag-container">{tags.map((tag, i) => <span key={i} className="profile-edit-modal-tag-pill">{tag}<span className="remove-tag" onClick={() => removeTag(tag)}>×</span></span>)}</div></div>
                            </div>
                        </section>
                        <section className="profile-edit-modal-form-section">
                            <h3 className="profile-edit-modal-section-title"><span className="profile-edit-modal-section-number">3</span>Share With</h3>
                            <div className="profile-edit-modal-publish-options-grid">{EDIT_MODAL_PUBLISH_OPTIONS.map((option) => <label key={option.value} className={`profile-edit-modal-publish-option ${publishScope === option.value ? "selected" : ""}`}><input type="radio" name="editPublishScope" value={option.value} checked={publishScope === option.value} onChange={handlePublishScopeChange} className="sr-only" /><option.icon className="publish-icon" /><span>{option.label}</span>{publishScope === option.value && <CheckCircleIcon className="selected-check" />}</label>)}</div>
                            {publishScope === "Specific Trust Circles" && (<div className="profile-edit-modal-trust-circle-select-wrapper"><label className="trust-circle-label">Select specific circles:</label>{internalTrustCirclesLoading && <div className="loading-trust-circles"><ArrowPathIcon className="animate-spin h-5 w-5 mr-2 inline" /> Loading...</div>}{internalTrustCirclesError && !internalTrustCirclesLoading && <div className="error-trust-circles"><XCircleIcon className="h-5 w-5 mr-2 inline text-red-500" /> {internalTrustCirclesError} <button type="button" onClick={fetchUserTrustCirclesFunc} className="retry-button ml-2">Retry</button></div>}{!internalTrustCirclesLoading && !internalTrustCirclesError && internalUserTrustCircles.length > 0 && <div className="profile-edit-modal-trust-circle-checkbox-group">{internalUserTrustCircles.map((circle) => <label key={circle.id} className="trust-circle-checkbox-item"><input type="checkbox" value={circle.id} checked={selectedTrustCircles.includes(circle.id)} onChange={() => handleTrustCircleToggle(circle.id)} /><span>{circle.name}</span></label>)}</div>}{!internalTrustCirclesLoading && !internalTrustCirclesError && internalUserTrustCircles.length === 0 && <p className="no-trust-circles-message">No communities found or could not load.</p>}</div>)}
                        </section>
                    </div>
                    <div className="profile-edit-modal-button-row"><button type="button" className="profile-edit-modal-btn cancel-btn" onClick={onClose} disabled={isSubmitting}>Cancel</button><button type="submit" className="profile-edit-modal-btn save-btn" disabled={isSubmitting || !requiredFieldsComplete}>{isSubmitting ? "Saving..." : "Save Changes"} <CheckCircleIcon /></button></div>
                    {message && <div className={`profile-edit-modal-message ${message.startsWith("error:") ? "error" : "success"}`}>{message.startsWith("error:") ? <XCircleIcon /> : <CheckCircleIcon />}<span>{message.substring(message.indexOf(":") + 1)}</span></div>}
                </form>
            </div>
        </div>
    );
};

const MyRecommendationCard = ({ rec, onEdit, onLikeRecommendation }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const formatDate = (dateString) => !dateString ? 'Date not available' : new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const handleShare = () => { alert('Share functionality for individual recommendations coming soon!'); setDropdownOpen(false); };
    const displayCommunityAvgRatingVal = (parseFloat(rec.average_rating) || 0).toFixed(1);
    const displayTotalReviewsVal = parseInt(rec.total_reviews, 10) || 0;

    return (
        <li className="profile-my-rec-card">
            <div className="profile-my-rec-card-header">
                <h2 className="profile-my-rec-card-title">{rec.business_name || 'Unknown Business'}</h2>
                <div className="profile-my-rec-badge-wrapper-with-menu">
                    <div className="profile-my-rec-badge-group">{(parseFloat(rec.average_rating) || 0) >= 4.5 && <span className="profile-my-rec-top-rated-badge">Top Rated</span>}</div>
                    <div className="profile-my-rec-right-actions"><div className="profile-my-rec-dropdown-wrapper"><button className="profile-my-rec-three-dots-button" onClick={() => setDropdownOpen(!dropdownOpen)} title="Options">⋮</button>{dropdownOpen && (<div className="profile-my-rec-dropdown-menu"><button className="profile-my-rec-dropdown-item" onClick={() => { onEdit(rec); setDropdownOpen(false); }}><PencilSquareIcon /> Edit Recommendation</button><button className="profile-my-rec-dropdown-item" onClick={handleShare}><ShareIcon /> Share Recommendation</button></div>)}</div></div>
                </div>
            </div>
            <div className="profile-my-rec-review-summary">
                {(typeof rec.average_rating === 'number' || rec.average_rating === 0) ? (
                    <>
                        <StarRatingDisplay rating={rec.average_rating || 0} isProfileCard={false} />
                        <span className="profile-my-rec-rating-score-text">{displayCommunityAvgRatingVal} ({displayTotalReviewsVal} Reviews)</span>
                    </>
                ) : (
                    <>
                        <StarRatingDisplay rating={0} isProfileCard={false} />
                        <span className="profile-my-rec-rating-score-text">0.0 (0 Reviews)</span>
                    </>
                )}
                <button
                    className={`profile-my-rec-like-button ${rec.currentUserLiked ? 'liked' : ''}`}
                    onClick={() => onLikeRecommendation(rec.id, rec.currentUserLiked)}
                    title={rec.currentUserLiked ? "You liked this" : "Like this recommendation"}
                >
                    <FaThumbsUp />
                    <span className="profile-my-rec-like-count">{rec.num_likes || 0}</span>
                </button>
            </div>
            <p className="profile-my-rec-card-description"><ChatBubbleLeftEllipsisIcon className="inline-icon" />{rec.recommender_message || "No detailed message provided."}</p>
            {Array.isArray(rec.tags) && rec.tags.length > 0 && (<div className="profile-my-rec-tag-container">{rec.tags.map((tag, idx) => <span key={idx} className="profile-my-rec-tag-badge">{tag}</span>)}<button className="profile-my-rec-add-tag-button" onClick={() => onEdit(rec)} aria-label="Edit tags">+</button></div>)}
            {(Array.isArray(rec.tags) && rec.tags.length === 0) && (<div className="profile-my-rec-tag-container"><span className="profile-my-rec-no-tags-text">No tags.</span><button className="profile-my-rec-add-tag-button" onClick={() => onEdit(rec)} aria-label="Add a tag">+</button></div>)}
            <div className="profile-my-rec-card-footer">
                <div className="profile-my-rec-date"><CalendarDaysIcon className="inline-icon" />Recommended on: {formatDate(rec.date_of_recommendation || rec.created_at)}</div>
                <div className="profile-my-rec-action-buttons"><button className="profile-my-rec-primary-action-button" onClick={() => onEdit(rec)}><PencilSquareIcon className="btn-icon" /> Edit My Rec</button></div>
            </div>
        </li>
    );
};

const Profile = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const { signOut } = useClerk();
    const navigate = useNavigate();
    const [baseRecommendations, setBaseRecommendations] = useState([]);
    const [enrichedRecommendations, setEnrichedRecommendations] = useState([]);
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
    const [statsLoading, setStatsLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentEditingRec, setCurrentEditingRec] = useState(null);
    const [userTrustCircles, setUserTrustCircles] = useState([]);
    const [trustCirclesLoading, setTrustCirclesLoading] = useState(false);
    const [trustCirclesError, setTrustCirclesError] = useState("");
    const ASPECT_RATIO = 1; const MIN_DIMENSION = 150;

    const getClerkUserQueryParams = useCallback(() => {
        if (!user) return "";
        return new URLSearchParams({ user_id: user.id, email: user.primaryEmailAddress?.emailAddress, firstName: user.firstName || "", lastName: user.lastName || "", phoneNumber: user.primaryPhoneNumber?.phoneNumber || "" }).toString();
    }, [user]);

    const fetchProfileData = useCallback(async () => {
        if (!isLoaded || !isSignedIn || !user) return;
        setLoading(true); setError(null); setEnrichedRecommendations([]);
        try {
            const queryParams = getClerkUserQueryParams(); if (!queryParams) throw new Error("User details not available.");
            const profileResPromise = fetch(`${API_URL}/api/users/me/recommendations?${queryParams}`);
            const connectionsResPromise = fetch(`${API_URL}/api/connections/check-connections?${queryParams}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.primaryEmailAddress?.emailAddress, user_id: user.id }), });
            const [profileRes, connectionsRes] = await Promise.all([profileResPromise, connectionsResPromise]);
            if (!profileRes.ok) { const errData = await profileRes.json().catch(() => ({})); throw new Error(errData.message || "Failed to fetch profile data"); }
            const profileData = await profileRes.json();
            setProfileUserData(profileData);
            setBaseRecommendations(profileData.recommendations || []);
            setUserBio(profileData.userBio || ''); setEditingBio(profileData.userBio || '');
            const imageQuery = getClerkUserQueryParams(); if (imageQuery) setProfileImage(`${API_URL}/api/users/me/profile/image?${imageQuery}&timestamp=${new Date().getTime()}`);
            if (!connectionsRes.ok) setConnections([]); else { const connsData = await connectionsRes.json(); setConnections(Array.isArray(connsData) ? connsData : []); }
        } catch (err) { setError(err.message); setBaseRecommendations([]); }
        finally { setLoading(false); }
    }, [isLoaded, isSignedIn, user, getClerkUserQueryParams]);

    useEffect(() => { if (isSignedIn && user) fetchProfileData(); else if (isLoaded && !isSignedIn) navigate("/"); }, [isSignedIn, user, isLoaded, fetchProfileData, navigate]);

    useEffect(() => {
        if (baseRecommendations.length > 0 && user?.id) {
            setStatsLoading(true);
            const enrichRecommendations = async () => {
                const enriched = await Promise.all(
                    baseRecommendations.map(async (rec) => {
                        let communityStats = { average_rating: 0, total_reviews: 0 };
                        let recommendationLikes = { num_likes: 0, currentUserLiked: false };

                        if (rec.id) {
                            try {
                                const statsRes = await fetch(`${API_URL}/api/reviews/stats/${rec.id}`);
                                if (statsRes.ok) {
                                    const statsData = await statsRes.json();
                                    communityStats.average_rating = parseFloat(statsData.average_rating) || 0;
                                    communityStats.total_reviews = parseInt(statsData.total_reviews, 10) || 0;
                                }
                            } catch (err) {
                                console.error(`Failed to fetch provider stats for rec ID ${rec.id}:`, err);
                            }
                        }

                        if (rec.id) {
                            try {
                                const recLikesRes = await fetch(`${API_URL}/api/recommendations/${rec.id}/like-details?userId=${user.id}`);
                                if (recLikesRes.ok) {
                                    const likesData = await recLikesRes.json();
                                    recommendationLikes.num_likes = parseInt(likesData.total_likes, 10) || 0;
                                    recommendationLikes.currentUserLiked = likesData.currentUserLiked || false;
                                }
                            } catch (err) {
                                console.error(`Failed to fetch likes for recommendation ID ${rec.id}:`, err);
                            }
                        }
                        return {
                            ...rec,
                            average_rating: communityStats.average_rating,
                            total_reviews: communityStats.total_reviews,
                            num_likes: recommendationLikes.num_likes,
                            currentUserLiked: recommendationLikes.currentUserLiked
                        };
                    })
                );
                setEnrichedRecommendations(enriched);
                setStatsLoading(false);
            };
            enrichRecommendations();
        } else {
            setEnrichedRecommendations([]);
            if (!loading) setStatsLoading(false);
        }
    }, [baseRecommendations, loading, user]);


    const handleLikeRecommendation = async (recommendationId, isCurrentlyLiked) => {
        if (!user?.id || !user.primaryEmailAddress?.emailAddress) {
            alert("Please sign in to like a recommendation.");
            return;
        }

        const originalRecommendations = [...enrichedRecommendations];
        const newEnrichedRecommendations = enrichedRecommendations.map(r => {
            if (r.id === recommendationId) {
                return {
                    ...r,
                    currentUserLiked: !isCurrentlyLiked,
                    num_likes: isCurrentlyLiked ? (r.num_likes || 1) - 1 : (r.num_likes || 0) + 1
                };
            }
            return r;
        });
        setEnrichedRecommendations(newEnrichedRecommendations);

        try {
            const response = await fetch(`${API_URL}/api/recommendations/${recommendationId}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, userEmail: user.primaryEmailAddress.emailAddress })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Server error during like action." }));
                throw new Error(errorData.message || `Failed to update like status. Status: ${response.status}`);
            }
            const result = await response.json();
            setEnrichedRecommendations(prevRecs =>
                prevRecs.map(r =>
                    r.id === recommendationId
                        ? { ...r, num_likes: result.num_likes, currentUserLiked: result.currentUserLiked }
                        : r
                )
            );
            setBaseRecommendations(prevBaseRecs =>
                prevBaseRecs.map(r =>
                    r.id === recommendationId
                        ? { ...r, num_likes: result.num_likes, currentUserLiked: result.currentUserLiked }
                        : r
                )
            );
        } catch (error) {
            console.error("Error liking recommendation:", error.message);
            setEnrichedRecommendations(originalRecommendations);
        }
    };

    const fetchUserTrustCirclesForModal = useCallback(async () => {
        if (!user?.primaryEmailAddress?.emailAddress) return [];
        setTrustCirclesLoading(true); setTrustCirclesError("");
        try {
            const email = encodeURIComponent(user.primaryEmailAddress.emailAddress);
            const res = await fetch(`${API_URL}/api/communities/user/${email}/communities`);
            if (!res.ok) { const errorData = await res.json().catch(() => ({})); throw new Error(errorData.message || "Failed to fetch user trust circles."); }
            const data = await res.json(); const formattedCircles = Array.isArray(data) ? data.map(tc => ({ id: tc.id, name: tc.name })) : [];
            setUserTrustCircles(formattedCircles); return formattedCircles;
        } catch (err) { setTrustCirclesError(err.message || "Could not load trust circles."); setUserTrustCircles([]); return []; }
        finally { setTrustCirclesLoading(false); }
    }, [user]);

    const handleOpenEditModal = (rec) => { setCurrentEditingRec(rec); setIsEditModalOpen(true); if (userTrustCircles.length === 0 && !trustCirclesLoading && !trustCirclesError) fetchUserTrustCirclesForModal(); };
    const handleUpdateRecommendationSuccess = (responseData) => { fetchProfileData(); };

    const sortedRecommendations = React.useMemo(() => {
        let sortableItems = [...enrichedRecommendations];
        if (sortOption === 'topRated' && sortableItems.every(item => typeof item.average_rating === 'number')) sortableItems.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0) || (b.total_reviews || 0) - (a.total_reviews || 0));
        else if (sortOption === 'date_of_recommendation') sortableItems.sort((a, b) => new Date(b.date_of_recommendation || b.created_at || 0) - new Date(a.date_of_recommendation || a.created_at || 0));
        return sortableItems;
    }, [enrichedRecommendations, sortOption]);

    const handleLogout = async () => { try { await signOut(); navigate("/"); } catch (err) { console.error("Error signing out:", err); } };
    const handleEditToggle = () => { if (isEditing) { setEditingBio(userBio); setImgSrcForCropper(''); setCompletedCrop(null); setOriginalFile(null); setCrop(undefined); } else setEditingBio(userBio || ''); setIsEditing(!isEditing); };
    const onImageLoad = (e) => { const { width, height } = e.currentTarget; const cropWidthInPercent = (MIN_DIMENSION / width) * 100; const cropVal = makeAspectCrop({ unit: '%', width: cropWidthInPercent }, ASPECT_RATIO, width, height); const centeredCrop = centerCrop(cropVal, width, height); setCrop(centeredCrop); };
    const handleFileChange = (event) => { const file = event.target.files[0]; if (file) { setOriginalFile(file); setCrop(undefined); const reader = new FileReader(); reader.addEventListener('load', () => setImgSrcForCropper(reader.result?.toString() || '')); reader.readAsDataURL(file); } };

    const handleSaveProfile = async () => {
        if (!user) { setError("User not found."); return; }
        setError(null); setSaving(true); const formData = new FormData();
        formData.append('bio', editingBio); formData.append('firstName', user.firstName || ""); formData.append('lastName', user.lastName || "");
        let fileToUpload = null;
        if (completedCrop && imgRef.current && originalFile) { try { const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop, originalFile.name); fileToUpload = new File([croppedImageBlob], originalFile.name, { type: croppedImageBlob.type }); } catch (cropError) { setError("Failed to crop image."); setSaving(false); return; } }
        if (fileToUpload) formData.append('profileImageFile', fileToUpload);
        try {
            const queryParams = getClerkUserQueryParams(); if (!queryParams) throw new Error("User details not available for API query.");
            const response = await fetch(`${API_URL}/api/users/me/profile?${queryParams}`, { method: 'PUT', body: formData });
            const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.message || "Failed to update profile.");
            setUserBio(data.user.bio || ''); setEditingBio(data.user.bio || '');
            const imageQuery = getClerkUserQueryParams(); if (imageQuery) setProfileImage(`${API_URL}/api/users/me/profile/image?${imageQuery}&timestamp=${new Date().getTime()}`);
            setImgSrcForCropper(''); setCompletedCrop(null); setOriginalFile(null); setIsEditing(false);
            if (profileUserData) setProfileUserData(prev => ({ ...prev, userName: data.user.name, userBio: data.user.bio }));
        } catch (err) { setError(`Failed to save profile: ${err.message}`); } finally { setSaving(false); }
    };

    const onAvatarOrPreviewError = (e) => { e.target.style.display = 'none'; const fallbackParent = e.target.closest('.profile-avatar-display-wrapper') || e.target.closest('.profile-avatar-cropper-wrapper'); if (fallbackParent) { const fallbackIcon = fallbackParent.querySelector('.profile-avatar-icon-fallback, .profile-avatar-icon-editing'); if (fallbackIcon) fallbackIcon.style.display = 'flex'; } };

    const displayOverallLoading = loading || (statsLoading && baseRecommendations.length > 0 && enrichedRecommendations.length < baseRecommendations.length);

    if (!isLoaded || (displayOverallLoading && !profileUserData && isSignedIn)) return <div className="profile-loading-container"><div className="profile-spinner"></div><p>Loading Profile...</p></div>;
    if (!isSignedIn && isLoaded) return null;
    if (!user && isLoaded && isSignedIn) return <div className="profile-page"><div className="profile-main-content" style={{ textAlign: 'center', paddingTop: '5rem' }}><h1 style={{ color: 'var(--profile-primary-color)' }}>Profile Access Denied</h1><p className="profile-error-banner" style={{ margin: '1rem auto', maxWidth: '600px' }}>User information not available.</p><button className="profile-primary-action-btn" onClick={() => navigate('/login')}>Go to Login</button></div></div>;

    return (
        <div className="profile-page">
            <header className="profile-main-header">
                <div className="profile-avatar-section">
                    {isEditing ? (
                        <div className="profile-avatar-cropper-wrapper">
                            <input type="file" id="profileImageUploadInput" style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
                            {!imgSrcForCropper && <div className="profile-avatar-container" onClick={() => document.getElementById('profileImageUploadInput')?.click()} style={{ cursor: 'pointer' }}>{profileImage ? <img src={profileImage} alt="Current profile" className="profile-avatar-image" onError={onAvatarOrPreviewError} /> : <UserCircleIcon className="profile-avatar-icon profile-avatar-icon-fallback" />}<div className="profile-avatar-edit-overlay"><CameraIcon style={{ width: '24px', height: '24px' }} /></div></div>}
                            {imgSrcForCropper && <div className="cropper-container"><ReactCrop crop={crop} onChange={(pc, p) => setCrop(p)} onComplete={(c) => setCompletedCrop(c)} aspect={ASPECT_RATIO} minWidth={MIN_DIMENSION} minHeight={MIN_DIMENSION} circularCrop={true}><img ref={imgRef} src={imgSrcForCropper} alt="Crop me" onLoad={onImageLoad} style={{ maxHeight: '300px' }} /></ReactCrop><button className="profile-change-photo-btn-cropper" onClick={() => document.getElementById('profileImageUploadInput')?.click()}><CameraIcon className="btn-icon" /> Change Photo</button></div>}
                        </div>
                    ) : <div className="profile-avatar-display-wrapper profile-avatar-container">{profileImage ? <img src={profileImage} alt={profileUserData?.userName || user?.firstName || "User"} className="profile-avatar-image" onError={onAvatarOrPreviewError} /> : null}<UserCircleIcon className="profile-avatar-icon profile-avatar-icon-fallback" style={{ display: profileImage ? 'none' : 'flex' }} /></div>}
                </div>
                <div className="profile-user-info">
                    <h1>{profileUserData?.userName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "User"}</h1>
                    <p><EnvelopeIcon className="inline-icon" />{user?.primaryEmailAddress?.emailAddress}</p>
                    {isEditing ? <textarea className="profile-bio-textarea" value={editingBio} onChange={(e) => setEditingBio(e.target.value)} placeholder="Tell us about yourself..." rows={3} /> : (userBio && <p className="profile-user-bio">{userBio}</p>)}
                </div>
                <div className="profile-header-actions">
                    {isEditing ? (<><button className="profile-save-btn" onClick={handleSaveProfile} disabled={saving}><CheckCircleIcon className="btn-icon" /> {saving ? "Saving..." : "Save Changes"}</button><button className="profile-cancel-btn" onClick={handleEditToggle} disabled={saving}><XCircleIcon className="btn-icon" /> Cancel</button></>) : <button className="profile-edit-btn" onClick={handleEditToggle}><PencilSquareIcon className="btn-icon" /> Edit Profile</button>}
                    <button className="profile-logout-btn-header" onClick={handleLogout} disabled={saving || isEditing}><ArrowRightOnRectangleIcon className="btn-icon" /> Logout</button>
                </div>
            </header>
            {error && <div className="profile-error-banner">{error}</div>}
            <section className="profile-stats-bar">
                <div className="stat-item"><FaStar className="stat-icon" style={{ color: "var(--profile-accent-yellow)" }} /><span>{sortedRecommendations.length}</span><p>Recommendations Made</p></div>
                <div className="stat-item"><UsersIconSolid className="stat-icon" /><span>{connections.length}</span><p>Connections</p></div>
            </section>
            <main className="profile-main-content">
                <section className="profile-content-section" id="my-recommendations">
                    <div className="section-header"><h2>My Recommendations</h2><button className="profile-add-new-btn" onClick={() => navigate("/share-recommendation")}><PlusCircleIcon className="btn-icon" /> Add New</button></div>
                    {(loading || (statsLoading && baseRecommendations.length > 0 && enrichedRecommendations.length < baseRecommendations.length)) && sortedRecommendations.length === 0 && <div className="profile-loading-container small-spinner"><div className="profile-spinner"></div><p>Loading recommendations...</p></div>}
                    {!(loading || (statsLoading && baseRecommendations.length > 0 && enrichedRecommendations.length < baseRecommendations.length)) && sortedRecommendations.length > 0 && <ul className="profile-my-recommendations-list">{sortedRecommendations.map((rec) => <MyRecommendationCard key={rec.id} rec={rec} onEdit={handleOpenEditModal} onLikeRecommendation={handleLikeRecommendation} />)}</ul>}
                    {!(loading || (statsLoading && baseRecommendations.length > 0 && enrichedRecommendations.length < baseRecommendations.length)) && sortedRecommendations.length === 0 && !error && <div className="profile-empty-state"><FaStar className="empty-state-icon" style={{ color: "var(--profile-text-light)" }} /><p>You haven't made any recommendations yet.</p><button className="profile-primary-action-btn" onClick={() => navigate("/share-recommendation")}>Share Your First Recommendation</button></div>}
                    {!(loading || (statsLoading && baseRecommendations.length > 0 && enrichedRecommendations.length < baseRecommendations.length)) && sortedRecommendations.length === 0 && error && <p className="profile-empty-state-error-inline">Could not load recommendations. {error}</p>}
                </section>
            </main>
            {isEditModalOpen && currentEditingRec && user && <EditRecommendationModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setCurrentEditingRec(null); }} recommendationToEdit={currentEditingRec} onSaveSuccess={handleUpdateRecommendationSuccess} userEmail={user.primaryEmailAddress?.emailAddress} clerkUserId={user.id} apiBaseUrl={API_URL} userTrustCirclesProp={userTrustCircles} trustCirclesLoadingProp={trustCirclesLoading} trustCirclesErrorProp={trustCirclesError} fetchUserTrustCirclesFunc={fetchUserTrustCirclesForModal} />}
        </div>
    );
};

export default Profile;

// working 5/20
// import React, { useEffect, useState, useCallback, useRef } from "react";
// import { useUser, useClerk } from "@clerk/clerk-react";
// import { useNavigate } from "react-router-dom";
// import { FaStar, FaStarHalfAlt } from "react-icons/fa";
// import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
// import 'react-image-crop/dist/ReactCrop.css';
// import {
//     UserCircleIcon, EnvelopeIcon, UsersIcon as UsersIconSolid,
//     ArrowRightOnRectangleIcon, PencilSquareIcon, PlusCircleIcon, CameraIcon,
//     CheckCircleIcon, XCircleIcon, BuildingOffice2Icon, ChatBubbleLeftEllipsisIcon,
//     EllipsisVerticalIcon, ShareIcon, CalendarDaysIcon, CropIcon,
//     TagIcon, GlobeAltIcon, SparklesIcon, ArrowPathIcon, PhoneIcon,
// } from "@heroicons/react/24/solid";
// import { StarIcon as SolidStarIcon } from "@heroicons/react/24/solid";
// import { StarIcon as OutlineStarIcon } from "@heroicons/react/24/outline";

// import "./Profile.css";

// const API_URL = 'https://api.seanag-recommendations.org:8080';
// // const API_URL = "http://localhost:5000";
// // const API_URL = "http://localhost:3000";

// function getCroppedImg(image, crop, fileName) {
//     const canvas = document.createElement('canvas');
//     const scaleX = image.naturalWidth / image.width;
//     const scaleY = image.naturalHeight / image.height;
//     canvas.width = crop.width * scaleX;
//     canvas.height = crop.height * scaleY;
//     const ctx = canvas.getContext('2d');
//     ctx.drawImage(
//         image,
//         crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY,
//         0, 0, canvas.width, canvas.height
//     );
//     return new Promise((resolve, reject) => {
//         canvas.toBlob(blob => {
//             if (!blob) { reject(new Error('Canvas is empty')); return; }
//             blob.name = fileName;
//             resolve(blob);
//         }, 'image/jpeg', 0.95);
//     });
// }

// const StarRatingDisplay = ({ rating, isProfileCard }) => {
//   const numRating = parseFloat(rating) || 0;
//   const fullStars = Math.floor(numRating);
//   const hasHalf = isProfileCard ? (numRating - fullStars >= 0.4) : (numRating - fullStars >= 0.5);
//   const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
//   const starClass = isProfileCard ? "profile-star-icon" : "as-star-icon";

//   return (
//     <div className={isProfileCard ? "profile-star-display" : "as-star-rating"}>
//       {[...Array(fullStars)].map((_, i) => <FaStar key={`full-${i}`} className={`${starClass} filled`} />)}
//       {hasHalf && (isProfileCard ? <FaStarHalfAlt key="half" className={`${starClass} filled`} /> : <FaStar key="half" className={`${starClass} half`} />)}
//       {[...Array(emptyStars)].map((_, i) => <FaStar key={`empty-${i}`} className={`${starClass} empty`} />)}
//     </div>
//   );
// };

// const EditModalStarDisplay = ({ active, onClick, onMouseEnter, onMouseLeave }) => {
//     if (active) {
//         return <SolidStarIcon className="profile-edit-modal-star-icon filled" onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} aria-hidden="true" />;
//     }
//     return <OutlineStarIcon className="profile-edit-modal-star-icon" onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} aria-hidden="true" />;
// };

// const EDIT_MODAL_PUBLISH_OPTIONS = [
//     { value: "Full Trust Circle", label: "Entire Trust Circle", icon: UsersIconSolid },
//     { value: "Specific Trust Circles", label: "Specific Trust Circles", icon: UserCircleIcon },
//     { value: "Public", label: "Public", icon: GlobeAltIcon },
// ];

// const EditRecommendationModal = ({
//     isOpen, onClose, recommendationToEdit, onSaveSuccess, userEmail, clerkUserId, apiBaseUrl,
//     userTrustCirclesProp, trustCirclesLoadingProp, trustCirclesErrorProp, fetchUserTrustCirclesFunc
// }) => {
//     const [businessName, setBusinessName] = useState("");
//     const [recommenderMessage, setRecommenderMessage] = useState("");
//     const [rating, setRatingState] = useState(0);
//     const [hoverRating, setHoverRating] = useState(0);
//     const [tags, setTags] = useState([]);
//     const [tagInput, setTagInput] = useState("");
//     const [providerContactName, setProviderContactName] = useState("");
//     const [website, setWebsite] = useState("");
//     const [phoneNumber, setPhoneNumber] = useState("");
//     const [publishScope, setPublishScope] = useState("Full Trust Circle");
//     const [selectedTrustCircles, setSelectedTrustCircles] = useState([]);
//     const [internalUserTrustCircles, setInternalUserTrustCircles] = useState([]);
//     const [internalTrustCirclesLoading, setInternalTrustCirclesLoading] = useState(false);
//     const [internalTrustCirclesError, setInternalTrustCirclesError] = useState("");
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [message, setMessage] = useState("");

//     useEffect(() => {
//         if (recommendationToEdit) {
//             setBusinessName(recommendationToEdit.business_name || "");
//             setRecommenderMessage(recommendationToEdit.recommender_message || "");
//             setRatingState(recommendationToEdit.rating || 0);
//             setTags(recommendationToEdit.tags || []);
//             setProviderContactName(recommendationToEdit.provider_contact_name || recommendationToEdit.business_contact || "");
//             setWebsite(recommendationToEdit.website || "");
//             setPhoneNumber(recommendationToEdit.phone_number || "");
//             let initialPublishScope = "Full Trust Circle";
//             if (recommendationToEdit.visibility === 'public') initialPublishScope = "Public";
//             else if (recommendationToEdit.visibility === 'connections') {
//                  initialPublishScope = (Array.isArray(recommendationToEdit.trust_circle_ids) && recommendationToEdit.trust_circle_ids.length > 0) ? "Specific Trust Circles" : "Full Trust Circle";
//             } else if (recommendationToEdit.publish_scope) initialPublishScope = recommendationToEdit.publish_scope;
//             setPublishScope(initialPublishScope);
//             setSelectedTrustCircles(recommendationToEdit.trust_circle_ids || []);
//             setMessage(""); setHoverRating(0); setTagInput("");
//         }
//     }, [recommendationToEdit]);

//     useEffect(() => {
//        setInternalUserTrustCircles(userTrustCirclesProp || []);
//        setInternalTrustCirclesLoading(trustCirclesLoadingProp || false);
//        setInternalTrustCirclesError(trustCirclesErrorProp || "");
//     }, [userTrustCirclesProp, trustCirclesLoadingProp, trustCirclesErrorProp]);

//     useEffect(() => {
//         if (publishScope === "Specific Trust Circles" && internalUserTrustCircles.length === 0 && !internalTrustCirclesLoading && !internalTrustCirclesError && fetchUserTrustCirclesFunc) {
//              (async () => {
//                 setInternalTrustCirclesLoading(true); setInternalTrustCirclesError("");
//                 try {
//                     const circles = await fetchUserTrustCirclesFunc(); setInternalUserTrustCircles(circles || []);
//                 } catch (err) { setInternalTrustCirclesError(err.message || "Could not load trust circles."); setInternalUserTrustCircles([]); }
//                 finally { setInternalTrustCirclesLoading(false); }
//             })();
//         }
//     }, [publishScope, internalUserTrustCircles, internalTrustCirclesLoading, internalTrustCirclesError, fetchUserTrustCirclesFunc]);

//     const handleStarClick = (n) => setRatingState(n);
//     const handleTagKeyDown = (e) => {
//         if (e.key === "Enter" && tagInput.trim()) {
//             e.preventDefault(); const newTag = tagInput.trim().toLowerCase();
//             if (newTag && !tags.includes(newTag)) setTags((prevTags) => [...prevTags, newTag]);
//             setTagInput("");
//         }
//     };
//     const removeTag = (tagToRemove) => setTags((prevTags) => prevTags.filter((tag) => tag !== tagToRemove));
//     const handlePublishScopeChange = (e) => { const newScope = e.target.value; setPublishScope(newScope); if (newScope !== "Specific Trust Circles") setSelectedTrustCircles([]); };
//     const handleTrustCircleToggle = (circleId) => setSelectedTrustCircles((prev) => prev.includes(circleId) ? prev.filter((id) => id !== circleId) : [...prev, circleId]);

//     const handleSubmit = async (e) => {
//         e.preventDefault(); if (isSubmitting) return;
//         if (!businessName.trim() || !recommenderMessage.trim() || rating === 0) { setMessage("error:Provider Name, Your Experience, and Rating are required."); return; }
//         if (publishScope === "Specific Trust Circles" && selectedTrustCircles.length === 0) { setMessage("error:Select trust circles or change publish scope."); return; }
//         setIsSubmitting(true); setMessage("");
//         const payload = {
//             business_name: businessName.trim(), recommender_message: recommenderMessage.trim(), rating: rating, tags: tags,
//             provider_contact_name: providerContactName.trim() || null, website: website.trim() || null, phone_number: phoneNumber.trim() || null,
//             publish_scope: publishScope, ...(publishScope === "Specific Trust Circles" && { trust_circle_ids: selectedTrustCircles }),
//         };
//         try {
//             const queryParams = new URLSearchParams({ user_id: clerkUserId, email: userEmail }).toString();
//             const res = await fetch(`${apiBaseUrl}/api/recommendations/${recommendationToEdit.id}?${queryParams}`, {
//                 method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
//             });
//             const responseData = await res.json();
//             if (!res.ok || !responseData.success) throw new Error(responseData.message || responseData.error || `Failed to update. Status: ${res.status}`);
//             setMessage("success:Recommendation updated successfully!");
//             if (onSaveSuccess) onSaveSuccess(responseData);
//             setTimeout(() => { onClose(); }, 1500);
//         } catch (error) { setMessage(`error:${error.message}`); }
//         finally { setIsSubmitting(false); }
//     };

//     if (!isOpen) return null;
//     const requiredFieldsComplete = businessName.trim() && recommenderMessage.trim() && rating > 0;

//     return (
//         <div className="profile-edit-modal-overlay">
//             <div className="profile-edit-modal-content">
//                 <button onClick={onClose} className="profile-edit-modal-close-btn">&times;</button>
//                 <h2 className="profile-edit-modal-title">Edit Your Recommendation</h2>
//                 <form onSubmit={handleSubmit} className="profile-edit-modal-form">
//                     <section className="profile-edit-modal-form-section">
//                         <h3 className="profile-edit-modal-section-title"><span className="profile-edit-modal-section-number">1</span>Core Details</h3>
//                         <div className="profile-edit-modal-form-grid">
//                             <div className="profile-edit-modal-form-group span-2"><label htmlFor="editBusinessName">Service Provider Name *</label><input id="editBusinessName" type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required /></div>
//                             <div className="profile-edit-modal-form-group span-2"><label htmlFor="editRecommendationBlurb">Your Experience *</label><textarea id="editRecommendationBlurb" value={recommenderMessage} onChange={(e) => setRecommenderMessage(e.target.value)} required rows={4}/></div>
//                             <div className="profile-edit-modal-form-group span-2 rating-group"><label>Your Rating *</label><div className="profile-edit-modal-star-rating">{[1, 2, 3, 4, 5].map((n) => <EditModalStarDisplay key={n} active={n <= (hoverRating || rating)} onClick={() => handleStarClick(n)} onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(0)}/>)}</div></div>
//                         </div>
//                     </section>
//                     <div className="profile-edit-modal-optional-section-wrapper visible">
//                         <section className="profile-edit-modal-form-section">
//                             <h3 className="profile-edit-modal-section-title"><span className="profile-edit-modal-section-number">2</span>Additional Info</h3>
//                             <div className="profile-edit-modal-form-grid">
//                                 <div className="profile-edit-modal-form-group"><label htmlFor="editProviderContactName"><UserCircleIcon /> Provider Contact</label><input id="editProviderContactName" type="text" value={providerContactName} onChange={(e) => setProviderContactName(e.target.value)} placeholder="e.g., Jane Doe" /></div>
//                                 <div className="profile-edit-modal-form-group"><label htmlFor="editWebsite"><GlobeAltIcon /> Website</label><input id="editWebsite" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://provider.com" /></div>
//                                 <div className="profile-edit-modal-form-group span-2"><label htmlFor="editPhoneNumber"><PhoneIcon /> Phone Number</label><input id="editPhoneNumber" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="(555) 123-4567" /></div>
//                                 <div className="profile-edit-modal-form-group span-2 tag-input-group"><label htmlFor="editTags"><TagIcon /> Tags (Press Enter)</label><input id="editTags" type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="e.g., reliable, fast"/><div className="profile-edit-modal-tag-container">{tags.map((tag, i) => <span key={i} className="profile-edit-modal-tag-pill">{tag}<span className="remove-tag" onClick={() => removeTag(tag)}>×</span></span>)}</div></div>
//                             </div>
//                         </section>
//                         <section className="profile-edit-modal-form-section">
//                             <h3 className="profile-edit-modal-section-title"><span className="profile-edit-modal-section-number">3</span>Share With</h3>
//                             <div className="profile-edit-modal-publish-options-grid">{EDIT_MODAL_PUBLISH_OPTIONS.map((option) => <label key={option.value} className={`profile-edit-modal-publish-option ${publishScope === option.value ? "selected" : ""}`}><input type="radio" name="editPublishScope" value={option.value} checked={publishScope === option.value} onChange={handlePublishScopeChange} className="sr-only"/><option.icon className="publish-icon" /><span>{option.label}</span>{publishScope === option.value && <CheckCircleIcon className="selected-check" />}</label>)}</div>
//                             {publishScope === "Specific Trust Circles" && (<div className="profile-edit-modal-trust-circle-select-wrapper"><label className="trust-circle-label">Select specific circles:</label>{internalTrustCirclesLoading && <div className="loading-trust-circles"><ArrowPathIcon className="animate-spin h-5 w-5 mr-2 inline" /> Loading...</div>}{internalTrustCirclesError && !internalTrustCirclesLoading && <div className="error-trust-circles"><XCircleIcon className="h-5 w-5 mr-2 inline text-red-500" /> {internalTrustCirclesError} <button type="button" onClick={fetchUserTrustCirclesFunc} className="retry-button ml-2">Retry</button></div>}{!internalTrustCirclesLoading && !internalTrustCirclesError && internalUserTrustCircles.length > 0 && <div className="profile-edit-modal-trust-circle-checkbox-group">{internalUserTrustCircles.map((circle) => <label key={circle.id} className="trust-circle-checkbox-item"><input type="checkbox" value={circle.id} checked={selectedTrustCircles.includes(circle.id)} onChange={() => handleTrustCircleToggle(circle.id)}/><span>{circle.name}</span></label>)}</div>}{!internalTrustCirclesLoading && !internalTrustCirclesError && internalUserTrustCircles.length === 0 && <p className="no-trust-circles-message">No communities found or could not load.</p>}</div>)}
//                         </section>
//                     </div>
//                     <div className="profile-edit-modal-button-row"><button type="button" className="profile-edit-modal-btn cancel-btn" onClick={onClose} disabled={isSubmitting}>Cancel</button><button type="submit" className="profile-edit-modal-btn save-btn" disabled={isSubmitting || !requiredFieldsComplete}>{isSubmitting ? "Saving..." : "Save Changes"} <CheckCircleIcon /></button></div>
//                     {message && <div className={`profile-edit-modal-message ${message.startsWith("error:") ? "error" : "success"}`}>{message.startsWith("error:") ? <XCircleIcon /> : <CheckCircleIcon />}<span>{message.substring(message.indexOf(":") + 1)}</span></div>}
//                 </form>
//             </div>
//         </div>
//     );
// };

// const MyRecommendationCard = ({ rec, onEdit }) => {
//     const [dropdownOpen, setDropdownOpen] = useState(false);
//     const formatDate = (dateString) => !dateString ? 'Date not available' : new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
//     const handleShare = () => { alert('Share functionality for individual recommendations coming soon!'); setDropdownOpen(false); };
//     const displayCommunityAvgRatingVal = (parseFloat(rec.average_rating) || 0).toFixed(1);
//     const displayTotalReviewsVal = parseInt(rec.total_reviews, 10) || 0;

//     return (
//         <li className="profile-my-rec-card">
//             <div className="profile-my-rec-card-header">
//                 <h2 className="profile-my-rec-card-title">{rec.business_name || 'Unknown Business'}</h2>
//                 <div className="profile-my-rec-badge-wrapper-with-menu">
//                     <div className="profile-my-rec-badge-group">{(parseFloat(rec.average_rating) || 0) >= 4.5 && <span className="profile-my-rec-top-rated-badge">Top Rated</span>}</div>
//                     <div className="profile-my-rec-right-actions"><div className="profile-my-rec-dropdown-wrapper"><button className="profile-my-rec-three-dots-button" onClick={() => setDropdownOpen(!dropdownOpen)} title="Options">⋮</button>{dropdownOpen && (<div className="profile-my-rec-dropdown-menu"><button className="profile-my-rec-dropdown-item" onClick={() => { onEdit(rec); setDropdownOpen(false); }}><PencilSquareIcon /> Edit Recommendation</button><button className="profile-my-rec-dropdown-item" onClick={handleShare}><ShareIcon /> Share Recommendation</button></div>)}</div></div>
//                 </div>
//             </div>
//             <div className="profile-my-rec-review-summary">
//                 {(typeof rec.average_rating === 'number' || rec.average_rating === 0) ? (
//                     <>
//                         <StarRatingDisplay rating={rec.average_rating || 0} isProfileCard={false} />
//                         <span className="profile-my-rec-rating-score-text">{displayCommunityAvgRatingVal} ({displayTotalReviewsVal} Reviews)</span>
//                     </>
//                 ) : (
//                     <>
//                         <StarRatingDisplay rating={0} isProfileCard={false} />
//                         <span className="profile-my-rec-rating-score-text">0.0 (0 Reviews)</span>
//                     </>
//                 )}
//             </div>
//             <p className="profile-my-rec-card-description"><ChatBubbleLeftEllipsisIcon className="inline-icon" />{rec.recommender_message || "No detailed message provided."}</p>
//             {Array.isArray(rec.tags) && rec.tags.length > 0 && (<div className="profile-my-rec-tag-container">{rec.tags.map((tag, idx) => <span key={idx} className="profile-my-rec-tag-badge">{tag}</span>)}<button className="profile-my-rec-add-tag-button" onClick={() => onEdit(rec)} aria-label="Edit tags">+</button></div>)}
//             {(Array.isArray(rec.tags) && rec.tags.length === 0) && (<div className="profile-my-rec-tag-container"><span className="profile-my-rec-no-tags-text">No tags.</span><button className="profile-my-rec-add-tag-button" onClick={() => onEdit(rec)} aria-label="Add a tag">+</button></div>)}
//             <div className="profile-my-rec-card-footer">
//                  <div className="profile-my-rec-date"><CalendarDaysIcon className="inline-icon" />Recommended on: {formatDate(rec.date_of_recommendation || rec.created_at)}</div>
//                 <div className="profile-my-rec-action-buttons"><button className="profile-my-rec-primary-action-button" onClick={() => onEdit(rec)}><PencilSquareIcon className="btn-icon" /> Edit My Rec</button></div>
//             </div>
//         </li>
//     );
// };

// const Profile = () => {
//     const { isLoaded, isSignedIn, user } = useUser();
//     const { signOut } = useClerk();
//     const navigate = useNavigate();
//     const [baseRecommendations, setBaseRecommendations] = useState([]);
//     const [enrichedRecommendations, setEnrichedRecommendations] = useState([]);
//     const [connections, setConnections] = useState([]);
//     const [profileUserData, setProfileUserData] = useState(null);
//     const [userBio, setUserBio] = useState('');
//     const [profileImage, setProfileImage] = useState('');
//     const [editingBio, setEditingBio] = useState('');
//     const [isEditing, setIsEditing] = useState(false);
//     const [imgSrcForCropper, setImgSrcForCropper] = useState('');
//     const imgRef = useRef(null);
//     const [crop, setCrop] = useState();
//     const [completedCrop, setCompletedCrop] = useState(null);
//     const [originalFile, setOriginalFile] = useState(null);
//     const [sortOption, setSortOption] = useState('date_of_recommendation');
//     const [loading, setLoading] = useState(true);
//     const [statsLoading, setStatsLoading] = useState(false);
//     const [saving, setSaving] = useState(false);
//     const [error, setError] = useState(null);
//     const [isEditModalOpen, setIsEditModalOpen] = useState(false);
//     const [currentEditingRec, setCurrentEditingRec] = useState(null);
//     const [userTrustCircles, setUserTrustCircles] = useState([]);
//     const [trustCirclesLoading, setTrustCirclesLoading] = useState(false);
//     const [trustCirclesError, setTrustCirclesError] = useState("");
//     const ASPECT_RATIO = 1; const MIN_DIMENSION = 150;

//     const getClerkUserQueryParams = useCallback(() => {
//         if (!user) return "";
//         return new URLSearchParams({ user_id: user.id, email: user.primaryEmailAddress?.emailAddress, firstName: user.firstName || "", lastName: user.lastName || "", phoneNumber: user.primaryPhoneNumber?.phoneNumber || "" }).toString();
//     }, [user]);

//     const fetchProfileData = useCallback(async () => {
//         if (!isLoaded || !isSignedIn || !user) return;
//         setLoading(true); setError(null); setEnrichedRecommendations([]);
//         try {
//             const queryParams = getClerkUserQueryParams(); if (!queryParams) throw new Error("User details not available.");
//             const profileResPromise = fetch(`${API_URL}/api/users/me/recommendations?${queryParams}`);
//             const connectionsResPromise = fetch(`${API_URL}/api/connections/check-connections?${queryParams}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.primaryEmailAddress?.emailAddress, user_id: user.id }), });
//             const [profileRes, connectionsRes] = await Promise.all([profileResPromise, connectionsResPromise]);
//             if (!profileRes.ok) { const errData = await profileRes.json().catch(() => ({})); throw new Error(errData.message || "Failed to fetch profile data"); }
//             const profileData = await profileRes.json();
//             setProfileUserData(profileData);
//             setBaseRecommendations(profileData.recommendations || []);
//             setUserBio(profileData.userBio || ''); setEditingBio(profileData.userBio || '');
//             const imageQuery = getClerkUserQueryParams(); if (imageQuery) setProfileImage(`${API_URL}/api/users/me/profile/image?${imageQuery}&timestamp=${new Date().getTime()}`);
//             if (!connectionsRes.ok) setConnections([]); else { const connsData = await connectionsRes.json(); setConnections(Array.isArray(connsData) ? connsData : []); }
//         } catch (err) { setError(err.message); setBaseRecommendations([]); }
//         finally { setLoading(false); }
//     }, [isLoaded, isSignedIn, user, getClerkUserQueryParams]);

//     useEffect(() => { if (isSignedIn && user) fetchProfileData(); else if (isLoaded && !isSignedIn) navigate("/"); }, [isSignedIn, user, isLoaded, fetchProfileData, navigate]);

//     useEffect(() => {
//         if (baseRecommendations.length > 0) {
//             setStatsLoading(true);
//             const enrichRecommendations = async () => {
//                 const enriched = await Promise.all(
//                     baseRecommendations.map(async (rec) => {
//                         let communityStats = { average_rating: 0, total_reviews: 0 };
//                         if (rec.id) {
//                             try {
//                                 const statsRes = await fetch(`${API_URL}/api/reviews/stats/${rec.id}`);
//                                 if (statsRes.ok) {
//                                     const statsData = await statsRes.json();
//                                     communityStats.average_rating = parseFloat(statsData.average_rating) || 0;
//                                     communityStats.total_reviews = parseInt(statsData.total_reviews, 10) || 0;
//                                 }
//                             } catch (err) {
//                                 console.error(`Failed to fetch stats for provider ID ${rec.id}:`, err);
//                             }
//                         }
//                         return {
//                             ...rec,
//                             average_rating: communityStats.average_rating,
//                             total_reviews: communityStats.total_reviews
//                         };
//                     })
//                 );
//                 setEnrichedRecommendations(enriched);
//                 setStatsLoading(false);
//             };
//             enrichRecommendations();
//         } else {
//              setEnrichedRecommendations([]);
//              if(!loading) setStatsLoading(false);
//         }
//     }, [baseRecommendations, loading]);

//     const fetchUserTrustCirclesForModal = useCallback(async () => {
//         if (!user?.primaryEmailAddress?.emailAddress) return [];
//         setTrustCirclesLoading(true); setTrustCirclesError("");
//         try {
//             const email = encodeURIComponent(user.primaryEmailAddress.emailAddress);
//             const res = await fetch(`${API_URL}/api/communities/user/${email}/communities`);
//             if (!res.ok) { const errorData = await res.json().catch(() => ({})); throw new Error(errorData.message || "Failed to fetch user trust circles."); }
//             const data = await res.json(); const formattedCircles = Array.isArray(data) ? data.map(tc => ({id: tc.id, name: tc.name})) : [];
//             setUserTrustCircles(formattedCircles); return formattedCircles;
//         } catch (err) { setTrustCirclesError(err.message || "Could not load trust circles."); setUserTrustCircles([]); return []; }
//         finally { setTrustCirclesLoading(false); }
//     }, [user]);

//     const handleOpenEditModal = (rec) => { setCurrentEditingRec(rec); setIsEditModalOpen(true); if (userTrustCircles.length === 0 && !trustCirclesLoading && !trustCirclesError) fetchUserTrustCirclesForModal(); };
//     const handleUpdateRecommendationSuccess = (responseData) => { fetchProfileData(); };

//     const sortedRecommendations = React.useMemo(() => {
//         let sortableItems = [...enrichedRecommendations];
//         if (sortOption === 'topRated' && sortableItems.every(item => typeof item.average_rating === 'number')) sortableItems.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0) || (b.total_reviews || 0) - (a.total_reviews || 0));
//         else if (sortOption === 'date_of_recommendation') sortableItems.sort((a, b) => new Date(b.date_of_recommendation || b.created_at || 0) - new Date(a.date_of_recommendation || a.created_at || 0));
//         return sortableItems;
//     }, [enrichedRecommendations, sortOption]);

//     const handleLogout = async () => { try { await signOut(); navigate("/"); } catch (err) { console.error("Error signing out:", err); } };
//     const handleEditToggle = () => { if (isEditing) { setEditingBio(userBio); setImgSrcForCropper(''); setCompletedCrop(null); setOriginalFile(null); setCrop(undefined); } else setEditingBio(userBio || ''); setIsEditing(!isEditing); };
//     const onImageLoad = (e) => { const { width, height } = e.currentTarget; const cropWidthInPercent = (MIN_DIMENSION / width) * 100; const cropVal = makeAspectCrop({ unit: '%', width: cropWidthInPercent }, ASPECT_RATIO, width, height); const centeredCrop = centerCrop(cropVal, width, height); setCrop(centeredCrop); };
//     const handleFileChange = (event) => { const file = event.target.files[0]; if (file) { setOriginalFile(file); setCrop(undefined); const reader = new FileReader(); reader.addEventListener('load', () => setImgSrcForCropper(reader.result?.toString() || '')); reader.readAsDataURL(file); } };

//     const handleSaveProfile = async () => {
//         if (!user) { setError("User not found."); return; }
//         setError(null); setSaving(true); const formData = new FormData();
//         formData.append('bio', editingBio); formData.append('firstName', user.firstName || ""); formData.append('lastName', user.lastName || "");
//         let fileToUpload = null;
//         if (completedCrop && imgRef.current && originalFile) { try { const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop, originalFile.name); fileToUpload = new File([croppedImageBlob], originalFile.name, { type: croppedImageBlob.type }); } catch (cropError) { setError("Failed to crop image."); setSaving(false); return; } }
//         if (fileToUpload) formData.append('profileImageFile', fileToUpload);
//         try {
//             const queryParams = getClerkUserQueryParams(); if (!queryParams) throw new Error("User details not available for API query.");
//             const response = await fetch(`${API_URL}/api/users/me/profile?${queryParams}`, { method: 'PUT', body: formData });
//             const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.message || "Failed to update profile.");
//             setUserBio(data.user.bio || ''); setEditingBio(data.user.bio || '');
//             const imageQuery = getClerkUserQueryParams(); if(imageQuery) setProfileImage(`${API_URL}/api/users/me/profile/image?${imageQuery}&timestamp=${new Date().getTime()}`);
//             setImgSrcForCropper(''); setCompletedCrop(null); setOriginalFile(null); setIsEditing(false);
//             if (profileUserData) setProfileUserData(prev => ({...prev, userName: data.user.name, userBio: data.user.bio}));
//         } catch (err) { setError(`Failed to save profile: ${err.message}`); } finally { setSaving(false); }
//     };

//     const onAvatarOrPreviewError = (e) => { e.target.style.display = 'none'; const fallbackParent = e.target.closest('.profile-avatar-display-wrapper') || e.target.closest('.profile-avatar-cropper-wrapper'); if (fallbackParent) { const fallbackIcon = fallbackParent.querySelector('.profile-avatar-icon-fallback, .profile-avatar-icon-editing'); if (fallbackIcon) fallbackIcon.style.display = 'flex'; } };

//     const displayOverallLoading = loading || (statsLoading && baseRecommendations.length > 0 && enrichedRecommendations.length < baseRecommendations.length) ;

//     if (!isLoaded || (displayOverallLoading && !profileUserData && isSignedIn)) return <div className="profile-loading-container"><div className="profile-spinner"></div><p>Loading Profile...</p></div>;
//     if (!isSignedIn && isLoaded) return null;
//     if (!user && isLoaded && isSignedIn) return <div className="profile-page"><div className="profile-main-content" style={{ textAlign: 'center', paddingTop: '5rem' }}><h1 style={{color: 'var(--profile-primary-color)'}}>Profile Access Denied</h1><p className="profile-error-banner" style={{margin: '1rem auto', maxWidth: '600px'}}>User information not available.</p><button className="profile-primary-action-btn" onClick={() => navigate('/login')}>Go to Login</button></div></div>;

//     return (
//         <div className="profile-page">
//             <header className="profile-main-header">
//                 <div className="profile-avatar-section">
//                     {isEditing ? (
//                         <div className="profile-avatar-cropper-wrapper">
//                             <input type="file" id="profileImageUploadInput" style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
//                             {!imgSrcForCropper && <div className="profile-avatar-container" onClick={() => document.getElementById('profileImageUploadInput')?.click()} style={{ cursor: 'pointer' }}>{profileImage ? <img src={profileImage} alt="Current profile" className="profile-avatar-image" onError={onAvatarOrPreviewError}/> : <UserCircleIcon className="profile-avatar-icon profile-avatar-icon-fallback"/> }<div className="profile-avatar-edit-overlay"><CameraIcon style={{ width: '24px', height: '24px' }}/></div></div>}
//                             {imgSrcForCropper && <div className="cropper-container"><ReactCrop crop={crop} onChange={(pc, p) => setCrop(p)} onComplete={(c) => setCompletedCrop(c)} aspect={ASPECT_RATIO} minWidth={MIN_DIMENSION} minHeight={MIN_DIMENSION} circularCrop={true}><img ref={imgRef} src={imgSrcForCropper} alt="Crop me" onLoad={onImageLoad} style={{ maxHeight: '300px' }} /></ReactCrop><button className="profile-change-photo-btn-cropper" onClick={() => document.getElementById('profileImageUploadInput')?.click()}><CameraIcon className="btn-icon"/> Change Photo</button></div>}
//                         </div>
//                     ) : <div className="profile-avatar-display-wrapper profile-avatar-container">{profileImage ? <img src={profileImage} alt={profileUserData?.userName || user?.firstName || "User"} className="profile-avatar-image" onError={onAvatarOrPreviewError} /> : null}<UserCircleIcon className="profile-avatar-icon profile-avatar-icon-fallback" style={{ display: profileImage ? 'none' : 'flex' }}/></div>}
//                 </div>
//                 <div className="profile-user-info">
//                     <h1>{profileUserData?.userName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "User"}</h1>
//                     <p><EnvelopeIcon className="inline-icon" />{user?.primaryEmailAddress?.emailAddress}</p>
//                     {isEditing ? <textarea className="profile-bio-textarea" value={editingBio} onChange={(e) => setEditingBio(e.target.value)} placeholder="Tell us about yourself..." rows={3}/> : (userBio && <p className="profile-user-bio">{userBio}</p>)}
//                 </div>
//                 <div className="profile-header-actions">
//                     {isEditing ? (<><button className="profile-save-btn" onClick={handleSaveProfile} disabled={saving}><CheckCircleIcon className="btn-icon" /> {saving ? "Saving..." : "Save Changes"}</button><button className="profile-cancel-btn" onClick={handleEditToggle} disabled={saving}><XCircleIcon className="btn-icon" /> Cancel</button></>) : <button className="profile-edit-btn" onClick={handleEditToggle}><PencilSquareIcon className="btn-icon" /> Edit Profile</button>}
//                     <button className="profile-logout-btn-header" onClick={handleLogout} disabled={saving || isEditing}><ArrowRightOnRectangleIcon className="btn-icon" /> Logout</button>
//                 </div>
//             </header>
//             {error && <div className="profile-error-banner">{error}</div>}
//             <section className="profile-stats-bar">
//                 <div className="stat-item"><FaStar className="stat-icon" style={{ color: "var(--profile-accent-yellow)" }} /><span>{sortedRecommendations.length}</span><p>Recommendations Made</p></div>
//                 <div className="stat-item"><UsersIconSolid className="stat-icon" /><span>{connections.length}</span><p>Connections</p></div>
//             </section>
//             <main className="profile-main-content">
//                 <section className="profile-content-section" id="my-recommendations">
//                     <div className="section-header"><h2>My Recommendations</h2><button className="profile-add-new-btn" onClick={() => navigate("/share-recommendation")}><PlusCircleIcon className="btn-icon" /> Add New</button></div>
//                     {(loading || (statsLoading && baseRecommendations.length > 0 && enrichedRecommendations.length < baseRecommendations.length)) && sortedRecommendations.length === 0 && <div className="profile-loading-container small-spinner"><div className="profile-spinner"></div><p>Loading recommendations...</p></div>}
//                     {!(loading || (statsLoading && baseRecommendations.length > 0 && enrichedRecommendations.length < baseRecommendations.length)) && sortedRecommendations.length > 0 && <ul className="profile-my-recommendations-list">{sortedRecommendations.map((rec) => <MyRecommendationCard key={rec.id} rec={rec} onEdit={handleOpenEditModal} />)}</ul>}
//                     {!(loading || (statsLoading && baseRecommendations.length > 0 && enrichedRecommendations.length < baseRecommendations.length)) && sortedRecommendations.length === 0 && !error && <div className="profile-empty-state"><FaStar className="empty-state-icon" style={{ color: "var(--profile-text-light)" }} /><p>You haven't made any recommendations yet.</p><button className="profile-primary-action-btn" onClick={() => navigate("/share-recommendation")}>Share Your First Recommendation</button></div>}
//                     {!(loading || (statsLoading && baseRecommendations.length > 0 && enrichedRecommendations.length < baseRecommendations.length)) && sortedRecommendations.length === 0 && error && <p className="profile-empty-state-error-inline">Could not load recommendations. {error}</p>}
//                 </section>
//             </main>
//             {isEditModalOpen && currentEditingRec && user && <EditRecommendationModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setCurrentEditingRec(null); }} recommendationToEdit={currentEditingRec} onSaveSuccess={handleUpdateRecommendationSuccess} userEmail={user.primaryEmailAddress?.emailAddress} clerkUserId={user.id} apiBaseUrl={API_URL} userTrustCirclesProp={userTrustCircles} trustCirclesLoadingProp={trustCirclesLoading} trustCirclesErrorProp={trustCirclesError} fetchUserTrustCirclesFunc={fetchUserTrustCirclesForModal}/>}
//         </div>
//     );
// };

// export default Profile;

// import React, { useEffect, useState, useCallback, useRef } from "react";
// import { useUser, useClerk } from "@clerk/clerk-react";
// import { useNavigate } from "react-router-dom";
// import { FaStar, FaStarHalfAlt } from "react-icons/fa";
// import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
// import 'react-image-crop/dist/ReactCrop.css';
// import {
//     UserCircleIcon, EnvelopeIcon, UsersIcon as UsersIconSolid,
//     ArrowRightOnRectangleIcon, PencilSquareIcon, PlusCircleIcon, CameraIcon,
//     CheckCircleIcon, XCircleIcon, BuildingOffice2Icon, ChatBubbleLeftEllipsisIcon,
//     EllipsisVerticalIcon, ShareIcon, CalendarDaysIcon, CropIcon,
//     TagIcon, GlobeAltIcon, SparklesIcon, ArrowPathIcon, PhoneIcon,
// } from "@heroicons/react/24/solid";
// import { StarIcon as SolidStarIcon } from "@heroicons/react/24/solid";
// import { StarIcon as OutlineStarIcon } from "@heroicons/react/24/outline";

// import "./Profile.css";

// // const API_URL = 'https://api.seanag-recommendations.org:8080';
// // const API_URL = "http://localhost:5000";
// const API_URL = "http://localhost:3000";

// function getCroppedImg(image, crop, fileName) {
//     const canvas = document.createElement('canvas');
//     const scaleX = image.naturalWidth / image.width;
//     const scaleY = image.naturalHeight / image.height;
//     canvas.width = crop.width * scaleX;
//     canvas.height = crop.height * scaleY;
//     const ctx = canvas.getContext('2d');
//     ctx.drawImage(
//         image,
//         crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY,
//         0, 0, canvas.width, canvas.height
//     );
//     return new Promise((resolve, reject) => {
//         canvas.toBlob(blob => {
//             if (!blob) { reject(new Error('Canvas is empty')); return; }
//             blob.name = fileName;
//             resolve(blob);
//         }, 'image/jpeg', 0.95);
//     });
// }

// const StarRatingDisplay = ({ rating, isProfileCard }) => {
//   const numRating = parseFloat(rating) || 0;
//   const fullStars = Math.floor(numRating);
//   const hasHalf = isProfileCard ? (numRating - fullStars >= 0.4) : (numRating - fullStars >= 0.5);
//   const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
//   const starClass = isProfileCard ? "profile-star-icon" : "as-star-icon";

//   return (
//     <div className={isProfileCard ? "profile-star-display" : "as-star-rating"}>
//       {[...Array(fullStars)].map((_, i) => <FaStar key={`full-${i}`} className={`${starClass} filled`} />)}
//       {hasHalf && (isProfileCard ? <FaStarHalfAlt key="half" className={`${starClass} filled`} /> : <FaStar key="half" className={`${starClass} half`} />)}
//       {[...Array(emptyStars)].map((_, i) => <FaStar key={`empty-${i}`} className={`${starClass} empty`} />)}
//     </div>
//   );
// };

// const EditModalStarDisplay = ({ active, onClick, onMouseEnter, onMouseLeave }) => {
//     if (active) {
//         return <SolidStarIcon className="profile-edit-modal-star-icon filled" onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} aria-hidden="true" />;
//     }
//     return <OutlineStarIcon className="profile-edit-modal-star-icon" onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} aria-hidden="true" />;
// };

// const EDIT_MODAL_PUBLISH_OPTIONS = [
//     { value: "Full Trust Circle", label: "Entire Trust Circle", icon: UsersIconSolid },
//     { value: "Specific Trust Circles", label: "Specific Trust Circles", icon: UserCircleIcon },
//     { value: "Public", label: "Public", icon: GlobeAltIcon },
// ];

// const EditRecommendationModal = ({
//     isOpen, onClose, recommendationToEdit, onSaveSuccess, userEmail, clerkUserId, apiBaseUrl,
//     userTrustCirclesProp, trustCirclesLoadingProp, trustCirclesErrorProp, fetchUserTrustCirclesFunc
// }) => {
//     const [businessName, setBusinessName] = useState("");
//     const [recommenderMessage, setRecommenderMessage] = useState("");
//     const [rating, setRatingState] = useState(0);
//     const [hoverRating, setHoverRating] = useState(0);
//     const [tags, setTags] = useState([]);
//     const [tagInput, setTagInput] = useState("");
//     const [providerContactName, setProviderContactName] = useState("");
//     const [website, setWebsite] = useState("");
//     const [phoneNumber, setPhoneNumber] = useState("");
//     const [publishScope, setPublishScope] = useState("Full Trust Circle");
//     const [selectedTrustCircles, setSelectedTrustCircles] = useState([]);
//     const [internalUserTrustCircles, setInternalUserTrustCircles] = useState([]);
//     const [internalTrustCirclesLoading, setInternalTrustCirclesLoading] = useState(false);
//     const [internalTrustCirclesError, setInternalTrustCirclesError] = useState("");
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [message, setMessage] = useState("");

//     useEffect(() => {
//         if (recommendationToEdit) {
//             setBusinessName(recommendationToEdit.business_name || "");
//             setRecommenderMessage(recommendationToEdit.recommender_message || "");
//             setRatingState(recommendationToEdit.rating || 0);
//             setTags(recommendationToEdit.tags || []);
//             setProviderContactName(recommendationToEdit.provider_contact_name || recommendationToEdit.business_contact || "");
//             setWebsite(recommendationToEdit.website || "");
//             setPhoneNumber(recommendationToEdit.phone_number || "");
//             let initialPublishScope = "Full Trust Circle";
//             if (recommendationToEdit.visibility === 'public') initialPublishScope = "Public";
//             else if (recommendationToEdit.visibility === 'connections') {
//                  initialPublishScope = (Array.isArray(recommendationToEdit.trust_circle_ids) && recommendationToEdit.trust_circle_ids.length > 0) ? "Specific Trust Circles" : "Full Trust Circle";
//             } else if (recommendationToEdit.publish_scope) initialPublishScope = recommendationToEdit.publish_scope;
//             setPublishScope(initialPublishScope);
//             setSelectedTrustCircles(recommendationToEdit.trust_circle_ids || []);
//             setMessage(""); setHoverRating(0); setTagInput("");
//         }
//     }, [recommendationToEdit]);

//     useEffect(() => {
//        setInternalUserTrustCircles(userTrustCirclesProp || []);
//        setInternalTrustCirclesLoading(trustCirclesLoadingProp || false);
//        setInternalTrustCirclesError(trustCirclesErrorProp || "");
//     }, [userTrustCirclesProp, trustCirclesLoadingProp, trustCirclesErrorProp]);

//     useEffect(() => {
//         if (publishScope === "Specific Trust Circles" && internalUserTrustCircles.length === 0 && !internalTrustCirclesLoading && !internalTrustCirclesError && fetchUserTrustCirclesFunc) {
//              (async () => {
//                 setInternalTrustCirclesLoading(true); setInternalTrustCirclesError("");
//                 try {
//                     const circles = await fetchUserTrustCirclesFunc(); setInternalUserTrustCircles(circles || []);
//                 } catch (err) { setInternalTrustCirclesError(err.message || "Could not load trust circles."); setInternalUserTrustCircles([]); }
//                 finally { setInternalTrustCirclesLoading(false); }
//             })();
//         }
//     }, [publishScope, internalUserTrustCircles, internalTrustCirclesLoading, internalTrustCirclesError, fetchUserTrustCirclesFunc]);

//     const handleStarClick = (n) => setRatingState(n);
//     const handleTagKeyDown = (e) => {
//         if (e.key === "Enter" && tagInput.trim()) {
//             e.preventDefault(); const newTag = tagInput.trim().toLowerCase();
//             if (newTag && !tags.includes(newTag)) setTags((prevTags) => [...prevTags, newTag]);
//             setTagInput("");
//         }
//     };
//     const removeTag = (tagToRemove) => setTags((prevTags) => prevTags.filter((tag) => tag !== tagToRemove));
//     const handlePublishScopeChange = (e) => { const newScope = e.target.value; setPublishScope(newScope); if (newScope !== "Specific Trust Circles") setSelectedTrustCircles([]); };
//     const handleTrustCircleToggle = (circleId) => setSelectedTrustCircles((prev) => prev.includes(circleId) ? prev.filter((id) => id !== circleId) : [...prev, circleId]);

//     const handleSubmit = async (e) => {
//         e.preventDefault(); if (isSubmitting) return;
//         if (!businessName.trim() || !recommenderMessage.trim() || rating === 0) { setMessage("error:Provider Name, Your Experience, and Rating are required."); return; }
//         if (publishScope === "Specific Trust Circles" && selectedTrustCircles.length === 0) { setMessage("error:Select trust circles or change publish scope."); return; }
//         setIsSubmitting(true); setMessage("");
//         const payload = {
//             business_name: businessName.trim(), recommender_message: recommenderMessage.trim(), rating: rating, tags: tags,
//             provider_contact_name: providerContactName.trim() || null, website: website.trim() || null, phone_number: phoneNumber.trim() || null,
//             publish_scope: publishScope, ...(publishScope === "Specific Trust Circles" && { trust_circle_ids: selectedTrustCircles }),
//         };
//         try {
//             const queryParams = new URLSearchParams({ user_id: clerkUserId, email: userEmail }).toString();
//             const res = await fetch(`${apiBaseUrl}/api/recommendations/${recommendationToEdit.id}?${queryParams}`, {
//                 method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
//             });
//             const responseData = await res.json();
//             if (!res.ok || !responseData.success) throw new Error(responseData.message || responseData.error || `Failed to update. Status: ${res.status}`);
//             setMessage("success:Recommendation updated successfully!");
//             if (onSaveSuccess) onSaveSuccess(responseData);
//             setTimeout(() => { onClose(); }, 1500);
//         } catch (error) { setMessage(`error:${error.message}`); }
//         finally { setIsSubmitting(false); }
//     };

//     if (!isOpen) return null;
//     const requiredFieldsComplete = businessName.trim() && recommenderMessage.trim() && rating > 0;

//     return (
//         <div className="profile-edit-modal-overlay">
//             <div className="profile-edit-modal-content">
//                 <button onClick={onClose} className="profile-edit-modal-close-btn">&times;</button>
//                 <h2 className="profile-edit-modal-title">Edit Your Recommendation</h2>
//                 <form onSubmit={handleSubmit} className="profile-edit-modal-form">
//                     <section className="profile-edit-modal-form-section">
//                         <h3 className="profile-edit-modal-section-title"><span className="profile-edit-modal-section-number">1</span>Core Details</h3>
//                         <div className="profile-edit-modal-form-grid">
//                             <div className="profile-edit-modal-form-group span-2"><label htmlFor="editBusinessName">Service Provider Name *</label><input id="editBusinessName" type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required /></div>
//                             <div className="profile-edit-modal-form-group span-2"><label htmlFor="editRecommendationBlurb">Your Experience *</label><textarea id="editRecommendationBlurb" value={recommenderMessage} onChange={(e) => setRecommenderMessage(e.target.value)} required rows={4}/></div>
//                             <div className="profile-edit-modal-form-group span-2 rating-group"><label>Your Rating *</label><div className="profile-edit-modal-star-rating">{[1, 2, 3, 4, 5].map((n) => <EditModalStarDisplay key={n} active={n <= (hoverRating || rating)} onClick={() => handleStarClick(n)} onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(0)}/>)}</div></div>
//                         </div>
//                     </section>
//                     <div className={`profile-edit-modal-optional-section-wrapper ${requiredFieldsComplete ? "visible" : ""}`}>
//                         {requiredFieldsComplete && <div className="profile-edit-modal-optional-intro"><SparklesIcon className="intro-icon mini" /> Keep refining... (Optional)</div>}
//                         <section className="profile-edit-modal-form-section">
//                             <h3 className="profile-edit-modal-section-title"><span className="profile-edit-modal-section-number">2</span>Additional Info</h3>
//                             <div className="profile-edit-modal-form-grid">
//                                 <div className="profile-edit-modal-form-group"><label htmlFor="editProviderContactName"><UserCircleIcon /> Provider Contact</label><input id="editProviderContactName" type="text" value={providerContactName} onChange={(e) => setProviderContactName(e.target.value)} placeholder="e.g., Jane Doe" /></div>
//                                 <div className="profile-edit-modal-form-group"><label htmlFor="editWebsite"><GlobeAltIcon /> Website</label><input id="editWebsite" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://provider.com" /></div>
//                                 <div className="profile-edit-modal-form-group span-2"><label htmlFor="editPhoneNumber"><PhoneIcon /> Phone Number</label><input id="editPhoneNumber" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="(555) 123-4567" /></div>
//                                 <div className="profile-edit-modal-form-group span-2 tag-input-group"><label htmlFor="editTags"><TagIcon /> Tags (Press Enter)</label><input id="editTags" type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="e.g., reliable, fast"/><div className="profile-edit-modal-tag-container">{tags.map((tag, i) => <span key={i} className="profile-edit-modal-tag-pill">{tag}<span className="remove-tag" onClick={() => removeTag(tag)}>×</span></span>)}</div></div>
//                             </div>
//                         </section>
//                         <section className="profile-edit-modal-form-section">
//                             <h3 className="profile-edit-modal-section-title"><span className="profile-edit-modal-section-number">3</span>Share With</h3>
//                             <div className="profile-edit-modal-publish-options-grid">{EDIT_MODAL_PUBLISH_OPTIONS.map((option) => <label key={option.value} className={`profile-edit-modal-publish-option ${publishScope === option.value ? "selected" : ""}`}><input type="radio" name="editPublishScope" value={option.value} checked={publishScope === option.value} onChange={handlePublishScopeChange} className="sr-only"/><option.icon className="publish-icon" /><span>{option.label}</span>{publishScope === option.value && <CheckCircleIcon className="selected-check" />}</label>)}</div>
//                             {publishScope === "Specific Trust Circles" && (<div className="profile-edit-modal-trust-circle-select-wrapper"><label className="trust-circle-label">Select specific circles:</label>{internalTrustCirclesLoading && <div className="loading-trust-circles"><ArrowPathIcon className="animate-spin h-5 w-5 mr-2 inline" /> Loading...</div>}{internalTrustCirclesError && !internalTrustCirclesLoading && <div className="error-trust-circles"><XCircleIcon className="h-5 w-5 mr-2 inline text-red-500" /> {internalTrustCirclesError} <button type="button" onClick={fetchUserTrustCirclesFunc} className="retry-button ml-2">Retry</button></div>}{!internalTrustCirclesLoading && !internalTrustCirclesError && internalUserTrustCircles.length > 0 && <div className="profile-edit-modal-trust-circle-checkbox-group">{internalUserTrustCircles.map((circle) => <label key={circle.id} className="trust-circle-checkbox-item"><input type="checkbox" value={circle.id} checked={selectedTrustCircles.includes(circle.id)} onChange={() => handleTrustCircleToggle(circle.id)}/><span>{circle.name}</span></label>)}</div>}{!internalTrustCirclesLoading && !internalTrustCirclesError && internalUserTrustCircles.length === 0 && <p className="no-trust-circles-message">No communities found or could not load.</p>}</div>)}
//                         </section>
//                     </div>
//                     <div className="profile-edit-modal-button-row"><button type="button" className="profile-edit-modal-btn cancel-btn" onClick={onClose} disabled={isSubmitting}>Cancel</button><button type="submit" className="profile-edit-modal-btn save-btn" disabled={isSubmitting || !requiredFieldsComplete}>{isSubmitting ? "Saving..." : "Save Changes"} <CheckCircleIcon /></button></div>
//                     {message && <div className={`profile-edit-modal-message ${message.startsWith("error:") ? "error" : "success"}`}>{message.startsWith("error:") ? <XCircleIcon /> : <CheckCircleIcon />}<span>{message.substring(message.indexOf(":") + 1)}</span></div>}
//                 </form>
//             </div>
//         </div>
//     );
// };

// const MyRecommendationCard = ({ rec, onEdit }) => {
//     const [dropdownOpen, setDropdownOpen] = useState(false);
//     const formatDate = (dateString) => !dateString ? 'Date not available' : new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
//     const handleShare = () => { alert('Share functionality for individual recommendations coming soon!'); setDropdownOpen(false); };
//     const displayCommunityAvgRatingVal = (parseFloat(rec.average_rating) || 0).toFixed(1);
//     const displayTotalReviewsVal = parseInt(rec.total_reviews, 10) || 0;

//     return (
//         <li className="profile-my-rec-card">
//             <div className="profile-my-rec-card-header">
//                 <h2 className="profile-my-rec-card-title">{rec.business_name || 'Unknown Business'}</h2>
//                 <div className="profile-my-rec-badge-wrapper-with-menu">
//                     <div className="profile-my-rec-badge-group">{(parseFloat(rec.average_rating) || 0) >= 4.5 && <span className="profile-my-rec-top-rated-badge">Top Rated</span>}</div>
//                     <div className="profile-my-rec-right-actions"><div className="profile-my-rec-dropdown-wrapper"><button className="profile-my-rec-three-dots-button" onClick={() => setDropdownOpen(!dropdownOpen)} title="Options">⋮</button>{dropdownOpen && (<div className="profile-my-rec-dropdown-menu"><button className="profile-my-rec-dropdown-item" onClick={() => { onEdit(rec); setDropdownOpen(false); }}><PencilSquareIcon /> Edit Recommendation</button><button className="profile-my-rec-dropdown-item" onClick={handleShare}><ShareIcon /> Share Recommendation</button></div>)}</div></div>
//                 </div>
//             </div>
//             <div className="profile-my-rec-review-summary">
//                 {(typeof rec.average_rating === 'number' || rec.average_rating === 0) ? (
//                     <>
//                         <StarRatingDisplay rating={rec.average_rating || 0} isProfileCard={false} />
//                         <span className="profile-my-rec-rating-score-text">{displayCommunityAvgRatingVal} ({displayTotalReviewsVal} Reviews)</span>
//                     </>
//                 ) : (
//                     <>
//                         <StarRatingDisplay rating={0} isProfileCard={false} />
//                         <span className="profile-my-rec-rating-score-text">0.0 (0 Reviews)</span>
//                     </>
//                 )}
//             </div>
//             <p className="profile-my-rec-card-description"><ChatBubbleLeftEllipsisIcon className="inline-icon" />{rec.recommender_message || "No detailed message provided."}</p>
//             {Array.isArray(rec.tags) && rec.tags.length > 0 && (<div className="profile-my-rec-tag-container">{rec.tags.map((tag, idx) => <span key={idx} className="profile-my-rec-tag-badge">{tag}</span>)}<button className="profile-my-rec-add-tag-button" onClick={() => onEdit(rec)} aria-label="Edit tags">+</button></div>)}
//             {(Array.isArray(rec.tags) && rec.tags.length === 0) && (<div className="profile-my-rec-tag-container"><span className="profile-my-rec-no-tags-text">No tags.</span><button className="profile-my-rec-add-tag-button" onClick={() => onEdit(rec)} aria-label="Add a tag">+</button></div>)}
//             <div className="profile-my-rec-card-footer">
//                  <div className="profile-my-rec-date"><CalendarDaysIcon className="inline-icon" />Recommended on: {formatDate(rec.date_of_recommendation || rec.created_at)}</div>
//                 <div className="profile-my-rec-action-buttons"><button className="profile-my-rec-primary-action-button" onClick={() => onEdit(rec)}><PencilSquareIcon className="btn-icon" /> Edit My Rec</button></div>
//             </div>
//         </li>
//     );
// };

// const Profile = () => {
//     const { isLoaded, isSignedIn, user } = useUser();
//     const { signOut } = useClerk();
//     const navigate = useNavigate();
//     const [baseRecommendations, setBaseRecommendations] = useState([]);
//     const [enrichedRecommendations, setEnrichedRecommendations] = useState([]);
//     const [connections, setConnections] = useState([]);
//     const [profileUserData, setProfileUserData] = useState(null);
//     const [userBio, setUserBio] = useState('');
//     const [profileImage, setProfileImage] = useState('');
//     const [editingBio, setEditingBio] = useState('');
//     const [isEditing, setIsEditing] = useState(false);
//     const [imgSrcForCropper, setImgSrcForCropper] = useState('');
//     const imgRef = useRef(null);
//     const [crop, setCrop] = useState();
//     const [completedCrop, setCompletedCrop] = useState(null);
//     const [originalFile, setOriginalFile] = useState(null);
//     const [sortOption, setSortOption] = useState('date_of_recommendation');
//     const [loading, setLoading] = useState(true);
//     const [statsLoading, setStatsLoading] = useState(false);
//     const [saving, setSaving] = useState(false);
//     const [error, setError] = useState(null);
//     const [isEditModalOpen, setIsEditModalOpen] = useState(false);
//     const [currentEditingRec, setCurrentEditingRec] = useState(null);
//     const [userTrustCircles, setUserTrustCircles] = useState([]);
//     const [trustCirclesLoading, setTrustCirclesLoading] = useState(false);
//     const [trustCirclesError, setTrustCirclesError] = useState("");
//     const ASPECT_RATIO = 1; const MIN_DIMENSION = 150;

//     const getClerkUserQueryParams = useCallback(() => {
//         if (!user) return "";
//         return new URLSearchParams({ user_id: user.id, email: user.primaryEmailAddress?.emailAddress, firstName: user.firstName || "", lastName: user.lastName || "", phoneNumber: user.primaryPhoneNumber?.phoneNumber || "" }).toString();
//     }, [user]);

//     const fetchProfileData = useCallback(async () => {
//         if (!isLoaded || !isSignedIn || !user) return;
//         setLoading(true); setError(null); setEnrichedRecommendations([]);
//         try {
//             const queryParams = getClerkUserQueryParams(); if (!queryParams) throw new Error("User details not available.");
//             const profileResPromise = fetch(`${API_URL}/api/users/me/recommendations?${queryParams}`);
//             const connectionsResPromise = fetch(`${API_URL}/api/connections/check-connections?${queryParams}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.primaryEmailAddress?.emailAddress, user_id: user.id }), });
//             const [profileRes, connectionsRes] = await Promise.all([profileResPromise, connectionsResPromise]);
//             if (!profileRes.ok) { const errData = await profileRes.json().catch(() => ({})); throw new Error(errData.message || "Failed to fetch profile data"); }
//             const profileData = await profileRes.json();
//             setProfileUserData(profileData);
//             setBaseRecommendations(profileData.recommendations || []);
//             setUserBio(profileData.userBio || ''); setEditingBio(profileData.userBio || '');
//             const imageQuery = getClerkUserQueryParams(); if (imageQuery) setProfileImage(`${API_URL}/api/users/me/profile/image?${imageQuery}&timestamp=${new Date().getTime()}`);
//             if (!connectionsRes.ok) setConnections([]); else { const connsData = await connectionsRes.json(); setConnections(Array.isArray(connsData) ? connsData : []); }
//         } catch (err) { setError(err.message); setBaseRecommendations([]); }
//         finally { setLoading(false); }
//     }, [isLoaded, isSignedIn, user, getClerkUserQueryParams]);

//     useEffect(() => { if (isSignedIn && user) fetchProfileData(); else if (isLoaded && !isSignedIn) navigate("/"); }, [isSignedIn, user, isLoaded, fetchProfileData, navigate]);

//     useEffect(() => {
//         if (baseRecommendations.length > 0) {
//             setStatsLoading(true);
//             const enrichRecommendations = async () => {
//                 const enriched = await Promise.all(
//                     baseRecommendations.map(async (rec) => {
//                         let communityStats = { average_rating: 0, total_reviews: 0 };
//                         if (rec.id) {
//                             try {
//                                 const statsRes = await fetch(`${API_URL}/api/reviews/stats/${rec.id}`);
//                                 if (statsRes.ok) {
//                                     const statsData = await statsRes.json();
//                                     communityStats.average_rating = parseFloat(statsData.average_rating) || 0;
//                                     communityStats.total_reviews = parseInt(statsData.total_reviews, 10) || 0;
//                                 }
//                             } catch (err) {
//                                 console.error(`Failed to fetch stats for provider ID ${rec.id}:`, err);
//                             }
//                         }
//                         return { 
//                             ...rec, 
//                             average_rating: communityStats.average_rating, 
//                             total_reviews: communityStats.total_reviews 
//                         };
//                     })
//                 );
//                 setEnrichedRecommendations(enriched);
//                 setStatsLoading(false);
//             };
//             enrichRecommendations();
//         } else {
//              setEnrichedRecommendations([]);
//              if(!loading) setStatsLoading(false);
//         }
//     }, [baseRecommendations, loading]);


//     const fetchUserTrustCirclesForModal = useCallback(async () => {
//         if (!user?.primaryEmailAddress?.emailAddress) return [];
//         setTrustCirclesLoading(true); setTrustCirclesError("");
//         try {
//             const email = encodeURIComponent(user.primaryEmailAddress.emailAddress);
//             const res = await fetch(`${API_URL}/api/communities/user/${email}/communities`);
//             if (!res.ok) { const errorData = await res.json().catch(() => ({})); throw new Error(errorData.message || "Failed to fetch user trust circles."); }
//             const data = await res.json(); const formattedCircles = Array.isArray(data) ? data.map(tc => ({id: tc.id, name: tc.name})) : [];
//             setUserTrustCircles(formattedCircles); return formattedCircles;
//         } catch (err) { setTrustCirclesError(err.message || "Could not load trust circles."); setUserTrustCircles([]); return []; }
//         finally { setTrustCirclesLoading(false); }
//     }, [user]);

//     const handleOpenEditModal = (rec) => { setCurrentEditingRec(rec); setIsEditModalOpen(true); if (userTrustCircles.length === 0 && !trustCirclesLoading && !trustCirclesError) fetchUserTrustCirclesForModal(); };
//     const handleUpdateRecommendationSuccess = (responseData) => { fetchProfileData(); };

//     const sortedRecommendations = React.useMemo(() => {
//         let sortableItems = [...enrichedRecommendations];
//         if (sortOption === 'topRated' && sortableItems.every(item => typeof item.average_rating === 'number')) sortableItems.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0) || (b.total_reviews || 0) - (a.total_reviews || 0));
//         else if (sortOption === 'date_of_recommendation') sortableItems.sort((a, b) => new Date(b.date_of_recommendation || b.created_at || 0) - new Date(a.date_of_recommendation || a.created_at || 0));
//         return sortableItems;
//     }, [enrichedRecommendations, sortOption]);

//     const handleLogout = async () => { try { await signOut(); navigate("/"); } catch (err) { console.error("Error signing out:", err); } };
//     const handleEditToggle = () => { if (isEditing) { setEditingBio(userBio); setImgSrcForCropper(''); setCompletedCrop(null); setOriginalFile(null); setCrop(undefined); } else setEditingBio(userBio || ''); setIsEditing(!isEditing); };
//     const onImageLoad = (e) => { const { width, height } = e.currentTarget; const cropWidthInPercent = (MIN_DIMENSION / width) * 100; const cropVal = makeAspectCrop({ unit: '%', width: cropWidthInPercent }, ASPECT_RATIO, width, height); const centeredCrop = centerCrop(cropVal, width, height); setCrop(centeredCrop); };
//     const handleFileChange = (event) => { const file = event.target.files[0]; if (file) { setOriginalFile(file); setCrop(undefined); const reader = new FileReader(); reader.addEventListener('load', () => setImgSrcForCropper(reader.result?.toString() || '')); reader.readAsDataURL(file); } };

//     const handleSaveProfile = async () => {
//         if (!user) { setError("User not found."); return; }
//         setError(null); setSaving(true); const formData = new FormData();
//         formData.append('bio', editingBio); formData.append('firstName', user.firstName || ""); formData.append('lastName', user.lastName || "");
//         let fileToUpload = null;
//         if (completedCrop && imgRef.current && originalFile) { try { const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop, originalFile.name); fileToUpload = new File([croppedImageBlob], originalFile.name, { type: croppedImageBlob.type }); } catch (cropError) { setError("Failed to crop image."); setSaving(false); return; } }
//         if (fileToUpload) formData.append('profileImageFile', fileToUpload);
//         try {
//             const queryParams = getClerkUserQueryParams(); if (!queryParams) throw new Error("User details not available for API query.");
//             const response = await fetch(`${API_URL}/api/users/me/profile?${queryParams}`, { method: 'PUT', body: formData });
//             const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.message || "Failed to update profile.");
//             setUserBio(data.user.bio || ''); setEditingBio(data.user.bio || '');
//             const imageQuery = getClerkUserQueryParams(); if(imageQuery) setProfileImage(`${API_URL}/api/users/me/profile/image?${imageQuery}&timestamp=${new Date().getTime()}`);
//             setImgSrcForCropper(''); setCompletedCrop(null); setOriginalFile(null); setIsEditing(false);
//             if (profileUserData) setProfileUserData(prev => ({...prev, userName: data.user.name, userBio: data.user.bio}));
//         } catch (err) { setError(`Failed to save profile: ${err.message}`); } finally { setSaving(false); }
//     };

//     const onAvatarOrPreviewError = (e) => { e.target.style.display = 'none'; const fallbackParent = e.target.closest('.profile-avatar-display-wrapper') || e.target.closest('.profile-avatar-cropper-wrapper'); if (fallbackParent) { const fallbackIcon = fallbackParent.querySelector('.profile-avatar-icon-fallback, .profile-avatar-icon-editing'); if (fallbackIcon) fallbackIcon.style.display = 'flex'; } };

//     const displayOverallLoading = loading || (statsLoading && baseRecommendations.length > 0 && enrichedRecommendations.length < baseRecommendations.length) ;

//     if (!isLoaded || (displayOverallLoading && !profileUserData && isSignedIn)) return <div className="profile-loading-container"><div className="profile-spinner"></div><p>Loading Profile...</p></div>;
//     if (!isSignedIn && isLoaded) return null;
//     if (!user && isLoaded && isSignedIn) return <div className="profile-page"><div className="profile-main-content" style={{ textAlign: 'center', paddingTop: '5rem' }}><h1 style={{color: 'var(--profile-primary-color)'}}>Profile Access Denied</h1><p className="profile-error-banner" style={{margin: '1rem auto', maxWidth: '600px'}}>User information not available.</p><button className="profile-primary-action-btn" onClick={() => navigate('/login')}>Go to Login</button></div></div>;

//     return (
//         <div className="profile-page">
//             <header className="profile-main-header">
//                 <div className="profile-avatar-section">
//                     {isEditing ? (
//                         <div className="profile-avatar-cropper-wrapper">
//                             <input type="file" id="profileImageUploadInput" style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
//                             {!imgSrcForCropper && <div className="profile-avatar-container" onClick={() => document.getElementById('profileImageUploadInput')?.click()} style={{ cursor: 'pointer' }}>{profileImage ? <img src={profileImage} alt="Current profile" className="profile-avatar-image" onError={onAvatarOrPreviewError}/> : <UserCircleIcon className="profile-avatar-icon profile-avatar-icon-fallback"/> }<div className="profile-avatar-edit-overlay"><CameraIcon style={{ width: '24px', height: '24px' }}/></div></div>}
//                             {imgSrcForCropper && <div className="cropper-container"><ReactCrop crop={crop} onChange={(pc, p) => setCrop(p)} onComplete={(c) => setCompletedCrop(c)} aspect={ASPECT_RATIO} minWidth={MIN_DIMENSION} minHeight={MIN_DIMENSION} circularCrop={true}><img ref={imgRef} src={imgSrcForCropper} alt="Crop me" onLoad={onImageLoad} style={{ maxHeight: '300px' }} /></ReactCrop><button className="profile-change-photo-btn-cropper" onClick={() => document.getElementById('profileImageUploadInput')?.click()}><CameraIcon className="btn-icon"/> Change Photo</button></div>}
//                         </div>
//                     ) : <div className="profile-avatar-display-wrapper profile-avatar-container">{profileImage ? <img src={profileImage} alt={profileUserData?.userName || user?.firstName || "User"} className="profile-avatar-image" onError={onAvatarOrPreviewError} /> : null}<UserCircleIcon className="profile-avatar-icon profile-avatar-icon-fallback" style={{ display: profileImage ? 'none' : 'flex' }}/></div>}
//                 </div>
//                 <div className="profile-user-info">
//                     <h1>{profileUserData?.userName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "User"}</h1>
//                     <p><EnvelopeIcon className="inline-icon" />{user?.primaryEmailAddress?.emailAddress}</p>
//                     {isEditing ? <textarea className="profile-bio-textarea" value={editingBio} onChange={(e) => setEditingBio(e.target.value)} placeholder="Tell us about yourself..." rows={3}/> : (userBio && <p className="profile-user-bio">{userBio}</p>)}
//                 </div>
//                 <div className="profile-header-actions">
//                     {isEditing ? (<><button className="profile-save-btn" onClick={handleSaveProfile} disabled={saving}><CheckCircleIcon className="btn-icon" /> {saving ? "Saving..." : "Save Changes"}</button><button className="profile-cancel-btn" onClick={handleEditToggle} disabled={saving}><XCircleIcon className="btn-icon" /> Cancel</button></>) : <button className="profile-edit-btn" onClick={handleEditToggle}><PencilSquareIcon className="btn-icon" /> Edit Profile</button>}
//                     <button className="profile-logout-btn-header" onClick={handleLogout} disabled={saving || isEditing}><ArrowRightOnRectangleIcon className="btn-icon" /> Logout</button>
//                 </div>
//             </header>
//             {error && <div className="profile-error-banner">{error}</div>}
//             <section className="profile-stats-bar">
//                 <div className="stat-item"><FaStar className="stat-icon" style={{ color: "var(--profile-accent-yellow)" }} /><span>{sortedRecommendations.length}</span><p>Recommendations Made</p></div>
//                 <div className="stat-item"><UsersIconSolid className="stat-icon" /><span>{connections.length}</span><p>Connections</p></div>
//             </section>
//             <main className="profile-main-content">
//                 <section className="profile-content-section" id="my-recommendations">
//                     <div className="section-header"><h2>My Recommendations</h2><button className="profile-add-new-btn" onClick={() => navigate("/share-recommendation")}><PlusCircleIcon className="btn-icon" /> Add New</button></div>
//                     {(loading || (statsLoading && baseRecommendations.length > 0 && enrichedRecommendations.length < baseRecommendations.length)) && sortedRecommendations.length === 0 && <div className="profile-loading-container small-spinner"><div className="profile-spinner"></div><p>Loading recommendations...</p></div>}
//                     {!(loading || (statsLoading && baseRecommendations.length > 0 && enrichedRecommendations.length < baseRecommendations.length)) && sortedRecommendations.length > 0 && <ul className="profile-my-recommendations-list">{sortedRecommendations.map((rec) => <MyRecommendationCard key={rec.id} rec={rec} onEdit={handleOpenEditModal} />)}</ul>}
//                     {!(loading || (statsLoading && baseRecommendations.length > 0 && enrichedRecommendations.length < baseRecommendations.length)) && sortedRecommendations.length === 0 && !error && <div className="profile-empty-state"><FaStar className="empty-state-icon" style={{ color: "var(--profile-text-light)" }} /><p>You haven't made any recommendations yet.</p><button className="profile-primary-action-btn" onClick={() => navigate("/share-recommendation")}>Share Your First Recommendation</button></div>}
//                     {!(loading || (statsLoading && baseRecommendations.length > 0 && enrichedRecommendations.length < baseRecommendations.length)) && sortedRecommendations.length === 0 && error && <p className="profile-empty-state-error-inline">Could not load recommendations. {error}</p>}
//                 </section>
//             </main>
//             {isEditModalOpen && currentEditingRec && user && <EditRecommendationModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setCurrentEditingRec(null); }} recommendationToEdit={currentEditingRec} onSaveSuccess={handleUpdateRecommendationSuccess} userEmail={user.primaryEmailAddress?.emailAddress} clerkUserId={user.id} apiBaseUrl={API_URL} userTrustCirclesProp={userTrustCircles} trustCirclesLoadingProp={trustCirclesLoading} trustCirclesErrorProp={trustCirclesError} fetchUserTrustCirclesFunc={fetchUserTrustCirclesForModal}/>}
//         </div>
//     );
// };

// export default Profile;

// working 5/19 => with photos working
// import React, { useEffect, useState, useCallback, useRef } from "react";
// import { useUser, useClerk } from "@clerk/clerk-react";
// import { useNavigate } from "react-router-dom";
// import { FaStar, FaStarHalfAlt } from "react-icons/fa";
// import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
// import 'react-image-crop/dist/ReactCrop.css';
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
//     CalendarDaysIcon,
//     CropIcon 
// } from "@heroicons/react/24/solid";
// import "./Profile.css";

// const API_URL = 'https://api.seanag-recommendations.org:8080';
// // const API_URL = "http://localhost:5000";
// // const API_URL = "http://localhost:3000";

// function getCroppedImg(image, crop, fileName) {
//     const canvas = document.createElement('canvas');
//     const scaleX = image.naturalWidth / image.width;
//     const scaleY = image.naturalHeight / image.height;
//     canvas.width = crop.width * scaleX;
//     canvas.height = crop.height * scaleY;
//     const ctx = canvas.getContext('2d');

//     ctx.drawImage(
//         image,
//         crop.x * scaleX,
//         crop.y * scaleY,
//         crop.width * scaleX,
//         crop.height * scaleY,
//         0,
//         0,
//         canvas.width,
//         canvas.height
//     );

//     return new Promise((resolve, reject) => {
//         canvas.toBlob(blob => {
//             if (!blob) {
//                 reject(new Error('Canvas is empty'));
//                 return;
//             }
//             blob.name = fileName;
//             resolve(blob);
//         }, 'image/jpeg', 0.95); 
//     });
// }


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
    
//     const [editingBio, setEditingBio] = useState('');
//     const [isEditing, setIsEditing] = useState(false);

//     const [imgSrcForCropper, setImgSrcForCropper] = useState('');
//     const imgRef = useRef(null);
//     const [crop, setCrop] = useState();
//     const [completedCrop, setCompletedCrop] = useState(null);
//     const [originalFile, setOriginalFile] = useState(null);
    
//     const [sortOption, setSortOption] = useState('date_of_recommendation'); 
//     const [loading, setLoading] = useState(true);
//     const [saving, setSaving] = useState(false);
//     const [error, setError] = useState(null);

//     const ASPECT_RATIO = 1;
//     const MIN_DIMENSION = 150;

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
//                 headers: { "Content-Type": "application/json" },
//                  body: JSON.stringify({ email: user.primaryEmailAddress?.emailAddress, user_id: user.id }),
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
//             setImgSrcForCropper('');
//             setCompletedCrop(null);
//             setOriginalFile(null);
//             setCrop(undefined);
//         } else {
//             setEditingBio(userBio || '');
//         }
//         setIsEditing(!isEditing);
//     };
    
//     const onImageLoad = (e) => {
//         const { width, height } = e.currentTarget;
//         const cropWidthInPercent = (MIN_DIMENSION / width) * 100;
//         const crop = makeAspectCrop(
//             { unit: '%', width: cropWidthInPercent },
//             ASPECT_RATIO,
//             width,
//             height
//         );
//         const centeredCrop = centerCrop(crop, width, height);
//         setCrop(centeredCrop);
//     };

//     const handleFileChange = (event) => {
//         const file = event.target.files[0];
//         if (file) {
//             setOriginalFile(file);
//             setCrop(undefined); 
//             const reader = new FileReader();
//             reader.addEventListener('load', () => {
//                 setImgSrcForCropper(reader.result?.toString() || '');
//             });
//             reader.readAsDataURL(file);
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
        
//         let fileToUpload = null;
//         if (completedCrop && imgRef.current && originalFile) {
//             try {
//                 const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop, originalFile.name);
//                 fileToUpload = new File([croppedImageBlob], originalFile.name, { type: croppedImageBlob.type });
//             } catch (cropError) {
//                 console.error("Error cropping image:", cropError);
//                 setError("Failed to crop image. Please try again.");
//                 setSaving(false);
//                 return;
//             }
//         }

//         if (fileToUpload) {
//             formData.append('profileImageFile', fileToUpload);
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
//             }
            
//             setImgSrcForCropper('');
//             setCompletedCrop(null);
//             setOriginalFile(null);
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
    
//     const onAvatarOrPreviewError = (e) => {
//         e.target.style.display = 'none'; 
//         const fallbackParent = e.target.closest('.profile-avatar-display-wrapper') || e.target.closest('.profile-avatar-cropper-wrapper');
//         if (fallbackParent) {
//             const fallbackIcon = fallbackParent.querySelector('.profile-avatar-icon-fallback, .profile-avatar-icon-editing');
//             if (fallbackIcon) {
//                 fallbackIcon.style.display = 'flex';
//             }
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
//                 <div className="profile-avatar-section">
//                     {isEditing ? (
//                         <div className="profile-avatar-cropper-wrapper">
//                             <input
//                                 type="file"
//                                 id="profileImageUploadInput"
//                                 style={{ display: 'none' }}
//                                 accept="image/*"
//                                 onChange={handleFileChange}
//                             />
//                             {!imgSrcForCropper && (
//                                 <div 
//                                     className="profile-avatar-container" 
//                                     onClick={() => document.getElementById('profileImageUploadInput')?.click()}
//                                     style={{ cursor: 'pointer' }}
//                                 >
//                                     {profileImage ? 
//                                         <img src={profileImage} alt="Current profile" className="profile-avatar-image" onError={onAvatarOrPreviewError}/> 
//                                         : <UserCircleIcon className="profile-avatar-icon profile-avatar-icon-fallback"/> 
//                                     }
//                                     <div className="profile-avatar-edit-overlay">
//                                         <CameraIcon style={{ width: '24px', height: '24px' }}/>
//                                     </div>
//                                 </div>
//                             )}
//                             {imgSrcForCropper && (
//                                 <div className="cropper-container">
//                                    <ReactCrop
//                                         crop={crop}
//                                         onChange={(pixelCrop, percentCrop) => setCrop(percentCrop)}
//                                         onComplete={(c) => setCompletedCrop(c)}
//                                         aspect={ASPECT_RATIO}
//                                         minWidth={MIN_DIMENSION}
//                                         minHeight={MIN_DIMENSION}
//                                         circularCrop={true}
//                                     >
//                                         <img
//                                             ref={imgRef}
//                                             src={imgSrcForCropper}
//                                             alt="Crop me"
//                                             onLoad={onImageLoad}
//                                             style={{ maxHeight: '300px' }}
//                                         />
//                                     </ReactCrop>
//                                     <button 
//                                         className="profile-change-photo-btn-cropper"
//                                         onClick={() => document.getElementById('profileImageUploadInput')?.click()}
//                                     >
//                                         <CameraIcon className="btn-icon"/> Change Photo
//                                     </button>
//                                 </div>
//                             )}
//                         </div>
//                     ) : (
//                         <div className="profile-avatar-display-wrapper profile-avatar-container">
//                             {profileImage ? (
//                                 <img 
//                                     src={profileImage} 
//                                     alt={profileUserData?.userName || user?.firstName || "User"} 
//                                     className="profile-avatar-image" 
//                                     onError={onAvatarOrPreviewError}
//                                 />
//                             ) : null}
//                             <UserCircleIcon 
//                                 className="profile-avatar-icon profile-avatar-icon-fallback" 
//                                 style={{ display: profileImage ? 'none' : 'flex' }}
//                             />
//                         </div>
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
//                         <textarea
//                             className="profile-bio-textarea"
//                             value={editingBio}
//                             onChange={(e) => setEditingBio(e.target.value)}
//                             placeholder="Tell us about yourself..."
//                             rows={3}
//                         />
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
