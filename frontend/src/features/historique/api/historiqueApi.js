import { API_ENDPOINTS } from "@/config/endpoints";
import { apiClient } from "@/lib/api/client";
import { cleanParams } from "@/lib/api/pagination";

export const getHistoriqueArticle = (code, params, config) =>
  apiClient
    .get(`${API_ENDPOINTS.HISTORIQUE_ARTICLE}${encodeURIComponent(code)}/`, { ...config, params: cleanParams(params) })
    .then((r) => r.data);

/** Fiche article au format Excel (Blob). */
export const exportHistoriqueArticle = (code, params) =>
  apiClient
    .get(`${API_ENDPOINTS.HISTORIQUE_ARTICLE}${encodeURIComponent(code)}/export/`, { params: cleanParams(params), responseType: "blob" })
    .then((r) => r.data);

export const getStocksLocalisation = (params, config) =>
  apiClient.get(API_ENDPOINTS.HISTORIQUE_LOCALISATION, { ...config, params: cleanParams(params) }).then((r) => r.data);
