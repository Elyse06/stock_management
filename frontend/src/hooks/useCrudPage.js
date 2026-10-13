import { useConfirmDialog } from "./useConfirmDialog";
import { useCrudMutations } from "./useCrudMutations";
import { useFormDialog } from "./useFormDialog";
import { usePaginatedList } from "./usePaginatedList";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";

/**
 * Tout ce dont a besoin une page CRUD simple : liste paginée, modale de
 * formulaire, mutations et confirmation de suppression.
 *
 * @param config.key          clé React Query de base (ex. "categories")
 * @param config.resource     service ``createResource(...)``
 * @param config.idField      champ identifiant (ex. "categorie_id")
 * @param config.emptyForm    valeurs initiales du formulaire
 * @param config.toForm       ligne -> valeurs du formulaire (édition)
 * @param config.toPayload    valeurs du formulaire -> corps de requête
 * @param config.filters      filtres de la liste
 * @param config.messages     ``{created, updated, deleted}``
 * @param config.deleteLabel  ligne -> libellé affiché dans la confirmation
 * @param config.invalidate   clés supplémentaires à invalider (listes d'options...)
 */
export function useCrudPage({
  key,
  resource,
  idField,
  emptyForm,
  toForm,
  toPayload = (form) => form,
  filters = {},
  pageSize = DEFAULT_PAGE_SIZE,
  messages,
  deleteLabel = () => "cet élément",
  invalidate = [],
}) {
  const list = usePaginatedList([key], resource.endpoint, filters, { pageSize });
  const dialog = useFormDialog(emptyForm, toForm);
  const { confirm, dialogProps: confirmProps } = useConfirmDialog();
  const mutations = useCrudMutations(resource, [[key], ["options", key], ...invalidate], messages);

  const handleSubmit = async (event) => {
    event?.preventDefault();
    const ok = await mutations.save(dialog.editing?.[idField], toPayload(dialog.form, dialog.editing));
    if (ok) dialog.close();
  };

  const askDelete = (row) =>
    confirm("Confirmer la suppression", `Êtes-vous sûr de vouloir supprimer ${deleteLabel(row)} ?`, () =>
      mutations.remove.mutate(row[idField]),
    );

  return {
    list,
    dialog,
    confirmProps,
    askDelete,
    handleSubmit,
    saving: mutations.saving,
    mutations,
    getRowId: (row) => row[idField],
  };
}
