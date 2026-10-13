import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useNotification } from "@/hooks/useNotification";
import { getErrorMessage } from "@/lib/api/errors";

import { validerInventaire } from "../api/stockApi";

/** Validation d'une session : met à jour le stock (mouvements d'ajustement côté backend). */
export function useValiderInventaire() {
  const queryClient = useQueryClient();
  const notify = useNotification();
  return useMutation({
    mutationFn: validerInventaire,
    onSuccess: () => {
      ["inventaires", "inventaire", "mouvements", "articles", "unites", "dashboard"].forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      );
      notify.success("Inventaire validé avec succès. Le stock a été mis à jour.");
    },
    onError: (error) => notify.error(getErrorMessage(error, "Erreur lors de la validation de l'inventaire.")),
  });
}
