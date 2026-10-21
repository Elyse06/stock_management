import { API_ENDPOINTS } from "@/config/endpoints";
import { apiClient } from "@/lib/api/client";
import { createResource } from "@/lib/api/resource";

export const magasinsApi = createResource(API_ENDPOINTS.MAGASINS);
export const sallesApi = createResource(API_ENDPOINTS.SALLES);
export const inventairesApi = createResource(API_ENDPOINTS.INVENTAIRES);
export const lignesInventaireApi = createResource(API_ENDPOINTS.LIGNES_INVENTAIRE);

/** Validation d'une session d'inventaire (droit INV_VAL). */
export const validerInventaire = (id) => inventairesApi.action(id, "valider");

/** Stock théorique par article d'un magasin : ``{code: {article_code, article_designation, stock_theorique}}``. */
export const getStocksMagasin = (id, config) =>
  apiClient.get(`${magasinsApi.url(id)}stocks/`, config).then((r) => r.data);
