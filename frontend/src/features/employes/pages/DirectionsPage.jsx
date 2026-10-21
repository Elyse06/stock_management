import { useState } from "react";
import { Box } from "@mui/material";

import { countColumn } from "@/components/table/columns";
import { EmptyValue } from "@/components/data-display/EmptyValue";
import { CrudDialogs } from "@/components/forms/CrudDialogs";
import { trimValues } from "@/utils/forms";
import { SearchField } from "@/components/forms/SearchField";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionButtons } from "@/components/table/ActionButtons";
import { actionsColumn } from "@/components/table/columns";
import { PaginatedDataGrid } from "@/components/table/PaginatedDataGrid";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

import { directionsApi, ORGANISATION_KEYS } from "../api/organisationApi";

const EMPTY_FORM = { dir_libelle: "", dir_description: "" };
const FIELDS = [
  { name: "dir_libelle", label: "Nom de la direction", required: true, maxLength: 50, autoFocus: true },
  { name: "dir_description", label: "Description", maxLength: 255, multiline: true },
];

export function DirectionsPage() {
  const { canManageEmployee } = usePermission();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const crud = useCrudPage({
    key: "directions",
    resource: directionsApi,
    idField: "dir_id",
    emptyForm: EMPTY_FORM,
    toForm: (row) => ({ dir_libelle: row.dir_libelle || "", dir_description: row.dir_description || "" }),
    toPayload: trimValues,
    filters: { search: debouncedSearch },
    messages: {
      created: (dir) => `Direction « ${dir.dir_libelle} » créée avec succès.`,
      updated: (dir) => `Direction « ${dir.dir_libelle} » mise à jour avec succès.`,
      deleted: "Direction supprimée.",
    },
    deleteLabel: (row) => `la direction « ${row.dir_libelle} »`,
    invalidate: ORGANISATION_KEYS,
  });

  const columns = [
    { field: "dir_libelle", headerName: "Direction" },
    { field: "dir_description", headerName: "Description", renderCell: ({ value }) => <EmptyValue value={value} /> },
    countColumn("services_count", "Services", "purple"),
    countColumn("employees_count", "Effectif"),
    actionsColumn(({ row }) => (
      <ActionButtons
        onEdit={canManageEmployee ? () => crud.dialog.openEdit(row) : null}
        onDelete={canManageEmployee ? () => crud.askDelete(row) : null}
      />
    )),
  ];

  return (
    <Box>
      <PageHeader
        actionLabel="Nouvelle Direction"
        onAction={crud.dialog.openCreate}
        canAction={canManageEmployee}
        onReset={() => setSearch("")}
        hasFilters={Boolean(search)}
      >
        <SearchField value={search} onChange={setSearch} placeholder="Rechercher une direction..." />
      </PageHeader>
      <PaginatedDataGrid {...crud.list.gridProps} columns={columns} getRowId={crud.getRowId} noRowsLabel="Aucune direction trouvée" />
      <CrudDialogs crud={crud} fields={FIELDS} titles={{ create: "Ajouter une Direction", edit: "Modifier la Direction" }} />
    </Box>
  );
}
