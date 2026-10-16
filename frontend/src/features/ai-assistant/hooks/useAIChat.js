import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { getErrorMessage } from "@/lib/api/errors";

import { aiChat, MAX_LONGUEUR_MESSAGE } from "../api/aiApi";

const ACCUEIL = {
  role: "assistant",
  content:
    "Bonjour ! Je suis l'assistant de Tahiry. Posez-moi une question sur vos données (stock, commandes, mouvements…) ou demandez-moi où trouver une page et comment faire une opération.",
};

let compteur = 0;
const avecId = (message) => ({ ...message, id: ++compteur });

/** Conversation avec l'assistant (historique local, requête annulable). Seul le texte est renvoyé en historique. */
export function useAIChat() {
  const location = useLocation();
  const [messages, setMessages] = useState(() => [avecId(ACCUEIL)]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const envoyer = useCallback(
    async (texte) => {
      const contenu = texte.trim().slice(0, MAX_LONGUEUR_MESSAGE);
      if (!contenu || loading) return;
      // Les outils utilisés par chaque réponse sont renvoyés : l'assistant comprend « et le mois dernier ? ».
      const historique = messages
        .filter((m) => !m.erreur)
        .map(({ role, content, outils }) => (outils?.length ? { role, content, outils } : { role, content }));
      setMessages((prev) => [...prev, avecId({ role: "user", content: contenu })]);
      setLoading(true);
      abortRef.current = new AbortController();
      try {
        // La page affichée permet de comprendre « combien en reste-t-il ? » sur une fiche article.
        const page = `${location.pathname}${location.search}`;
        const data = await aiChat(contenu, historique, { signal: abortRef.current.signal }, page);
        setMessages((prev) => [
          ...prev,
          avecId({
            role: "assistant", content: data.reply, tableaux: data.tableaux || [], liens: data.liens || [], choix: data.choix || [],
            outils: data.outils_utilises || [],
          }),
        ]);
      } catch (error) {
        if (error?.code === "ERR_CANCELED") return;
        const message = getErrorMessage(error, "Désolé, une erreur est survenue.");
        setMessages((prev) => [...prev, avecId({ role: "assistant", content: `⚠️ ${message}`, erreur: true })]);
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [messages, loading, location.pathname, location.search],
  );

  const reinitialiser = useCallback(() => {
    abortRef.current?.abort();
    setMessages([avecId({ role: "assistant", content: "Conversation réinitialisée. Comment puis-je vous aider ?" })]);
  }, []);

  return { messages, loading, envoyer, reinitialiser, estNouvelle: messages.length <= 1 };
}
