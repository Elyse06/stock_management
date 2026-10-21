import { useState } from "react";
import { Box } from "@mui/material";

import { EmptyValue } from "@/components/data-display/EmptyValue";
import { CrudDialogs } from "@/components/forms/CrudDialogs";
import { trimValues } from "@/utils/forms";
import { SearchField } from "@/components/forms/SearchField";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionButtons } from "@/components/table/ActionButtons";
import { actionsColumn } from "@/components/table/columns";
import { PaginatedDataGrid } from "@/components/table/PaginatedDataGrid";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

import { fournisseursApi } from "../api/catalogueApi";

const EMPTY_FORM = { nom: "", email: "", adresse: "", contact: "", nif: "", stat: "" };
const FIELDS = [
  { name: "nom", label: "Nom", required: true, maxLength: 50, autoFocus: true },
  { name: "email", label: "Email", type: "email", required: true, maxLength: 254 },
  { name: "contact", label: "Contact", maxLength: 20 },
  { name: "nif", label: "NIF", maxLength: 20, xs: 12, sm: 6 },
  { name: "stat", label: "STAT", maxLength: 20, xs: 12, sm: 6 },
  { name: "adresse", label: "Adresse", maxLength: 50 },
];
const optional = ({ value }) => <EmptyValue value={value} />;

export function FournisseursPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const crud = useCrudPage({
    key: "fournisseurs",
    resource: fournisseursApi,
    idField: "fournisseur_id",
    emptyForm: EMPTY_FORM,
    toForm: (row) => Object.fromEntries(Object.keys(EMPTY_FORM).map((k) => [k, row[k] || ""])),
    // Champs facultatifs envoyés vides (et non null) : le backend refuse null.
    toPayload: trimValues,
    filters: { search: debouncedSearch },
    messages: { created: "Fournisseur créé avec succès", updated: "Fournisseur modifié avec succès", deleted: "Fournisseur supprimé avec succès" },
    deleteLabel: (row) => `le fournisseur « ${row.nom} »`,
  });

  const columns = [
    { field: "nom", headerName: "Nom" },
    { field: "email", headerName: "Email", renderCell: optional },
    { field: "contact", headerName: "Contact", renderCell: optional },
    { field: "nif", headerName: "NIF", renderCell: optional },
    { field: "stat", headerName: "STAT", renderCell: optional },
    actionsColumn(({ row }) => (
      <ActionButtons onEdit={() => crud.dialog.openEdit(row)} onDelete={() => crud.askDelete(row)} />
    )),
  ];

  return (
    <Box>
      <PageHeader actionLabel="Nouveau fournisseur" onAction={crud.dialog.openCreate} hasFilters={Boolean(search)} onReset={() => setSearch("")}>
        <SearchField value={search} onChange={setSearch} placeholder="Rechercher un fournisseur" />
      </PageHeader>
      <PaginatedDataGrid {...crud.list.gridProps} columns={columns} getRowId={crud.getRowId} noRowsLabel="Aucun fournisseur" />
      <CrudDialogs crud={crud} fields={FIELDS} titles={{ create: "Nouveau fournisseur", edit: "Modifier le fournisseur" }} />
    </Box>
  );
}
