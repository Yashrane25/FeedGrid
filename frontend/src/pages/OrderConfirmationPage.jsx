import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getOrderById } from "../services/orderService";
import LoadingSpinner from "../components/LoadingSpinner";
import "./OrderConfirmationPage.css";

const OrderConfirmationPage = () => {
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await getOrderById(orderId);
        setOrder(data.order);
      } catch {
        setError("Could not load order details");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  if (loading) return <LoadingSpinner message="Loading your order..." />;

  if (error || !order) {
    return (
      <div className="error-container">
        <p className="error-text">{error || "Order not found"}</p>
        <Link to="/">Go home</Link>
      </div>
    );
  }

  const orderNumber =
    order.orderNumber || `#${order._id.slice(-6).toUpperCase()}`;

  return (
    <div className="order-page">
      {/* SUCCESS BANNER */}
      <div className="success-banner">
        <div className="success-icon">🎉</div>
        <div className="success-title">Order Placed!</div>
        <div className="success-subtitle">
          Your order {orderNumber} has been placed successfully.
        </div>
      </div>

      {/* STATUS */}
      <div className="card">
        <div className="card-title">Order Status</div>

        <div className="status-row">
          <span className="status-badge">
            {order.status.replace(/_/g, " ")}
          </span>
          <span className="timestamp">
            {new Date(order.createdAt).toLocaleString()}
          </span>
        </div>

        {order.estimatedDeliveryTime && (
          <p className="eta">
            🕐 Estimated delivery:{" "}
            <strong>{order.estimatedDeliveryTime} minutes</strong>
          </p>
        )}
      </div>

      {/* ITEMS */}
      <div className="card">
        <div className="card-title">Items from {order.restaurant?.name}</div>

        {order.items.map((item, i) => (
          <div key={i} className="item-row">
            <span>
              {item.name} <span className="qty">× {item.quantity}</span>
            </span>
            <span className="price">₹{item.price * item.quantity}</span>
          </div>
        ))}

        <div className="row">
          <span>Subtotal</span>
          <span>₹{order.subtotal}</span>
        </div>

        <div className="row">
          <span>Delivery fee</span>
          <span>₹{order.deliveryFee}</span>
        </div>

        <div className="row">
          <span>GST (5%)</span>
          <span>₹{order.tax}</span>
        </div>

        <div className="total-row">
          <span>Total paid</span>
          <span>₹{order.total}</span>
        </div>
      </div>

      {/* ADDRESS */}
      <div className="card">
        <div className="card-title">📍 Delivery Address</div>
        <p className="address">
          {order.deliveryAddress.street},<br />
          {order.deliveryAddress.city}, {order.deliveryAddress.state} —{" "}
          {order.deliveryAddress.pincode}
        </p>
      </div>

      {/* TIMELINE */}
      {order.statusHistory?.length > 0 && (
        <div className="card">
          <div className="card-title">📋 Order Timeline</div>

          {order.statusHistory.map((entry, i) => (
            <div key={i} className="timeline-item">
              <div className="dot" />
              <div>
                <div className="timeline-status">
                  {entry.status.replace(/_/g, " ")}
                </div>
                <div className="timeline-time">
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
                {entry.note && (
                  <div className="timeline-note">{entry.note}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ACTIONS */}
      <div className="actions">
        <Link to="/restaurants" className="btn primary">
          Order Again
        </Link>
        <Link to="/my-orders" className="btn secondary">
          My Orders
        </Link>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
