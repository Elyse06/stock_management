import { API_ENDPOINTS } from "@/config/endpoints";
import { apiClient } from "@/lib/api/client";
import { createResource } from "@/lib/api/resource";

export const articlesApi = createResource(API_ENDPOINTS.ARTICLES);
export const categoriesApi = createResource(API_ENDPOINTS.CATEGORIES);
export const fournisseursApi = createResource(API_ENDPOINTS.FOURNISSEURS);

export const getFicheArticle = (code, config) =>
  apiClient.get(`${articlesApi.url(code)}fiche-complete/`, config).then((r) => r.data);
