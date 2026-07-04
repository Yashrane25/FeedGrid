import { useState, useEffect, useCallback } from "react";
import {
  getAllRestaurantsAdmin,
  approveRestaurant,
  toggleRestaurantActive,
} from "../../services/adminService";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import "./AdminRestaurantsPage.css";

const AdminRestaurantsPage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    page: 1,
  });

  const fetchRestaurants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: filters.page,
        limit: 15,
      };

      if (filters.status !== "all") {
        params.status = filters.status;
      }

      if (filters.search) {
        params.search = filters.search;
      }

      const data = await getAllRestaurantsAdmin(params);

      setRestaurants(data.restaurants);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load restaurants");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const handleApprove = async (restaurantId) => {
    setActionLoadingId(restaurantId + "_approve");

    try {
      const res = await approveRestaurant(restaurantId);

      setRestaurants((prev) =>
        prev.map((r) =>
          r._id === restaurantId ? { ...r, isApproved: res.isApproved } : r,
        ),
      );
    } catch (err) {
      alert(err.response?.data?.message || "Action failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleActive = async (restaurantId) => {
    setActionLoadingId(restaurantId + "_active");

    try {
      const res = await toggleRestaurantActive(restaurantId);

      setRestaurants((prev) =>
        prev.map((r) =>
          r._id === restaurantId ? { ...r, isActive: res.isActive } : r,
        ),
      );
    } catch (err) {
      alert(err.response?.data?.message || "Action failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="admin-restaurants-page">
      <div className="restaurants-header">
        <h1 className="restaurants-title">
          Restaurants <span className="restaurants-count">({total})</span>
        </h1>
      </div>

      <div className="restaurants-filter-bar">
        <input
          className="restaurants-search-input"
          type="text"
          placeholder="Search by name or city..."
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
          className="restaurants-select"
          value={filters.status}
          onChange={(e) =>
            setFilters((p) => ({
              ...p,
              status: e.target.value,
              page: 1,
            }))
          }
        >
          <option value="all">All Restaurants</option>
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading restaurants..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchRestaurants} />
      ) : (
        <>
          <div className="restaurants-results-info">
            Showing {restaurants.length} of {total} restaurants
          </div>

          <div className="restaurants-table">
            <div className="restaurants-table-header">
              <span>Restaurant</span>
              <span>Owner</span>
              <span>Approved</span>
              <span>Active</span>
              <span>Open</span>
              <span>Actions</span>
            </div>

            {restaurants.length === 0 ? (
              <div className="restaurants-empty">No restaurants found</div>
            ) : (
              restaurants.map((r) => (
                <div key={r._id} className="restaurants-table-row">
                  <div>
                    <div className="restaurant-name">{r.name}</div>

                    <div className="restaurant-meta">
                      {r.address?.city} •{" "}
                      {r.cuisineType?.slice(0, 2).join(", ")}
                    </div>
                  </div>

                  <div className="owner-info">
                    <div>{r.owner?.name}</div>
                    <div className="owner-email">{r.owner?.email}</div>
                  </div>

                  <div>
                    <span
                      className="status-badge"
                      style={{
                        background: r.isApproved ? "#e8f5e9" : "#fff3e0",
                        color: r.isApproved ? "#2e7d32" : "#e65100",
                      }}
                    >
                      {r.isApproved ? "Yes" : "No"}
                    </span>
                  </div>

                  <div>
                    <span
                      className="status-badge"
                      style={{
                        background: r.isActive ? "#e8f5e9" : "#fdecea",
                        color: r.isActive ? "#2e7d32" : "#c62828",
                      }}
                    >
                      {r.isActive ? "Yes" : "No"}
                    </span>
                  </div>

                  <div>
                    <span
                      className="status-badge"
                      style={{
                        background: r.isOpen ? "#e3f2fd" : "#fafafa",
                        color: r.isOpen ? "#1565c0" : "#aaa",
                      }}
                    >
                      {r.isOpen ? "Open" : "Closed"}
                    </span>
                  </div>

                  <div className="restaurant-actions">
                    <button
                      className="approve-btn"
                      style={{
                        background: r.isApproved ? "#fdecea" : "#e8f5e9",
                        color: r.isApproved ? "#c62828" : "#2e7d32",
                      }}
                      onClick={() => handleApprove(r._id)}
                      disabled={actionLoadingId === r._id + "_approve"}
                    >
                      {actionLoadingId === r._id + "_approve"
                        ? "..."
                        : r.isApproved
                          ? "Unapprove"
                          : "Approve"}
                    </button>

                    <button
                      className="active-btn"
                      style={{
                        background: r.isActive ? "#fdecea" : "#e3f2fd",
                        color: r.isActive ? "#c62828" : "#1565c0",
                      }}
                      onClick={() => handleToggleActive(r._id)}
                      disabled={actionLoadingId === r._id + "_active"}
                    >
                      {actionLoadingId === r._id + "_active"
                        ? "..."
                        : r.isActive
                          ? "Deactivate"
                          : "Activate"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminRestaurantsPage;
