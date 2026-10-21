import { API_ENDPOINTS } from "@/config/endpoints";
import { createResource } from "@/lib/api/resource";

export const utilisateursApi = createResource(API_ENDPOINTS.UTILISATEURS);

/** Renvoie un nouveau mot de passe temporaire par e-mail à un compte pas encore activé. */
export const renvoyerAcces = (id) => utilisateursApi.action(id, "renvoyer-acces");
