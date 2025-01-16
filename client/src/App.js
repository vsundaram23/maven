import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Home from './pages/Home/Home';
import Profile from './pages/Profile/Profile';
import ServiceDetails from './pages/ServiceDetails/ServiceDetails';
import Header from './components/Header/Header';
import FinancialServices from './pages/FinancialServices/FinancialServices';
import ApplianceServices from './pages/ApplianceServices/ApplianceServices';
import CleaningServices from './pages/CleaningServices/CleaningServices';
import UtilitiesServices from './pages/UtilitiesServices/UtilitiesServices';
import RepairServices from './pages/RepairServices/RepairServices';
import OutdoorServices from './pages/OutdoorServices/OutdoorServices';
import MovingServices from './pages/MovingServices/MovingServices';
import './styles/global.css';

const App = () => {
  return (
    <Router>
      <div className="App">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/providers/:id" element={<ServiceDetails />} />
            <Route path="/profile" element={<Profile />} />
            <Route 
              path="/financial-services" 
              element={<FinancialServices />} 
            />
            <Route path="/appliances" element={<ApplianceServices />} />
            <Route path="/cleaning" element={<CleaningServices />} />
            <Route path="/utilities" element={<UtilitiesServices />} />
            <Route path="/repairs" element={<RepairServices />} />
            <Route path="/outdoor" element={<OutdoorServices />} />
            <Route path="/moving" element={<MovingServices />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;



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
