import { apiClient } from "../../api/client";

const BASE = "/api/achats";

export const listCommandes = (params = {}) =>
  apiClient.get(`${BASE}/commandes/`, { params }).then((r) => r.data);

export const getCommande = (id) =>
  apiClient.get(`${BASE}/commandes/${id}/`).then((r) => r.data);

export const createCommande = (payload) =>
  apiClient.post(`${BASE}/commandes/`, payload).then((r) => r.data);

export const traiterCommande = (id, payload) =>
  apiClient.post(`${BASE}/commandes/${id}/traiter/`, payload).then((r) => r.data);
