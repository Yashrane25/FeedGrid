import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMyOrders } from "../services/orderService";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import "./MyOrdersPage.css";

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await getMyOrders();
        setOrders(data.orders);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Oops! We couldn't retrieve your orders. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const statusColors = {
    placed: { bg: "#e3f2fd", color: "#1565c0" },
    confirmed: { bg: "#e8f5e9", color: "#2e7d32" },
    preparing: { bg: "#fff3e0", color: "#e65100" },
    ready_for_pickup: { bg: "#f3e5f5", color: "#6a1b9a" },
    out_for_delivery: { bg: "#e0f7fa", color: "#006064" },
    delivered: { bg: "#e8f5e9", color: "#1b5e20" },
    cancelled: { bg: "#fdecea", color: "#b71c1c" },
  };

  if (loading) {
    return <LoadingSpinner message="Loading your orders..." />;
  }

  if (error) {
    return (
      <ErrorMessage message={error} onRetry={() => window.location.reload()} />
    );
  }

  return (
    <div className="orders-page">
      <h1 className="orders-title">My Orders</h1>

      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🍽️</div>

          <h3 className="empty-title">No orders yet</h3>

          <p className="empty-text">Your order history will appear here</p>

          <Link to="/restaurants" className="browse-restaurants-btn">
            Browse Restaurants
          </Link>
        </div>
      ) : (
        orders.map((order) => {
          const orderStatus = statusColors[order.status] || statusColors.placed;

          const orderNumber = `#${order._id.slice(-6).toUpperCase()}`;

          const itemsSummary = order.items
            .slice(0, 2)
            .map((item) => `${item.name} ×${item.quantity}`)
            .join(", ");

          const hasMore = order.items.length > 2;

          return (
            <Link
              key={order._id}
              to={`/orders/${order._id}`}
              className="order-card"
            >
              <div className="order-header">
                <div>
                  <div className="restaurant-name">
                    {order.restaurant?.name || "Restaurant"}
                  </div>

                  <div className="order-meta">
                    {orderNumber} •{" "}
                    {new Date(order.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>

                <span
                  className="status-badge"
                  style={{
                    background: orderStatus.bg,
                    color: orderStatus.color,
                  }}
                >
                  {order.status.replace(/_/g, " ")}
                </span>
              </div>

              <div className="items-summary">
                {itemsSummary}

                {hasMore && (
                  <span className="more-items">
                    {" "}
                    +{order.items.length - 2} more
                  </span>
                )}
              </div>

              <div className="order-footer">
                <span className="order-total">₹{order.total}</span>

                {/* <Link
                  key={order._id}
                  to={`/order-confirmation/${order._id}`}
                  className="order-card"
                >
                  <span className="view-details-link">View details →</span>
                </Link> */}

                <span className="view-details-link">Track Order →</span>
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
};

export default MyOrdersPage;
