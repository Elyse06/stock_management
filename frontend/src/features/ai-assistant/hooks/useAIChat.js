import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { getErrorMessage } from "@/lib/api/errors";

import { aiChatFlux, MAX_LONGUEUR_MESSAGE } from "../api/aiApi";

let compteur = 0;
const nouveau = (message) => ({ heure: new Date(), ...message, id: ++compteur });

/**
 * Conversation avec l'assistant. La réponse arrive en flux : étapes de recherche puis texte
 * au fil de l'eau ; ``arreter`` interrompt la réponse en cours. Seuls le texte et les outils
 * utilisés sont renvoyés en historique (questions de suite : « et le mois dernier ? »).
 */
export function useAIChat() {
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => () => abortRef.current?.abort(), []);

  const modifier = (id, changement) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...(typeof changement === "function" ? changement(m) : changement) } : m)));

  const envoyer = useCallback(
    async (texte) => {
      const contenu = texte.trim().slice(0, MAX_LONGUEUR_MESSAGE);
      if (!contenu || abortRef.current) return;
      const historique = messagesRef.current
        .filter((m) => !m.erreur && !m.interrompu && m.content)
        .map(({ role, content, outils }) => (outils?.length ? { role, content, outils } : { role, content }));
      const reponse = nouveau({ role: "assistant", content: "", etapes: [], enCours: true });
      setMessages((prev) => [...prev, nouveau({ role: "user", content: contenu }), reponse]);
      setLoading(true);
      const controleur = new AbortController();
      abortRef.current = controleur;

      const surEvenement = (evenement) => {
        switch (evenement.type) {
          case "etape":
            modifier(reponse.id, (m) => ({ etapes: [...m.etapes, { libelle: evenement.libelle, precision: evenement.precision }] }));
            break;
          case "texte":
            modifier(reponse.id, (m) => ({ content: m.content + evenement.texte }));
            break;
          case "efface":
            modifier(reponse.id, { content: "" });
            break;
          case "fin":
            modifier(reponse.id, {
              content: evenement.reply,
              tableaux: evenement.tableaux || [],
              liens: evenement.liens || [],
              choix: evenement.choix || [],
              outils: evenement.outils_utilises || [],
              enCours: false,
              heure: new Date(),
            });
            break;
          case "erreur":
            modifier(reponse.id, { content: evenement.message, erreur: true, enCours: false, question: contenu });
            break;
          default:
        }
      };

      try {
        // La page affichée permet de comprendre « combien en reste-t-il ? » sur une fiche article.
        const page = `${location.pathname}${location.search}`;
        await aiChatFlux(contenu, historique, page, { signal: controleur.signal, surEvenement });
        // Flux coupé sans événement de fin (réseau) : on le signale plutôt que de laisser un message vide.
        modifier(reponse.id, (m) => (m.enCours ? { enCours: false, erreur: true, question: contenu,
          content: "La réponse a été coupée avant la fin. Réessayez." } : {}));
      } catch (error) {
        if (controleur.signal.aborted || error?.code === "ERR_CANCELED") {
          modifier(reponse.id, (m) => ({ enCours: false, interrompu: true, content: m.content }));
        } else {
          const message = getErrorMessage(error, "Désolé, une erreur est survenue.");
          modifier(reponse.id, { content: message, erreur: true, enCours: false, question: contenu });
        }
      } finally {
        setLoading(false);
        if (abortRef.current === controleur) abortRef.current = null;
      }
    },
    [location.pathname, location.search],
  );

  const arreter = useCallback(() => abortRef.current?.abort(), []);

  /** Renvoie la question d'une réponse en erreur (le message d'erreur et la question sont retirés). */
  const reessayer = useCallback(
    (message) => {
      if (abortRef.current || !message.question) return;
      const index = messagesRef.current.findIndex((m) => m.id === message.id);
      if (index < 1) return;
      // La question précède toujours sa réponse : les deux sont retirées, l'historique repart sans elles.
      const restants = messagesRef.current.slice(0, index - 1);
      messagesRef.current = restants;
      setMessages(restants);
      envoyer(message.question);
    },
    [envoyer],
  );

  const reinitialiser = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  return { messages, loading, envoyer, arreter, reessayer, reinitialiser, estNouvelle: messages.length === 0 };
}
