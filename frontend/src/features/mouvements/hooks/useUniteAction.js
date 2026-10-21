import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useNotification } from "@/hooks/useNotification";
import { MESSAGES } from "@/constants/messages";
import { getErrorMessage } from "@/lib/api/errors";

import { DEMANDES_KEY } from "../api/demandesUnitesApi";
import { STOCK_KEYS } from "../api/mouvementsApi";

/** Action sur une unité (retour, transfert) : invalide stocks et unités puis notifie. */
export function useUniteAction(mutationFn, successMessage, onSuccess) {
  const queryClient = useQueryClient();
  const notify = useNotification();
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      // Les demandes aussi : un mouvement clôture la demande traitée (ou celles devenues sans objet).
      [...STOCK_KEYS, DEMANDES_KEY].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      notify.success(successMessage);
      onSuccess?.(data);
    },
    onError: (error) => notify.error(getErrorMessage(error, MESSAGES.SAVE_FAILED)),
  });
}
