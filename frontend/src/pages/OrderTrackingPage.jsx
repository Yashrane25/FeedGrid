import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getOrderById } from "../services/orderService";
import { useCart } from "../context/CartContext";
import { useSocket } from "../context/SocketContext";
import useSocketEvent from "../hooks/useSocketEvent";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import RatingForm from "../components/RatingForm";
import StarRating from "../components/StarRating";
import "./OrderTrackingPage.css";

// The 6 stages in order used to build the progress bar
const ORDER_STAGES = [
  {
    key: "placed",
    label: "Order Placed",
    icon: "📋",
    description: "Your order has been received",
  },
  {
    key: "confirmed",
    label: "Confirmed",
    icon: "✅",
    description: "Restaurant accepted your order",
  },
  {
    key: "preparing",
    label: "Preparing",
    icon: "🍳",
    description: "Your food is being prepared",
  },
  {
    key: "ready_for_pickup",
    label: "Ready",
    icon: "📦",
    description: "Food is ready for pickup",
  },
  {
    key: "out_for_delivery",
    label: "On the Way",
    icon: "🛵",
    description: "Delivery agent is on the way",
  },
  {
    key: "delivered",
    label: "Delivered",
    icon: "🎉",
    description: "Order delivered successfully",
  },
];

const STATUS_COLORS = {
  placed: { bg: "#e3f2fd", color: "#1565c0", border: "#90caf9" },
  confirmed: { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
  preparing: { bg: "#fff3e0", color: "#e65100", border: "#ffcc80" },
  ready_for_pickup: {
    bg: "#f3e5f5",
    color: "#6a1b9a",
    border: "#ce93d8",
  },
  out_for_delivery: {
    bg: "#e0f7fa",
    color: "#006064",
    border: "#80deea",
  },
  delivered: { bg: "#e8f5e9", color: "#1b5e20", border: "#a5d6a7" },
  cancelled: { bg: "#fdecea", color: "#b71c1c", border: "#ef9a9a" },
};

const OrderProgressBar = ({ currentStatus }) => {
  if (currentStatus === "cancelled") {
    return (
      <div className="progress-bar__cancelled">
        <div className="progress-bar__cancelled-icon">❌</div>
        <div className="progress-bar__cancelled-title">Order Cancelled</div>
        <div className="progress-bar__cancelled-subtitle">
          This order was cancelled. Your payment will be refunded.
        </div>
      </div>
    );
  }

  const currentIndex = ORDER_STAGES.findIndex((s) => s.key === currentStatus);

  return (
    <div className="progress-bar">
      <div className="progress-bar__headline">
        <div className="progress-bar__headline-icon">
          {ORDER_STAGES[currentIndex]?.icon || "📋"}
        </div>
        <div className="progress-bar__headline-label">
          {ORDER_STAGES[currentIndex]?.label || currentStatus}
        </div>
        <div className="progress-bar__headline-desc">
          {ORDER_STAGES[currentIndex]?.description}
        </div>
      </div>

      {/* Progress steps */}
      <div className="progress-bar__steps">
        {ORDER_STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={stage.key} className="progress-bar__stage">
              {/* Stage circle */}
              <div className="progress-bar__stage-col">
                <div
                  className={`progress-bar__circle ${
                    isCurrent
                      ? "progress-bar__circle--current"
                      : isCompleted
                        ? "progress-bar__circle--completed"
                        : ""
                  }`}
                >
                  {isCompleted ? (
                    <span className="progress-bar__check">✓</span>
                  ) : (
                    <span
                      className={`progress-bar__icon ${
                        isPending ? "progress-bar__icon--pending" : ""
                      }`}
                    >
                      {stage.icon}
                    </span>
                  )}
                </div>
                <div
                  className={`progress-bar__stage-label ${
                    isCurrent
                      ? "progress-bar__stage-label--current"
                      : isCompleted
                        ? "progress-bar__stage-label--completed"
                        : ""
                  }`}
                >
                  {stage.label}
                </div>
              </div>

              {/* Connector line between stages */}
              {index < ORDER_STAGES.length - 1 && (
                <div
                  className={`progress-bar__connector ${
                    index < currentIndex
                      ? "progress-bar__connector--completed"
                      : ""
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StatusTimeline = ({ statusHistory }) => {
  if (!statusHistory || statusHistory.length === 0) return null;

  return (
    <div className="timeline-card">
      <div className="timeline-card__title">Order Timeline</div>

      <div className="timeline-card__body">
        <div className="timeline-card__line" />

        {[...statusHistory].reverse().map((entry, i) => {
          const stageInfo = ORDER_STAGES.find((s) => s.key === entry.status);
          const isLatest = i === 0;

          return (
            <div key={i} className="timeline-entry">
              <div
                className={`timeline-entry__dot ${
                  isLatest ? "timeline-entry__dot--latest" : ""
                }`}
              >
                <span
                  className={`timeline-entry__dot-mark ${
                    isLatest ? "timeline-entry__dot-mark--latest" : ""
                  }`}
                >
                  ●
                </span>
              </div>

              <div className="timeline-entry__content">
                <div
                  className={`timeline-entry__label ${
                    isLatest ? "timeline-entry__label--latest" : ""
                  }`}
                >
                  {stageInfo?.label || entry.status.replace(/_/g, " ")}
                </div>
                {entry.note && (
                  <div className="timeline-entry__note">{entry.note}</div>
                )}
                <div className="timeline-entry__timestamp">
                  {new Date(entry.timestamp).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const OrderTrackingPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { addItem, setIsCartOpen } = useCart();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [reorderLoading, setReorderLoading] = useState(false);

  const pollingRef = useRef(null);
  const { socket } = useSocket();

  const fetchOrder = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        setError(null);

        const data = await getOrderById(orderId);
        setOrder(data.order);
        setLastRefreshed(new Date());
      } catch (err) {
        if (showSpinner) {
          if (err.response?.status === 404) {
            setError("Order not found");
          } else {
            setError(err.response?.data?.message || "Failed to load order");
          }
        }
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [orderId],
  );

  //Initial fetch
  useEffect(() => {
    fetchOrder(true);
  }, [fetchOrder]);

  //Join socket room for this order
  useEffect(() => {
    if (!socket || !orderId) return;

    socket.emit("join_order_room", orderId);

    return () => {
      socket.emit("leave_order_room", orderId);
    };
  }, [socket, orderId]);

  //Handle real time status updates
  const handleOrderStatusUpdate = useCallback(
    (data) => {
      const updatedOrder = data.order;

      if (updatedOrder._id === orderId) {
        setOrder(updatedOrder);
        setLastRefreshed(new Date());
      }
    },
    [orderId],
  );

  useSocketEvent("order_status_update", handleOrderStatusUpdate);

  //Fallback polling every 30 seconds
  useEffect(() => {
    if (!order) return;

    const terminalStatuses = ["delivered", "cancelled"];

    if (terminalStatuses.includes(order.status)) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(() => {
      fetchOrder(false);
    }, 30000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [order?.status, fetchOrder]);

  const handleReorder = async () => {
    if (!order) return;

    setReorderLoading(true);

    try {
      const restaurant = {
        _id: order.restaurant._id,
        name: order.restaurant.name,
        deliveryFee: order.deliveryFee,
      };

      for (const item of order.items) {
        const cartItem = {
          _id: item.menuItem || item._id,
          name: item.name,
          price: item.price,
          image: item.image,
          isVegetarian: item.isVegetarian || false,
        };

        const result = addItem(cartItem, restaurant);

        if (result?.requiresConfirmation) {
          const confirmed = window.confirm(result.message);
          if (confirmed) {
            navigate(`/restaurants/${order.restaurant._id}`);
            return;
          } else {
            return;
          }
        }
      }

      setIsCartOpen(true);
    } finally {
      setReorderLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading your order..." />;
  if (error)
    return <ErrorMessage message={error} onRetry={() => fetchOrder(true)} />;
  if (!order) return null;

  const orderNumber = `#${order._id.slice(-6).toUpperCase()}`;
  const isTerminal = ["delivered", "cancelled"].includes(order.status);

  return (
    <div className="order-tracking-page">
      <div className="order-tracking-page__top-bar">
        <button
          className="order-tracking-page__back-btn"
          onClick={() => navigate("/my-orders")}
        >
          ← My Orders
        </button>

        <div className="order-tracking-page__refresh-info">
          {!isTerminal && (
            <>
              <span className="order-tracking-page__polling-dot" />
              Auto-updating
            </>
          )}
          {lastRefreshed && (
            <span>
              Updated:{" "}
              {lastRefreshed.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>

      <div className="info-card">
        <div className="order-header">
          <div>
            <div className="order-header__number">{orderNumber}</div>
            <div className="order-header__date">
              {new Date(order.createdAt).toLocaleString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
          <div className="order-header__right">
            <div className="order-header__restaurant-name">
              {order.restaurant?.name}
            </div>
            <div className="order-header__restaurant-city">
              {order.restaurant?.address?.city}
            </div>
            <span className="order-header__payment-badge">
              ✓ {order.paymentStatus}
            </span>
          </div>
        </div>
      </div>

      <OrderProgressBar currentStatus={order.status} />

      {/* Live tracking button only when out for delivery */}
      {order.status === "out_for_delivery" && (
        <Link
          to={`/track/${orderId}`}
          className="order-tracking__live-track-btn"
        >
          🗺️ Track Live on Map →
        </Link>
      )}

      {order.estimatedDeliveryTime &&
        !isTerminal &&
        order.status !== "cancelled" && (
          <div className="eta-banner">
            <span className="eta-banner__icon">🕐</span>
            <div>
              <div className="eta-banner__title">
                Estimated delivery in {order.estimatedDeliveryTime} minutes
              </div>
              <div className="eta-banner__subtitle">
                Hang tight — your food is on its way!
              </div>
            </div>
          </div>
        )}

      {order.status === "delivered" && (
        <div className="delivered-banner">
          <div className="delivered-banner__icon">🎉</div>
          <div className="delivered-banner__title">Delivered successfully!</div>
          <div className="delivered-banner__subtitle">
            We hope you enjoyed your meal. Rate your experience below!
          </div>
        </div>
      )}

      <StatusTimeline statusHistory={order.statusHistory} />

      <div className="info-card">
        <div className="info-card__title">
          🧾 Order Items ({order.items.length})
        </div>

        {order.items.map((item, i) => (
          <div key={i} className="order-item-row">
            <span>
              {item.name}
              <span className="order-item-row__qty">× {item.quantity}</span>
            </span>
            <span className="order-item-row__price">
              ₹{item.price * item.quantity}
            </span>
          </div>
        ))}

        {/* Bill */}
        <div className="bill-summary">
          <div className="bill-row">
            <span>Subtotal</span>
            <span>₹{order.subtotal}</span>
          </div>
          <div className="bill-row">
            <span>Delivery fee</span>
            <span>₹{order.deliveryFee}</span>
          </div>
          <div className="bill-row">
            <span>GST (5%)</span>
            <span>₹{order.tax}</span>
          </div>
          <div className="bill-total-row">
            <span>Total Paid</span>
            <span>₹{order.total}</span>
          </div>
        </div>
      </div>

      <div className="info-card">
        <div className="info-card__title">📍 Delivery Address</div>
        <div className="address-text">
          {order.deliveryAddress?.street}
          <br />
          {order.deliveryAddress?.city}, {order.deliveryAddress?.state} —{" "}
          {order.deliveryAddress?.pincode}
        </div>
      </div>

      {order.customerNote && (
        <div className="info-card info-card--note">
          <div className="info-card__title">📝 Your Note</div>
          <div className="note-text">{order.customerNote}</div>
        </div>
      )}

      {/* {order.status === "delivered" && !order.rating?.score && (
        <div className="info-card info-card--rating">
          <div className="rating-placeholder__label">
            ⭐ Rate your experience
          </div>
          <div className="rating-placeholder__note">
            Rating feature coming soon (Phase 9)
          </div>
        </div>
      )} */}

      {/* Rating section */}
      {order.status === "delivered" && (
        <>
          {order.rating?.score ? (
            <div className="order-tracking__card">
              <div className="order-tracking__card-title">⭐ Your Rating</div>
              <div className="order-tracking__existing-rating">
                <StarRating value={order.rating.score} readonly size="md" />
                {order.rating.review && (
                  <p className="order-tracking__rating-review">
                    "{order.rating.review}"
                  </p>
                )}
                <div className="order-tracking__rating-date">
                  Rated on{" "}
                  {new Date(order.rating.createdAt).toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  )}
                </div>
              </div>
            </div>
          ) : (
            <RatingForm
              orderId={order._id}
              restaurantName={order.restaurant?.name}
              onSuccess={(rating) => {
                setOrder((prev) => ({
                  ...prev,
                  rating,
                }));
              }}
            />
          )}
        </>
      )}

      <div className="order-actions">
        <button
          className={`order-actions__reorder-btn ${
            reorderLoading ? "order-actions__reorder-btn--loading" : ""
          }`}
          onClick={handleReorder}
          disabled={reorderLoading}
        >
          {reorderLoading ? "Adding to cart..." : "🔄 Order Again"}
        </button>
        <Link to="/restaurants" className="order-actions__browse-btn">
          Browse Restaurants
        </Link>
      </div>
    </div>
  );
};

export default OrderTrackingPage;
