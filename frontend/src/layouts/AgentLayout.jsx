import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AgentLayout.css";

const AgentLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navLinks = [
    { to: "/agent/dashboard", label: "📦 Available Orders" },
    { to: "/agent/active", label: "🛵 Active Delivery" },
  ];

  return (
    <div className="agent-layout">
      <aside className="agent-sidebar">
        <div className="agent-sidebar__brand">
          <div className="agent-sidebar__brand-title">
            <Link to="/" className="main-layout__brand">
              FeedGrid
            </Link>
          </div>
          <div className="agent-sidebar__brand-sub">Delivery Agent</div>
        </div>

        <nav className="agent-sidebar__nav">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `agent-sidebar__nav-item ${
                  isActive ? "agent-sidebar__nav-item--active" : ""
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="agent-sidebar__footer">
          <div className="agent-sidebar__user-info">
            Signed in as{" "}
            <span className="agent-sidebar__user-name">{user?.name}</span>
          </div>
          <button className="agent-sidebar__logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="agent-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AgentLayout;
