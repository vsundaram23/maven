// App.js
import React, { useEffect } from 'react';
import { Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
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
          <Route path="/providers/:id" element={<ServiceDetails />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/financial-services" element={<FinancialServices />} />
          <Route path="/auto-services" element={<AutoServices />} />
          <Route path="/repair-services" element={<ApplianceServices />} />
          <Route path="/cleaning-services" element={<CleaningServices />} />
          <Route path="/utilities" element={<UtilitiesServices />} />
          <Route path="/renovation-services" element={<RepairServices />} />
          <Route path="/outdoor-services" element={<OutdoorServices />} />
          <Route path="/moving-services" element={<MovingServices />} />
          <Route path="/trustcircles" element={<TrustCircles />} />
          <Route path="/search" element={<Search />} />
          <Route path="/provider/:id" element={<ProviderProfile />} />
          <Route path="/share-recommendation" element={<ShareRecommendation />} />
          <Route path="/user/:id/recommendations" element={<UserRecommendations />} />
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
// import React from 'react';
// import { Route, BrowserRouter as Router, Routes, Navigate } from 'react-router-dom';
// import Home from './pages/Home/Home';
// import Profile from './pages/Profile/Profile';
// import ServiceDetails from './pages/ServiceDetails/ServiceDetails';
// import Header from './components/Header/Header';
// import FinancialServices from './pages/FinancialServices/FinancialServices';
// import ApplianceServices from './pages/ApplianceServices/ApplianceServices';
// import CleaningServices from './pages/CleaningServices/CleaningServices';
// import UtilitiesServices from './pages/UtilitiesServices/UtilitiesServices';
// import RepairServices from './pages/RepairServices/RepairServices';
// import OutdoorServices from './pages/OutdoorServices/OutdoorServices';
// import MovingServices from './pages/MovingServices/MovingServices';
// import AuthPage from './pages/Auth/AuthPage';
// import TrustCircleSelection from './pages/Auth/TrustCircleSelection';
// import './styles/global.css';

// // Create a new AuthGuard component
// const AuthGuard = ({ children }) => {
//   const isAuthenticated = localStorage.getItem('token');
//   const hasTrustCircle = localStorage.getItem('trustCircle');

//   if (!isAuthenticated) {
//     return <Navigate to="/auth" replace />;
//   }

//   if (!hasTrustCircle) {
//     return <Navigate to="/select-circle" replace />;
//   }

//   return children;
// };

// // Create protected route wrapper
// const ProtectedRoute = ({ element }) => {
//   return <AuthGuard>{element}</AuthGuard>;
// };

// const App = () => {
//   return (
//     <Router>
//       <div className="App">
//         <Header />
//         <main>
//           <Routes>
//             {/* Auth routes */}
//             <Route path="/auth" element={<AuthPage />} />
//             <Route path="/select-circle" element={<TrustCircleSelection />} />

//             {/* Protected routes */}
//             <Route path="/" element={<ProtectedRoute element={<Home />} />} />
//             <Route path="/providers/:id" element={<ProtectedRoute element={<ServiceDetails />} />} />
//             <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />
//             <Route 
//               path="/financial-services" 
//               element={<ProtectedRoute element={<FinancialServices />} />} 
//             />
//             <Route path="/appliances" element={<ProtectedRoute element={<ApplianceServices />} />} />
//             <Route path="/cleaning" element={<ProtectedRoute element={<CleaningServices />} />} />
//             <Route path="/utilities" element={<ProtectedRoute element={<UtilitiesServices />} />} />
//             <Route path="/repairs" element={<ProtectedRoute element={<RepairServices />} />} />
//             <Route path="/outdoor" element={<ProtectedRoute element={<OutdoorServices />} />} />
//             <Route path="/moving" element={<ProtectedRoute element={<MovingServices />} />} />
//           </Routes>
//         </main>
//       </div>
//     </Router>
//   );
// };

// export default App;




// import React from 'react';
// import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
// import Home from './pages/Home/Home';
// import Profile from './pages/Profile/Profile';
// import ServiceDetails from './pages/ServiceDetails/ServiceDetails';
// import Header from './components/Header/Header';
// import FinancialServices from './pages/FinancialServices/FinancialServices';
// import './styles/global.css';

// const App = () => {
//   return (
//     <Router>
//       <div className="App">
//         <Header />
//         <main>
//           <Routes>
//             <Route path="/" element={<Home />} />
//             <Route path="/providers/:id" element={<ServiceDetails />} />
//             <Route path="/profile" element={<Profile />} />
//             <Route path="/financial-services" element={<FinancialServices />} />
//           </Routes>
//         </main>
//       </div>
//     </Router>
//   );
// };

// export default App;
