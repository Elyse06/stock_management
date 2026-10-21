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
import { toOptions, useDirections } from "@/hooks/useReferenceData";

import { ORGANISATION_KEYS, servicesApi } from "../api/organisationApi";

const EMPTY_FORM = { serv_libelle: "", serv_dir_id: "", serv_info: "" };
const tag = (sx) => ({ value }) => (
  <Chip label={value || "—"} size="small" sx={{ fontWeight: 700, fontSize: 11, ...sx }} />
);

export function ServicesPage() {
  const { canManageEmployee } = usePermission();
  const { data: directions = [] } = useDirections();
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const crud = useCrudPage({
    key: "services",
    resource: servicesApi,
    idField: "serv_id",
    emptyForm: EMPTY_FORM,
    toForm: (row) => ({ serv_libelle: row.serv_libelle || "", serv_dir_id: row.serv_dir_id || "", serv_info: row.serv_info || "" }),
    toPayload: trimValues,
    filters: { search: debouncedSearch, serv_dir_id: direction },
    messages: {
      created: (s) => `Service « ${s.serv_libelle} » créé avec succès.`,
      updated: (s) => `Service « ${s.serv_libelle} » mis à jour avec succès.`,
      deleted: "Service supprimé.",
    },
    deleteLabel: (row) => `le service « ${row.serv_libelle} »`,
    invalidate: ORGANISATION_KEYS,
  });

  const directionOptions = toOptions(directions, (d) => d.dir_id, (d) => d.dir_libelle);
  const fields = [
    { name: "serv_libelle", label: "Nom du service", required: true, maxLength: 50, autoFocus: true },
    { name: "serv_dir_id", label: "Direction de rattachement", options: directionOptions, required: true },
    { name: "serv_info", label: "Description", multiline: true },
  ];

  const columns = [
    { field: "serv_libelle", headerName: "Service", autoExtraWidth: 32, renderCell: tag({ bgcolor: "#F3E5F5", color: "#7B1FA2" }) },
    { field: "serv_info", headerName: "Description" },
    { field: "direction_libelle", headerName: "Direction parente", autoExtraWidth: 32, renderCell: tag({ bgcolor: "#E3F2FD", color: "#1565C0" }) },
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
        actionLabel="Nouveau Service"
        onAction={crud.dialog.openCreate}
        canAction={canManageEmployee}
        onReset={() => {
          setSearch("");
          setDirection("");
        }}
        hasFilters={Boolean(search || direction)}
      >
        <SearchField value={search} onChange={setSearch} placeholder="Rechercher un service..." />
        <SelectFilter
          label="Direction"
          value={direction}
          onChange={setDirection}
          options={toOptions(directions, (d) => d.dir_id, (d) => d.dir_libelle, "Toutes les directions")}
          minWidth={180}
        />
      </PageHeader>
      <PaginatedDataGrid {...crud.list.gridProps} columns={columns} getRowId={crud.getRowId} noRowsLabel="Aucun service trouvé" />
      <CrudDialogs crud={crud} fields={fields} titles={{ create: "Ajouter un Service", edit: "Modifier le Service" }} />
    </Box>
  );
}
