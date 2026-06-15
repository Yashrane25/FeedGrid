import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "../api/axios.js";
import { useSocket } from "../hooks/useSocket.js";
import LiveMap from "../components/LiveMap.jsx";
import "./AgentPage.css";

export default function AgentPage() {
  const { orderId } = useParams();
  const socket = useSocket();
  const [order, setOrder] = useState(null);
  const [myPosition, setMyPosition] = useState(null); //{ lat, lng }
  const [tracking, setTracking] = useState(false); //Is GPS emission active?
  const [geoError, setGeoError] = useState("");
  const [loading, setLoading] = useState(true);
  const watchIdRef = useRef(null); //Geolocation watchPosition ID
  const emitIntervalRef = useRef(null); //setInterval ID for socket emit

  //Fetch order details
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await axios.get(`/orders/${orderId}`);
        setOrder(res.data.order);
      } catch (error) {
        console.error("Failed to fetch order:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  //Join the orders Socket.io room
  useEffect(() => {
    if (!socket || !orderId) return;
    socket.emit("join:order", orderId);
    return () => socket.emit("leave:order", orderId);
  }, [socket, orderId]);

  //Start GPS tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    setTracking(true);
    setGeoError("");

    //watchPosition is like getCurrentPosition but CONTINUOUS
    //It calls the callback every time the device moves
    //options.enableHighAccuracy: true uses GPS chip (more accurate, more battery)
    //options.maximumAge: 0 means never use cached position, always fresh
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setMyPosition({ lat, lng });
      },
      (error) => {
        const messages = {
          1: "Location permission denied. Please allow location access.",
          2: "Position unavailable. Check your GPS signal.",
          3: "Location request timed out.",
        };
        setGeoError(messages[error.code] || "Unknown geolocation error.");
        setTracking(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      },
    );
  }, []);

  //Emit location to Socket.io every 5 seconds
  useEffect(() => {
    if (!tracking || !socket || !orderId) return;

    emitIntervalRef.current = setInterval(() => {
      if (myPosition) {
        //emit to server, server validates and rebroadcasts to order room
        socket.emit("agent:location", {
          orderId,
          lat: myPosition.lat,
          lng: myPosition.lng,
        });
      }
    }, 5000); //5000ms = 5seconds

    return () => {
      if (emitIntervalRef.current) clearInterval(emitIntervalRef.current);
    };
  }, [tracking, socket, orderId, myPosition]);

  //Stop GPS tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (emitIntervalRef.current) {
      clearInterval(emitIntervalRef.current);
      emitIntervalRef.current = null;
    }
    setTracking(false);
  }, []);

  //Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  //Mark order as delivered
  const handleMarkDelivered = async () => {
    try {
      await axios.patch(`/orders/${orderId}/status`, { status: "delivered" });
      stopTracking();
      setOrder((prev) => ({ ...prev, status: "delivered" }));
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update status.");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        Loading order...
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        Order not found.
      </div>
    );
  }

  const isDelivered = order.status === "delivered";

  return (
    <div className="agent-page">
      {/* Header */}
      <div className="agent-header">
        <h1 className="agent-title">Delivery Order</h1>
        <p className="agent-order-id">#{orderId.slice(-8).toUpperCase()}</p>
      </div>

      {/* Delivery Address Card */}
      <div className="delivery-address-card">
        <div className="delivery-address-title">📍 Deliver to</div>
        <div className="delivery-address-text">
          {order.deliveryAddress.street}
          <br />
          {order.deliveryAddress.city}, {order.deliveryAddress.state}
          <br />
          {order.deliveryAddress.pincode}
        </div>
      </div>

      {/* Live Map */}
      <div className="agent-map-section">
        <div className="agent-map-header">
          <h3 style={{ margin: 0, fontSize: "15px" }}>Your Location</h3>
          {tracking && myPosition && (
            <span className="gps-active">
              <span className="gps-active-dot" />
              GPS active
            </span>
          )}
        </div>

        <LiveMap
          agentPosition={myPosition}
          restaurantLocation={
            order.restaurant?.location?.coordinates
              ? {
                  lat: order.restaurant.location.coordinates[1],
                  lng: order.restaurant.location.coordinates[0],
                }
              : null
          }
          height="260px"
        />
      </div>

      {/* GPS Position Display */}
      {myPosition && (
        <div className="coordinates-box">
          lat: {myPosition.lat.toFixed(6)} | lng: {myPosition.lng.toFixed(6)}
        </div>
      )}

      {/* Error display */}
      {geoError && <div className="geo-error">⚠️ {geoError}</div>}

      {/* Controls */}
      {!isDelivered ? (
        <div className="agent-controls">
          {/* Start/Stop tracking button */}
          {!tracking ? (
            <button onClick={startTracking} className="start-tracking-btn">
              📍 Start GPS Tracking
            </button>
          ) : (
            <button onClick={stopTracking} className="stop-tracking-btn">
              ⏹ Stop Tracking
            </button>
          )}

          {/* Mark as delivered */}
          {order.status === "out_for_delivery" && (
            <button
              onClick={handleMarkDelivered}
              className="mark-delivered-btn"
            >
              ✅ Mark as Delivered
            </button>
          )}
        </div>
      ) : (
        <div className="delivered-container">
          <div className="delivered-emoji">🎉</div>
          <h3 className="delivered-title">Order Delivered!</h3>
          <p className="delivered-text">
            Great job. The customer has been notified.
          </p>
        </div>
      )}

      {/* Order items summary */}
      <div className="order-summary">
        <h3 className="order-summary-title">Order Items</h3>
        {order.items.map((item) => (
          <div className="order-item-row">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>₹{item.price * item.quantity}</span>
          </div>
        ))}
        <div className="order-total-row">
          <span>Total</span>
          <span>₹{order.totalAmount}</span>
        </div>
      </div>
    </div>
  );
}
