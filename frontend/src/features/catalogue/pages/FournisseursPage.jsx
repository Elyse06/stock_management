import { useState } from "react";
import { Box, TextField } from "@mui/material";
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

const EMPTY_FORM = {
  nom: "",
  email: "",
  adresse: "",
  contact: "",
  nif: "",
  stat: "",
};

export function FournisseursPage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const { paginationModel, setPaginationModel } = usePagination(25);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading, error } = useQuery({
    queryKey: ["fournisseurs", { page: paginationModel.page + 1, pageSize: paginationModel.pageSize }],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.FOURNISSEURS, {
        params: { page: paginationModel.page + 1, page_size: paginationModel.pageSize },
      });
      return {
        fournisseurs: data.results ?? data,
        totalCount: data.count ?? (data.results ?? data).length,
      };
    },
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(API_ENDPOINTS.FOURNISSEURS, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fournisseurs"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await apiClient.put(`${API_ENDPOINTS.FOURNISSEURS}${id}/`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fournisseurs"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`${API_ENDPOINTS.FOURNISSEURS}${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fournisseurs"] });
    },
  });

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const ouvrirCreation = () => {
    setForm(EMPTY_FORM);
    setEditing({});
    setModalOpen(true);
  };

  const ouvrirEdition = (fournisseur) => {
    setForm({
      nom: fournisseur.nom || "",
      email: fournisseur.email || "",
      adresse: fournisseur.adresse || "",
      contact: fournisseur.contact || "",
      nif: fournisseur.nif || "",
      stat: fournisseur.stat || "",
    });
    setEditing(fournisseur);
    setModalOpen(true);
  };

  const fermerModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    const payload = {
      nom: form.nom.trim(),
      email: form.email.trim(),
      adresse: form.adresse.trim() || null,
      contact: form.contact.trim() || null,
      nif: form.nif.trim() || null,
      stat: form.stat.trim() || null,
    };

    try {
      if (editing?.fournisseur_id) {
        await updateMutation.mutateAsync({ id: editing.fournisseur_id, ...payload });
        notify.success("Fournisseur modifié avec succès");
      } else {
        await createMutation.mutateAsync(payload);
        notify.success("Fournisseur créé avec succès");
      }
      fermerModal();
    } catch {
      notify.error(ERROR_MESSAGES.SAVE_FAILED);
    }
  };

  const supprimer = (fournisseur) => {
    confirm(
      "Supprimer le fournisseur",
      `Êtes-vous sûr de vouloir supprimer le fournisseur "${fournisseur.nom}" ?`,
      async () => {
        try {
          await deleteMutation.mutateAsync(fournisseur.fournisseur_id);
          notify.success("Fournisseur supprimé avec succès");
        } catch {
          notify.error("Suppression impossible (des articles sont probablement liés à ce fournisseur).");
        }
      }
    );
  };

  const columns = [
    { field: "nom", headerName: "Nom", flex: 1, minWidth: 180 },
    { field: "email", headerName: "Email", flex: 1, minWidth: 200, renderCell: (params) => <EmptyValue value={params.value} /> },
    { field: "contact", headerName: "Contact", width: 160, renderCell: (params) => <EmptyValue value={params.value} /> },
    { field: "nif", headerName: "NIF", width: 140, renderCell: (params) => <EmptyValue value={params.value} /> },
    { field: "stat", headerName: "STAT", width: 140, renderCell: (params) => <EmptyValue value={params.value} /> },
    { field: "adresse", headerName: "Adresse", flex: 1, minWidth: 200, renderCell: (params) => <EmptyValue value={params.value} /> },
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
      <PageHeader title="" actionLabel="Nouveau fournisseur" onAction={ouvrirCreation} />
      <ErrorAlert error={error?.message} />
      <PaginatedDataGrid
        rows={data?.fournisseurs || []}
        columns={columns}
        loading={isLoading}
        rowCount={data?.totalCount || 0}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={(row) => row.fournisseur_id}
        noRowsLabel="Aucun fournisseur"
      />
      <FormDialog
        open={modalOpen}
        onClose={fermerModal}
        title={editing?.fournisseur_id ? "Modifier le fournisseur" : "Nouveau fournisseur"}
        onSubmit={enregistrer}
        saving={isSaving}
        disabled={!form.nom.trim() || !form.email.trim()}
        maxWidth="md"
      >
        <TextField
          label="Nom"
          value={form.nom}
          onChange={handleChange("nom")}
          required
          autoFocus
          fullWidth
          margin="normal"
          inputProps={{ maxLength: 50 }}
        />
        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={handleChange("email")}
          required
          fullWidth
          margin="normal"
          inputProps={{ maxLength: 254 }}
        />
        <TextField
          label="Contact"
          value={form.contact}
          onChange={handleChange("contact")}
          fullWidth
          margin="normal"
          placeholder="Nom du contact principal"
          inputProps={{ maxLength: 20 }}
        />
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mt: 1 }}>
          <TextField
            label="NIF"
            value={form.nif}
            onChange={handleChange("nif")}
            fullWidth
            placeholder="Numéro d'Identification Fiscale"
            inputProps={{ maxLength: 20 }}
          />
          <TextField
            label="STAT"
            value={form.stat}
            onChange={handleChange("stat")}
            fullWidth
            placeholder="Numéro STAT"
            inputProps={{ maxLength: 20 }}
          />
        </Box>
        <TextField
          label="Adresse"
          value={form.adresse}
          onChange={handleChange("adresse")}
          fullWidth
          margin="normal"
          multiline
          rows={2}
          inputProps={{ maxLength: 50 }}
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