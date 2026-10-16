import { API_ENDPOINTS } from "@/config/endpoints";
import { apiClient } from "@/lib/api/client";

/** Limites appliquées par le backend (apps/ai/chat_prompts.py). */
export const MAX_LONGUEUR_MESSAGE = 2000;
export const MAX_HISTORIQUE = 10;

/** ``page`` : chemin affiché ; le serveur en déduit le contexte (ex. la fiche article consultée). */
export const aiChat = (message, history = [], config, page) =>
  apiClient.post(API_ENDPOINTS.AI_CHAT, { message, history: history.slice(-MAX_HISTORIQUE), page }, config).then((r) => r.data);
