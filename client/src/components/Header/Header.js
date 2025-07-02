import {
    SignInButton,
    useClerk,
    useUser
} from "@clerk/clerk-react";
import React, { useEffect, useRef, useState } from "react";
import { FaCaretDown, FaUsers } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import "./Header.css";

const API_URL = "https://api.seanag-recommendations.org:8080";
// const API_URL = "http://localhost:5000";

const ProfileAvatar = ({ email }) => {
    const getInitials = () =>
        email ? email.split('@')[0].charAt(0).toUpperCase() : '?';

    return (
        <div
            style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-blue)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 'bold',
            }}
        >
            {getInitials()}
        </div>
    );
};

const Header = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const { openSignIn, signOut, openUserProfile } = useClerk();
    const navigate = useNavigate();
    const [showAddRecommendationModal, setShowAddRecommendationModal] =
        useState(false);
    const [showExplore, setShowExplore] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const mobileMenuRef = useRef(null);
    const exploreRef = useRef(null);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const profileDropdownRef = useRef(null);

    const [recommendationForm, setRecommendationForm] = useState({
        business_name: "",
        email: "",
        phone_number: "",
        category: "",
        subcategory: "",
        description: "",
        notes: "",
        user_email: "",
    });

    useEffect(() => {
        if (isSignedIn && user?.primaryEmailAddress?.emailAddress) {
            setRecommendationForm(prevForm => ({
                ...prevForm,
                user_email: user.primaryEmailAddress.emailAddress
            }));
        } else {
             setRecommendationForm(prevForm => ({
                ...prevForm,
                user_email: ""
            }));
        }
    }, [isSignedIn, user]);

    const categories = {
        "Home Services": [
            { name: "Appliances", backend: "Appliance Services" },
            { name: "Cleaning", backend: "Cleaning and Upkeep" },
            { name: "Utilities", backend: "Utilities" },
            { name: "Repairs", backend: "Structural Repairs" },
            { name: "Outdoor", backend: "Outdoor Services" },
            { name: "Moving and Misc", backend: "Moving and Misc" },
        ],
        "Financial Services": [
            { name: "Tax Preparation", backend: "Tax Preparation" },
            { name: "Financial Planning", backend: "Financial Planning" },
        ],
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showProfileDropdown &&
                profileDropdownRef.current &&
                !profileDropdownRef.current.contains(event.target)
            ) {
                setShowProfileDropdown(false);
            }

            if (showExplore &&
                exploreRef.current &&
                !exploreRef.current.contains(event.target)
            ) {
                setShowExplore(false);
            }

            if (isMobileMenuOpen &&
                mobileMenuRef.current &&
                !mobileMenuRef.current.contains(event.target) &&
                !event.target.closest(".mobile-menu-button") &&
                !event.target.closest(".profile-avatar-dropdown-trigger")
            ) {
                setIsMobileMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isMobileMenuOpen, showProfileDropdown, showExplore]);

    const toggleExplore = (e) => {
        e.preventDefault();
        setShowExplore((v) => !v);
        setShowProfileDropdown(false);
        // Do not close mobile menu when opening explore from within it
    };

    const homeServices = [
        { name: "Repair Services", slug: "repair-services" },
        { name: "Cleaning Services", slug: "cleaning-services" },
        { name: "Home Renovation", slug: "renovation-services" },
        { name: "Outdoor Services", slug: "outdoor-services" },
        { name: "Moving Services", slug: "moving-services" },
    ];

    const otherServices = [
        { name: "Financial Services", slug: "financial-services" },
        { name: "Auto Services", slug: "auto-services" },
    ];

    const handleMobileMenuToggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsMobileMenuOpen((v) => !v);
        setShowExplore(false);
        setShowProfileDropdown(false);
    };

    const handleNavLinkClick = () => {
        setIsMobileMenuOpen(false);
        setShowExplore(false);
        setShowProfileDropdown(false);
    };

    const handleProfileAvatarClick = (e) => {
        e.stopPropagation(); // Prevent click from bubbling to document if mobile menu is open,
                             // though the refined handleClickOutside should handle it.
        setShowProfileDropdown(v => !v);
        setShowExplore(false);
        // Do not close mobile menu here; let `handleNavLinkClick` or `handleClickOutside` handle it if necessary.
    };


    const handleRecommendationSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/api/recommendations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(recommendationForm),
            });
            if (!response.ok) throw new Error("Failed to add recommendation");
            setShowAddRecommendationModal(false);
            setRecommendationForm({
                business_name: "",
                email: "",
                phone_number: "",
                category: "",
                subcategory: "",
                description: "",
                notes: "",
                user_email: user?.primaryEmailAddress?.emailAddress,
            });
        } catch (error) {
            console.error("Error adding recommendation:", error);
        }
    };

    const handleTrustCircleClick = (e) => {
        e.preventDefault();
        if (!isSignedIn) {
            openSignIn({
                redirectUrl: "/trustcircles",
            });
            return;
        }
        handleNavLinkClick(); // Close mobile menu if open
        navigate("/trustcircles");
    };

    const handleProfileLinkClick = (e) => {
        e.preventDefault();
        handleNavLinkClick();
        navigate('/profile');
    };

    const handleLogoutLinkClick = async (e) => {
        e.preventDefault();
        const wasMobileMenuOpen = isMobileMenuOpen;
        handleNavLinkClick();
        if (wasMobileMenuOpen) {
             // Ensure menu is visually closed before Clerk's redirect might interfere
            setTimeout(async () => {
                await signOut({ redirectUrl: '/' });
            }, 50); // Small delay for UI update
        } else {
            await signOut({ redirectUrl: '/' });
        }
    };


    return (
        <header className="header">
            <div className="header-content">
                <Link to="/" className="logo" onClick={handleNavLinkClick}>
                    Tried & Trusted
                </Link>

                <button
                    className="mobile-menu-button"
                    onClick={handleMobileMenuToggle}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <nav
                    className={`nav-links ${
                        isMobileMenuOpen ? "mobile-open" : ""
                    }`}
                    ref={mobileMenuRef}
                >
                    <div className="nav-item explore" ref={exploreRef}>
                        <button
                            className="nav-link btn-explore"
                            onClick={toggleExplore}
                        >
                            Explore{" "}
                            <FaCaretDown
                                className={`caret ${showExplore ? "open" : ""}`}
                            />
                        </button>
                        {showExplore && (
                            <div className="explore-panel">
                                <div className="panel-column">
                                    <h4>Home Services</h4>
                                    {homeServices.map((item) => (
                                        <Link
                                            key={item.slug}
                                            to={`/${item.slug}`}
                                            className="panel-link"
                                            onClick={handleNavLinkClick}
                                        >
                                            {item.name}
                                        </Link>
                                    ))}
                                </div>

                                <div className="panel-column">
                                    <h4>Other Services</h4>
                                    {otherServices.map((item) => (
                                        <Link
                                            key={item.slug}
                                            to={`/${item.slug}`}
                                            className="panel-link"
                                            onClick={handleNavLinkClick}
                                        >
                                            {item.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <a
                        href="/trustcircles" // Changed to <a> for direct href handling if needed,
                                             // but onClick handles logic
                        className="nav-link my-trust-circle-link"
                        onClick={handleTrustCircleClick}
                    >
                        <FaUsers style={{ marginRight: "6px" }} /> My Trust
                        Circle
                    </a>

                    {isSignedIn ? (
                        <Link
                            to="/share-recommendation"
                            className="add-recommendation-button styled-button"
                            onClick={handleNavLinkClick}
                        >
                            Add Recommendation
                        </Link>
                    ) : (
                        <SignInButton mode="modal">
                            <button className="add-recommendation-button styled-button">
                                Add Recommendation
                            </button>
                        </SignInButton>
                    )}

                    {isSignedIn && isLoaded ? (
                        <div className="profile-dropdown-wrapper" ref={profileDropdownRef}>
                            <div
                                className="profile-avatar-dropdown-trigger"
                                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginLeft: '10px' }}
                                onClick={handleProfileAvatarClick}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleProfileAvatarClick(e); }}
                            >
                                <ProfileAvatar email={user?.primaryEmailAddress?.emailAddress} />
                                <FaCaretDown style={{ color: 'var(--primary-blue)', marginLeft: '4px' }} />
                            </div>
                            {showProfileDropdown && (
                                <div className="dropdown-menu profile-dropdown-menu">
                                    <Link to="/profile" className="dropdown-item" onClick={handleProfileLinkClick}>
                                        My Profile
                                    </Link>
                                    <Link to="#" className="dropdown-item" onClick={handleLogoutLinkClick}>
                                        Logout
                                    </Link>
                                </div>
                            )}
                        </div>
                    ) : isLoaded ? (
                        <SignInButton mode="modal">
                            <button className="login-button nav-link">
                                Sign In
                            </button>
                        </SignInButton>
                    ) : null}
                </nav>
            </div>

            {showAddRecommendationModal && (
                <div
                    className="modal-overlay"
                    onClick={() => setShowAddRecommendationModal(false)}
                >
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="close-button"
                            onClick={() => setShowAddRecommendationModal(false)}
                        >
                            ×
                        </button>
                        <h2>Add New Recommendation</h2>
                        <form onSubmit={handleRecommendationSubmit}>
                            <input
                                type="text"
                                placeholder="Business Name"
                                value={recommendationForm.business_name}
                                onChange={(e) =>
                                    setRecommendationForm({
                                        ...recommendationForm,
                                        business_name: e.target.value,
                                    })
                                }
                                required
                            />
                            <input
                                type="email"
                                placeholder="Business Email"
                                value={recommendationForm.email}
                                onChange={(e) =>
                                    setRecommendationForm({
                                        ...recommendationForm,
                                        email: e.target.value,
                                    })
                                }
                                required
                            />
                            <input
                                type="tel"
                                placeholder="Phone Number"
                                value={recommendationForm.phone_number}
                                onChange={(e) =>
                                    setRecommendationForm({
                                        ...recommendationForm,
                                        phone_number: e.target.value,
                                    })
                                }
                                required
                            />
                            <textarea
                                placeholder="What did you think?"
                                value={recommendationForm.description}
                                onChange={(e) =>
                                    setRecommendationForm({
                                        ...recommendationForm,
                                        description: e.target.value,
                                    })
                                }
                            />
                            <select
                                value={recommendationForm.category}
                                onChange={(e) =>
                                    setRecommendationForm({
                                        ...recommendationForm,
                                        category: e.target.value,
                                        subcategory: "",
                                    })
                                }
                                required
                            >
                                <option value="">Select Category</option>
                                {Object.keys(categories).map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                            {recommendationForm.category && (
                                <select
                                    value={recommendationForm.subcategory}
                                    onChange={(e) =>
                                        setRecommendationForm({
                                            ...recommendationForm,
                                            subcategory: e.target.value,
                                        })
                                    }
                                    required
                                >
                                    <option value="">Select Subcategory</option>
                                    {categories[
                                        recommendationForm.category
                                    ].map((sub) => (
                                        <option
                                            key={sub.backend}
                                            value={sub.backend}
                                        >
                                            {sub.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <button type="submit">Submit Recommendation</button>
                        </form>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
