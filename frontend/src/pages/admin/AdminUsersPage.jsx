import { useState, useEffect, useCallback } from "react";
import {
  getAllUsers,
  toggleUserActive,
  updateUserRole,
} from "../../services/adminService";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import "./AdminUsersPage.css";

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [filters, setFilters] = useState({
    role: "",
    search: "",
    page: 1,
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: filters.page,
        limit: 15,
      };

      if (filters.role) {
        params.role = filters.role;
      }
      if (filters.search) {
        params.search = filters.search;
      }

      const data = await getAllUsers(params);

      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleActive = async (userId) => {
    setActionLoadingId(userId + "_active");

    try {
      const res = await toggleUserActive(userId);

      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, isActive: res.isActive } : u,
        ),
      );
    } catch (err) {
      alert(err.response?.data?.message || "Action failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (
      !window.confirm(
        `Change this user's role to "${newRole}"? They will need to log in again.`,
      )
    ) {
      return;
    }

    setActionLoadingId(userId + "_role");

    try {
      const res = await updateUserRole(userId, newRole);

      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: res.user.role } : u)),
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update role");
    } finally {
      setActionLoadingId(null);
    }
  };

  const roleColors = {
    customer: { bg: "#e3f2fd", color: "#1565c0" },
    restaurant_owner: {
      bg: "#e8f5e9",
      color: "#2e7d32",
    },
    delivery_agent: {
      bg: "#fff3e0",
      color: "#e65100",
    },
    admin: {
      bg: "#fce4ec",
      color: "#880e4f",
    },
  };

  return (
    <div className="admin-users-page">
      <h1 className="users-title">
        Users <span className="users-count">({total})</span>
      </h1>

      <div className="filter-bar">
        <input
          className="search-input"
          type="text"
          placeholder="Search by name or email..."
          value={filters.search}
          onChange={(e) =>
            setFilters((p) => ({
              ...p,
              search: e.target.value,
              page: 1,
            }))
          }
        />

        <select
          className="filter-select"
          value={filters.role}
          onChange={(e) =>
            setFilters((p) => ({
              ...p,
              role: e.target.value,
              page: 1,
            }))
          }
        >
          <option value="">All Roles</option>
          <option value="customer">Customers</option>
          <option value="restaurant_owner">Restaurant Owners</option>
          <option value="delivery_agent">Delivery Agents</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading users..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchUsers} />
      ) : (
        <>
          <div className="results-info">
            Showing {users.length} of {total} users
          </div>

          <div className="users-table">
            <div className="table-header">
              <span>User</span>
              <span>Role</span>
              <span>Change Role</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            {users.length === 0 ? (
              <div className="no-users">No users found</div>
            ) : (
              users.map((u) => {
                const rc = roleColors[u.role] || roleColors.customer;

                return (
                  <div key={u._id} className="table-row">
                    <div>
                      <div className="user-name">{u.name}</div>

                      <div className="user-email">{u.email}</div>
                    </div>

                    <div>
                      <span
                        className="role-badge"
                        style={{
                          background: rc.bg,
                          color: rc.color,
                        }}
                      >
                        {u.role.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div>
                      <select
                        className="role-select"
                        value={u.role}
                        onChange={(e) =>
                          handleRoleChange(u._id, e.target.value)
                        }
                        disabled={actionLoadingId === u._id + "_role"}
                      >
                        <option value="customer">Customer</option>
                        <option value="restaurant_owner">Owner</option>
                        <option value="delivery_agent">Agent</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div>
                      <span
                        className="status-badge"
                        style={{
                          background: u.isActive ? "#e8f5e9" : "#fdecea",
                          color: u.isActive ? "#2e7d32" : "#c62828",
                        }}
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="action-buttons">
                      <button
                        className="toggle-btn"
                        style={{
                          background: u.isActive ? "#fdecea" : "#e8f5e9",
                          color: u.isActive ? "#c62828" : "#2e7d32",
                        }}
                        onClick={() => handleToggleActive(u._id)}
                        disabled={actionLoadingId === u._id + "_active"}
                      >
                        {actionLoadingId === u._id + "_active"
                          ? "..."
                          : u.isActive
                            ? "Deactivate"
                            : "Activate"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminUsersPage;
