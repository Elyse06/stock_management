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

export function CategoriesPage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const { paginationModel, setPaginationModel } = usePagination(25);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formLibelle, setFormLibelle] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["categories", { page: paginationModel.page + 1, pageSize: paginationModel.pageSize }],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.CATEGORIES, {
        params: { page: paginationModel.page + 1, page_size: paginationModel.pageSize },
      });
      return {
        categories: data.results ?? data,
        totalCount: data.count ?? (data.results ?? data).length,
      };
    },
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(API_ENDPOINTS.CATEGORIES, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await apiClient.put(`${API_ENDPOINTS.CATEGORIES}${id}/`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`${API_ENDPOINTS.CATEGORIES}${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const ouvrirCreation = () => {
    setFormLibelle("");
    setFormDescription("");
    setEditing({});
    setModalOpen(true);
  };

  const ouvrirEdition = (cat) => {
    setFormLibelle(cat.cat_libelle || "");
    setFormDescription(cat.cat_description || "");
    setEditing(cat);
    setModalOpen(true);
  };

  const fermerModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    const payload = {
      cat_libelle: formLibelle.trim(),
      cat_description: formDescription.trim(),
    };

    try {
      if (editing?.categorie_id) {
        await updateMutation.mutateAsync({ id: editing.categorie_id, ...payload });
        notify.success("Catégorie modifiée avec succès");
      } else {
        await createMutation.mutateAsync(payload);
        notify.success("Catégorie créée avec succès");
      }
      fermerModal();
    } catch {
      notify.error(ERROR_MESSAGES.SAVE_FAILED);
    }
  };

  const supprimer = (cat) => {
    confirm(
      "Supprimer la catégorie",
      `Êtes-vous sûr de vouloir supprimer la catégorie "${cat.cat_libelle}" ?`,
      async () => {
        try {
          await deleteMutation.mutateAsync(cat.categorie_id);
          notify.success("Catégorie supprimée avec succès");
        } catch {
          notify.error("Suppression impossible (des articles utilisent probablement cette catégorie).");
        }
      }
    );
  };

  const columns = [
    { field: "cat_libelle", headerName: "code", flex: 1, minWidth: 200 },
    {
      field: "cat_description",
      headerName: "Description",
      flex: 2,
      minWidth: 300,
      renderCell: (params) => <EmptyValue value={params.value} />,
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
      <PageHeader title="" actionLabel="Nouvelle catégorie" onAction={ouvrirCreation} />
      <ErrorAlert error={error?.message} />
      <PaginatedDataGrid
        rows={data?.categories || []}
        columns={columns}
        loading={isLoading}
        rowCount={data?.totalCount || 0}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={(row) => row.categorie_id}
        noRowsLabel="Aucune catégorie"
      />
      <FormDialog
        open={modalOpen}
        onClose={fermerModal}
        title={editing?.categorie_id ? "Modifier la catégorie" : "Nouvelle catégorie"}
        onSubmit={enregistrer}
        saving={isSaving}
        disabled={!formLibelle.trim()}
      >
        <TextField
          label="Code"
          value={formLibelle}
          onChange={(e) => setFormLibelle(e.target.value)}
          required
          autoFocus
          fullWidth
          margin="normal"
          inputProps={{ maxLength: 20 }}
        />
        <TextField
          label="Description"
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          fullWidth
          margin="normal"
          multiline
          rows={3}
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