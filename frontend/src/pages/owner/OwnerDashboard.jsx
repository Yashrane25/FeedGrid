import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import "./OwnerDashboard.css";

const OwnerDashboard = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await API.get("/restaurants/my");
      setRestaurants(res.data.restaurants);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load your restaurants",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleToggle = async (restaurantId) => {
    try {
      setTogglingId(restaurantId);

      const res = await API.patch(`/restaurants/${restaurantId}/toggle`);

      setRestaurants((prev) =>
        prev.map((r) =>
          r._id === restaurantId ? { ...r, isOpen: res.data.isOpen } : r,
        ),
      );
    } catch (err) {
      alert(
        err.response?.data?.message || "Failed to toggle restaurant status",
      );
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading your restaurants..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchRestaurants} />;
  }

  return (
    <div>
      <div className="owner-dashboard__header">
        <h1 className="owner-dashboard__title">My Restaurants</h1>

        <Link
          to="/owner/restaurants/new"
          className="owner-dashboard__new-button"
        >
          + Add Restaurant
        </Link>
      </div>

      {restaurants.length === 0 ? (
        <div className="owner-dashboard__empty-state">
          <div className="owner-dashboard__empty-icon">🏪</div>

          <h3 className="owner-dashboard__empty-title">No restaurants yet</h3>

          <p className="owner-dashboard__empty-text">
            List your first restaurant to start receiving orders
          </p>

          <Link
            to="/owner/restaurants/new"
            className="owner-dashboard__empty-button"
          >
            List Your Restaurant
          </Link>
        </div>
      ) : (
        <div className="owner-dashboard__grid">
          {restaurants.map((r) => (
            <div key={r._id} className="owner-dashboard__card">
              <div className="owner-dashboard__card-header">
                <div className="owner-dashboard__name-row">
                  <span className="owner-dashboard__restaurant-name">
                    {r.name}
                  </span>
                </div>

                <div className="owner-dashboard__badge-row">
                  <span
                    className={`owner-dashboard__badge ${
                      r.isApproved
                        ? "owner-dashboard__badge--approved"
                        : "owner-dashboard__badge--pending"
                    }`}
                  >
                    {r.isApproved ? "✓ Approved" : "⏳ Pending Approval"}
                  </span>

                  <span
                    className={`owner-dashboard__badge ${
                      r.isOpen
                        ? "owner-dashboard__badge--open"
                        : "owner-dashboard__badge--closed"
                    }`}
                  >
                    {r.isOpen ? "● Open" : "● Closed"}
                  </span>

                  {!r.isActive && (
                    <span className="owner-dashboard__badge owner-dashboard__badge--deactivated">
                      Deactivated
                    </span>
                  )}
                </div>

                <div className="owner-dashboard__cuisine">
                  {r.cuisineType?.join(" • ")}
                </div>
              </div>

              <div className="owner-dashboard__card-body">
                <div className="owner-dashboard__meta-row">
                  <span>🕐 {r.deliveryTime} mins</span>

                  <span>
                    🛵 {r.deliveryFee === 0 ? "Free" : `₹${r.deliveryFee}`}
                  </span>

                  <span>📍 {r.address?.city}</span>
                </div>

                {!r.isApproved && (
                  <div className="owner-dashboard__notice">
                    ⏳ Your restaurant is under review. It will appear to
                    customers once an admin approves it.
                  </div>
                )}
              </div>

              <div className="owner-dashboard__card-footer">
                <Link
                  to={`/owner/restaurants/${r._id}`}
                  className="owner-dashboard__manage-btn"
                >
                  Manage
                </Link>

                <button
                  className={`owner-dashboard__toggle-btn ${
                    r.isOpen
                      ? "owner-dashboard__toggle-btn--close"
                      : "owner-dashboard__toggle-btn--open"
                  }`}
                  onClick={() => handleToggle(r._id)}
                  disabled={togglingId === r._id}
                >
                  {togglingId === r._id ? "..." : r.isOpen ? "Close" : "Open"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;
