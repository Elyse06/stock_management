import { Box } from "@mui/material";

import { CrudDialogs } from "@/components/forms/CrudDialogs";
import { trimValues } from "@/utils/forms";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionButtons } from "@/components/table/ActionButtons";
import { actionsColumn } from "@/components/table/columns";
import { PaginatedDataGrid } from "@/components/table/PaginatedDataGrid";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useCrudPage } from "@/hooks/useCrudPage";
import { toOptions, useSites } from "@/hooks/useReferenceData";

import { sallesApi } from "../api/stockApi";

const EMPTY_FORM = { nom: "", localite: "" };

export function SallesPage() {
  const { canManageInventaire } = usePermission();
  const { data: sites = [] } = useSites({ select: (rows) => rows.filter((s) => s.site_type === "SIEGE") });

  const crud = useCrudPage({
    key: "salles",
    resource: sallesApi,
    idField: "salle_id",
    emptyForm: EMPTY_FORM,
    toForm: (row) => ({ nom: row.nom || "", localite: row.localite || "" }),
    toPayload: (form) => ({ ...trimValues(form), localite: Number(form.localite) }),
    messages: { created: "Salle créée avec succès", updated: "Salle modifiée avec succès", deleted: "Salle supprimée avec succès" },
    deleteLabel: (row) => `la salle « ${row.nom} »`,
  });

  const fields = [
    { name: "nom", label: "Nom de la salle", required: true, maxLength: 100, autoFocus: true },
    {
      name: "localite",
      label: "Site Siège",
      required: true,
      options: toOptions(sites, (s) => s.site_id, (s) => `${s.site_nom}${s.localite ? ` (${s.localite})` : ""}`),
    },
  ];

  const columns = [
    { field: "nom", headerName: "Salle" },
    { field: "localite_nom", headerName: "Site" },
    ...(canManageInventaire
      ? [actionsColumn(({ row }) => <ActionButtons onEdit={() => crud.dialog.openEdit(row)} onDelete={() => crud.askDelete(row)} />, 130)]
      : []),
  ];

  return (
    <Box>
      <PageHeader actionLabel="Nouvelle salle" onAction={crud.dialog.openCreate} canAction={canManageInventaire} />
      <PaginatedDataGrid {...crud.list.gridProps} columns={columns} getRowId={crud.getRowId} noRowsLabel="Aucune salle" />
      <CrudDialogs crud={crud} fields={fields} titles={{ create: "Nouvelle salle", edit: "Modifier la salle" }} />
    </Box>
  );
}
