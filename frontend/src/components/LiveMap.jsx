import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import { restaurantIcon, customerIcon, agentIcon } from "../utils/mapIcons";
import "./LiveMap.css";

//automatically adjusts the zoom to fit all markers on screen
const MapAutoFit = ({ positions }) => {
  const map = useMap();

  useEffect(() => {
    if (!positions || positions.length === 0) {
      return;
    }

    //Filter out null/undefined positions
    const validPositions = positions.filter((p) => p && p[0] && p[1]);

    if (validPositions.length === 0) {
      return;
    }

    if (validPositions.length === 1) {
      map.setView(validPositions[0], 15);
      return;
    }

    //fitBounds shows all markers with some padding
    map.fitBounds(validPositions, { padding: [50, 50] });
  }, [map, JSON.stringify(positions)]);

  return null;
};

//Smoothly moves the agent marker when location updates Using a ref to access the marker instance directly
const AgentMarker = ({ position, label }) => {
  const markerRef = useRef(null);

  useEffect(() => {
    if (markerRef.current && position) {
      // setLatLng smoothly updates marker position
      markerRef.current.setLatLng(position);
    }
  }, [position]);

  if (!position) {
    return null;
  }

  return (
    <Marker position={position} icon={agentIcon} ref={markerRef}>
      <Popup>{label || "Delivery Agent"}</Popup>
    </Marker>
  );
};

//main map components
const LiveMap = ({
  restaurantPosition,
  customerPosition,
  agentPosition,
  restaurantName = "Restaurant",
  customerName = "Delivery Address",
  agentName = "Delivery Agent",
}) => {
  //Default center point is India
  const defaultCenter = [20.5937, 78.9629];
  const defaultZoom = 5;

  //use restaurant position if available to determine initial center
  const initialCenter = restaurantPosition || defaultCenter;
  const initialZoom = restaurantPosition ? 14 : defaultZoom;

  //Build polyline path, restaurant -> agent (if exists) -> customer
  //This draws the route on the map
  const polylinePoints = [];
  if (restaurantPosition) {
    polylinePoints.push(restaurantPosition);
  }
  if (agentPosition) {
    polylinePoints.push(agentPosition);
  }
  if (customerPosition) {
    polylinePoints.push(customerPosition);
  }

  // All positions to fit in view
  const allPositions = [
    restaurantPosition,
    agentPosition,
    customerPosition,
  ].filter(Boolean);

  return (
    <div className="live-map">
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        className="live-map__container"
        //scrollWheelZoom allows zooming with the mouse wheel
        scrollWheelZoom={true}
      >
        {/* OpenStreetMap tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Autofit map to show all markers */}
        <MapAutoFit positions={allPositions} />

        {/* Restaurant marker */}
        {restaurantPosition && (
          <Marker position={restaurantPosition} icon={restaurantIcon}>
            <Popup>
              <strong>🏪 {restaurantName}</strong>
              <br />
              Pickup point
            </Popup>
          </Marker>
        )}

        {/* Customer marker */}
        {customerPosition && (
          <Marker position={customerPosition} icon={customerIcon}>
            <Popup>
              <strong>🏠 {customerName}</strong>
              <br />
              Delivery address
            </Popup>
          </Marker>
        )}

        {/* Agent marker updates in real time */}
        <AgentMarker position={agentPosition} label={agentName} />

        {/* Route polyline */}
        {polylinePoints.length >= 2 && (
          <Polyline
            positions={polylinePoints}
            color="#e85d04"
            weight={3}
            opacity={0.7}
            dashArray="8, 8"
          />
        )}
      </MapContainer>

      {/* Map legend */}
      <div className="live-map__legend">
        <div className="live-map__legend-item">
          <span className="live-map__legend-dot live-map__legend-dot--restaurant" />
          Restaurant
        </div>
        <div className="live-map__legend-item">
          <span className="live-map__legend-dot live-map__legend-dot--agent" />
          Agent
        </div>
        <div className="live-map__legend-item">
          <span className="live-map__legend-dot live-map__legend-dot--customer" />
          You
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
