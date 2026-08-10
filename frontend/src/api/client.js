import axios from "axios";
import { getAccessToken, getRefreshToken, setTokens, triggerLogout } from "./tokenStore";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Pour ajouter auto.. le token acces pour chaque requete
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


//refraichissement et si echoue, deconnecté 
let refreshPromise = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.includes("/api/auth/");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        triggerLogout();
        return Promise.reject(error);
      }

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_BASE_URL}/api/auth/refresh/`, { refresh: refreshToken })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const { data } = await refreshPromise;
        setTokens({ access: data.access });
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        triggerLogout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
