import { API_ENDPOINTS } from "@/config/endpoints";
import { apiClient } from "@/lib/api/client";

/** Limites appliquées par le backend (apps/ai/chat_prompts.py). */
export const MAX_LONGUEUR_MESSAGE = 2000;
export const MAX_HISTORIQUE = 10;
/** Délai maximal d'une réponse en flux (plusieurs consultations de données possibles). */
const DELAI_FLUX = 120000;

/** ``page`` : chemin affiché ; le serveur en déduit le contexte (ex. la fiche article consultée). */
export const aiChat = (message, history = [], config, page) =>
  apiClient.post(API_ENDPOINTS.AI_CHAT, { message, history: history.slice(-MAX_HISTORIQUE), page }, config).then((r) => r.data);

/** Lit un flux NDJSON (une ligne JSON par événement) et appelle ``surEvenement`` pour chacun. */
async function lireLignes(flux, surEvenement) {
  const lecteur = flux.getReader();
  const decodeur = new TextDecoder();
  let reste = "";
  for (;;) {
    const { done, value } = await lecteur.read();
    reste += decodeur.decode(value ?? new Uint8Array(), { stream: !done });
    const lignes = reste.split("\n");
    reste = lignes.pop() ?? "";
    for (const ligne of lignes) {
      if (ligne.trim()) surEvenement(JSON.parse(ligne));
    }
    if (done) break;
  }
  if (reste.trim()) surEvenement(JSON.parse(reste));
}

/** Corps d'une réponse d'erreur reçue en flux (``{"error": ...}``) : remis en JSON pour getErrorMessage. */
async function corpsErreur(error) {
  const data = error?.response?.data;
  if (!data || typeof data.getReader !== "function") return error;
  try {
    const texte = await new Response(data).text();
    error.response.data = JSON.parse(texte);
  } catch {
    error.response.data = null;
  }
  return error;
}

/**
 * Réponse de l'assistant en flux : ``surEvenement`` reçoit, dans l'ordre, les étapes
 * (``{type: "etape", libelle, precision}``), le texte au fil de l'eau (``{type: "texte", texte}``),
 * puis ``{type: "fin", reply, tableaux, liens, choix, outils_utilises}`` ou
 * ``{type: "erreur", message}``. Passe par ``apiClient`` : jeton et rafraîchissement inclus.
 */
export async function aiChatFlux(message, history, page, { signal, surEvenement }) {
  let reponse;
  try {
    reponse = await apiClient.post(
      API_ENDPOINTS.AI_CHAT_FLUX,
      { message, history: history.slice(-MAX_HISTORIQUE), page },
      { adapter: "fetch", responseType: "stream", signal, timeout: DELAI_FLUX },
    );
  } catch (error) {
    throw await corpsErreur(error);
  }
  await lireLignes(reponse.data, surEvenement);
}
