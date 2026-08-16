import { apiClient } from "../../api/client";

const BASE = "/api/stock";

// --- Magasins ---
export const listMagasins = (params = {}) =>
  apiClient.get(`${BASE}/magasins/`, { params }).then((r) => r.data);
export const createMagasin = (payload) =>
  apiClient.post(`${BASE}/magasins/`, payload).then((r) => r.data);
export const updateMagasin = (id, payload) =>
  apiClient.put(`${BASE}/magasins/${id}/`, payload).then((r) => r.data);
export const deleteMagasin = (id) => apiClient.delete(`${BASE}/magasins/${id}/`);

// --- Mouvements ---
export const listMouvements = (params = {}) =>
  apiClient.get(`${BASE}/mouvements/`, { params }).then((r) => r.data);
export const getMouvement = (id) =>
  apiClient.get(`${BASE}/mouvements/${id}/`).then((r) => r.data);
export const createMouvement = (payload) =>
  apiClient.post(`${BASE}/mouvements/`, payload).then((r) => r.data);

// --- Inventaires ---
export const listInventaires = (params = {}) =>
  apiClient.get(`${BASE}/inventaires/`, { params }).then((r) => r.data);
export const createInventaire = (payload) =>
  apiClient.post(`${BASE}/inventaires/`, payload).then((r) => r.data);
