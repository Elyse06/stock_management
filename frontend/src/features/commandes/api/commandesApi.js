import { API_ENDPOINTS } from "@/config/endpoints";
import { createResource } from "@/lib/api/resource";

export const commandesApi = createResource(API_ENDPOINTS.COMMANDES);

/** Transition de statut (pré-validation, validation finale, rejet). */
export const traiterCommande = (id, payload) => commandesApi.action(id, "traiter", payload);

/** Une validation finale crée une sortie de stock : ces données changent aussi. */
export const COMMANDE_KEYS = [["commandes"], ["mouvements"], ["unites"], ["articles"], ["dashboard"]];
