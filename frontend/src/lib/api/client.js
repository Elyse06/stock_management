import axios from "axios";

import { API_BASE_URL, API_TIMEOUT } from "@/config/env";
import { API_ENDPOINTS } from "@/config/endpoints";

import { getAccessToken, getRefreshToken, setTokens, triggerLogout } from "./tokenStore";

export const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: API_TIMEOUT });

export const publicClient = axios.create({ baseURL: API_BASE_URL, timeout: API_TIMEOUT });

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

export function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) return Promise.reject(new Error("Aucun jeton de rafraîchissement."));
  if (!refreshPromise) {
    refreshPromise = publicClient
      .post(API_ENDPOINTS.REFRESH, { refresh })
      .then(({ data }) => {
        setTokens({ access: data.access });
        return data.access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    if (error.response?.status !== 401 || !request || request._retry) {
      return Promise.reject(error);
    }
    request._retry = true;
    try {
      const access = await refreshAccessToken();
      request.headers.Authorization = `Bearer ${access}`;
      return apiClient(request);
    } catch {
      triggerLogout();
      return Promise.reject(error);
    }
  },
);
