import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAvailableOrders, acceptOrder } from "../../services/agentService";
import useSocketEvent from "../../hooks/useSocketEvent";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import "./AgentDashboard.css";

const AgentDashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const pollingRef = useRef(null);

  //Fetch available orders
  const fetchOrders = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const data = await getAvailableOrders();
      setOrders(data.orders || []);
      setLastRefreshed(new Date());
    } catch (err) {
      if (showSpinner) {
        setError(
          err.response?.data?.message || "Failed to load available orders",
        );
      }
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(true);
  }, [fetchOrders]);

  useEffect(() => {
    pollingRef.current = setInterval(() => fetchOrders(false), 30000);
    return () => clearInterval(pollingRef.current);
  }, [fetchOrders]);

  const handleOrderUpdated = useCallback(
    (data) => {
      if (data.order?.status === "ready_for_pickup") {
        fetchOrders(false);
      }
    },
    [fetchOrders],
  );

  useSocketEvent("order_updated", handleOrderUpdated);

  //Accept an order
  const handleAccept = async (orderId) => {
    setAcceptingId(orderId);
    try {
      await acceptOrder(orderId);
      //Navigate to the active delivery page
      navigate("/agent/active");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to accept order");
      setAcceptingId(null);
    }
  };

  return (
    <div className="agent-dashboard">
      {/* Header */}
      <div className="agent-dashboard__header">
        <div>
          <h1 className="agent-dashboard__title">Available Pickups</h1>
          <div className="agent-dashboard__subtitle">
            <span className="agent-dashboard__live-dot" />
            Orders ready for pickup
            {lastRefreshed && (
              <span className="agent-dashboard__updated">
                · Updated{" "}
                {lastRefreshed.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
        <button
          className="agent-dashboard__refresh-btn"
          onClick={() => fetchOrders(false)}
        >
          🔄 Refresh
        </button>
      </div>

      {loading && <LoadingSpinner message="Loading available orders..." />}
      {error && (
        <ErrorMessage message={error} onRetry={() => fetchOrders(true)} />
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="agent-dashboard__empty">
          <div className="agent-dashboard__empty-icon">📭</div>
          <h3 className="agent-dashboard__empty-title">
            No orders available right now
          </h3>
          <p className="agent-dashboard__empty-sub">
            Orders appear here when restaurants mark them ready for pickup. This
            page updates automatically.
          </p>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="agent-dashboard__list">
          {orders.map((order) => {
            const orderNumber = `#${order._id.slice(-6).toUpperCase()}`;
            return (
              <div key={order._id} className="pickup-card">
                {/* Card header */}
                <div className="pickup-card__header">
                  <div className="pickup-card__order-number">{orderNumber}</div>
                  <div className="pickup-card__earn">
                    Earn ₹{Math.round(order.deliveryFee * 0.8)}
                  </div>
                </div>

                {/* Restaurant info */}
                <div className="pickup-card__restaurant">
                  <div className="pickup-card__restaurant-name">
                    🏪 {order.restaurant?.name}
                  </div>
                  <div className="pickup-card__restaurant-address">
                    {order.restaurant?.address?.street},{" "}
                    {order.restaurant?.address?.city}
                  </div>
                  {order.restaurant?.phone && (
                    <div className="pickup-card__restaurant-phone">
                      📞 {order.restaurant.phone}
                    </div>
                  )}
                </div>

                {/* Delivery info */}
                <div className="pickup-card__delivery">
                  <div className="pickup-card__delivery-label">Deliver to</div>
                  <div className="pickup-card__delivery-address">
                    📍 {order.deliveryAddress?.street},{" "}
                    {order.deliveryAddress?.city} -{" "}
                    {order.deliveryAddress?.pincode}
                  </div>
                  {order.customer?.phone && (
                    <div className="pickup-card__customer-phone">
                      👤 {order.customer?.name} · {order.customer.phone}
                    </div>
                  )}
                </div>

                {/* Items summary */}
                <div className="pickup-card__items">
                  {order.items.slice(0, 3).map((item, i) => (
                    <span key={i} className="pickup-card__item-tag">
                      {item.name} ×{item.quantity}
                    </span>
                  ))}
                  {order.items.length > 3 && (
                    <span className="pickup-card__item-tag pickup-card__item-tag--more">
                      +{order.items.length - 3} more
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="pickup-card__footer">
                  <div className="pickup-card__order-time">
                    {new Date(order.createdAt)
                      .toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      .toUpperCase()}
                  </div>
                  <button
                    className={`pickup-card__accept-btn ${
                      acceptingId === order._id
                        ? "pickup-card__accept-btn--loading"
                        : ""
                    }`}
                    onClick={() => handleAccept(order._id)}
                    disabled={acceptingId !== null}
                  >
                    {acceptingId === order._id
                      ? "Accepting..."
                      : "Accept Delivery"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AgentDashboard;
