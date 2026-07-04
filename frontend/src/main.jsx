import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

//Fix Leaflet default marker icons in Vite
import "./utils/leafletIconFix.js";

//Leaflet CSS imported globally for the map to render correctly
import "leaflet/dist/leaflet.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
