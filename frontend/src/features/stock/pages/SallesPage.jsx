import { useState } from "react";
import { TextField } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
import { usePagination } from "../../../hooks/usePagination";
import { usePermission } from "../../../hooks/usePermission";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { useNotification } from "../../../components/common/NotificationProvider";
import { PageHeader } from "../../../components/common/PageHeader";
import { ErrorAlert } from "../../../components/common/ErrorAlert";
import { ActionButtons } from "../../../components/common/ActionButtons";
import { FormDialog } from "../../../components/common/FormDialog";
import { SelectFilter } from "../../../components/common/SelectFilter";
import { PaginatedDataGrid } from "../../../components/common/PaginatedDataGrid";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";

const EMPTY_FORM = { nom: "", localite: "" };

export function SallesPage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { paginationModel, setPaginationModel } = usePagination(25);
  const { canManageInventaire } = usePermission();
  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [formOpen, setFormOpen] = useState(false);
  const [salleEditing, setSalleEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading, error } = useQuery({
    queryKey: ["salles", { page: paginationModel.page + 1, pageSize: paginationModel.pageSize }],
    queryFn: async () => {
      const { data: response } = await apiClient.get(API_ENDPOINTS.SALLES, {
        params: { page: paginationModel.page + 1, page_size: paginationModel.pageSize },
      });
      return {
        salles: response.results ?? response,
        totalCount: response.count ?? (response.results ?? response).length,
      };
    },
    keepPreviousData: true,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites", "siege-options"],
    queryFn: async () => {
      const { data: response } = await apiClient.get(API_ENDPOINTS.SITES, {
        params: { page_size: 500, site_type: "SIEGE" },
      });
      return (response.results ?? response).filter((site) => site.site_type === "SIEGE");
    },
    staleTime: 1000 * 60 * 10,
  });

  const notifyMutationError = (err, fallback) => {
    const response = err.response?.data;
    if (typeof response?.detail === "string") {
      notify.error(response.detail);
      return;
    }
    const messages = Object.entries(response || {})
      .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(", ") : errors}`)
      .join(" | ");
    notify.error(messages || fallback);
  };

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data: response } = await apiClient.post(API_ENDPOINTS.SALLES, payload);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salles"] });
      notify.success("Salle créée avec succès.");
      fermerFormulaire();
    },
    onError: (err) => notifyMutationError(err, ERROR_MESSAGES.SAVE_FAILED),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data: response } = await apiClient.put(`${API_ENDPOINTS.SALLES}${id}/`, payload);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salles"] });
      notify.success("Salle modifiée avec succès.");
      fermerFormulaire();
    },
    onError: (err) => notifyMutationError(err, ERROR_MESSAGES.SAVE_FAILED),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => apiClient.delete(`${API_ENDPOINTS.SALLES}${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salles"] });
      notify.success("Salle supprimée.");
    },
    onError: (err) => notifyMutationError(err, ERROR_MESSAGES.DELETE_FAILED),
  });

  const ouvrirFormulaire = (salle = null) => {
    setSalleEditing(salle);
    setForm(salle
      ? { nom: salle.nom || "", localite: salle.localite || "" }
      : EMPTY_FORM);
    setFormOpen(true);
  };

  function fermerFormulaire() {
    setFormOpen(false);
    setSalleEditing(null);
    setForm(EMPTY_FORM);
  }

  const enregistrer = (event) => {
    event.preventDefault();
    const payload = { nom: form.nom.trim(), localite: Number(form.localite) };
    if (!payload.nom || !payload.localite) {
      notify.error("Le nom et le site Siège de la salle sont obligatoires.");
      return;
    }
    if (salleEditing) {
      updateMutation.mutate({ id: salleEditing.salle_id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const supprimer = (salle) => {
    confirm(
      "Supprimer la salle",
      `Supprimer la salle « ${salle.nom} » ? Les affectations déjà liées à cette salle empêchent sa suppression.`,
      () => deleteMutation.mutate(salle.salle_id)
    );
  };

  const columns = [
    { field: "nom", headerName: "Salle", flex: 1, minWidth: 200 },
    { field: "localite_nom", headerName: "Site Siège", flex: 1, minWidth: 180 },
    ...(canManageInventaire
      ? [{
        field: "actions",
        headerName: "Actions",
        width: 130,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        headerAlign: "center",
        align: "center",
        renderCell: ({ row }) => (
          <ActionButtons
            onEdit={() => ouvrirFormulaire(row)}
            onDelete={() => supprimer(row)}
          />
        ),
      }]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Salles"
        actionLabel="Nouvelle salle"
        canAction={canManageInventaire}
        onAction={() => ouvrirFormulaire()}
      />
      <ErrorAlert error={error?.message} />
      <PaginatedDataGrid
        rows={data?.salles || []}
        columns={columns}
        loading={isLoading}
        rowCount={data?.totalCount || 0}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={(row) => row.salle_id}
        noRowsLabel="Aucune salle"
      />
      <FormDialog
        open={formOpen}
        onClose={fermerFormulaire}
        title={salleEditing ? "Modifier la salle" : "Nouvelle salle"}
        onSubmit={enregistrer}
        saving={createMutation.isPending || updateMutation.isPending}
        disabled={!form.nom.trim() || !form.localite}
      >
        <TextField
          label="Nom de la salle"
          value={form.nom}
          onChange={(event) => setForm((current) => ({ ...current, nom: event.target.value }))}
          required
          autoFocus
          fullWidth
          margin="normal"
          inputProps={{ maxLength: 100 }}
        />
        <SelectFilter
          label="Site Siège"
          value={form.localite}
          onChange={(value) => setForm((current) => ({
            ...current,
            localite: value,
          }))}
          options={[
            { value: "", label: "Sélectionner un site Siège" },
            ...sites.map((site) => ({
              value: site.site_id,
              label: `${site.site_nom}${site.localite ? ` (${site.localite})` : ""}`,
            })),
          ]}
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
    </>
  );
}
