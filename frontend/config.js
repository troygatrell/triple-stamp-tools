// Centralized API configuration for Triple Stamp Tools
// Set to true when you run the backend server locally (npm start in backend/)
const USE_LOCAL_BACKEND = false;

const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "[::1]" ||
  window.location.protocol === "file:"
);

const API_CONFIG = {
  // If USE_LOCAL_BACKEND is true and running on localhost, route to local Express backend.
  // Otherwise connect to the live Render services.
  INVENTORY_API: (window.CUSTOM_API_CONFIG && window.CUSTOM_API_CONFIG.INVENTORY_API) || (
    (USE_LOCAL_BACKEND && isLocalhost)
      ? "http://localhost:3000/api/inventory"
      : "https://inventory-search.onrender.com/api/inventory"
  ),

  INK_FORMULA_API: (window.CUSTOM_API_CONFIG && window.CUSTOM_API_CONFIG.INK_FORMULA_API) || (
    (USE_LOCAL_BACKEND && isLocalhost)
      ? "http://localhost:3000"
      : "https://ink-formulas.onrender.com"
  )
};

// Supabase Configuration
const SUPABASE_CONFIG = {
  URL: (window.CUSTOM_API_CONFIG && window.CUSTOM_API_CONFIG.SUPABASE_URL) || "https://ajztkwmnkxvfoakkepxs.supabase.co",
  ANON_KEY: (window.CUSTOM_API_CONFIG && window.CUSTOM_API_CONFIG.SUPABASE_ANON_KEY) || "sb_publishable_roT3E5sRppxA36HYL6ImDg_zWJ2gu7z",
};

let supabaseClient = null;
if (typeof supabase !== "undefined" && typeof supabase.createClient === "function" && SUPABASE_CONFIG.URL && SUPABASE_CONFIG.ANON_KEY) {
  supabaseClient = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);
}
