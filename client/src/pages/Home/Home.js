// Home.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const API_URL = 'https://api.seanag-recommendations.org:8080';


const Home = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/api/providers`)
      .then(res => res.json())
      .then(data => {
        setProviders(data.providers);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching providers:', err);
        setLoading(false);
      });
  }, []);

  const handleScroll = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth'
    });
  };

  return (
    <div className="home">
      <div className="hero-container">
        <div className="glass-card">
          <h1 className="title-animation">Seattle Nagarathar Recommendations</h1>
          <p className="subtitle-animation">Trusted recommendations from the Seattle Nagarathar Community.</p>
          <div className="scroll-indicator" onClick={handleScroll}>
            <span className="arrow"></span>
          </div>
        </div>

        <div className="service-container">
          {loading ? (
            <div className="loader"></div>
          ) : (
            <>
              <div 
                className="service-card" 
                onClick={() => navigate('/home-services')}
              >
                <div className="card-content">
                  <h2>Home Services</h2>
                  <p>Find vetted professionals for your home</p>
                </div>
                <div className="card-overlay"></div>
              </div>

              <div 
                className="service-card"
                onClick={() => navigate('/financial-services')}
              >
                <div className="card-content">
                  <h2>Financial Services</h2>
                  <p>Connect with trusted financial advisors</p>
                </div>
                <div className="card-overlay"></div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;


// import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import './Home.css';

// const Home = () => {
//   const [providers, setProviders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const navigate = useNavigate();

//   useEffect(() => {
//     fetch('http://localhost:3000/api/providers')
//       .then(res => res.json())
//       .then(data => {
//         setProviders(data.providers);
//         setLoading(false);
//       })
//       .catch(err => {
//         console.error('Error fetching providers:', err);
//         setLoading(false);
//       });
//   }, []);

//   return (
//     <div className="home">
//       <div className="hero-container">
//         <div className="glass-card">
//           <h1>Seattle Nagarathar Recommenations</h1>
//           <p>Trusted recommendations from the Seattle Nagarathar Community.</p>
//         </div>

//         <div className="service-container">
//           {loading ? (
//             <div>Loading...</div>
//           ) : (
//             <>
//               <div 
//                 className="service-card" 
//                 onClick={() => navigate('/home-services')}
//                 style={{ cursor: 'pointer' }}
//               >
//                 <div className="card-content">
//                   <h2>Home Services</h2>
//                   <p>Find vetted professionals for your home</p>
//                 </div>
//                 <div className="card-overlay"></div>
//               </div>

//               <div 
//                 className="service-card"
//                 onClick={() => navigate('/financial-services')}
//                 style={{ cursor: 'pointer' }}
//               >
//                 <div className="card-content">
//                   <h2>Financial Services</h2>
//                   <p>Connect with trusted financial advisors</p>
//                 </div>
//                 <div className="card-overlay"></div>
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Home;
