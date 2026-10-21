const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");
export const IS_DEV = import.meta.env.DEV;

export const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;
export const UPLOAD_TIMEOUT = 120000;

if (!IS_DEV && API_BASE_URL.startsWith("http://") && !API_BASE_URL.includes("localhost")) {
  // En production, l'API doit être servie en HTTPS (les jetons transitent dans les en-têtes).
  console.warn("VITE_API_BASE_URL devrait utiliser HTTPS en production.");
}
