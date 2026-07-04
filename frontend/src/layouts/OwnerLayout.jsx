import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./OwnerLayout.css";

const OwnerLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navLinks = [
    { to: "/owner/dashboard", label: "🏠 Dashboard" },
    { to: "/owner/orders", label: "📦 Orders" },
    { to: "/owner/restaurants/new", label: "➕ New Restaurant" },
  ];

  return (
    <div className="owner-layout">
      {/* Sidebar */}
      <aside className="owner-layout__sidebar">
        <div className="owner-layout__brand">
          <div className="owner-layout__brand-title">
            <Link to="/" className="main-layout__brand">
              FeedGrid
            </Link>
          </div>
          <div className="owner-layout__brand-subtitle">Owner Dashboard</div>
        </div>

        <nav className="owner-layout__nav">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `owner-layout__nav-item ${
                  isActive ? "owner-layout__nav-item--active" : ""
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="owner-layout__footer">
          <div className="owner-layout__user-info">
            Signed in as{" "}
            <span className="owner-layout__user-name">{user?.name}</span>
          </div>

          <button className="owner-layout__logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="owner-layout__main">
        <Outlet />
      </main>
    </div>
  );
};

export default OwnerLayout;
