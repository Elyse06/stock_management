// src/services/aiService.js
import { apiClient } from "../api/client";

/**
 * Appelle l'IA pour transformer une requête en langage naturel en filtres
 * @param {string} query - La requête de l'utilisateur
 * @param {number|null} magasinId - Optionnel : filtre par magasin
 * @returns {Promise<Object>} - Les résultats filtrés
 */
export const aiSearchArticles = async (query, magasinId = null) => {
  const payload = { query };
  if (magasinId) payload.magasin_id = magasinId;

  const { data } = await apiClient.post("/api/ai/search/", payload);
  return data;
};

export const aiChat = async (message, history = []) => {
  const { data } = await apiClient.post("/api/ai/chat/", {
    message,
    history,
  });
  return data;
};