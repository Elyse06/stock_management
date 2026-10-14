import { useState } from "react";
import { Box } from "@mui/material";

import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { ErrorAlert } from "@/components/feedback/ErrorAlert";
import { SearchField } from "@/components/forms/SearchField";
import { SelectFilter } from "@/components/forms/SelectFilter";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionButtons } from "@/components/table/ActionButtons";
import { actionsColumn } from "@/components/table/columns";
import { PaginatedDataGrid } from "@/components/table/PaginatedDataGrid";
import { API_ENDPOINTS } from "@/config/endpoints";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useCrudMutations } from "@/hooks/useCrudMutations";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { toOptions, useDirections, useServices, useSites } from "@/hooks/useReferenceData";
import { getErrorMessage } from "@/lib/api/errors";

import { employeesApi, ORGANISATION_KEYS } from "../api/organisationApi";
import { EmployeeDetailModal } from "../components/EmployeeDetailModal";
import { EmployeeFormModal } from "../components/EmployeeFormModal";
import { EmailImportModal } from "../components/email-import/EmailImportModal";
import { EmployeeImportModal } from "../components/EmployeeImportModal";
import { MatriculeChip } from "../components/MatriculeChip";

const FILTRES_VIDES = { site: "", direction: "", service: "" };

export function EmployeesPage() {
  const { canManageEmployee } = usePermission();
  const { confirm, dialogProps } = useConfirmDialog();
  const { remove, invalidate } = useCrudMutations(employeesApi, ORGANISATION_KEYS, { deleted: "Employé supprimé avec succès" });
  const { data: sites = [] } = useSites();
  const { data: directions = [] } = useDirections();
  const { data: services = [] } = useServices();

  const [search, setSearch] = useState("");
  const [filtres, setFiltres] = useState(FILTRES_VIDES);
  const [modal, setModal] = useState({ type: null, employee: null });
  const debouncedSearch = useDebouncedValue(search);

  const list = usePaginatedList(
    ["employees"],
    API_ENDPOINTS.EMPLOYEES,
    { search: debouncedSearch, emp_site_id: filtres.site, emp_dir_id: filtres.direction, emp_serv_id: filtres.service },
  );

  const ouvrir = (type, employee = null) => setModal({ type, employee });
  const fermer = () => setModal({ type: null, employee: null });
  const filtre = (cle) => (valeur) => setFiltres((prev) => ({ ...prev, [cle]: valeur }));

  const askDelete = (employee) =>
    confirm(
      "Supprimer l'employé",
      `Êtes-vous sûr de vouloir supprimer ${employee.emp_nom} (${employee.emp_matricule}) ?`,
      () => remove.mutate(employee.emp_id),
    );

  const columns = [
    { field: "emp_matricule", headerName: "Matricule", autoExtraWidth: 20, renderCell: ({ value }) => <MatriculeChip value={value} /> },
    { field: "emp_nom", headerName: "Nom & Prénoms" },
    { field: "emp_fonction", headerName: "Fonction" },
    { field: "direction_libelle", headerName: "Direction" },
    { field: "service_libelle", headerName: "Service" },
    { field: "site_nom", headerName: "Site" },
    actionsColumn(
      ({ row }) => (
        <ActionButtons
          onView={() => ouvrir("detail", row)}
          onEdit={canManageEmployee ? () => ouvrir("form", row) : null}
          onDelete={canManageEmployee ? () => askDelete(row) : null}
        />
      ),
      160,
    ),
  ];

  return (
    <Box>
      <PageHeader
        actionLabel="Nouvel Employé"
        onAction={() => ouvrir("form")}
        canAction={canManageEmployee}
        secondaryMenu={{
          label: "Importer",
          items: [
            { label: "Employés", onClick: () => ouvrir("import") },
            { label: "Adresses électroniques", onClick: () => ouvrir("import-emails") },
          ],
        }}
        canSecondaryAction={canManageEmployee}
        onReset={() => {
          setSearch("");
          setFiltres(FILTRES_VIDES);
        }}
        hasFilters={Boolean(search || filtres.site || filtres.direction || filtres.service)}
      >
        <SearchField value={search} onChange={setSearch} placeholder="Rechercher par nom, matricule, fonction..." />
        <SelectFilter label="Site" value={filtres.site} onChange={filtre("site")} options={toOptions(sites, (s) => s.site_id, (s) => s.site_nom, "Tous les sites")} />
        <SelectFilter
          label="Direction"
          value={filtres.direction}
          onChange={filtre("direction")}
          options={toOptions(directions, (d) => d.dir_id, (d) => d.dir_libelle, "Toutes les directions")}
          minWidth={180}
        />
        <SelectFilter
          label="Service"
          value={filtres.service}
          onChange={filtre("service")}
          options={toOptions(services, (s) => s.serv_id, (s) => s.serv_libelle, "Tous les services")}
        />
      </PageHeader>
      <ErrorAlert error={list.error && getErrorMessage(list.error)} />

      <PaginatedDataGrid {...list.gridProps} columns={columns} getRowId={(row) => row.emp_id} noRowsLabel="Aucun employé trouvé" />

      <EmployeeFormModal isOpen={modal.type === "form"} onClose={fermer} employeeToEdit={modal.employee} />
      <EmployeeDetailModal
        employee={modal.employee}
        isOpen={modal.type === "detail"}
        onClose={fermer}
        onEdit={canManageEmployee ? (emp) => ouvrir("form", emp) : undefined}
      />
      <EmployeeImportModal isOpen={modal.type === "import"} onClose={fermer} onSuccess={invalidate} />
      <EmailImportModal isOpen={modal.type === "import-emails"} onClose={fermer} />
      <ConfirmDialog {...dialogProps} />
    </Box>
  );
}
