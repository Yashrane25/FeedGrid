import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "../api/axios.js";
import { useCart } from "../context/CartContext.jsx";
import "./OrdersPage.css";

const STATUS_COLORS = {
  pending: { bg: "#fff8e1", color: "#f59f00", label: "Pending" },
  confirmed: { bg: "#e8f5e9", color: "#388e3c", label: "Confirmed" },
  preparing: { bg: "#e3f2fd", color: "#1976d2", label: "Preparing" },
  out_for_delivery: {
    bg: "#f3e5f5",
    color: "#7b1fa2",
    label: "Out for delivery",
  },
  delivered: { bg: "#e8f5e9", color: "#388e3c", label: "Delivered" },
  cancelled: { bg: "#ffebee", color: "#c62828", label: "Cancelled" },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const { addToCart, clearCart } = useCart();

  const paymentSuccess = searchParams.get("success") === "true";

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get("/orders/my-orders");
        setOrders(res.data.orders);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleReorder = async (orderId) => {
    try {
      const res = await axios.post(`/orders/${orderId}/reorder`);
      const { restaurantId, restaurantName, items } = res.data;

      clearCart();

      items.forEach((item) => {
        addToCart(
          {
            _id: item.menuItemId,
            name: item.name,
            price: item.price,
            image: item.image,
            isVeg: item.isVeg,
          },
          {
            _id: restaurantId,
            name: restaurantName,
          },
        );
      });

      window.location.href = "/cart";
    } catch (error) {
      alert(error.response?.data?.message || "Reorder failed.");
    }
  };

  if (loading) {
    return <div className="orders-loading">Loading orders...</div>;
  }

  return (
    <div className="orders-page">
      {paymentSuccess && (
        <div className="payment-success-banner">
          🎉 Payment successful! Your order has been placed and the restaurant
          has been notified.
        </div>
      )}

      <h1 className="orders-title">Your Orders</h1>

      {orders.length === 0 ? (
        <div className="empty-orders">
          <div className="empty-orders-icon">📦</div>
          <p>No orders yet. Go order something delicious!</p>

          <Link to="/" className="browse-restaurants-link">
            Browse Restaurants →
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const statusInfo =
              STATUS_COLORS[order.status] || STATUS_COLORS.pending;

            return (
              <div key={order._id} className="order-card">
                <div className="order-header">
                  <div>
                    <div className="restaurant-name">
                      {order.restaurant?.name}
                    </div>

                    <div className="order-date">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <span
                    className="status-badge"
                    style={{
                      background: statusInfo.bg,
                      color: statusInfo.color,
                    }}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                <div className="order-items">
                  {order.items
                    .map((item) => `${item.name} × ${item.quantity}`)
                    .join("  •  ")}
                </div>

                <div className="order-footer">
                  <span className="order-total">₹{order.totalAmount}</span>

                  <div className="order-actions">
                    {["confirmed", "preparing", "out_for_delivery"].includes(
                      order.status,
                    ) && (
                      <Link
                        to={`/track/${order._id}`}
                        className="track-order-btn"
                      >
                        Track Order
                      </Link>
                    )}

                    {order.status === "delivered" && !order.rating?.score && (
                      <RatingModal
                        orderId={order._id}
                        onRated={() =>
                          setOrders((prev) =>
                            prev.map((o) =>
                              o._id === order._id
                                ? { ...o, rating: { score: 5 } }
                                : o,
                            ),
                          )
                        }
                      />
                    )}

                    {order.status === "delivered" && (
                      <button
                        onClick={() => handleReorder(order._id)}
                        className="reorder-btn"
                      >
                        Reorder
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

function RatingModal({ orderId, onRated }) {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(5);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      await axios.post(`/orders/${orderId}/rate`, {
        score,
        review,
      });

      onRated();
      setOpen(false);
    } catch (error) {
      alert(error.response?.data?.message || "Rating failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="rate-btn">
        ⭐ Rate
      </button>

      {open && (
        <div className="modal-overlay">
          <div className="rating-modal">
            <h3 className="rating-modal-title">Rate your order</h3>

            <div className="star-selector">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setScore(s)}
                  className="star-btn"
                  style={{
                    opacity: s <= score ? 1 : 0.3,
                  }}
                >
                  ⭐
                </button>
              ))}
            </div>

            <textarea
              placeholder="Write a review (optional)"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={3}
              className="review-textarea"
            />

            <div className="modal-actions">
              <button onClick={() => setOpen(false)} className="cancel-btn">
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="submit-btn"
              >
                {loading ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
