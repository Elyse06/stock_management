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

const EMPTY_FORM = { dir_id: "", dir_libelle: "", site: "", dir_description: "" };

export function DirectionsPage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const { paginationModel, setPaginationModel, resetPage } = usePagination(25);
  const { canManageCatalogue } = usePermission();

  const [search, setSearch] = useState("");
  const [siteFiltre, setSiteFiltre] = useState("");
  const [dirToEdit, setDirToEdit] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["directions", {
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
      search,
      site: siteFiltre,
    }],
    queryFn: async () => {
      const params = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
      };
      if (search) params.search = search;
      if (siteFiltre) params.site = siteFiltre;

      const { data } = await apiClient.get(API_ENDPOINTS.DIRECTIONS, { params });
      return {
        directions: data.results ?? data,
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

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(API_ENDPOINTS.DIRECTIONS, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["directions"] });
      notify.success(`Direction « ${data.dir_libelle} » créée avec succès.`);
      handleCloseModal();
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.SAVE_FAILED;
      notify.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.put(`${API_ENDPOINTS.DIRECTIONS}${id}/`, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["directions"] });
      notify.success(`Direction « ${data.dir_libelle} » mise à jour avec succès.`);
      handleCloseModal();
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.SAVE_FAILED;
      notify.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`${API_ENDPOINTS.DIRECTIONS}${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["directions"] });
      notify.success("Direction supprimée.");
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.DELETE_FAILED;
      notify.error(msg);
    },
  });

  const handleOpenModal = (dir = null) => {
    if (dir) {
      setDirToEdit(dir);
      setForm({
        dir_id: dir.dir_id || "",
        dir_libelle: dir.dir_libelle || "",
        site: dir.site || "",
        dir_description: dir.dir_description || "",
      });
    } else {
      setDirToEdit(null);
      setForm({ ...EMPTY_FORM, site: sites[0]?.site_id || "" });
    }
    setIsFormModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsFormModalOpen(false);
    setDirToEdit(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.dir_libelle.trim()) {
      notify.error("Le nom de la direction est requis.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        dir_id: (form.dir_id || form.dir_libelle.slice(0, 4).toUpperCase()).trim(),
        dir_libelle: form.dir_libelle.trim(),
        site: form.site ? Number(form.site) : null,
        dir_description: form.dir_description.trim(),
      };
      if (dirToEdit) {
        await updateMutation.mutateAsync({ id: dirToEdit.dir_id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (dir) => {
    confirm(
      "Supprimer la direction",
      `Êtes-vous sûr de vouloir supprimer la direction « ${dir.dir_libelle} » (${dir.dir_id}) ?`,
      async () => {
        try {
          await deleteMutation.mutateAsync(dir.dir_id);
        } catch {}
      }
    );
  };

  const columns = [
    {
      field: "dir_libelle",
      headerName: "Code",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "site_nom",
      headerName: "Site / Établissement",
      width: 180,
    },
    {
      field: "dir_description",
      headerName: "Description",
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ color: "text.secondary", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {params.value || "—"}
        </Box>
      ),
    },
    {
      field: "services_count",
      headerName: "Services",
      width: 110,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Chip
          label={`${params.value || 0}`}
          size="small"
          sx={{ bgcolor: "#F3E5F5", color: "#7B1FA2", fontWeight: 600 }}
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

  const siteOptions = [
    { value: "", label: "Tous les sites" },
    ...sites.map((s) => ({ value: s.site_id, label: s.site_nom })),
  ];

  return (
    <Box>
      <PageHeader
        actionLabel="Nouvelle Direction"
        onAction={() => handleOpenModal()}
        canAction={canManageCatalogue}
        onReset={() => {
          setSearch("");
          setSiteFiltre("");
          resetPage();
        }}
        hasFilters={Boolean(search || siteFiltre)}
      >
        <TextField
          placeholder="Rechercher par nom de direction, code ou site..."
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
          minWidth={180}
        />
      </PageHeader>
      <ErrorAlert error={error?.message} />

      <PaginatedDataGrid
        rows={data?.directions || []}
        columns={columns}
        loading={isLoading}
        rowCount={data?.totalCount || 0}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={(row) => row.dir_id}
        noRowsLabel="Aucune direction trouvée"
      />

      <FormDialog
        open={isFormModalOpen}
        onClose={handleCloseModal}
        title={dirToEdit ? "Modifier la Direction" : "Ajouter une Direction"}
        onSubmit={handleSubmit}
        saving={saving || createMutation.isPending || updateMutation.isPending}
        submitLabel={dirToEdit ? "Enregistrer" : "Créer la direction"}
        maxWidth="sm"
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Code"
            value={form.dir_libelle}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, dir_libelle: val });
              if (!dirToEdit && !form.dir_id) {
                setForm((prev) => ({ ...prev, dir_id: val.slice(0, 4).toUpperCase() }));
              }
            }}
            required
            autoFocus
            fullWidth
          />
          <SelectFilter
            label="Site / Établissement principal"
            value={form.site}
            onChange={(value) => setForm({ ...form, site: value })}
            options={[
              { value: "", label: "-- Sélectionner --" },
              ...sites.map((s) => ({ value: s.site_id, label: `${s.site_nom} (${s.site_type})` })),
            ]}
            required
          />
          <TextField
            label="Description"
            value={form.dir_description}
            onChange={(e) => setForm({ ...form, dir_description: e.target.value })}
            multiline
            rows={3}
            placeholder="Rôle stratégique, responsabilités, attributions..."
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