import { Box } from "@mui/material";

import { CrudDialogs } from "@/components/forms/CrudDialogs";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionButtons } from "@/components/table/ActionButtons";
import { actionsColumn } from "@/components/table/columns";
import { PaginatedDataGrid } from "@/components/table/PaginatedDataGrid";
import { useCrudPage } from "@/hooks/useCrudPage";
import { toOptions, useSites } from "@/hooks/useReferenceData";

import { magasinsApi } from "../api/stockApi";
import { SiteLabel } from "../components/SiteLabel";

const EMPTY_FORM = { magasin_nom: "", localite: "" };

export function MagasinsPage() {
  const { data: sites = [] } = useSites();
  const crud = useCrudPage({
    key: "magasins",
    resource: magasinsApi,
    idField: "magasin_id",
    emptyForm: EMPTY_FORM,
    toForm: (row) => ({ magasin_nom: row.magasin_nom || "", localite: row.localite || "" }),
    toPayload: (form) => ({ magasin_nom: form.magasin_nom.trim(), localite: form.localite ? Number(form.localite) : null }),
    messages: { created: "Magasin créé avec succès", updated: "Magasin modifié avec succès", deleted: "Magasin supprimé avec succès" },
    deleteLabel: (row) => `le magasin « ${row.magasin_nom} »`,
  });

  const fields = [
    { name: "magasin_nom", label: "Nom", required: true, maxLength: 50, autoFocus: true },
    {
      name: "localite",
      label: "Site (Siège/Agence)",
      options: toOptions(sites, (s) => s.site_id, (s) => `${s.site_type === "SIEGE" ? "Siège" : "Agence"} · ${s.site_nom}${s.localite ? ` (${s.localite})` : ""}`, "-- Aucun site --"),
    },
  ];

  const columns = [
    { field: "magasin_nom", headerName: "Nom" },
    {
      field: "localite_nom",
      headerName: "Site",
      autoExtraWidth: 28,
      renderCell: ({ row }) => <SiteLabel nom={row.localite_nom} type={row.localite_type} />,
    },
    actionsColumn(({ row }) => <ActionButtons onEdit={() => crud.dialog.openEdit(row)} onDelete={() => crud.askDelete(row)} />),
  ];

  return (
    <Box>
      <PageHeader actionLabel="Nouveau magasin" onAction={crud.dialog.openCreate} />
      <PaginatedDataGrid {...crud.list.gridProps} columns={columns} getRowId={crud.getRowId} noRowsLabel="Aucun magasin" />
      <CrudDialogs crud={crud} fields={fields} titles={{ create: "Nouveau magasin", edit: "Modifier le magasin" }} />
    </Box>
  );
}
