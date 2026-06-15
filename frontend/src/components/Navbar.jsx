import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import "./Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      {/* Logo */}
      <Link to="/" className="navbar-logo">
        🍽️ FeedGrid
      </Link>

      {/* Right side links */}
      <div className="navbar-links">
        {user ? (
          <>
            {/* Role-specific nav links */}
            {user.role === "customer" && (
              <>
                <Link to="/" className="nav-link">
                  Restaurants
                </Link>

                <Link to="/orders" className="nav-link">
                  Orders
                </Link>

                {/* Cart with item count badge */}
                <Link to="/cart" className="cart-link">
                  <span className="cart-icon">🛒</span>

                  {totalItems > 0 && (
                    <span className="cart-badge">{totalItems}</span>
                  )}
                </Link>
              </>
            )}

            {user.role === "restaurant_owner" && (
              <Link to="/dashboard" className="nav-link">
                Dashboard
              </Link>
            )}

            {/* User greeting + logout */}
            <div className="user-section">
              <span className="user-greeting">
                {user.name?.split(" ")[0] || "User"}
              </span>

              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">
              Login
            </Link>

            <Link to="/register" className="signup-btn">
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
