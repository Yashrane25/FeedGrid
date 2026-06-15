import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "../api/axios.js";
import { useSocket } from "../hooks/useSocket.js";
import LiveMap from "../components/LiveMap.jsx";
import { geocodeAddress } from "../utils/geocode.js";
import "./TrackOrderPage.css";

//The 6 statuses in order used to render the progress bar
const ORDER_STEPS = [
  {
    key: "pending",
    icon: "🧾",
    label: "Order Placed",
    desc: "Your order has been received",
  },
  {
    key: "confirmed",
    icon: "✅",
    label: "Confirmed",
    desc: "Restaurant accepted your order",
  },
  {
    key: "preparing",
    icon: "👨‍🍳",
    label: "Preparing",
    desc: "Kitchen is preparing your food",
  },
  {
    key: "out_for_delivery",
    icon: "🛵",
    label: "Out for Delivery",
    desc: "Your order is on its way",
  },
  {
    key: "delivered",
    icon: "🎉",
    label: "Delivered",
    desc: "Enjoy your meal!",
  },
];

export default function TrackOrderPage() {
  const [customerCoords, setCustomerCoords] = useState(null);
  const { id } = useParams();
  const socket = useSocket();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agentLocation, setAgentLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const timerRef = useRef(null);

  //Fetch initial order data
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await axios.get(`/orders/${id}`);
        setOrder(res.data.order);
      } catch (error) {
        console.error("Failed to fetch order:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  //Socket.io: join order room and listen for events
  useEffect(() => {
    if (!socket || !id) {
      return;
    }

    //Join the room for this specific order
    socket.emit("join:order", id);

    //Listen: status changed by restaurant
    socket.on(
      "order:statusUpdate",
      ({ orderId, status, estimatedDeliveryTime, timestamp }) => {
        if (orderId !== id) {
          return;
        }

        setOrder((prev) => {
          if (!prev) {
            return prev;
          }
          return {
            ...prev,
            status,
            estimatedDeliveryTime:
              estimatedDeliveryTime || prev.estimatedDeliveryTime,
            statusTimestamps: {
              ...prev.statusTimestamps,
              [status]: timestamp,
            },
          };
        });

        //Start ETA countdown when order goes "out_for_delivery"
        if (status === "out_for_delivery") {
          startEtaCountdown(estimatedDeliveryTime || 30);
        }

        //Stop countdown when delivered
        if (status === "delivered" || status === "cancelled") {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          setEta(null);
        }
      },
    );

    //Listen: delivery agent location broadcast
    //Every 5 seconds the agent emits their GPS -> we receive it here
    socket.on("location:update", ({ lat, lng }) => {
      setAgentLocation({ lat, lng });
    });

    //Listen: agent assigned notification
    socket.on("order:agentAssigned", ({ message }) => {
      console.log(message);
    });

    //Cleanup: leave the room and remove listeners when component unmounts
    return () => {
      socket.emit("leave:order", id);
      socket.off("order:statusUpdate");
      socket.off("location:update");
      socket.off("order:agentAssigned");
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [socket, id]);

  useEffect(() => {
    if (!order?.deliveryAddress) {
      return;
    }

    const fetchCoords = async () => {
      const coords = await geocodeAddress(order.deliveryAddress);
      if (coords) {
        setCustomerCoords(coords);
      }
    };

    fetchCoords();
  }, [order?.deliveryAddress]);

  //ETA Countdown Timer
  const startEtaCountdown = (minutes) => {
    let secondsLeft = minutes * 60;
    setEta(secondsLeft);

    timerRef.current = setInterval(() => {
      secondsLeft -= 1;
      setEta(secondsLeft);
      if (secondsLeft <= 0) {
        clearInterval(timerRef.current);
        setEta(0);
      }
    }, 1000);
  };

  const formatEta = (seconds) => {
    if (seconds <= 0) return "Any moment now...";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  if (loading) {
    return (
      <div className="track-loading">
        <div className="track-loading-icon">⏳</div>
        <p>Loading your order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="track-not-found">
        <p>Order not found.</p>
      </div>
    );
  }

  const currentStepIndex = ORDER_STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="track-page">
      {/* Header */}
      <div className="track-header">
        <div className="track-order-id">
          Order #{order._id.slice(-8).toUpperCase()}
        </div>
        <h1 className="track-title">
          {isCancelled ? "Order Cancelled" : "Tracking your order"}
        </h1>
        <p className="track-restaurant-name">{order.restaurant?.name}</p>
      </div>

      {/* ETA Banner */}
      {eta !== null && order.status === "out_for_delivery" && (
        <div className="track-eta-banner">
          <div>
            <div className="track-eta-label">Estimated arrival</div>
            <div className="track-eta-value">{formatEta(eta)}</div>
          </div>
          <div className="track-eta-icon">🛵</div>
        </div>
      )}

      {/* Progress Steps */}
      {!isCancelled ? (
        <div className="track-steps-card">
          {ORDER_STEPS.map((step, index) => {
            const isDone = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isPending = index > currentStepIndex;

            return (
              <div key={step.key} className="track-step">
                {/* Vertical connector line between steps */}
                {index < ORDER_STEPS.length - 1 && (
                  <div
                    className={`track-step-connector ${
                      isDone
                        ? "track-step-connector--done"
                        : "track-step-connector--pending"
                    }`}
                  />
                )}

                {/* Step icon circle */}
                <div
                  className={`track-step-icon ${
                    isDone
                      ? "track-step-icon--done"
                      : isCurrent
                        ? "track-step-icon--current"
                        : "track-step-icon--pending"
                  }`}
                >
                  {isDone ? "✓" : step.icon}
                </div>

                {/* Step text */}
                <div
                  className={`track-step-body ${
                    isPending
                      ? "track-step-body--pending"
                      : "track-step-body--active"
                  }`}
                >
                  <div
                    className={`track-step-label ${
                      isDone
                        ? "track-step-label--done"
                        : isCurrent
                          ? "track-step-label--current"
                          : "track-step-label--pending"
                    }`}
                  >
                    {step.label}
                  </div>
                  <div className="track-step-desc">
                    {isCurrent ? step.desc : isDone ? "Done" : step.desc}
                  </div>
                  {/* Timestamp for completed steps */}
                  {(isDone || isCurrent) &&
                    order.statusTimestamps?.[step.key] && (
                      <div className="track-step-timestamp">
                        {new Date(
                          order.statusTimestamps[step.key],
                        ).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="track-cancelled-card">
          <div className="track-cancelled-icon">😔</div>
          <h3 className="track-cancelled-title">Order Cancelled</h3>
          <p className="track-cancelled-desc">
            Your refund will be processed within 5-7 business days.
          </p>
        </div>
      )}

      {/* Live Map */}
      {["out_for_delivery", "preparing", "confirmed"].includes(
        order.status,
      ) && (
        <div className="live-map-section">
          <div className="live-map-header">
            <h3 className="live-map-title">
              {order.status === "out_for_delivery"
                ? "Live Tracking 🔴"
                : "Delivery Route"}
            </h3>

            {order.status === "out_for_delivery" && agentLocation && (
              <span className="live-status">
                <span className="live-status-dot" />
                Live
              </span>
            )}
          </div>

          <LiveMap
            agentPosition={agentLocation}
            restaurantLocation={
              order.restaurant?.location?.coordinates
                ? {
                    lat: order.restaurant.location.coordinates[1],
                    lng: order.restaurant.location.coordinates[0],
                  }
                : null
            }
            customerLocation={customerCoords}
            routeCoords={[
              order.restaurant?.location?.coordinates
                ? [
                    order.restaurant.location.coordinates[1],
                    order.restaurant.location.coordinates[0],
                  ]
                : null,

              agentLocation ? [agentLocation.lat, agentLocation.lng] : null,
            ].filter(Boolean)}
            height="320px"
          />

          {agentLocation && (
            <p className="last-updated">
              Last updated:{" "}
              {new Date(
                agentLocation.timestamp || Date.now(),
              ).toLocaleTimeString("en-IN")}
            </p>
          )}
        </div>
      )}

      {/* Order Summary */}
      <div className="track-summary-card">
        <h3 className="track-summary-title">Order Details</h3>

        {order.items.map((item) => (
          <div key={item.menuItemId} className="track-summary-item">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>₹{item.price * item.quantity}</span>
          </div>
        ))}

        <div className="track-summary-divider">
          {[
            { label: "Subtotal", value: order.subtotal },
            { label: "Delivery fee", value: order.deliveryFee },
            { label: "GST", value: order.tax },
          ].map(({ label, value }) => (
            <div key={label} className="track-summary-fee-row">
              <span>{label}</span>
              <span>₹{value}</span>
            </div>
          ))}
          <div className="track-summary-total">
            <span>Total Paid</span>
            <span>₹{order.totalAmount}</span>
          </div>
        </div>

        <div className="track-delivery-address">
          <strong>Delivering to:</strong> {order.deliveryAddress.street},{" "}
          {order.deliveryAddress.city}, {order.deliveryAddress.state} -{" "}
          {order.deliveryAddress.pincode}
        </div>
      </div>
    </div>
  );
}
