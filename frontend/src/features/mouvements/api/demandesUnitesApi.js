import { API_ENDPOINTS } from "@/config/endpoints";
import { apiClient } from "@/lib/api/client";

/** Clé de cache commune : toute action sur une demande rafraîchit listes et compteur. */
export const DEMANDES_KEY = ["demandes-unites"];

export const creerDemande = (payload) => apiClient.post(API_ENDPOINTS.DEMANDES_UNITES, payload).then((r) => r.data);
export const annulerDemande = (id) => apiClient.post(`${API_ENDPOINTS.DEMANDES_UNITES}${id}/annuler/`).then((r) => r.data);
export const refuserDemande = (id, commentaire) =>
  apiClient.post(`${API_ENDPOINTS.DEMANDES_UNITES}${id}/refuser/`, { commentaire }).then((r) => r.data);
export const compterDemandes = () => apiClient.get(`${API_ENDPOINTS.DEMANDES_UNITES}compteur/`).then((r) => r.data.en_attente);
export const getUnite = (id) => apiClient.get(`${API_ENDPOINTS.UNITES_ARTICLE}${id}/`).then((r) => r.data);

export const STATUTS_DEMANDE = {
  EN_ATTENTE: { label: "En attente", color: "warning" },
  TRAITEE: { label: "Traitée", color: "success" },
  REFUSEE: { label: "Refusée", color: "error" },
  ANNULEE: { label: "Annulée", color: "default" },
};

/** « Retour en stock » ou « Transfert vers DSI ». */
export const libelleDemande = (d) =>
  d.type_demande === "RETOUR" ? "Retour en stock" : `Transfert vers ${d.nouveau_beneficiaire?.nom || "—"}`;
