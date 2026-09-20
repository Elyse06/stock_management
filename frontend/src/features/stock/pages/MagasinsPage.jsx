import { useState } from "react";
import { Box, TextField, Typography } from "@mui/material";
import { AccountBalance as AccountBalanceIcon, Business as BusinessIcon } from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
import { usePagination } from "../../../hooks/usePagination";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { useNotification } from "../../../components/common/NotificationProvider";
import { PageHeader } from "../../../components/common/PageHeader";
import { ErrorAlert } from "../../../components/common/ErrorAlert";
import { ActionButtons } from "../../../components/common/ActionButtons";
import { EmptyValue } from "../../../components/common/EmptyValue";
import { FormDialog } from "../../../components/common/FormDialog";
import { PaginatedDataGrid } from "../../../components/common/PaginatedDataGrid";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { SelectFilter } from "../../../components/common/SelectFilter";

const EMPTY_FORM = { magasin_nom: "", localite: "" };

export function MagasinsPage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const { paginationModel, setPaginationModel } = usePagination(25);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading, error } = useQuery({
    queryKey: ["magasins", { page: paginationModel.page + 1, pageSize: paginationModel.pageSize }],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.MAGASINS, {
        params: { page: paginationModel.page + 1, page_size: paginationModel.pageSize },
      });
      return {
        magasins: data.results ?? data,
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
      const { data } = await apiClient.post(API_ENDPOINTS.MAGASINS, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["magasins"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await apiClient.put(`${API_ENDPOINTS.MAGASINS}${id}/`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["magasins"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`${API_ENDPOINTS.MAGASINS}${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["magasins"] });
    },
  });

  const handleChange = (field) => (e) => {
    const value = e?.target
      ? e.target.value
      : e;
    setForm((prev) => ({ ...prev, [field]: value}));
  };

  const ouvrirCreation = () => {
    setForm(EMPTY_FORM);
    setEditing({});
    setModalOpen(true);
  };

  const ouvrirEdition = (magasin) => {
    setForm({
      magasin_nom: magasin.magasin_nom || "",
      localite: magasin.localite || "",
    });
    setEditing(magasin);
    setModalOpen(true);
  };

  const fermerModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    const payload = {
      magasin_nom: form.magasin_nom.trim(),
      localite: form.localite ? Number(form.localite) : null,
    };

    try {
      if (editing?.magasin_id) {
        await updateMutation.mutateAsync({ id: editing.magasin_id, ...payload });
        notify.success("Magasin modifié avec succès");
      } else {
        await createMutation.mutateAsync(payload);
        notify.success("Magasin créé avec succès");
      }
      fermerModal();
    } catch {
      notify.error(ERROR_MESSAGES.SAVE_FAILED);
    }
  };

  const supprimer = (magasin) => {
    confirm(
      "Supprimer le magasin",
      `Êtes-vous sûr de vouloir supprimer le magasin "${magasin.magasin_nom}" ?`,
      async () => {
        try {
          await deleteMutation.mutateAsync(magasin.magasin_id);
          notify.success("Magasin supprimé avec succès");
        } catch {
          notify.error("Suppression impossible (des mouvements y sont probablement liés).");
        }
      }
    );
  };

  const getSiteIcon = (type) =>
    type === "SIEGE" ? (
      <AccountBalanceIcon fontSize="small" sx={{ mr: 0.5 }} />
    ) : (
      <BusinessIcon fontSize="small" sx={{ mr: 0.5 }} />
    );

  const siteOptions = [
    { value: "", label: "-- Aucun site --" },
    ...sites.map((s) => ({
      value: s.site_id,
      label: (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {getSiteIcon(s.site_type)}
          <Typography variant="body2">{s.site_nom}</Typography>
          {s.localite && (
            <Typography variant="caption" color="text.secondary">
              ({s.localite})
            </Typography>
          )}
        </Box>
      ),
    })),
  ];

  const columns = [
    { field: "magasin_id", headerName: "ID", width: 80, headerAlign: "center", align: "center" },
    { field: "magasin_nom", headerName: "Nom", flex: 1, minWidth: 200 },
    {
      field: "localite_nom",
      headerName: "Site",
      flex: 1,
      minWidth: 200,
      renderCell: (params) => {
        const nom = params.row.localite_nom;
        const type = params.row.localite_type;
        if (!nom) return <EmptyValue />;
        return (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {getSiteIcon(type)}
            <Typography variant="body2">{nom}</Typography>
          </Box>
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 140,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <ActionButtons
          onEdit={() => ouvrirEdition(params.row)}
          onDelete={() => supprimer(params.row)}
        />
      ),
    },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Box>
      <PageHeader title="Magasins" actionLabel="Nouveau magasin" onAction={ouvrirCreation} />
      <ErrorAlert error={error?.message} />
      <PaginatedDataGrid
        rows={data?.magasins || []}
        columns={columns}
        loading={isLoading}
        rowCount={data?.totalCount || 0}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={(row) => row.magasin_id}
        noRowsLabel="Aucun magasin"
      />
      <FormDialog
        open={modalOpen}
        onClose={fermerModal}
        title={editing?.magasin_id ? "Modifier le magasin" : "Nouveau magasin"}
        onSubmit={enregistrer}
        saving={isSaving}
        disabled={!form.magasin_nom.trim()}
      >
        <TextField
          label="Nom"
          value={form.magasin_nom}
          onChange={handleChange("magasin_nom")}
          required
          autoFocus
          fullWidth
          margin="normal"
          inputProps={{ maxLength: 50 }}
        />
        <SelectFilter
          label="Site (Siège/Agence)"
          value={form.localite}
          onChange={handleChange("localite")}
          options={siteOptions}
          minWidth={250}
        />
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