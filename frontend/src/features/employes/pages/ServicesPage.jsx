import { useState } from "react";
import { Box, TextField } from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
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
import { FormDialog } from "../../../components/common/FormDialog";
import { Chip } from "@mui/material";

const EMPTY_FORM = { serv_libelle: "", serv_dir_id: "", serv_info: "" };

export function ServicesPage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const { paginationModel, setPaginationModel, resetPage } = usePagination(25);
  const { canManageCatalogue } = usePermission();

  const [search, setSearch] = useState("");
  const [directionFiltre, setDirectionFiltre] = useState("");
  const [servToEdit, setServToEdit] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["services", {
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
      search,
      direction: directionFiltre,
    }],
    queryFn: async () => {
      const params = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
      };
      if (search) params.search = search;
      if (directionFiltre) params.serv_dir_id = directionFiltre;

      const { data } = await apiClient.get(API_ENDPOINTS.SERVICES, { params });
      return {
        services: data.results ?? data,
        totalCount: data.count ?? (data.results ?? data).length,
      };
    },
    keepPreviousData: true,
  });

  const { data: directions = [] } = useQuery({
    queryKey: ["directions", "options"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.DIRECTIONS, { params: { page_size: 100 } });
      return data.results ?? data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(API_ENDPOINTS.SERVICES, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["directions"] });
      notify.success(`Service « ${data.serv_libelle} » créé avec succès.`);
      handleCloseModal();
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.SAVE_FAILED;
      notify.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.put(`${API_ENDPOINTS.SERVICES}${id}/`, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["directions"] });
      notify.success(`Service « ${data.serv_libelle} » mis à jour avec succès.`);
      handleCloseModal();
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.SAVE_FAILED;
      notify.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`${API_ENDPOINTS.SERVICES}${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["directions"] });
      notify.success("Service supprimé.");
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.DELETE_FAILED;
      notify.error(msg);
    },
  });

  const handleOpenModal = (serv = null) => {
    if (serv) {
      setServToEdit(serv);
      setForm({
        serv_libelle: serv.serv_libelle || "",
        serv_dir_id: serv.serv_dir_id || "",
        serv_info: serv.serv_info || "",
      });
    } else {
      setServToEdit(null);
      setForm({ ...EMPTY_FORM, serv_dir_id: directions[0]?.dir_id || "" });
    }
    setIsFormModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsFormModalOpen(false);
    setServToEdit(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.serv_libelle.trim()) {
      notify.error("Le nom du service est requis.");
      return;
    }
    if (!form.serv_dir_id) {
      notify.error("Veuillez sélectionner une direction.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        serv_libelle: form.serv_libelle.trim(),
        serv_dir_id: form.serv_dir_id,
        serv_info: form.serv_info.trim(),
      };
      if (servToEdit) {
        await updateMutation.mutateAsync({ id: servToEdit.serv_id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (serv) => {
    confirm(
      "Supprimer le service",
      `Êtes-vous sûr de vouloir supprimer le service « ${serv.serv_libelle} » ?`,
      async () => {
        try {
          await deleteMutation.mutateAsync(serv.serv_id);
        } catch {}
      }
    );
  };

  const columns = [
    {
      field: "serv_libelle",
      headerName: "Service",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          sx={{ bgcolor: "#F3E5F5", color: "#7B1FA2", fontWeight: 700, fontSize: 11 }}
        />
      ),
    },
    {
      field: "serv_info",
      headerName: "Description",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "direction_libelle",
      headerName: "Direction parente",
      width: 200,
      renderCell: (params) => (
        <Chip
          label={params.value || "—"}
          size="small"
          sx={{ bgcolor: "#E3F2FD", color: "#1565C0", fontWeight: 600, fontSize: 11 }}
        />
      ),
    },
    {
      field: "employees_count",
      headerName: "Effectif",
      width: 110,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Chip
          label={`${params.value || 0}`}
          size="small"
          sx={{
            bgcolor: (params.value || 0) > 0 ? "#E8F5E9" : "#FAFAFA",
            color: (params.value || 0) > 0 ? "#2E7D32" : "#9E9E9E",
            fontWeight: 600,
          }}
        />
      ),
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
          onEdit={canManageCatalogue ? () => handleOpenModal(params.row) : null}
          onDelete={canManageCatalogue ? () => handleDelete(params.row) : null}
        />
      ),
    },
  ];

  const directionOptions = [
    { value: "", label: "Toutes les directions" },
    ...directions.map((d) => ({ value: d.dir_id, label: d.dir_libelle })),
  ];

  return (
    <Box>
      <PageHeader
        actionLabel="Nouveau Service"
        onAction={() => handleOpenModal()}
        canAction={canManageCatalogue}
        onReset={() => {
          setSearch("");
          setDirectionFiltre("");
          resetPage();
        }}
        hasFilters={Boolean(search || directionFiltre)}
      >
        <TextField
          placeholder="Rechercher par nom de service, code ou direction..."
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
          label="Direction"
          value={directionFiltre}
          onChange={(value) => {
            setDirectionFiltre(value);
            resetPage();
          }}
          options={directionOptions}
          minWidth={200}
        />
      </PageHeader>
      <ErrorAlert error={error?.message} />

      <PaginatedDataGrid
        rows={data?.services || []}
        columns={columns}
        loading={isLoading}
        rowCount={data?.totalCount || 0}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={(row) => row.serv_id}
        noRowsLabel="Aucun service trouvé"
      />

      <FormDialog
        open={isFormModalOpen}
        onClose={handleCloseModal}
        title={servToEdit ? "Modifier le Service" : "Ajouter un Service"}
        onSubmit={handleSubmit}
        saving={saving || createMutation.isPending || updateMutation.isPending}
        submitLabel={servToEdit ? "Enregistrer" : "Créer le service"}
        maxWidth="sm"
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Nom du service"
            value={form.serv_libelle}
            onChange={(e) => {
              setForm({ ...form, serv_libelle: e.target.value });
            }}
            required
            autoFocus
            fullWidth
          />
          <SelectFilter
            label="Direction de rattachement *"
            value={form.serv_dir_id}
            onChange={(value) => setForm({ ...form, serv_dir_id: value })}
            options={[
              { value: "", label: "-- Sélectionner --" },
              ...directions.map((d) => ({ value: d.dir_id, label: d.dir_libelle })),
            ]}
            required
          />
          <TextField
            label="Description"
            value={form.serv_info}
            onChange={(e) => setForm({ ...form, serv_info: e.target.value })}
            multiline
            rows={3}
            fullWidth
          />
        </Box>
      </FormDialog>

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