import { createContext, useContext } from "react";

/** Ouvre l'assistant depuis n'importe quelle page, avec éventuellement une question à poser. */
export const AssistantContext = createContext({ ouvrir: () => {} });

export const useAssistant = () => useContext(AssistantContext);
