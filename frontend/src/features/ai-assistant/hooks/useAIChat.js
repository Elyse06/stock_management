import { useCallback, useEffect, useRef, useState } from "react";

import { getErrorMessage } from "@/lib/api/errors";

import { aiChat, MAX_LONGUEUR_MESSAGE } from "../api/aiApi";

const ACCUEIL = {
  role: "assistant",
  content:
    "Bonjour ! 👋 Je suis votre assistant IA. Je peux vous aider à rechercher des articles, analyser le stock, et répondre à vos questions. Essayez par exemple : « Articles avec stock < 5 » ou « Ordinateurs Dell ».",
};

let compteur = 0;
const avecId = (message) => ({ ...message, id: ++compteur });

/** Conversation avec l'assistant (historique local, requête annulable). */
export function useAIChat() {
  const [messages, setMessages] = useState(() => [avecId(ACCUEIL)]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const envoyer = useCallback(
    async (texte) => {
      const contenu = texte.trim().slice(0, MAX_LONGUEUR_MESSAGE);
      if (!contenu || loading) return;
      const historique = messages.filter((m) => !m.erreur).map(({ role, content }) => ({ role, content }));
      setMessages((prev) => [...prev, avecId({ role: "user", content: contenu })]);
      setLoading(true);
      abortRef.current = new AbortController();
      try {
        const data = await aiChat(contenu, historique, { signal: abortRef.current.signal });
        setMessages((prev) => [...prev, avecId({ role: "assistant", content: data.reply, searchResults: data.search_results || null })]);
      } catch (error) {
        if (error?.code === "ERR_CANCELED") return;
        const message = getErrorMessage(error, "Désolé, une erreur est survenue.");
        setMessages((prev) => [...prev, avecId({ role: "assistant", content: `⚠️ ${message}`, erreur: true })]);
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [messages, loading],
  );

  const reinitialiser = useCallback(() => {
    abortRef.current?.abort();
    setMessages([avecId({ role: "assistant", content: "Conversation réinitialisée. Comment puis-je vous aider ?" })]);
  }, []);

  return { messages, loading, envoyer, reinitialiser, estNouvelle: messages.length <= 1 };
}
