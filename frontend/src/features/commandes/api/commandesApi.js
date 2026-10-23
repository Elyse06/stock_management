import { API_ENDPOINTS } from "@/config/endpoints";
import { apiClient } from "@/lib/api/client";
import { createResource } from "@/lib/api/resource";

export const commandesApi = createResource(API_ENDPOINTS.COMMANDES);

/** Transition de statut (pré-validation, validation finale, rejet). */
export const traiterCommande = (id, payload) => commandesApi.action(id, "traiter", payload);

/** Rattache une ligne « nouvel article » à un article du catalogue (gestionnaire, commande en cours). */
export const associerArticle = (id, detailId, codeArticle) =>
  commandesApi.action(id, "associer-article", { detail_id: detailId, article: codeArticle });

/** Livraisons (sorties de stock) d'une commande livrée en une ou plusieurs fois. */
export const livraisonsCommande = (id, config) =>
  apiClient.get(`${API_ENDPOINTS.COMMANDES}${id}/livraisons/`, config).then((r) => r.data);

/** Une validation finale crée une sortie de stock : ces données changent aussi. */
export const COMMANDE_KEYS = [["commandes"], ["mouvements"], ["unites"], ["articles"], ["dashboard"]];
