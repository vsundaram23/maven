import React, { useEffect, useState, useMemo } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMediaQuery } from "react-responsive";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import {
    MapPinIcon,
    LockClosedIcon,
    XMarkIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import "./Home.css";

const API_URL = 'https://api.seanag-recommendations.org:8080';
// const API_URL = "http://localhost:3000";

const BRAND_PHRASE = "Tried & Trusted.";
const LOCKED_LOCATION = "Greater Seattle Area";

const Home = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const { openSignIn, openSignUp } = useClerk();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useMediaQuery({ maxWidth: 768 });

    const [name, setName] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showLocationModal, setShowLocationModal] = useState(false);

    const targetText = useMemo(() => {
        if (!isLoaded) return `Welcome to ${BRAND_PHRASE}`;
        if (!isSignedIn) return `Welcome to ${BRAND_PHRASE}`;
        return user?.firstName
            ? `Welcome back, ${user.firstName}.`
            : `Welcome to ${BRAND_PHRASE}`;
    }, [isLoaded, isSignedIn, user?.firstName]);

    const [displayText, setDisplayText] = useState("");
    const [isTyping, setIsTyping] = useState(true);

    useEffect(() => {
        setDisplayText("");
        setIsTyping(true);
    }, [targetText]);

    useEffect(() => {
        if (!isTyping || !targetText) {
            setIsTyping(false);
            return;
        }
        if (displayText.length < targetText.length) {
            const next = targetText.substring(0, displayText.length + 1);
            const t = setTimeout(() => {
                setDisplayText(next);
            }, 100);
            return () => clearTimeout(t);
        } else {
            setIsTyping(false);
        }
    }, [displayText, isTyping, targetText]);

    const [providerCount, setProviderCount] = useState(0);
    const [connectionCount, setConnectionCount] = useState(0);
    const recommenderRankDisplay = "N/A";

    useEffect(() => {
        if (!isLoaded) return;

        const fetchCounts = async () => {
            if (!isSignedIn || !user) {
                setProviderCount(0);
                setConnectionCount(0);
                return;
            }

            try {
                const params = new URLSearchParams({
                    user_id: user.id,
                    email: user.primaryEmailAddress?.emailAddress,
                    firstName: user.firstName || "",
                    lastName: user.lastName || "",
                });

                const providerRes = await fetch(
                    `${API_URL}/api/providers/count?${params.toString()}`
                );
                if (providerRes.ok) {
                    const providerData = await providerRes.json();
                    setProviderCount(providerData.count || 0);
                } else {
                    setProviderCount(0);
                }
            } catch (err) {
                console.error("Error fetching provider count:", err);
                setProviderCount(0);
            }

            if (user.primaryEmailAddress?.emailAddress) {
                try {
                    const connectionsResponse = await fetch(
                        `${API_URL}/api/connections/check-connections`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                email: user.primaryEmailAddress.emailAddress,
                                user_id: user.id,
                            }),
                        }
                    );
                    if (connectionsResponse.ok) {
                        const connectionsData =
                            await connectionsResponse.json();
                        const uniqueConnections = Array.isArray(connectionsData)
                            ? Array.from(
                                  new Set(connectionsData.map((u) => u.email))
                              )
                            : [];
                        setConnectionCount(uniqueConnections.length);
                    } else {
                        setConnectionCount(0);
                    }
                } catch (err) {
                    console.error("Error fetching connections:", err);
                    setConnectionCount(0);
                }
            }
        };

        fetchCounts();
    }, [isLoaded, isSignedIn, user]);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        const q = searchQuery.trim();
        if (!q) return;

        if (!isLoaded) {
            alert("Session still loading, please try again in a moment.");
            return;
        }

        if (!isSignedIn) {
            openSignIn();
            setIsSearching(false);
            return;
        }

        setIsSearching(true);

        try {
            const params = new URLSearchParams({
                q: q,
                user_id: user.id,
                email: user.primaryEmailAddress?.emailAddress,
                location: LOCKED_LOCATION,
            });
            const searchUrl = `${API_URL}/api/providers/search?${params.toString()}`;
            const response = await fetch(searchUrl);
            const responseBody = await response.text();

            if (!response.ok) {
                let errorPayload;
                try {
                    errorPayload = JSON.parse(responseBody);
                } catch (parseError) {
                    throw new Error(
                        `HTTP error! status: ${response.status}, Non-JSON response: ${responseBody}`
                    );
                }
                throw new Error(
                    errorPayload.message ||
                        errorPayload.error ||
                        `HTTP error! status: ${response.status}`
                );
            }

            const d = JSON.parse(responseBody);

            if (d.success) {
                const base = `/search?q=${encodeURIComponent(
                    q
                )}&location=${encodeURIComponent(LOCKED_LOCATION)}`;
                navigate(
                    d.providers?.length > 0 ? base : base + "&noResults=true",
                    {
                        state: {
                            initialProviders: d.providers,
                            currentSearchUserId: user.id,
                        },
                    }
                );
            } else {
                throw new Error(
                    d.message ||
                        d.error ||
                        "Search was not successful according to API response"
                );
            }
        } catch (err) {
            console.error("Search error:", err);
            alert(
                `Search failed: ${err.message}. Please check the console for more details.`
            );
        } finally {
            setIsSearching(false);
        }
    };

    const triggerLoginModal = () => {
        openSignIn();
    };

    const triggerSignUpModal = () => {
        openSignUp();
    };

    const handleLocationClick = () => {
        setShowLocationModal(true);
    };

    if (location.pathname !== "/") return null;

    const highlightTarget = name || BRAND_PHRASE;

    return (
        <div className="home">
            <div className="hero-container">
                <motion.h1
                    className="main-title"
                    key={targetText}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    dangerouslySetInnerHTML={{
                        __html:
                            displayText &&
                            highlightTarget &&
                            displayText.includes(highlightTarget)
                                ? displayText.replace(
                                      highlightTarget,
                                      `<span class="highlight-box">${highlightTarget}</span>`
                                  )
                                : displayText,
                    }}
                />
                <p className="subtitle">
                    Find trusted recommendations from&nbsp;
                    <span className="underline-highlight">your network.</span>
                </p>
                <form className="search-form-wrapper" onSubmit={handleSearch}>
                    <div className="search-input-group">
                        <input
                            className="main-search-input"
                            type="text"
                            placeholder={
                                isMobile
                                    ? "Search services..."
                                    : "Search for home services, financial advisors..."
                            }
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            disabled={isSearching}
                        />
                        <div
                            className="location-input-wrapper"
                            onClick={handleLocationClick}
                        >
                            <MapPinIcon className="location-icon" />
                            <span className="location-text">
                                {LOCKED_LOCATION}
                            </span>
                            <LockClosedIcon className="location-lock-icon" />
                        </div>
                        <button
                            type="submit"
                            className="search-submit-button"
                            disabled={isSearching}
                        >
                            {isSearching ? (
                                <span className="search-spinner"></span>
                            ) : (
                                <MagnifyingGlassIcon className="search-button-icon" />
                            )}
                        </button>
                    </div>
                </form>
            </div>
            <div className="yc-stats">
                <div
                    className="stat clickable-stat"
                    onClick={() => {
                        if (isSignedIn) {
                            navigate("/trustcircles?tab=myRecommendations");
                        } else {
                            openSignIn();
                        }
                    }}
                >
                    <p className="number">
                        <CountUp
                            end={providerCount || 0}
                            duration={2}
                            separator=","
                        />
                    </p>
                    <p className="label">
                        Recommendations
                        <br />
                        shared with you
                    </p>
                </div>
                <div
                    className="stat clickable-stat"
                    onClick={() => {
                        if (isSignedIn) {
                             navigate("/trustcircles?tab=myTrust");
                        } else {
                            openSignIn();
                        }
                    }}
                >
                    {/* <p className="number">
                        <CountUp end={connectionCount || 0} duration={2} />
                    </p>
                    <p className="label">
                        People in Your
                        <br />
                        Trust Circle
                    </p> */}
                </div>
            </div>
            {/* {isSignedIn && (
                <motion.div
                    className="network-cta"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.2, duration: 0.6 }}
                >
                    <p>
                        Want even more recommendations? Invite friends to unlock
                        new insights!
                    </p>
                    <button
                        onClick={() => navigate("/trustcircles")}
                        className="primary-button"
                    >
                        Grow Your Trust Circle
                    </button>
                </motion.div>
            )} */}
            {isSignedIn && (
                <motion.div
                    className="network-cta"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.2, duration: 0.6 }}
                >
                    <p>
                        Want more recommendations?{' '}
                        <span className="cta-link" onClick={() => navigate('/trustcircles')}>
                            Invite friends
                        </span>{' '}
                        to grow your Trust Circle.
                    </p>
                </motion.div>
            )}

            {showLocationModal && (
                <div className="location-modal-overlay">
                    <div className="location-modal-content">
                        <button
                            className="location-modal-close"
                            onClick={() => setShowLocationModal(false)}
                        >
                            <XMarkIcon />
                        </button>
                        <h3>Expanding Our Horizons!</h3>
                        <p>
                            We're currently focused on serving the{" "}
                            <strong>Greater Seattle Area</strong>.
                        </p>
                        <p>
                            We're working hard to expand and will be launching
                            nationally soon. Stay tuned!
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;

// good 5/26
// import React, { useEffect, useState, useMemo } from "react";
// import { useUser, useClerk } from "@clerk/clerk-react";
// import { useNavigate, useLocation } from "react-router-dom";
// import { useMediaQuery } from "react-responsive";
// import { motion } from "framer-motion";
// import CountUp from "react-countup";
// import {
//     MapPinIcon,
//     LockClosedIcon,
//     XMarkIcon,
//     MagnifyingGlassIcon,
// } from "@heroicons/react/24/solid";
// import "./Home.css";

// const API_URL = 'https://api.seanag-recommendations.org:8080';
// // const API_URL = "http://localhost:5000";
// // const API_URL = "http://localhost:3000";

// const BRAND_PHRASE = "Tried & Trusted.";
// const LOCKED_LOCATION = "Greater Seattle Area";

// const Home = () => {
//     const { isLoaded, isSignedIn, user } = useUser();
//     const { openSignIn, openSignUp } = useClerk();
//     const navigate = useNavigate(); // Already imported, great!
//     const location = useLocation();
//     const isMobile = useMediaQuery({ maxWidth: 768 });

//     const [name, setName] = useState("");
//     const [isSearching, setIsSearching] = useState(false);
//     const [searchQuery, setSearchQuery] = useState("");
//     const [showLocationModal, setShowLocationModal] = useState(false);

//     const targetText = useMemo(() => {
//         if (!isLoaded) return `Welcome to ${BRAND_PHRASE}`;
//         if (!isSignedIn) return `Welcome to ${BRAND_PHRASE}`;
//         return user?.firstName
//             ? `Welcome back, ${user.firstName}.`
//             : `Welcome to ${BRAND_PHRASE}`;
//     }, [isLoaded, isSignedIn, user?.firstName]);

//     const [displayText, setDisplayText] = useState("");
//     const [isTyping, setIsTyping] = useState(true);

//     useEffect(() => {
//         setDisplayText("");
//         setIsTyping(true);
//     }, [targetText]);

//     useEffect(() => {
//         if (!isTyping || !targetText) {
//             setIsTyping(false);
//             return;
//         }
//         if (displayText.length < targetText.length) {
//             const next = targetText.substring(0, displayText.length + 1);
//             const t = setTimeout(() => {
//                 setDisplayText(next);
//             }, 100);
//             return () => clearTimeout(t);
//         } else {
//             setIsTyping(false);
//         }
//     }, [displayText, isTyping, targetText]);

//     const [providerCount, setProviderCount] = useState(0);
//     const [connectionCount, setConnectionCount] = useState(0);
//     const recommenderRankDisplay = "N/A";

//     useEffect(() => {
//         if (!isLoaded) return;

//         const fetchCounts = async () => {
//             if (!isSignedIn || !user) {
//                 setProviderCount(0);
//                 setConnectionCount(0);
//                 return;
//             }

//             // Fetch provider count
//             try {
//                 const params = new URLSearchParams({
//                     user_id: user.id,
//                     email: user.primaryEmailAddress?.emailAddress,
//                     firstName: user.firstName || "",
//                     lastName: user.lastName || "",
//                 });

//                 const providerRes = await fetch(
//                     `${API_URL}/api/providers/count?${params.toString()}`
//                 );
//                 if (providerRes.ok) {
//                     const providerData = await providerRes.json();
//                     setProviderCount(providerData.count || 0);
//                 } else {
//                     setProviderCount(0);
//                 }
//             } catch (err) {
//                 console.error("Error fetching provider count:", err);
//                 setProviderCount(0);
//             }

//             // Fetch connection count
//             if (user.primaryEmailAddress?.emailAddress) {
//                 try {
//                     const connectionsResponse = await fetch(
//                         `${API_URL}/api/connections/check-connections`,
//                         {
//                             method: "POST",
//                             headers: { "Content-Type": "application/json" },
//                             body: JSON.stringify({
//                                 email: user.primaryEmailAddress.emailAddress,
//                                 user_id: user.id,
//                             }),
//                         }
//                     );
//                     if (connectionsResponse.ok) {
//                         const connectionsData =
//                             await connectionsResponse.json();
//                         const uniqueConnections = Array.isArray(connectionsData)
//                             ? Array.from(
//                                   new Set(connectionsData.map((u) => u.email))
//                               )
//                             : [];
//                         setConnectionCount(uniqueConnections.length);
//                     } else {
//                         setConnectionCount(0);
//                     }
//                 } catch (err) {
//                     console.error("Error fetching connections:", err);
//                     setConnectionCount(0);
//                 }
//             }
//         };

//         fetchCounts();
//     }, [isLoaded, isSignedIn, user]);

//     const handleSearch = async (e) => {
//         if (e) e.preventDefault();
//         const q = searchQuery.trim();
//         if (!q) return;

//         if (!isLoaded) {
//             alert("Session still loading, please try again in a moment.");
//             return;
//         }

//         if (!isSignedIn) {
//             openSignIn();
//             setIsSearching(false);
//             return;
//         }

//         setIsSearching(true);

//         try {
//             const params = new URLSearchParams({
//                 q: q,
//                 user_id: user.id,
//                 email: user.primaryEmailAddress?.emailAddress,
//                 location: LOCKED_LOCATION,
//             });
//             const searchUrl = `${API_URL}/api/providers/search?${params.toString()}`;
//             const response = await fetch(searchUrl);
//             const responseBody = await response.text();

//             if (!response.ok) {
//                 let errorPayload;
//                 try {
//                     errorPayload = JSON.parse(responseBody);
//                 } catch (parseError) {
//                     throw new Error(
//                         `HTTP error! status: ${response.status}, Non-JSON response: ${responseBody}`
//                     );
//                 }
//                 throw new Error(
//                     errorPayload.message ||
//                         errorPayload.error ||
//                         `HTTP error! status: ${response.status}`
//                 );
//             }

//             const d = JSON.parse(responseBody);

//             if (d.success) {
//                 const base = `/search?q=${encodeURIComponent(
//                     q
//                 )}&location=${encodeURIComponent(LOCKED_LOCATION)}`;
//                 navigate(
//                     d.providers?.length > 0 ? base : base + "&noResults=true",
//                     {
//                         state: {
//                             initialProviders: d.providers,
//                             currentSearchUserId: user.id,
//                         },
//                     }
//                 );
//             } else {
//                 throw new Error(
//                     d.message ||
//                         d.error ||
//                         "Search was not successful according to API response"
//                 );
//             }
//         } catch (err) {
//             console.error("Search error:", err);
//             alert(
//                 `Search failed: ${err.message}. Please check the console for more details.`
//             );
//         } finally {
//             setIsSearching(false);
//         }
//     };

//     const triggerLoginModal = () => {
//         openSignIn();
//     };

//     const triggerSignUpModal = () => {
//         openSignUp();
//     };

//     const handleLocationClick = () => {
//         setShowLocationModal(true);
//     };

//     if (location.pathname !== "/") return null;

//     const highlightTarget = name || BRAND_PHRASE;

//     return (
//         <div className="home">
//             <div className="hero-container">
//                 <motion.h1
//                     className="main-title"
//                     key={targetText}
//                     initial={{ opacity: 0, y: 20 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     transition={{ delay: 0.4, duration: 0.6 }}
//                     dangerouslySetInnerHTML={{
//                         __html:
//                             displayText &&
//                             highlightTarget &&
//                             displayText.includes(highlightTarget)
//                                 ? displayText.replace(
//                                       highlightTarget,
//                                       `<span class="highlight-box">${highlightTarget}</span>`
//                                   )
//                                 : displayText,
//                     }}
//                 />
//                 <p className="subtitle">
//                     Find trusted recommendations from&nbsp;
//                     <span className="underline-highlight">your network.</span>
//                 </p>
//                 <form className="search-form-wrapper" onSubmit={handleSearch}>
//                     <div className="search-input-group">
//                         <input
//                             className="main-search-input"
//                             type="text"
//                             placeholder={
//                                 isMobile
//                                     ? "Search services..."
//                                     : "Search for home services, financial advisors..."
//                             }
//                             value={searchQuery}
//                             onChange={(e) => setSearchQuery(e.target.value)}
//                             disabled={isSearching}
//                         />
//                         <div
//                             className="location-input-wrapper"
//                             onClick={handleLocationClick}
//                         >
//                             <MapPinIcon className="location-icon" />
//                             <span className="location-text">
//                                 {LOCKED_LOCATION}
//                             </span>
//                             <LockClosedIcon className="location-lock-icon" />
//                         </div>
//                         <button
//                             type="submit"
//                             className="search-submit-button"
//                             disabled={isSearching}
//                         >
//                             {isSearching ? (
//                                 <span className="search-spinner"></span>
//                             ) : (
//                                 <MagnifyingGlassIcon className="search-button-icon" />
//                             )}
//                         </button>
//                     </div>
//                 </form>
//                 <motion.div
//                     className="recommender-banner"
//                     initial={{ opacity: 0, y: 10 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     transition={{ delay: 1.2, duration: 0.6 }}
//                 >
//                     {isSignedIn ? (
//                         providerCount > 0 ? (
//                             <span
//                                 className="auth-link"
//                                 onClick={() => navigate("/trustcircles?tab=myRecommendations")}
//                             >
//                                 View the recommendations shared with you! →
//                             </span>
//                         ) : (
//                             <>
//                                 Add your first recommendation to unlock your Trust Circle rank!
//                             </>
//                         )
//                     ) : (
//                         <>
//                             Unlock trusted recommendations.&nbsp;
//                             <span onClick={triggerSignUpModal} className="auth-link">
//                                 Sign Up
//                             </span>
//                             &nbsp;or&nbsp;
//                             <span onClick={triggerLoginModal} className="auth-link">
//                                 Log In
//                             </span>
//                             .
//                         </>
//                     )}
//                 </motion.div>
//             </div>
//             <div className="yc-stats">
//                 {/* MODIFICATION START: Make this stat block clickable */}
//                 <div
//                     className="stat clickable-stat" // Added a class for potential styling
//                     onClick={() => {
//                         if (isSignedIn) { // Optional: only navigate if signed in
//                             navigate("/trustcircles?tab=myRecommendations");
//                         } else {
//                             openSignIn(); // Or prompt to sign in
//                         }
//                     }}
//                     style={{ cursor: "pointer" }} // Added inline style for cursor
//                 >
//                     <p className="number">
//                         <CountUp
//                             end={providerCount || 0}
//                             duration={2}
//                             separator=","
//                         />
//                     </p>
//                     <p className="label">
//                         Recommendations
//                         <br />
//                         shared with you
//                     </p>
//                 </div>
//                 {/* MODIFICATION END */}

//                 {/* <div className="stat">
//                     <p className="number">{recommenderRankDisplay}</p>
//                     <p className="label">
//                         Your Recommender
//                         <br />
//                         Rank
//                     </p>
//                 </div> */}

//                 {/* MODIFICATION START: Make this stat block clickable */}
//                 <div
//                     className="stat clickable-stat" // Added a class for potential styling
//                     onClick={() => {
//                         if (isSignedIn) { // Optional: only navigate if signed in
//                              navigate("/trustcircles?tab=myTrust");
//                         } else {
//                             openSignIn(); // Or prompt to sign in
//                         }
//                     }}
//                     style={{ cursor: "pointer" }} // Added inline style for cursor
//                 >
//                     <p className="number">
//                         <CountUp end={connectionCount || 0} duration={2} />
//                     </p>
//                     <p className="label">
//                         People in Your
//                         <br />
//                         Trust Circle
//                     </p>
//                 </div>
//                 {/* MODIFICATION END */}
//             </div>
//             {isSignedIn && (
//                 <motion.div
//                     className="network-cta"
//                     initial={{ opacity: 0, y: 20 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     transition={{ delay: 2.2, duration: 0.6 }}
//                 >
//                     <p>
//                         Want even more recommendations? Invite friends to unlock
//                         new insights!
//                     </p>
//                     <button
//                         onClick={() => navigate("/trustcircles")}
//                         className="primary-button"
//                     >
//                         Grow Your Trust Circle
//                     </button>
//                 </motion.div>
//             )}

//             {showLocationModal && (
//                 <div className="location-modal-overlay">
//                     <div className="location-modal-content">
//                         <button
//                             className="location-modal-close"
//                             onClick={() => setShowLocationModal(false)}
//                         >
//                             <XMarkIcon />
//                         </button>
//                         <h3>Expanding Our Horizons!</h3>
//                         <p>
//                             We're currently focused on serving the{" "}
//                             <strong>Greater Seattle Area</strong>.
//                         </p>
//                         <p>
//                             We're working hard to expand and will be launching
//                             nationally soon. Stay tuned!
//                         </p>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default Home;