import { Box } from "@mui/material";

import { EmptyValue } from "@/components/data-display/EmptyValue";
import { CrudDialogs } from "@/components/forms/CrudDialogs";
import { trimValues } from "@/utils/forms";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionButtons } from "@/components/table/ActionButtons";
import { actionsColumn } from "@/components/table/columns";
import { PaginatedDataGrid } from "@/components/table/PaginatedDataGrid";
import { useCrudPage } from "@/hooks/useCrudPage";

import { categoriesApi } from "../api/catalogueApi";

const EMPTY_FORM = { cat_libelle: "", cat_description: "" };
const FIELDS = [
  { name: "cat_libelle", label: "Code", required: true, maxLength: 20, autoFocus: true },
  { name: "cat_description", label: "Description", multiline: true },
];

export function CategoriesPage() {
  const crud = useCrudPage({
    key: "categories",
    resource: categoriesApi,
    idField: "categorie_id",
    emptyForm: EMPTY_FORM,
    toForm: (row) => ({ cat_libelle: row.cat_libelle || "", cat_description: row.cat_description || "" }),
    toPayload: trimValues,
    messages: { created: "Catégorie créée avec succès", updated: "Catégorie modifiée avec succès", deleted: "Catégorie supprimée avec succès" },
    deleteLabel: (row) => `la catégorie « ${row.cat_libelle} »`,
  });

  const columns = [
    { field: "cat_libelle", headerName: "Code" },
    { field: "cat_description", headerName: "Description", renderCell: ({ value }) => <EmptyValue value={value} /> },
    actionsColumn(({ row }) => (
      <ActionButtons onEdit={() => crud.dialog.openEdit(row)} onDelete={() => crud.askDelete(row)} />
    )),
  ];

  return (
    <Box>
      <PageHeader actionLabel="Nouvelle catégorie" onAction={crud.dialog.openCreate} />
      <PaginatedDataGrid {...crud.list.gridProps} columns={columns} getRowId={crud.getRowId} noRowsLabel="Aucune catégorie" />
      <CrudDialogs crud={crud} fields={FIELDS} titles={{ create: "Nouvelle catégorie", edit: "Modifier la catégorie" }} />
    </Box>
  );
}
