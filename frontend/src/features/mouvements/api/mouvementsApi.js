import { API_ENDPOINTS } from "@/config/endpoints";
import { createResource } from "@/lib/api/resource";

export const mouvementsApi = createResource(API_ENDPOINTS.MOUVEMENTS);
export const unitesApi = createResource(API_ENDPOINTS.UNITES_ARTICLE);

export const retournerUnite = (id, payload) => unitesApi.action(id, "retourner-stock", payload);
export const transfererUnite = (id, payload) => unitesApi.action(id, "transferer", payload);

/** Un mouvement modifie stocks, historiques et unités : clés à invalider. */
export const STOCK_KEYS = [["mouvements"], ["unites"], ["articles"], ["article"], ["historique"], ["dashboard"]];
