import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useNotification } from "@/hooks/useNotification";
import { MESSAGES } from "@/constants/messages";
import { getErrorMessage } from "@/lib/api/errors";

import { STOCK_KEYS } from "../api/mouvementsApi";

/** Action sur une unité (retour, transfert) : invalide stocks et unités puis notifie. */
export function useUniteAction(mutationFn, successMessage, onSuccess) {
  const queryClient = useQueryClient();
  const notify = useNotification();
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      STOCK_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      notify.success(successMessage);
      onSuccess?.(data);
    },
    onError: (error) => notify.error(getErrorMessage(error, MESSAGES.SAVE_FAILED)),
  });
}
