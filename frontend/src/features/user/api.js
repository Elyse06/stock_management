import { apiClient } from "../../api/client";

const BASE = "/api/utilisateurs";

// --- Profils ---
export const listProfils = (params = {}) =>
  apiClient.get(`${BASE}/profils/`, { params }).then((r) => r.data);
export const createProfil = (payload) =>
  apiClient.post(`${BASE}/profils/`, payload).then((r) => r.data);
export const updateProfil = (id, payload) =>
  apiClient.put(`${BASE}/profils/${id}/`, payload).then((r) => r.data);
export const deleteProfil = (id) => apiClient.delete(`${BASE}/profils/${id}/`);

// --- Employes ---
export const listEmployes = (params = {}) =>
  apiClient.get(`${BASE}/employes/`, { params }).then((r) => r.data);
export const createEmploye = (payload) =>
  apiClient.post(`${BASE}/employes/`, payload).then((r) => r.data);
export const updateEmploye = (id, payload) =>
  apiClient.put(`${BASE}/employes/${id}/`, payload).then((r) => r.data);
export const deleteEmploye = (id) => apiClient.delete(`${BASE}/employes/${id}/`);

// --- Utilisateurs ---
export const listUtilisateurs = (params = {}) =>
  apiClient.get(`${BASE}/utilisateurs/`, { params }).then((r) => r.data);
export const createUtilisateur = (payload) =>
  apiClient.post(`${BASE}/utilisateurs/`, payload).then((r) => r.data);
export const updateUtilisateur = (id, payload) =>
  apiClient.put(`${BASE}/utilisateurs/${id}/`, payload).then((r) => r.data);
export const deleteUtilisateur = (id) => apiClient.delete(`${BASE}/utilisateurs/${id}/`);

// --- Auth ---
export const getCurrentUser = () =>
  apiClient.get("/api/auth/me/").then((r) => r.data);
export const login = (nom_user, password) =>
  apiClient.post("/api/auth/login/", { username: nom_user, password }).then((r) => r.data);
export const refreshToken = (refresh) =>
  apiClient.post("/api/auth/refresh/", { refresh }).then((r) => r.data);
