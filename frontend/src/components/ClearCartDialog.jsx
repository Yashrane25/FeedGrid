import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import CartDrawer from "../components/CartDrawer";
import "./clearCartDialog.css";

const MainLayout = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { totalItems, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div>
      <nav className="navbar">
        {/* Brand */}
        <Link to="/" className="brand">
          🍔 FeedGrid
        </Link>

        {/* Right side */}
        <div className="nav-right">
          <Link to="/restaurants" className="nav-link">
            Browse
          </Link>

          {/* Cart button */}
          <button className="cart-button" onClick={() => setIsCartOpen(true)}>
            🛒
            {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
          </button>

          {isAuthenticated ? (
            <>
              <span className="user-text">Hi, {user.name.split(" ")[0]}</span>

              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Login
              </Link>

              <Link to="/register" className="register-btn">
                Register
              </Link>
            </>
          )}
        </div>
      </nav>

      <CartDrawer />

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
