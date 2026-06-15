import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "./LiveMap.css";

//Custom icons
const agentIcon = L.divIcon({
  html: `<div class="agent-icon">🛵</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  className: "",
});

const restaurantIcon = L.divIcon({
  html: `<div class="restaurant-icon">🍽️</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  className: "",
});

const customerIcon = L.divIcon({
  html: `<div class="customer-icon"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  className: "",
});

//Smooth marker movement component
function SmoothAgentMarker({ position }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!markerRef.current || !position) {
      return;
    }

    markerRef.current.setLatLng([position.lat, position.lng]);
  }, [position]);

  if (!position) {
    return null;
  }

  return (
    <Marker
      ref={markerRef}
      position={[position.lat, position.lng]}
      icon={agentIcon}
    >
      <Popup>
        <strong>Delivery Agent</strong>
        <br />
        On the way to you!
      </Popup>
    </Marker>
  );
}

//Auto pan map when agent moves
function MapController({ agentPosition, fitBounds }) {
  const map = useMap();

  useEffect(() => {
    if (!agentPosition) {
      return;
    }

    map.panTo([agentPosition.lat, agentPosition.lng], {
      animate: true,
      duration: 0.8,
    });
  }, [agentPosition, map]);

  useEffect(() => {
    if (!fitBounds || fitBounds.length < 2) {
      return;
    }

    const bounds = L.latLngBounds(fitBounds);

    map.fitBounds(bounds, {
      padding: [60, 60],
    });
  }, [fitBounds, map]);

  return null;
}

//Main LiveMap component
export default function LiveMap({
  agentPosition,
  restaurantLocation,
  customerLocation,
  height = "350px",
  routeCoords = [],
}) {
  const defaultCenter = customerLocation
    ? [customerLocation.lat, customerLocation.lng]
    : [23.0225, 72.5714];

  const boundsPoints = [];

  if (restaurantLocation) {
    boundsPoints.push([restaurantLocation.lat, restaurantLocation.lng]);
  }

  if (customerLocation) {
    boundsPoints.push([customerLocation.lat, customerLocation.lng]);
  }

  if (agentPosition) {
    boundsPoints.push([agentPosition.lat, agentPosition.lng]);
  }

  return (
    <div className="live-map-container" style={{ height }}>
      <MapContainer
        center={defaultCenter}
        zoom={14}
        scrollWheelZoom={false}
        className="live-map"
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        <MapController
          agentPosition={agentPosition}
          fitBounds={boundsPoints.length >= 2 ? boundsPoints : null}
        />

        {restaurantLocation && (
          <Marker
            position={[restaurantLocation.lat, restaurantLocation.lng]}
            icon={restaurantIcon}
          >
            <Popup>
              <strong>Restaurant</strong>
              <br />
              Order picked up from here
            </Popup>
          </Marker>
        )}

        {customerLocation && (
          <Marker
            position={[customerLocation.lat, customerLocation.lng]}
            icon={customerIcon}
          >
            <Popup>
              <strong>Your Location</strong>
              <br />
              Delivery destination
            </Popup>
          </Marker>
        )}

        <SmoothAgentMarker position={agentPosition} />

        {routeCoords.length >= 2 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{
              color: "#e23744",
              weight: 3,
              opacity: 0.7,
              dashArray: "8, 6",
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
