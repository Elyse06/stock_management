import { apiClient } from "../../api/client";

const BASE = "/api/catalogue";

// --- Articles ---
export const listArticles = (params = {}) =>
  apiClient.get(`${BASE}/articles/`, { params }).then((r) => r.data);

export const getArticle = (codeArticle) =>
  apiClient.get(`${BASE}/articles/${codeArticle}/`).then((r) => r.data);

export const createArticle = (payload) =>
  apiClient.post(`${BASE}/articles/`, payload).then((r) => r.data);

export const updateArticle = (codeArticle, payload) =>
  apiClient.put(`${BASE}/articles/${codeArticle}/`, payload).then((r) => r.data);

export const deleteArticle = (codeArticle) =>
  apiClient.delete(`${BASE}/articles/${codeArticle}/`);

// --- Categories ---
export const listCategories = () =>
  apiClient.get(`${BASE}/categories/`, { params: { page_size: 100 } }).then((r) => r.data);

export const createCategorie = (payload) =>
  apiClient.post(`${BASE}/categories/`, payload).then((r) => r.data);

export const updateCategorie = (id, payload) =>
  apiClient.put(`${BASE}/categories/${id}/`, payload).then((r) => r.data);

export const deleteCategorie = (id) => apiClient.delete(`${BASE}/categories/${id}/`);

// --- Fournisseurs ---
export const listFournisseurs = (params = {}) =>
  apiClient.get(`${BASE}/fournisseurs/`, { params }).then((r) => r.data);

export const createFournisseur = (payload) =>
  apiClient.post(`${BASE}/fournisseurs/`, payload).then((r) => r.data);

export const updateFournisseur = (id, payload) =>
  apiClient.put(`${BASE}/fournisseurs/${id}/`, payload).then((r) => r.data);

export const deleteFournisseur = (id) => apiClient.delete(`${BASE}/fournisseurs/${id}/`);

// --- Association article <-> fournisseur (prix d'achat) ---
export const addArticleFournisseur = (payload) =>
  apiClient.post(`${BASE}/article-fournisseurs/`, payload).then((r) => r.data);

export const updateArticleFournisseur = (id, payload) =>
  apiClient.patch(`${BASE}/article-fournisseurs/${id}/`, payload).then((r) => r.data);

export const removeArticleFournisseur = (id) =>
  apiClient.delete(`${BASE}/article-fournisseurs/${id}/`);
