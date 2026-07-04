import L from "leaflet";
import "./mapIcons.css";

//Restaurant marker: Orange pin - pickup point
export const restaurantIcon = L.divIcon({
    html: `
    <div class="map-icon map-icon--restaurant">
      <span class="map-icon__emoji">🏪</span>
    </div>
  `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
});

//Customer marker: Blue pin - delivery destination
export const customerIcon = L.divIcon({
    html: `
    <div class="map-icon map-icon--customer">
      <span class="map-icon__emoji">🏠</span>
    </div>
  `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
});

//Agent marker: Green animated marker moves in real time
export const agentIcon = L.divIcon({
    html: `
    <div class="map-agent">
      🛵
      <div class="map-agent__ring"></div>
    </div>
  `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
});