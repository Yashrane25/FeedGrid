import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AdminLayout.css";

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navLinks = [
    { to: "/admin/dashboard", label: "📊 Dashboard" },
    { to: "/admin/restaurants", label: "🏪 Restaurants" },
    { to: "/admin/users", label: "👥 Users" },
  ];

  return (
    <div className="admin-wrapper">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-title">
            <Link to="/" className="main-layout__brand">
              FeedGrid
            </Link>
          </div>
          <div className="admin-brand-sub">Admin Panel</div>
        </div>

        <nav className="admin-nav">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                isActive
                  ? "admin-nav-item admin-nav-item-active"
                  : "admin-nav-item"
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-footer">
          <div className="admin-user-info">
            Signed in as <span className="admin-user-name">{user?.name}</span>
          </div>

          <button className="admin-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
