import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios.js";
import { useSocket } from "../hooks/useSocket.js";
import { useAuth } from "../context/AuthContext.jsx";
import "./RestaurantDashboard.css";

const STATUS_ACTIONS = {
  pending: {
    next: "confirmed",
    label: "Accept Order",
    color: "#388e3c",
  },
  confirmed: {
    next: "preparing",
    label: "Start Preparing",
    color: "#1976d2",
  },
  preparing: {
    next: "out_for_delivery",
    label: "Ready for Pickup",
    color: "#7b1fa2",
  },
  out_for_delivery: {
    next: "delivered",
    label: "Mark Delivered",
    color: "#388e3c",
  },
  delivered: {
    next: null,
    label: "Delivered ✓",
    color: "#aaa",
  },
  cancelled: {
    next: null,
    label: "Cancelled",
    color: "#c00",
  },
};

const STATUS_COLORS = {
  pending: "#f59f00",
  confirmed: "#388e3c",
  preparing: "#1976d2",
  out_for_delivery: "#7b1fa2",
  delivered: "#388e3c",
  cancelled: "#c62828",
};

export default function RestaurantDashboard() {
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("active");
  //filter = "active" -> pending, confirmed, preparing, out for delivery
  //filter = "past" -> delivered, cancelled
  const [loading, setLoading] = useState(true);
  const [newOrderId, setNewOrderId] = useState(null);

  //Fetch restaurant info and orders
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [restRes, ordersRes] = await Promise.all([
          axios.get("/restaurants/owner/me"),
          axios.get("/orders/restaurant/all"),
        ]);
        setRestaurant(restRes.data.restaurant);
        setOrders(ordersRes.data.orders);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  //Socket.io: listen for new orders and status updates
  useEffect(() => {
    if (!socket || !restaurant) {
      return;
    }

    //Join the restaurant room so we receive new order notifications
    socket.emit("join:restaurant", restaurant._id);

    //New order arrived
    socket.on("order:new", ({ order }) => {
      setOrders((prev) => [order, ...prev]);
      setNewOrderId(order._id);
      setTimeout(() => setNewOrderId(null), 3000);
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } catch (error) {
        console.error("Failed to play notification sound:", error);
      }
    });

    //Status updated elsewhere
    socket.on("order:statusUpdate", ({ orderId, status }) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status } : o)),
      );
    });

    return () => {
      socket.off("order:new");
      socket.off("order:statusUpdate");
    };
  }, [socket, restaurant]);

  //Update order status via HTTP then update local state
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await axios.patch(`/orders/${orderId}/status`, { status: newStatus });
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o)),
      );
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update status.");
    }
  };

  const handleToggleOpen = async () => {
    try {
      const res = await axios.patch(`/restaurants/${restaurant._id}/toggle`);
      setRestaurant((prev) => ({ ...prev, isOpen: res.data.isOpen }));
    } catch {
      alert("Failed to toggle status.");
    }
  };

  //Filter helpers
  const activeStatuses = [
    "pending",
    "confirmed",
    "preparing",
    "out_for_delivery",
  ];
  const pastStatuses = ["delivered", "cancelled"];

  const filteredOrders = orders.filter((o) =>
    filter === "active"
      ? activeStatuses.includes(o.status)
      : pastStatuses.includes(o.status),
  );

  const formatStatus = (status) =>
    status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  //Loading / no restaurant guards
  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (!restaurant) {
    return (
      <div className="dashboard-no-restaurant">
        <h2>You haven&apos;t created a restaurant yet.</h2>
        <button
          className="btn-create-restaurant"
          onClick={() => navigate("/create-restaurant")}
        >
          Create Restaurant
        </button>
      </div>
    );
  }

  //Derived stats
  const todayOrders = orders.filter((o) => {
    const today = new Date();
    const orderDate = new Date(o.createdAt);
    return orderDate.toDateString() === today.toDateString();
  });
  const todayRevenue = todayOrders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const stats = [
    { label: "Today's Orders", value: todayOrders.length, icon: "📦" },
    { label: "Today's Revenue", value: `₹${todayRevenue}`, icon: "💰" },
    {
      label: "Active Orders",
      value: orders.filter((o) => activeStatuses.includes(o.status)).length,
      icon: "🔥",
    },
    {
      label: "Avg Rating",
      value: restaurant.rating > 0 ? `${restaurant.rating} ⭐` : "New",
      icon: "⭐",
    },
  ];

  //Render
  return (
    <div className="dashboard-wrapper">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>{restaurant.name}</h1>
          <p>Restaurant Dashboard</p>
        </div>

        <button
          className={`btn-toggle-open ${restaurant.isOpen ? "is-open" : "is-closed"}`}
          onClick={handleToggleOpen}
        >
          {restaurant.isOpen
            ? "● Open — Click to Close"
            : "● Closed — Click to Open"}
        </button>
      </div>

      {/* Stats Row */}
      <div className="stats-grid">
        {stats.map(({ label, value, icon }) => (
          <div key={label} className="stat-card">
            <div className="stat-card__icon">{icon}</div>
            <div className="stat-card__value">{value}</div>
            <div className="stat-card__label">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {[
          {
            key: "active",
            label: `Active Orders (${orders.filter((o) => activeStatuses.includes(o.status)).length})`,
          },
          {
            key: "past",
            label: `Past Orders (${orders.filter((o) => pastStatuses.includes(o.status)).length})`,
          },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`btn-filter ${filter === key ? "active" : ""}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="orders-empty">
          <div className="orders-empty__icon">
            {filter === "active" ? "🎉" : "📦"}
          </div>
          <p>
            {filter === "active"
              ? "No active orders right now"
              : "No past orders yet"}
          </p>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map((order) => {
            const action = STATUS_ACTIONS[order.status];
            const isNew = order._id === newOrderId;

            return (
              <div
                key={order._id}
                className={`order-card ${isNew ? "is-new" : ""}`}
              >
                {/* Order header */}
                <div className="order-card__header">
                  <div>
                    <div className="order-card__customer-name">
                      {order.customer?.name || "Customer"}
                      {isNew && <span className="badge-new">NEW</span>}
                    </div>
                    <div className="order-card__meta">
                      {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · "}Order #{order._id.slice(-6).toUpperCase()}
                    </div>
                  </div>

                  <span
                    className="order-card__status"
                    style={{
                      background: `${STATUS_COLORS[order.status]}18`,
                      color: STATUS_COLORS[order.status],
                    }}
                  >
                    {formatStatus(order.status)}
                  </span>
                </div>

                {/* Items */}
                <div className="order-card__items">
                  {order.items
                    .map((item) => `${item.name} × ${item.quantity}`)
                    .join("  •  ")}
                </div>

                {/* Address */}
                <div className="order-card__address">
                  📍 {order.deliveryAddress?.street},{" "}
                  {order.deliveryAddress?.city}
                </div>

                {/* Footer */}
                <div className="order-card__footer">
                  <span className="order-card__price">
                    ₹{order.totalAmount}
                  </span>

                  <div className="order-card__actions">
                    {/* Decline button only for pending orders */}
                    {order.status === "pending" && (
                      <button
                        className="btn-decline"
                        onClick={() =>
                          handleStatusUpdate(order._id, "cancelled")
                        }
                      >
                        Decline
                      </button>
                    )}

                    {/* Primary action button */}
                    {action?.next && (
                      <button
                        className="btn-action"
                        style={{ background: action.color }}
                        onClick={() =>
                          handleStatusUpdate(order._id, action.next)
                        }
                      >
                        {action.label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
