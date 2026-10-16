const REFRESH_TOKEN_KEY = "stock.refresh_token";
const LEGACY_KEYS = ["access_token", "refresh_token"];

let accessToken = null;
let onLogoutCallback = null;

LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));

export function setTokens({ access, refresh }) {
  if (access !== undefined) accessToken = access || null;
  if (refresh !== undefined) {
    if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export const getAccessToken = () => accessToken;
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export function clearTokens() {
  accessToken = null;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function registerOnLogout(callback) {
  onLogoutCallback = callback;
}

export function triggerLogout() {
  clearTokens();
  onLogoutCallback?.();
}

window.addEventListener("storage", (event) => {
  if (event.key === REFRESH_TOKEN_KEY && !event.newValue) {
    accessToken = null;
    onLogoutCallback?.();
  }
});
