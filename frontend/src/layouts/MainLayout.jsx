import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import CartDrawer from "../components/CartDrawer";
import SocketStatus from "../components/SocketStatus";
import "./MainLayout.css";

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
      <nav className="main-layout__nav">
        <Link to="/" className="main-layout__brand">
          FeedGrid
        </Link>

        {/* Right side */}
        <div className="main-layout__nav-right">
          <Link to="/restaurants" className="main-layout__link">
            Restaurents
          </Link>

          {isAuthenticated && user.role === "restaurant_owner" && (
            <Link to="/owner/dashboard" className="main-layout__link">
              My Dashboard
            </Link>
          )}

          {isAuthenticated && user.role === "delivery_agent" && (
            <Link to="/agent/dashboard" className="main-layout__link">
              My Deliveries
            </Link>
          )}

          {isAuthenticated && user.role === "admin" && (
            <Link to="/admin/dashboard" className="main-layout__link">
              Admin Panel
            </Link>
          )}

          <SocketStatus />

          <button
            className="main-layout__cart-button"
            onClick={() => setIsCartOpen(true)}
          >
            🛒
            {totalItems > 0 && (
              <span className="main-layout__badge">{totalItems}</span>
            )}
          </button>

          {isAuthenticated ? (
            <>
              {user.role === "customer" && (
                <Link to="/my-orders" className="main-layout__nav-link">
                  My Orders
                </Link>
              )}

              <span className="main-layout__user-greeting">
                {user.name.split(" ")[0]}
              </span>

              <button
                className="main-layout__logout-button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="main-layout__link">
                Login
              </Link>

              <Link to="/register" className="main-layout__register-link">
                Register
              </Link>
            </>
          )}
        </div>
      </nav>

      <CartDrawer />

      <main className="main-layout__main">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
