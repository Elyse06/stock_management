import { apiClient } from "../../api/client";

const BASE = "/api/stock";

// --- Mouvements ---
export const listMouvements = (params = {}) =>
  apiClient.get(`${BASE}/mouvements/`, { params }).then((r) => r.data);
export const getMouvement = (id) =>
  apiClient.get(`${BASE}/mouvements/${id}/`).then((r) => r.data);
export const createMouvement = (payload) =>
  apiClient.post(`${BASE}/mouvements/`, payload).then((r) => r.data);
