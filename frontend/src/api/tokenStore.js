let accessToken = null;
let refreshToken = null;
let onLogoutCallback = null;

export function setTokens({ access, refresh }) {
  if (access !== undefined) accessToken = access;
  if (refresh !== undefined) refreshToken = refresh;
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
}

export function registerOnLogout(callback) {
  onLogoutCallback = callback;
}

export function triggerLogout() {
  clearTokens();
  if (onLogoutCallback) onLogoutCallback();
}
