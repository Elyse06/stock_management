import { useState } from "react";
import { Box, TextField } from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS } from "../../../constants/api";
import { usePagination } from "../../../hooks/usePagination";
import { usePermission } from "../../../hooks/usePermission";
import { useNotification } from "../../../components/common/NotificationProvider";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { PageHeader } from "../../../components/common/PageHeader";
import { ErrorAlert } from "../../../components/common/ErrorAlert";
import { ActionButtons } from "../../../components/common/ActionButtons";
import { SelectFilter } from "../../../components/common/SelectFilter";
import { PaginatedDataGrid } from "../../../components/common/PaginatedDataGrid";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { EmployeeFormModal } from "../components/EmployeeFormModal";
import { EmployeeDetailModal } from "../components/EmployeeDetailModal";
import { EmployeeImportModal } from "../components/EmployeeImportModal";

export function EmployeesPage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const { paginationModel, setPaginationModel, resetPage } = usePagination(25);
  const { canManageEmployee } = usePermission();

  const [search, setSearch] = useState("");
  const [siteFiltre, setSiteFiltre] = useState("");
  const [directionFiltre, setDirectionFiltre] = useState("");
  const [serviceFiltre, setServiceFiltre] = useState("");

  const [employeeToEdit, setEmployeeToEdit] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "employees",
      {
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        search,
        site: siteFiltre,
        direction: directionFiltre,
        service: serviceFiltre,
      },
    ],
    queryFn: async () => {
      const params = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
      };
      if (search) params.search = search;
      if (siteFiltre) params.emp_site_id = siteFiltre;
      if (directionFiltre) params.emp_dir_id = directionFiltre;
      if (serviceFiltre) params.emp_serv_id = serviceFiltre;

      const { data } = await apiClient.get(API_ENDPOINTS.EMPLOYEES, { params });
      return {
        employees: data.results ?? data,
        totalCount: data.count ?? (data.results ?? data).length,
      };
    },
    keepPreviousData: true,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites", "options"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.SITES, { params: { page_size: 100 } });
      return data.results ?? data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: directions = [] } = useQuery({
    queryKey: ["directions", "options"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.DIRECTIONS, { params: { page_size: 100 } });
      return data.results ?? data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services", "options"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.SERVICES, { params: { page_size: 100 } });
      return data.results ?? data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`${API_ENDPOINTS.EMPLOYEES}${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["directions"] });
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });

  const handleDelete = (employee) => {
    confirm(
      "Supprimer l'employé",
      `Êtes-vous sûr de vouloir supprimer ${employee.emp_nom} (${employee.emp_matricule}) ?`,
      async () => {
        try {
          await deleteMutation.mutateAsync(employee.emp_id);
          notify.success("Employé supprimé avec succès");
        } catch {
          notify.error("Suppression impossible (employé probablement référencé ailleurs).");
        }
      }
    );
  };

  const openDetailModal = async (employee) => {
    try {
      const { data } = await apiClient.get(`${API_ENDPOINTS.EMPLOYEES}${employee.emp_id}/`);
      setSelectedEmployee(data);
      setIsDetailModalOpen(true);
    } catch {
      notify.error("Impossible de charger les détails de l'employé.");
    }
  };

  const openFormModalForEdit = async (employee) => {
    try {
      const { data } = await apiClient.get(`${API_ENDPOINTS.EMPLOYEES}${employee.emp_id}/`);
      setEmployeeToEdit(data);
      setIsFormModalOpen(true);
    } catch {
      notify.error("Impossible de charger les détails de l'employé à modifier.");
    }
  };

  const columns = [
    {
      field: "emp_matricule",
      headerName: "Matricule",
      width: 120,
      renderCell: (params) => (
        <Box
          sx={{
            fontFamily: "monospace",
            fontWeight: 700,
            bgcolor: "#FFF8E1",
            color: "#E65100",
            border: "1px solid #FFE082",
            borderRadius: 1,
            px: 1,
            py: 0.5,
            fontSize: 12,
          }}
        >
          {params.value}
        </Box>
      ),
    },
    {
      field: "emp_nom",
      headerName: "Nom & Prénoms",
      flex: 1,
      minWidth: 180,
    },
    {
      field: "emp_fonction",
      headerName: "Fonction",
      width: 150,
    },
    {
      field: "direction_libelle",
      headerName: "Direction",
      width: 180,
    },
    {
      field: "service_libelle",
      headerName: "Service",
      width: 150,
    },
    {
      field: "site_nom",
      headerName: "Site",
      width: 150,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 160,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <ActionButtons
          onView={() => openDetailModal(params.row)}
          onEdit={canManageEmployee ? () => openFormModalForEdit(params.row) : null}
          onDelete={canManageEmployee ? () => handleDelete(params.row) : null}
        />
      ),
    },
  ];

  const siteOptions = [
    { value: "", label: "Tous les sites" },
    ...sites.map((s) => ({ value: s.site_id, label: s.site_nom })),
  ];

  const directionOptions = [
    { value: "", label: "Toutes les directions" },
    ...directions.map((d) => ({ value: d.dir_id, label: d.dir_libelle })),
  ];

  const serviceOptions = [
    { value: "", label: "Tous les services" },
    ...services.map((s) => ({ value: s.serv_id, label: s.serv_libelle })),
  ];

  return (
    <Box>
      <PageHeader
        actionLabel="Nouvel Employé"
        onAction={() => {
          setEmployeeToEdit(null);
          setIsFormModalOpen(true);
        }}
        canAction={canManageEmployee}
        secondaryActionLabel="Importer"
        onSecondaryAction={() => setIsImportModalOpen(true)}
        canSecondaryAction={canManageEmployee}
        onReset={() => {
          setSearch("");
          setSiteFiltre("");
          setDirectionFiltre("");
          setServiceFiltre("");
          resetPage();
        }}
        hasFilters={Boolean(search || siteFiltre || directionFiltre || serviceFiltre)}
      >
        <TextField
          placeholder="Rechercher par nom, matricule, fonction..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            resetPage();
          }}
          size="small"
          sx={{ flex: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <SearchIcon fontSize="small" sx={{ color: "text.secondary", mr: 1 }} />
              ),
            },
          }}
        />
        <SelectFilter
          label="Site"
          value={siteFiltre}
          onChange={(value) => {
            setSiteFiltre(value);
            resetPage();
          }}
          options={siteOptions}
          minWidth={150}
        />
        <SelectFilter
          label="Direction"
          value={directionFiltre}
          onChange={(value) => {
            setDirectionFiltre(value);
            resetPage();
          }}
          options={directionOptions}
          minWidth={180}
        />
        <SelectFilter
          label="Service"
          value={serviceFiltre}
          onChange={(value) => {
            setServiceFiltre(value);
            resetPage();
          }}
          options={serviceOptions}
          minWidth={150}
        />
      </PageHeader>
      <ErrorAlert error={error?.message} />

      <PaginatedDataGrid
        rows={data?.employees || []}
        columns={columns}
        loading={isLoading}
        rowCount={data?.totalCount || 0}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={(row) => row.emp_id}
        noRowsLabel="Aucun employé trouvé"
      />

      <EmployeeFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEmployeeToEdit(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["employees"] });
          queryClient.invalidateQueries({ queryKey: ["services"] });
          queryClient.invalidateQueries({ queryKey: ["directions"] });
          queryClient.invalidateQueries({ queryKey: ["sites"] });
        }}
        employeeToEdit={employeeToEdit}
        sites={sites}
        directions={directions}
        services={services}
      />

      <EmployeeDetailModal
        employee={selectedEmployee}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedEmployee(null);
        }}
        onEdit={(emp) => {
          setIsDetailModalOpen(false);
          setSelectedEmployee(null);
          setEmployeeToEdit(emp);
          setIsFormModalOpen(true);
        }}
      />

      <EmployeeImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["employees"] });
          queryClient.invalidateQueries({ queryKey: ["services"] });
          queryClient.invalidateQueries({ queryKey: ["directions"] });
          queryClient.invalidateQueries({ queryKey: ["sites"] });
        }}
      />

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
}