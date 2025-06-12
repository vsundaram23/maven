// App.js
import React, { useEffect, useState } from "react";
import {
    Route,
    BrowserRouter as Router,
    Routes,
    useLocation,
} from "react-router-dom";
import { useUser, RedirectToSignIn } from "@clerk/clerk-react";
import Home from "./pages/Home/Home";
import Profile from "./pages/Profile/Profile";
import ServiceDetails from "./pages/ServiceDetails/ServiceDetails";
import Header from "./components/Header/Header";
import FinancialServices from "./pages/FinancialServices/FinancialServices";
import AutoServices from "./pages/AutoServices/AutoServices";
import ApplianceServices from "./pages/ApplianceServices/ApplianceServices";
import CleaningServices from "./pages/CleaningServices/CleaningServices";
import UtilitiesServices from "./pages/UtilitiesServices/UtilitiesServices";
import RepairServices from "./pages/RepairServices/RepairServices";
import OutdoorServices from "./pages/OutdoorServices/OutdoorServices";
import MovingServices from "./pages/MovingServices/MovingServices";
import TrustCircles from "./pages/TrustCircles/TrustCircles";
import Search from "./pages/Search/Search";
import ProviderProfile from "./pages/ServiceDetails/ProviderProfile";
import ShareRecommendation from "./pages/ShareRecommendation/ShareRecommendation";
import UserRecommendations from "./pages/UserRecommendations/UserRecommendations";
import CommunityProfile from "./pages/CommunityProfile/CommunityProfile";
import PublicProfile from "./pages/PublicProfile/PublicProfile";
import OnboardingModal from "./components/OnboardingModal/OnboardingModal";
import InvitePage from "./pages/InvitePage/InvitePage";
import PWAInterface from './pages/PWAInterface/PWAInterface';
import UsernameRedirector from "./pages/UsernameRedirector/UsernameRedirector";
import "./styles/global.css";
import "./App.css";

const API_URL = "https://api.seanag-recommendations.org:8080";
// const API_URL = "http://localhost:3000";

const ProtectedRoute = ({ children }) => {
    const { isSignedIn } = useUser();

    if (!isSignedIn) {
        return <RedirectToSignIn />;
    }

    return children;
};

const AppWrapper = () => {
    const location = useLocation();
    const { isLoaded, isSignedIn, user } = useUser();
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        // Add or remove body class for home page styling
        if (location.pathname === "/") {
            document.body.classList.add("home-page");
        } else {
            document.body.classList.remove("home-page");
        }
    }, [location.pathname]);

    useEffect(() => {
        const checkOnboardingStatus = async () => {
            if (!isLoaded || !isSignedIn || !user) return;

            try {
                // Add debug logging
                console.log(
                    "Checking onboarding status for:",
                    user.primaryEmailAddress?.emailAddress
                );

                const response = await fetch(
                    `${API_URL}/api/users/onboarding-status?email=${encodeURIComponent(
                        user.primaryEmailAddress?.emailAddress
                    )}`
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                // Add debug logging
                console.log("Onboarding status response:", data);

                // Be explicit about the boolean check
                if (data.hasCompletedOnboarding === false) {
                    setShowOnboarding(true);
                } else {
                    setShowOnboarding(false);
                }
            } catch (error) {
                console.error("Error checking onboarding status:", error);
                // Optionally show an error message to the user
            }
        };

        checkOnboardingStatus();
    }, [isLoaded, isSignedIn, user]);

    const handleOnboardingComplete = () => {
        setShowOnboarding(false);
    };

    return (
        <div className="App">
            <Header />
            <main>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/pwa" element={<PWAInterface />} />
                    <Route
                        path="/providers/:id"
                        element={
                            <ProtectedRoute>
                                <ServiceDetails />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <Profile />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/financial-services"
                        element={
                            <ProtectedRoute>
                                <FinancialServices />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/auto-services"
                        element={
                            <ProtectedRoute>
                                <AutoServices />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/repair-services"
                        element={
                            <ProtectedRoute>
                                <ApplianceServices />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/cleaning-services"
                        element={
                            <ProtectedRoute>
                                <CleaningServices />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/utilities"
                        element={
                            <ProtectedRoute>
                                <UtilitiesServices />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/renovation-services"
                        element={
                            <ProtectedRoute>
                                <RepairServices />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/outdoor-services"
                        element={
                            <ProtectedRoute>
                                <OutdoorServices />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/moving-services"
                        element={
                            <ProtectedRoute>
                                <MovingServices />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/trustcircles"
                        element={
                            <ProtectedRoute>
                                <TrustCircles />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/search"
                        element={
                            <ProtectedRoute>
                                <Search />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/provider/:id"
                        element={
                            <ProtectedRoute>
                                <ProviderProfile />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/share-recommendation"
                        element={
                            <ProtectedRoute>
                                <ShareRecommendation />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/user/:id/recommendations"
                        element={
                            <ProtectedRoute>
                                <UserRecommendations />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/community/:communityId"
                        element={
                            <ProtectedRoute>
                                <CommunityProfile />
                            </ProtectedRoute>
                        }
                    />
                    <Route 
                        path="/pro/:username" 
                        element={<PublicProfile 
                    />} />
                    <Route
                        path="/invite/:tokenString"
                        element={<InvitePage />}
                    />
                    {/* <Route
                        path="/pro/:username"
                        element={<UsernameRedirector />}
                    /> */}
                </Routes>
            </main>
            <OnboardingModal
                isOpen={showOnboarding}
                onComplete={handleOnboardingComplete}
                user={user}
            />
        </div>
    );
};

const App = () => (
    <Router>
        <AppWrapper />
    </Router>
);

export default App;
