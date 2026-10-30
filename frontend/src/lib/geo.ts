// Nagpur (Maharashtra) — default map framing for every Leaflet view.
export const CITY_NAME = "Nagpur";
export const CITY_CENTER: [number, number] = [21.1458, 79.0882];
export const CITY_ZOOM = 12;
export const CITY_BOUNDS: [[number, number], [number, number]] = [[20.95, 78.85], [21.3, 79.3]];

const CARTO_KEY = (import.meta as any).env?.VITE_CARTO_API_KEY;

// CARTO Dark Matter requires a key from carto.com/basemaps/apikey.
// If not configured, fall back to free OSM tiles with dark mode CSS filter
// so maps work seamlessly without 'API KEY REQUIRED' watermark.
export const HAS_CARTO_KEY = Boolean(CARTO_KEY);
export const CARTO_DARK_URL = CARTO_KEY
  ? `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${CARTO_KEY}`
  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const CARTO_ATTRIBUTION = CARTO_KEY
  ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const CARTO_SUBDOMAINS = CARTO_KEY ? "abcd" : "abc";

