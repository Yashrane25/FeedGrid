import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getOrderById } from "../services/orderService";
import { useSocket } from "../context/SocketContext";
import useSocketEvent from "../hooks/useSocketEvent";
import LiveMap from "../components/LiveMap";
import LoadingSpinner from "../components/LoadingSpinner";
import { geocodeAddress, buildAddressString } from "../utils/geocode";
import "./LiveTrackingPage.css";

const LiveTrackingPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  //Map positions  [latitude, longitude]
  const [restaurantPosition, setRestaurantPosition] = useState(null);
  const [customerPosition, setCustomerPosition] = useState(null);

  //Agent position updates via socket
  const [agentPosition, setAgentPosition] = useState(null);

  //ETA countdown
  const [eta, setEta] = useState(null);
  const etaIntervalRef = useRef(null);

  const [lastAgentUpdate, setLastAgentUpdate] = useState(null);

  //Fetch order data
  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOrderById(orderId);
      const fetchedOrder = data.order;
      setOrder(fetchedOrder);

      //Set ETA from order
      if (fetchedOrder.estimatedDeliveryTime) {
        setEta(fetchedOrder.estimatedDeliveryTime * 60); //Convert to seconds
      }

      if (
        fetchedOrder.deliveryLocation?.coordinates &&
        fetchedOrder.deliveryLocation.coordinates[0] !== 0
      ) {
        const [lng, lat] = fetchedOrder.deliveryLocation.coordinates;
        setAgentPosition([lat, lng]);
      }

      //Geocode restaurant and customer addresses
      await geocodeLocations(fetchedOrder);
    } catch (err) {
      if (err.response?.status === 404) {
        setError("Order not found");
      } else {
        setError("Failed to load tracking information");
      }
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  //Geocode both addresses on load
  const geocodeLocations = async (orderData) => {
    //Geocode restaurant address
    if (orderData.restaurant?.address) {
      const restaurantAddr = buildAddressString(orderData.restaurant.address);
      if (restaurantAddr) {
        const coords = await geocodeAddress(restaurantAddr);
        if (coords) {
          setRestaurantPosition([coords.latitude, coords.longitude]);
        }
      }
    }

    // Small delay to respect Nominatim rate limit (1 req/sec)
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Geocode customer delivery address
    if (orderData.deliveryAddress) {
      const customerAddr = buildAddressString(orderData.deliveryAddress);
      if (customerAddr) {
        const coords = await geocodeAddress(customerAddr);
        if (coords) {
          setCustomerPosition([coords.latitude, coords.longitude]);
        }
      }
    }
  };

  //Join order room for location updates
  useEffect(() => {
    if (!socket || !orderId) return;
    socket.emit("join_order_room", orderId);
    return () => socket.emit("leave_order_room", orderId);
  }, [socket, orderId]);

  //Socket: agent location update
  const handleAgentLocation = useCallback(
    (data) => {
      if (data.orderId !== orderId) return;
      const { latitude, longitude } = data.location;
      setAgentPosition([latitude, longitude]);
      setLastAgentUpdate(new Date());
    },
    [orderId],
  );

  useSocketEvent("agent_location_update", handleAgentLocation);

  //Socket: order status update
  const handleStatusUpdate = useCallback(
    (data) => {
      if (data.order?._id === orderId) {
        setOrder(data.order);
      }
    },
    [orderId],
  );

  useSocketEvent("order_status_update", handleStatusUpdate);

  //ETA countdown timer
  useEffect(() => {
    if (!eta || eta <= 0) return;

    etaIntervalRef.current = setInterval(() => {
      setEta((prev) => {
        if (prev <= 1) {
          clearInterval(etaIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(etaIntervalRef.current);
  }, [eta]);

  //Format seconds as mm:ss
  const formatEta = (seconds) => {
    if (!seconds || seconds <= 0) return "Arriving soon";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  if (loading) return <LoadingSpinner message="Loading live tracking..." />;

  if (error) {
    return (
      <div className="live-tracking__error">
        <div className="live-tracking__error-icon">⚠️</div>
        <p>{error}</p>
        <Link to="/my-orders" className="live-tracking__back-link">
          Back to My Orders
        </Link>
      </div>
    );
  }

  if (!order) return null;

  //Only show live tracking for out_for_delivery orders
  if (order.status !== "out_for_delivery") {
    return (
      <div className="live-tracking__not-active">
        <div className="live-tracking__not-active-icon">🗺️</div>
        <h2 className="live-tracking__not-active-title">
          Live tracking not available
        </h2>
        <p className="live-tracking__not-active-sub">
          Live map tracking is only available while your order is out for
          delivery. Your order is currently:{" "}
          <strong>{order.status.replace(/_/g, " ")}</strong>
        </p>
        <Link to={`/orders/${orderId}`} className="live-tracking__track-link">
          View Order Status →
        </Link>
      </div>
    );
  }

  const orderNumber = `#${order._id.slice(-6).toUpperCase()}`;

  return (
    <div className="live-tracking">
      {/* Header */}
      <div className="live-tracking__header">
        <button
          className="live-tracking__back-btn"
          onClick={() => navigate(`/orders/${orderId}`)}
        >
          ← Order Status
        </button>
        <div className="live-tracking__header-right">
          <span className="live-tracking__live-badge">
            <span className="live-tracking__live-dot" />
            LIVE
          </span>
        </div>
      </div>

      {/* ETA banner */}
      <div className="live-tracking__eta-banner">
        <div className="live-tracking__eta-icon">🛵</div>
        <div className="live-tracking__eta-content">
          <div className="live-tracking__eta-label">Estimated arrival</div>
          <div className="live-tracking__eta-value">{formatEta(eta)}</div>
        </div>
        <div className="live-tracking__order-info">
          <div className="live-tracking__order-number">{orderNumber}</div>
          <div className="live-tracking__restaurant-name">
            {order.restaurant?.name}
          </div>
        </div>
      </div>

      {/* Live Map */}
      <div className="live-tracking__map-section">
        <LiveMap
          restaurantPosition={restaurantPosition}
          customerPosition={customerPosition}
          agentPosition={agentPosition}
          restaurantName={order.restaurant?.name}
          customerName="Your Address"
          agentName={order.deliveryAgent?.name || "Delivery Agent"}
        />

        {/* Agent location status */}
        <div className="live-tracking__location-status">
          {agentPosition ? (
            <div className="live-tracking__location-active">
              <span className="live-tracking__location-dot" />
              Agent location live
              {lastAgentUpdate && (
                <span className="live-tracking__location-time">
                  · Updated{" "}
                  {lastAgentUpdate.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              )}
            </div>
          ) : (
            <div className="live-tracking__location-waiting">
              ⏳ Waiting for agent location...
            </div>
          )}
        </div>
      </div>

      {/* Delivery details */}
      <div className="live-tracking__details">
        <div className="live-tracking__detail-card">
          <div className="live-tracking__detail-label">📦 Pickup from</div>
          <div className="live-tracking__detail-value">
            {order.restaurant?.name}
          </div>
          <div className="live-tracking__detail-sub">
            {order.restaurant?.address?.street},{" "}
            {order.restaurant?.address?.city}
          </div>
        </div>

        <div className="live-tracking__detail-arrow">→</div>

        <div className="live-tracking__detail-card">
          <div className="live-tracking__detail-label">🏠 Deliver to</div>
          <div className="live-tracking__detail-value">Your Address</div>
          <div className="live-tracking__detail-sub">
            {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
          </div>
        </div>
      </div>

      {/* Map tips */}
      {!restaurantPosition && !customerPosition && (
        <div className="live-tracking__geocoding-notice">
          🗺️ Locating addresses on map...
        </div>
      )}

      {/* Link to full order status */}
      <div className="live-tracking__footer">
        <Link to={`/orders/${orderId}`} className="live-tracking__status-link">
          View Full Order Status →
        </Link>
      </div>
    </div>
  );
};

export default LiveTrackingPage;
