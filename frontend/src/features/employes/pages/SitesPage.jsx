import { useState } from "react";
import { Box, Chip } from "@mui/material";

import { countColumn } from "@/components/table/columns";
import { CrudDialogs } from "@/components/forms/CrudDialogs";
import { trimValues } from "@/utils/forms";
import { SearchField } from "@/components/forms/SearchField";
import { SelectFilter } from "@/components/forms/SelectFilter";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionButtons } from "@/components/table/ActionButtons";
import { actionsColumn } from "@/components/table/columns";
import { PaginatedDataGrid } from "@/components/table/PaginatedDataGrid";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

import { ORGANISATION_KEYS, sitesApi } from "../api/organisationApi";
import { SITE_TYPES } from "../constants/site";

const EMPTY_FORM = { site_nom: "", site_type: "AGENCE", localite: "" };
const FIELDS = [
  { name: "site_nom", label: "Nom de l'établissement", required: true, maxLength: 50, autoFocus: true },
  { name: "site_type", label: "Type d'établissement", options: SITE_TYPES, required: true },
  { name: "localite", label: "Localité / Ville", maxLength: 50 },
];

export function SitesPage() {
  const { canManageEmployee } = usePermission();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const crud = useCrudPage({
    key: "sites",
    resource: sitesApi,
    idField: "site_id",
    emptyForm: EMPTY_FORM,
    toForm: (row) => ({ site_nom: row.site_nom || "", site_type: row.site_type || "AGENCE", localite: row.localite || "" }),
    toPayload: trimValues,
    filters: { search: debouncedSearch, site_type: type },
    messages: {
      created: (site) => `Site « ${site.site_nom} » créé avec succès.`,
      updated: (site) => `Site « ${site.site_nom} » mis à jour avec succès.`,
      deleted: "Site supprimé.",
    },
    deleteLabel: (row) => `le site « ${row.site_nom} »`,
    invalidate: ORGANISATION_KEYS,
  });

  const columns = [
    { field: "site_nom", headerName: "Nom de l'établissement" },
    {
      field: "site_type",
      headerName: "Type",
      autoExtraWidth: 32,
      renderCell: ({ value }) => (
        <Chip
          label={SITE_TYPES.find((t) => t.value === value)?.label || value}
          size="small"
          color={value === "SIEGE" ? "primary" : "default"}
          variant={value === "SIEGE" ? "filled" : "outlined"}
          sx={{ fontWeight: 600, fontSize: 11 }}
        />
      ),
    },
    { field: "localite", headerName: "Localité" },
    countColumn("directions_count", "Directions", "blue"),
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
        actionLabel="Nouveau Site"
        onAction={crud.dialog.openCreate}
        canAction={canManageEmployee}
        onReset={() => {
          setSearch("");
          setType("");
        }}
        hasFilters={Boolean(search || type)}
      >
        <SearchField value={search} onChange={setSearch} placeholder="Rechercher par nom de site, localité..." />
        <SelectFilter
          label="Type d'établissement"
          value={type}
          onChange={setType}
          options={[{ value: "", label: "Tous les types" }, ...SITE_TYPES]}
          minWidth={180}
        />
      </PageHeader>
      <PaginatedDataGrid {...crud.list.gridProps} columns={columns} getRowId={crud.getRowId} noRowsLabel="Aucun site trouvé" />
      <CrudDialogs crud={crud} fields={FIELDS} titles={{ create: "Ajouter un Site", edit: "Modifier le Site" }} />
    </Box>
  );
}
