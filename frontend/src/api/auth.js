import axios from "axios";
import { apiClient } from "./client";
import { setTokens, clearTokens } from "./tokenStore";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function login(utilisateur_mail, password) {
  const { data } = await axios.post(`${API_BASE_URL}/api/auth/login/`, {
    utilisateur_mail,
    password,
  });
  setTokens({ access: data.access, refresh: data.refresh });

  const me = await apiClient.get("/api/auth/me/");
  return me.data;
}

export function logout() {
  clearTokens();
}

export async function fetchCurrentUser() {
  const { data } = await apiClient.get("/api/auth/me/");
  return data;
}