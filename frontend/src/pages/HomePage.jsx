// import { Link } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";
// import "./HomePage.css";

// const HomePage = () => {
//   const { isAuthenticated, user } = useAuth();

//   return (
//     <div className="home-page">
//       {/* Welcome back banner for logged-in users */}
//       {isAuthenticated && (
//         <div className="home-page__welcome-box">
//           👋 Welcome back, <strong>{user.name}</strong>!{" "}
//           <Link to="/restaurants" className="home-page__welcome-link">
//             Browse restaurants →
//           </Link>
//         </div>
//       )}

//       {/* Hero section */}
//       <div className="home-page__hero">
//         <h1 className="home-page__title">Hungry? 🍔</h1>

//         <p className="home-page__subtitle">
//           Order food from the best restaurants near you
//         </p>

//         <Link to="/restaurants" className="home-page__cta-button">
//           Order Now
//         </Link>
//       </div>

//       {/* Feature cards */}
//       <div className="home-page__features-grid">
//         <div className="home-page__feature-card">
//           <div className="home-page__feature-icon">🏪</div>

//           <div className="home-page__feature-title">100+ Restaurants</div>

//           <div className="home-page__feature-text">
//             Choose from a wide variety of cuisines
//           </div>
//         </div>

//         <div className="home-page__feature-card">
//           <div className="home-page__feature-icon">⚡</div>

//           <div className="home-page__feature-title">Fast Delivery</div>

//           <div className="home-page__feature-text">
//             Get your food delivered in 30 minutes
//           </div>
//         </div>

//         <div className="home-page__feature-card">
//           <div className="home-page__feature-icon">💳</div>

//           <div className="home-page__feature-title">Secure Payment</div>

//           <div className="home-page__feature-text">Pay safely with Stripe</div>
//         </div>

//         <div className="home-page__feature-card">
//           <div className="home-page__feature-icon">📍</div>

//           <div className="home-page__feature-title">Live Tracking</div>

//           <div className="home-page__feature-text">
//             Track your order in real time on a map
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default HomePage;

import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./HomePage.css";

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="home-page">
      {/* Welcome back banner for logged-in users */}
      {isAuthenticated && (
        <div className="home-page__welcome-box">
          👋 Welcome back, <strong>{user.name}</strong>!{" "}
          <Link to="/restaurants" className="home-page__welcome-link">
            Browse restaurants →
          </Link>
        </div>
      )}

      {/* Hero section */}
      <div className="home-page__hero">
        <h1 className="home-page__title">Hungry? 🍔</h1>

        <p className="home-page__subtitle">
          Order food from the best restaurants near you
        </p>

        <Link to="/restaurants" className="home-page__cta-button">
          Order Now
        </Link>
      </div>

      {/* Feature cards */}
      <div className="home-page__features-grid">
        <div className="home-page__feature-card">
          <div className="home-page__feature-icon">🏪</div>

          <div className="home-page__feature-title">100+ Restaurants</div>

          <div className="home-page__feature-text">
            Choose from a wide variety of cuisines
          </div>
        </div>

        <div className="home-page__feature-card">
          <div className="home-page__feature-icon">⚡</div>

          <div className="home-page__feature-title">Fast Delivery</div>

          <div className="home-page__feature-text">
            Get your food delivered in 30 minutes
          </div>
        </div>

        <div className="home-page__feature-card">
          <div className="home-page__feature-icon">💳</div>

          <div className="home-page__feature-title">Secure Payment</div>

          <div className="home-page__feature-text">Pay safely with Stripe</div>
        </div>

        <div className="home-page__feature-card">
          <div className="home-page__feature-icon">📍</div>

          <div className="home-page__feature-title">Live Tracking</div>

          <div className="home-page__feature-text">
            Track your order in real time on a map
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
