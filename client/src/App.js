// App.js
import React, { useEffect } from 'react';
import { Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import { useUser, RedirectToSignIn } from '@clerk/clerk-react';
import Home from './pages/Home/Home';
import Profile from './pages/Profile/Profile';
import ServiceDetails from './pages/ServiceDetails/ServiceDetails';
import Header from './components/Header/Header';
import FinancialServices from './pages/FinancialServices/FinancialServices';
import AutoServices from './pages/AutoServices/AutoServices';
import ApplianceServices from './pages/ApplianceServices/ApplianceServices';
import CleaningServices from './pages/CleaningServices/CleaningServices';
import UtilitiesServices from './pages/UtilitiesServices/UtilitiesServices';
import RepairServices from './pages/RepairServices/RepairServices';
import OutdoorServices from './pages/OutdoorServices/OutdoorServices';
import MovingServices from './pages/MovingServices/MovingServices';
import TrustCircles from './pages/TrustCircles/TrustCircles';
import Search from './pages/Search/Search';
import ProviderProfile from './pages/ServiceDetails/ProviderProfile';
import ShareRecommendation from './pages/ShareRecommendation/ShareRecommendation';
import UserRecommendations from './pages/UserRecommendations/UserRecommendations';
import './styles/global.css';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { isSignedIn } = useUser();

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return children;
};

const AppWrapper = () => {
  const location = useLocation();

  useEffect(() => {
    // Add or remove body class for home page styling
    if (location.pathname === '/') {
      document.body.classList.add('home-page');
    } else {
      document.body.classList.remove('home-page');
    }
  }, [location.pathname]);

  return (
    <div className="App">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/providers/:id" element={<ProtectedRoute><ServiceDetails /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/financial-services" element={<ProtectedRoute><FinancialServices /></ProtectedRoute>} />
          <Route path="/auto-services" element={<ProtectedRoute><AutoServices /></ProtectedRoute>} />
          <Route path="/repair-services" element={<ProtectedRoute><RepairServices /></ProtectedRoute>} />
          <Route path="/cleaning-services" element={<ProtectedRoute><CleaningServices /></ProtectedRoute>} />
          <Route path="/utilities" element={<ProtectedRoute><UtilitiesServices /></ProtectedRoute>} />
          <Route path="/renovation-services" element={<ProtectedRoute><RepairServices /></ProtectedRoute>} />
          <Route path="/outdoor-services" element={<ProtectedRoute><OutdoorServices /></ProtectedRoute>} />
          <Route path="/moving-services" element={<ProtectedRoute><MovingServices /></ProtectedRoute>} />
          <Route path="/trustcircles" element={<ProtectedRoute><TrustCircles /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
          <Route path="/provider/:id" element={<ProtectedRoute><ProviderProfile /></ProtectedRoute>} />
          <Route path="/share-recommendation" element={<ProtectedRoute><ShareRecommendation /></ProtectedRoute>} />
          <Route path="/user/:id/recommendations" element={<ProtectedRoute><UserRecommendations /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => (
  <Router>
    <AppWrapper />
  </Router>
);

export default App;