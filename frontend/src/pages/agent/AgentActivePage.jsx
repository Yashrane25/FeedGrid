import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  getAgentActiveOrder,
  markDelivered,
  updateLocation,
} from "../../services/agentService";
import LoadingSpinner from "../../components/LoadingSpinner";
import "./AgentActivePage.css";

const AgentActivePage = () => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [delivering, setDelivering] = useState(false);
  const [locationStatus, setLocationStatus] = useState("idle");

  const locationIntervalRef = useRef(null);
  const pollingRef = useRef(null);

  const fetchActiveOrder = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const data = await getAgentActiveOrder();
      setOrder(data.order);
    } catch (err) {
      console.error("Failed to fetch active order:", err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveOrder(true);
  }, [fetchActiveOrder]);

  //Poll every 15 seconds to catch any order changes
  useEffect(() => {
    pollingRef.current = setInterval(() => fetchActiveOrder(false), 15000);
    return () => clearInterval(pollingRef.current);
  }, [fetchActiveOrder]);

  const startLocationTracking = useCallback(() => {
    if (!order) return;

    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }

    setLocationStatus("tracking");

    //Send location immediately, then every 5 seconds
    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await updateLocation(
              order._id,
              position.coords.latitude,
              position.coords.longitude,
            );
          } catch (err) {
            console.error("Location update failed:", err.message);
          }
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setLocationStatus("denied");
            stopLocationTracking();
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        },
      );
    };

    //Send once immediately
    sendLocation();

    //Then every 5 seconds
    locationIntervalRef.current = setInterval(sendLocation, 5000);
  }, [order]);

  const stopLocationTracking = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    setLocationStatus("idle");
  };

  useEffect(() => {
    return () => {
      if (locationIntervalRef.current)
        clearInterval(locationIntervalRef.current);
    };
  }, []);

  const handleMarkDelivered = async () => {
    if (!window.confirm("Confirm delivery? This action cannot be undone."))
      return;

    setDelivering(true);
    stopLocationTracking();

    try {
      await markDelivered(order._id);
      setOrder(null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to mark as delivered");
      setDelivering(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading active delivery..." />;

  if (!order) {
    return (
      <div className="agent-active">
        <div className="agent-active__no-order">
          <div className="agent-active__no-order-icon">🛵</div>
          <h2 className="agent-active__no-order-title">No active delivery</h2>
          <p className="agent-active__no-order-sub">
            Accept an order from Available Pickups to start delivering
          </p>
          <Link to="/agent/dashboard" className="agent-active__browse-btn">
            View Available Orders
          </Link>
        </div>
      </div>
    );
  }

  const orderNumber = `#${order._id.slice(-6).toUpperCase()}`;

  return (
    <div className="agent-active">
      <h1 className="agent-active__title">Active Delivery</h1>

      {/* Order number banner */}
      <div className="agent-active__order-banner">
        <div className="agent-active__order-number">{orderNumber}</div>
        <div className="agent-active__order-status">Out for Delivery</div>
      </div>

      {/* Pickup info */}
      <div className="agent-active__card">
        <div className="agent-active__card-title">📦 Pickup From</div>
        <div className="agent-active__restaurant-name">
          {order.restaurant?.name}
        </div>
        <div className="agent-active__restaurant-address">
          {order.restaurant?.address?.street}, {order.restaurant?.address?.city}
        </div>
        {order.restaurant?.phone && (
          <a
            href={`tel:${order.restaurant.phone}`}
            className="agent-active__call-btn"
          >
            📞 Call Restaurant
          </a>
        )}
      </div>

      {/* Deliver to */}
      <div className="agent-active__card">
        <div className="agent-active__card-title">🏠 Deliver To</div>
        <div className="agent-active__customer-name">
          {order.customer?.name}
        </div>
        <div className="agent-active__delivery-address">
          {order.deliveryAddress?.street}, {order.deliveryAddress?.city},{" "}
          {order.deliveryAddress?.state} — {order.deliveryAddress?.pincode}
        </div>
        {order.customer?.phone && (
          <a
            href={`tel:${order.customer.phone}`}
            className="agent-active__call-btn"
          >
            📞 Call Customer
          </a>
        )}
      </div>

      {/* Items */}
      <div className="agent-active__card">
        <div className="agent-active__card-title">🧾 Order Items</div>
        {order.items.map((item, i) => (
          <div key={i} className="agent-active__item-row">
            <span>
              {item.name}
              <span className="agent-active__item-qty">× {item.quantity}</span>
            </span>
            <span className="agent-active__item-price">
              ₹{item.price * item.quantity}
            </span>
          </div>
        ))}
        <div className="agent-active__total-row">
          <span>Total</span>
          <span>₹{order.total}</span>
        </div>
      </div>

      {/* GPS Location sharing */}
      <div className="agent-active__card agent-active__location-card">
        <div className="agent-active__card-title">📡 Live Location Sharing</div>

        {locationStatus === "idle" && (
          <div>
            <p className="agent-active__location-hint">
              Share your live location so the customer can track their delivery
              on the map.
            </p>
            <button
              className="agent-active__start-location-btn"
              onClick={startLocationTracking}
            >
              Start Sharing Location
            </button>
          </div>
        )}

        {locationStatus === "tracking" && (
          <div className="agent-active__tracking-active">
            <span className="agent-active__tracking-dot" />
            <div>
              <div className="agent-active__tracking-title">
                Location sharing active
              </div>
              <div className="agent-active__tracking-sub">
                Your location is being sent every 5 seconds
              </div>
            </div>
            <button
              className="agent-active__stop-location-btn"
              onClick={stopLocationTracking}
            >
              Stop
            </button>
          </div>
        )}

        {locationStatus === "denied" && (
          <div className="agent-active__location-denied">
            ⚠️ Location access denied. Please enable location permissions in
            your browser settings and try again.
          </div>
        )}

        {locationStatus === "error" && (
          <div className="agent-active__location-denied">
            ⚠️ Geolocation is not supported by your browser.
          </div>
        )}
      </div>

      {/* Mark delivered button */}
      <button
        className={`agent-active__delivered-btn ${
          delivering ? "agent-active__delivered-btn--loading" : ""
        }`}
        onClick={handleMarkDelivered}
        disabled={delivering}
      >
        {delivering ? "Marking as delivered..." : "✅ Mark as Delivered"}
      </button>
    </div>
  );
};

export default AgentActivePage;
