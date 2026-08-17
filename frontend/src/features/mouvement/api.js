import { apiClient } from "../../api/client";

const BASE = "/api/stock";

// --- Mouvements ---
export const listMouvements = (params = {}) => {
  const query = { ...params };

  if (query.type && !query.type_mouvement) {
    query.type_mouvement = query.type;
  }
  delete query.type;

  return apiClient.get(`${BASE}/mouvements/`, { params: query }).then((r) => r.data);
};

export const getMouvement = (id) =>
  apiClient.get(`${BASE}/mouvements/${id}/`).then((r) => r.data);
export const createMouvement = (payload) =>
  apiClient.post(`${BASE}/mouvements/`, payload).then((r) => r.data);
