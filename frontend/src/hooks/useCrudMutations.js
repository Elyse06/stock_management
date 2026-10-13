import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useNotification } from "@/hooks/useNotification";
import { MESSAGES } from "@/constants/messages";
import { getErrorMessage } from "@/lib/api/errors";

/**
 * Mutations création / modification / suppression d'une ressource, avec
 * invalidation du cache et notifications homogènes.
 *
 * @param resource  service ``createResource(...)``
 * @param keys      clés React Query à invalider (ex. ``[["categories"], ["options", "categories"]]``)
 * @param messages  ``{created, updated, deleted}`` (chaîne ou fonction recevant la réponse)
 */
export function useCrudMutations(resource, keys, messages = {}) {
  const queryClient = useQueryClient();
  const notify = useNotification();

  const invalidate = () =>
    Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  const texte = (message, data) => (typeof message === "function" ? message(data) : message);

  const options = (successMessage, fallback) => ({
    onSuccess: async (data) => {
      await invalidate();
      if (successMessage) notify.success(texte(successMessage, data));
    },
    onError: (error) => notify.error(getErrorMessage(error, fallback)),
  });

  const create = useMutation({
    mutationFn: (payload) => resource.create(payload),
    ...options(messages.created ?? "Enregistré avec succès.", MESSAGES.SAVE_FAILED),
  });
  const update = useMutation({
    mutationFn: ({ id, payload }) => resource.update(id, payload),
    ...options(messages.updated ?? "Modifié avec succès.", MESSAGES.SAVE_FAILED),
  });
  const remove = useMutation({
    mutationFn: (id) => resource.remove(id),
    ...options(messages.deleted ?? "Supprimé avec succès.", MESSAGES.DELETE_FAILED),
  });

  /** Crée ou modifie selon la présence de ``id``. Retourne ``true`` si réussi. */
  const save = async (id, payload) => {
    try {
      if (id !== undefined && id !== null) await update.mutateAsync({ id, payload });
      else await create.mutateAsync(payload);
      return true;
    } catch {
      return false;
    }
  };

  return { create, update, remove, save, invalidate, saving: create.isPending || update.isPending };
}
