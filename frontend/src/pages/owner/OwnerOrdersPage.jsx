import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "../../context/SocketContext";
import useSocketEvent from "../../hooks/useSocketEvent";
import API from "../../api/axios";
import {
  getRestaurantOrders,
  updateOrderStatus,
} from "../../services/orderService";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage";
import "./OwnerOrdersPage.css";

const STATUS_CONFIG = {
  placed: {
    label: "New Order",
    bg: "#e3f2fd",
    color: "#1565c0",
    actions: [
      {
        label: "✓ Confirm Order",
        nextStatus: "confirmed",
        className: "action-btn--confirm",
      },
      {
        label: "✕ Cancel",
        nextStatus: "cancelled",
        className: "action-btn--cancel",
      },
    ],
  },
  confirmed: {
    label: "Confirmed",
    bg: "#e8f5e9",
    color: "#2e7d32",
    actions: [
      {
        label: "🍳 Start Preparing",
        nextStatus: "preparing",
        className: "action-btn--prepare",
      },
    ],
  },
  preparing: {
    label: "Preparing",
    bg: "#fff3e0",
    color: "#e65100",
    actions: [
      {
        label: "✅ Ready for Pickup",
        nextStatus: "ready_for_pickup",
        className: "action-btn--ready",
      },
    ],
  },
  ready_for_pickup: {
    label: "Ready for Pickup",
    bg: "#f3e5f5",
    color: "#6a1b9a",
    actions: [],
  },
  out_for_delivery: {
    label: "Out for Delivery",
    bg: "#e0f7fa",
    color: "#006064",
    actions: [],
  },
  delivered: {
    label: "Delivered",
    bg: "#e8f5e9",
    color: "#1b5e20",
    actions: [],
  },
  cancelled: {
    label: "Cancelled",
    bg: "#fdecea",
    color: "#b71c1c",
    actions: [],
  },
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "placed", label: "New" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "ready_for_pickup", label: "Ready" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const OrderCard = ({ order, onStatusUpdate, isUpdating }) => {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.placed;
  const orderNumber = `#${order._id.slice(-6).toUpperCase()}`;
  const orderTime = new Date(order.createdAt).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`order-card ${
        order.status === "placed" ? "order-card--new" : ""
      }`}
    >
      {/* Header */}
      <div className="order-card__header">
        <div className="order-card__meta">
          <span className="order-card__number">{orderNumber}</span>
          <span
            className="order-card__status-badge"
            style={{ background: config.bg, color: config.color }}
          >
            {config.label}
          </span>
          <span className="order-card__time">{orderTime}</span>
        </div>
        <div className="order-card__customer">
          <div className="order-card__customer-name">
            {order.customer?.name || "Customer"}
          </div>
          {order.customer?.phone && (
            <div className="order-card__customer-phone">
              {order.customer.phone}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="order-card__body">
        <div className="order-card__items">
          {order.items.map((item, i) => (
            <div key={i} className="order-card__item-row">
              <span className="order-card__item-name">
                {item.name}
                <span className="order-card__item-qty">× {item.quantity}</span>
              </span>
              <span className="order-card__item-price">
                ₹{item.price * item.quantity}
              </span>
            </div>
          ))}
        </div>

        <div className="order-card__bill-summary">
          <span>Subtotal ₹{order.subtotal}</span>
          <span className="order-card__bill-sep">+</span>
          <span>Delivery ₹{order.deliveryFee}</span>
          <span className="order-card__bill-sep">+</span>
          <span>GST ₹{order.tax}</span>
        </div>

        <div className="order-card__total-row">
          <span>Total</span>
          <span>₹{order.total}</span>
        </div>

        <div className="order-card__address">
          📍 {order.deliveryAddress?.street}, {order.deliveryAddress?.city} —{" "}
          {order.deliveryAddress?.pincode}
        </div>

        {order.customerNote && (
          <div className="order-card__note">
            📝 <strong>Note:</strong> {order.customerNote}
          </div>
        )}
      </div>

      {/* Footer action buttons */}
      {config.actions.length > 0 && (
        <div className="order-card__footer">
          {config.actions.map((action) => (
            <button
              key={action.nextStatus}
              className={`action-btn ${action.className} ${
                isUpdating === order._id ? "action-btn--loading" : ""
              }`}
              onClick={() => onStatusUpdate(order._id, action.nextStatus)}
              disabled={isUpdating === order._id}
            >
              {isUpdating === order._id ? "Updating..." : action.label}
            </button>
          ))}
          <span className="order-card__payment-status">
            Payment: {order.paymentStatus}
          </span>
        </div>
      )}

      {config.actions.length === 0 &&
        !["delivered", "cancelled"].includes(order.status) && (
          <div className="order-card__footer">
            <span className="order-card__waiting">
              Waiting for delivery agent...
            </span>
          </div>
        )}
    </div>
  );
};

//main page
const OwnerOrdersPage = () => {
  const { socket } = useSocket();

  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  //Track new order IDs received via socket so it can be flashed briefly on the page
  const [newOrderIds, setNewOrderIds] = useState(new Set());

  const pollingRef = useRef(null);

  //Fetch owners restaurants
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await API.get("/restaurants/my");
        const list = res.data.restaurants || [];
        setRestaurants(list);
        if (list.length > 0) {
          setSelectedRestaurantId(list[0]._id);
        }
      } catch (err) {
        setError("Failed to load your restaurants");
      }
    };
    fetchRestaurants();
  }, []);

  const fetchOrders = useCallback(
    async (showSpinner = true) => {
      if (!selectedRestaurantId) return;
      try {
        if (showSpinner) setLoading(true);
        setError(null);
        const data = await getRestaurantOrders(selectedRestaurantId, {
          limit: 50,
        });
        setOrders(data.orders || []);
        setLastRefreshed(new Date());
      } catch (err) {
        if (showSpinner) {
          setError(err.response?.data?.message || "Failed to load orders");
        }
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [selectedRestaurantId],
  );

  //Initial fetch
  useEffect(() => {
    if (selectedRestaurantId) fetchOrders(true);
  }, [selectedRestaurantId, fetchOrders]);

  //Join/leave restaurant socket room
  useEffect(() => {
    if (!socket || !selectedRestaurantId) return;

    socket.emit("join_restaurant_room", selectedRestaurantId);

    return () => {
      socket.emit("leave_restaurant_room", selectedRestaurantId);
    };
  }, [socket, selectedRestaurantId]);

  const handleNewOrder = useCallback((data) => {
    const incomingOrder = data.order;

    setOrders((prev) => {
      const exists = prev.some((o) => o._id === incomingOrder._id);
      if (exists) return prev;
      return [incomingOrder, ...prev];
    });

    //Flash the new order card briefly
    setNewOrderIds((prev) => {
      const updated = new Set(prev);
      updated.add(incomingOrder._id);
      //Remove the flash after 5 seconds
      setTimeout(() => {
        setNewOrderIds((curr) => {
          const next = new Set(curr);
          next.delete(incomingOrder._id);
          return next;
        });
      }, 5000);
      return updated;
    });

    setLastRefreshed(new Date());
    setActiveTab("placed");
  }, []);

  const handleOrderUpdated = useCallback((data) => {
    const updatedOrder = data.order;
    setOrders((prev) =>
      prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o)),
    );
    setLastRefreshed(new Date());
  }, []);

  //Subscribe to socket events using our custom hook
  useSocketEvent("new_order", handleNewOrder);
  useSocketEvent("order_updated", handleOrderUpdated);

  //Keeps things working if socket disconnects temporarily
  useEffect(() => {
    if (!selectedRestaurantId) return;

    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(() => {
      fetchOrders(false);
    }, 30000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedRestaurantId, fetchOrders]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId
            ? {
                ...o,
                status: newStatus,
                statusHistory: [
                  ...o.statusHistory,
                  {
                    status: newStatus,
                    timestamp: new Date().toISOString(),
                  },
                ],
              }
            : o,
        ),
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update order status");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const filteredOrders =
    activeTab === "all" ? orders : orders.filter((o) => o.status === activeTab);

  const countByStatus = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="owner-orders">
      {/* Header */}
      <div className="owner-orders__header">
        <div className="owner-orders__title-section">
          <h1 className="owner-orders__title">Orders</h1>
          <div className="owner-orders__refresh-info">
            <span className="owner-orders__live-dot" />
            Live updates active
            {lastRefreshed && (
              <span className="owner-orders__last-updated">
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

        <div className="owner-orders__controls">
          {restaurants.length > 1 && (
            <select
              className="owner-orders__restaurant-select"
              value={selectedRestaurantId}
              onChange={(e) => setSelectedRestaurantId(e.target.value)}
            >
              {restaurants.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
          <button
            className="owner-orders__refresh-btn"
            onClick={() => fetchOrders(false)}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {restaurants.length === 0 && !loading && (
        <div className="owner-orders__empty-restaurants">
          <div className="owner-orders__empty-icon">🏪</div>
          <p>You have no restaurants yet.</p>
        </div>
      )}

      {loading && <LoadingSpinner message="Loading orders..." />}

      {error && (
        <ErrorMessage message={error} onRetry={() => fetchOrders(true)} />
      )}

      {!loading && !error && selectedRestaurantId && (
        <>
          {/* Summary bar */}
          {orders.length > 0 && (
            <div className="owner-orders__summary-bar">
              <div className="summary-card">
                📦 <strong>{orders.length}</strong> total orders
              </div>
              {countByStatus.placed > 0 && (
                <div className="summary-card summary-card--new">
                  🆕 <strong>{countByStatus.placed} new</strong>{" "}
                  {countByStatus.placed > 1 ? "orders" : "order"} waiting
                </div>
              )}
              {countByStatus.preparing > 0 && (
                <div className="summary-card summary-card--preparing">
                  🍳 <strong>{countByStatus.preparing} being prepared</strong>
                </div>
              )}
            </div>
          )}

          {/* Filter tabs */}
          <div className="owner-orders__tabs">
            {FILTER_TABS.map((tab) => {
              const count =
                tab.key === "all" ? orders.length : countByStatus[tab.key] || 0;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  className={`owner-orders__tab ${
                    isActive ? "owner-orders__tab--active" : ""
                  }`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={`tab-badge ${
                        isActive ? "tab-badge--active" : "tab-badge--inactive"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Orders list */}
          {filteredOrders.length === 0 ? (
            <div className="owner-orders__empty">
              <div className="owner-orders__empty-icon">
                {activeTab === "all" ? "📭" : "✅"}
              </div>
              <p className="owner-orders__empty-title">
                {activeTab === "all"
                  ? "No orders yet"
                  : `No ${activeTab.replace(/_/g, " ")} orders`}
              </p>
              {activeTab === "all" && (
                <p className="owner-orders__empty-sub">
                  Orders appear here instantly when customers place them. Live
                  updates are active.
                </p>
              )}
            </div>
          ) : (
            <div className="owner-orders__list">
              {[...filteredOrders]
                .sort((a, b) => {
                  if (a.status === "placed" && b.status !== "placed") return -1;
                  if (a.status !== "placed" && b.status === "placed") return 1;
                  return new Date(b.createdAt) - new Date(a.createdAt);
                })
                .map((order) => (
                  <div
                    key={order._id}
                    className={newOrderIds.has(order._id) ? "order-flash" : ""}
                  >
                    <OrderCard
                      order={order}
                      onStatusUpdate={handleStatusUpdate}
                      isUpdating={updatingOrderId}
                    />
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OwnerOrdersPage;
