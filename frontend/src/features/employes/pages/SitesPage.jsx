import { useState } from "react";
import { Box, TextField, Autocomplete } from "@mui/material";
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

const SITE_TYPES = [
  { value: "SIEGE", label: "Siège" },
  { value: "AGENCE", label: "Agence" },
];

const EMPTY_FORM = { site_nom: "", site_type: "AGENCE", localite: "" };

export function SitesPage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const { paginationModel, setPaginationModel, resetPage } = usePagination(25);
  const { canManageCatalogue } = usePermission();

  const [search, setSearch] = useState("");
  const [typeFiltre, setTypeFiltre] = useState("");
  const [siteToEdit, setSiteToEdit] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["sites", {
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
      search,
      site_type: typeFiltre,
    }],
    queryFn: async () => {
      const params = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
      };
      if (search) params.search = search;
      if (typeFiltre) params.site_type = typeFiltre;

      const { data } = await apiClient.get(API_ENDPOINTS.SITES, { params });
      return {
        sites: data.results ?? data,
        totalCount: data.count ?? (data.results ?? data).length,
      };
    },
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(API_ENDPOINTS.SITES, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      notify.success(`Site « ${data.site_nom} » créé avec succès.`);
      handleCloseModal();
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.SAVE_FAILED;
      notify.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.put(`${API_ENDPOINTS.SITES}${id}/`, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      notify.success(`Site « ${data.site_nom} » mis à jour avec succès.`);
      handleCloseModal();
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.SAVE_FAILED;
      notify.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`${API_ENDPOINTS.SITES}${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      notify.success("Site supprimé.");
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.DELETE_FAILED;
      notify.error(msg);
    },
  });

  const handleOpenModal = (site = null) => {
    if (site) {
      setSiteToEdit(site);
      setForm({
        site_nom: site.site_nom || "",
        site_type: site.site_type || "AGENCE",
        localite: site.localite || "",
      });
    } else {
      setSiteToEdit(null);
      setForm(EMPTY_FORM);
    }
    setIsFormModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsFormModalOpen(false);
    setSiteToEdit(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.site_nom.trim()) {
      notify.error("Le nom du site est requis.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        site_nom: form.site_nom.trim(),
        site_type: form.site_type,
        localite: form.localite.trim(),
      };
      if (siteToEdit) {
        await updateMutation.mutateAsync({ id: siteToEdit.site_id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (site) => {
    confirm(
      "Supprimer le site",
      `Êtes-vous sûr de vouloir supprimer le site « ${site.site_nom} » ?`,
      async () => {
        try {
          await deleteMutation.mutateAsync(site.site_id);
        } catch {}
      }
    );
  };

  const columns = [
    {
      field: "site_nom",
      headerName: "Nom de l'établissement",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "site_type",
      headerName: "Type",
      width: 130,
      renderCell: (params) => {
        const found = SITE_TYPES.find((t) => t.value === params.value);
        return (
          <Chip
            label={found?.label || params.value}
            size="small"
            color={params.value === "SIEGE" ? "primary" : "default"}
            variant={params.value === "SIEGE" ? "filled" : "outlined"}
            sx={{ fontWeight: 600, fontSize: 11 }}
          />
        );
      },
    },
    {
      field: "localite",
      headerName: "Localité",
      width: 150,
    },
    {
      field: "directions_count",
      headerName: "Directions",
      width: 110,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Chip
          label={`${params.value || 0}`}
          size="small"
          sx={{ bgcolor: "#E1F5FE", color: "#0288D1", fontWeight: 600 }}
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

  const typeOptions = [
    { value: "", label: "Tous les types" },
    ...SITE_TYPES.map((t) => ({ value: t.value, label: t.label })),
  ];

  return (
    <Box>
      <PageHeader
        actionLabel="Nouveau Site"
        onAction={() => handleOpenModal()}
        canAction={canManageCatalogue}
        onReset={() => {
          setSearch("");
          setTypeFiltre("");
          resetPage();
        }}
        hasFilters={Boolean(search || typeFiltre)}
      >
        <TextField
          placeholder="Rechercher par nom de site, localité..."
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
          label="Type d'établissement"
          value={typeFiltre}
          onChange={(value) => {
            setTypeFiltre(value);
            resetPage();
          }}
          options={typeOptions}
          minWidth={180}
        />
      </PageHeader>
      <ErrorAlert error={error?.message} />

      <PaginatedDataGrid
        rows={data?.sites || []}
        columns={columns}
        loading={isLoading}
        rowCount={data?.totalCount || 0}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={(row) => row.site_id}
        noRowsLabel="Aucun site trouvé"
      />

      <FormDialog
        open={isFormModalOpen}
        onClose={handleCloseModal}
        title={siteToEdit ? "Modifier le Site" : "Ajouter un Site"}
        onSubmit={handleSubmit}
        saving={saving || createMutation.isPending || updateMutation.isPending}
        submitLabel={siteToEdit ? "Enregistrer" : "Créer le site"}
        maxWidth="sm"
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Nom de l'établissement *"
            value={form.site_nom}
            onChange={(e) => setForm({ ...form, site_nom: e.target.value })}
            required
            autoFocus
            fullWidth
          />
          <SelectFilter
            label="Type d'établissement"
            value={form.site_type}
            onChange={(value) => setForm({ ...form, site_type: value })}
            options={SITE_TYPES}
            required
          />
          <TextField
            label="Localité / Ville"
            value={form.localite}
            onChange={(e) => setForm({ ...form, localite: e.target.value })}
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