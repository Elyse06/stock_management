import { createContext, useContext } from "react";

/**
 * Ouvre l'assistant depuis n'importe quelle page, avec éventuellement une question à poser.
 * ``disponible`` : faux pour qui n'est pas gestionnaire du stock (aucun bouton ne doit alors l'évoquer).
 */
export const AssistantContext = createContext({ ouvrir: () => {}, disponible: false });

export const useAssistant = () => useContext(AssistantContext);
