import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, TextField } from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
import { usePermission } from "../../../hooks/usePermission";
import { usePagination } from "../../../hooks/usePagination";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { useNotification } from "../../../components/common/NotificationProvider";
import { useCategoryOptions } from "../../../hooks/useCategoryOptions";
import { PageHeader } from "../../../components/common/PageHeader";
import { ErrorAlert } from "../../../components/common/ErrorAlert";
import { ActionButtons } from "../../../components/common/ActionButtons";
import { CodeChip } from "../../../components/common/CodeChip";
import { EmptyValue } from "../../../components/common/EmptyValue";
import { PaginatedDataGrid } from "../../../components/common/PaginatedDataGrid";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { SelectFilter } from "../../../components/common/SelectFilter";
import { ArticleFormModal } from "../components/ArticleFormModal";

export function ArticleListPage() {
  const navigate = useNavigate();
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { confirmState, confirm, handleConfirm, handleCancel } =
    useConfirmDialog();
  const { paginationModel, setPaginationModel, resetPage } = usePagination(25);
  const { canManageCatalogue, canReadCatalogue } = usePermission();

  const [search, setSearch] = useState("");
  const [categorieFiltre, setCategorieFiltre] = useState("");
  const [typeFiltre, setTypeFiltre] = useState("");
  const [articleToEdit, setArticleToEdit] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "articles",
      {
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        search,
        categorie: categorieFiltre,
        is_immobilisation: typeFiltre ? typeFiltre === "true" : undefined,
      },
    ],
    queryFn: async () => {
      const params = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
      };
      if (search) params.search = search;
      if (categorieFiltre) params.categorie = categorieFiltre;
      if (typeFiltre) params.is_immobilisation = typeFiltre === "true";

      const { data } = await apiClient.get(API_ENDPOINTS.ARTICLES, { params });
      return {
        articles: data.results ?? data,
        totalCount: data.count ?? (data.results ?? data).length,
      };
    },
    keepPreviousData: true,
  });

  const { data: categories = [] } = useCategoryOptions();

  const deleteMutation = useMutation({
    mutationFn: async (code) => {
      await apiClient.delete(`${API_ENDPOINTS.ARTICLES}${code}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
  });

  const handleSearchChange = (value) => {
    setSearch(value);
    resetPage();
  };

  const handleCategorieChange = (value) => {
    setCategorieFiltre(value);
    resetPage();
  };

  const handleTypeChange = (value) => {
    setTypeFiltre(value);
    resetPage();
  };

  const openDetailModal = (article) => {
    navigate(`/catalogue/articles/${article.code_article}`);
  };

  const openFormModalForCreate = () => {
    setArticleToEdit(null);
    setIsFormModalOpen(true);
  };

  const openFormModalForEdit = async (article) => {
    try {
      const { data } = await apiClient.get(
        `${API_ENDPOINTS.ARTICLES}${article.code_article}/`,
      );
      setArticleToEdit(data);
      setIsFormModalOpen(true);
    } catch {
      notify.error(
        "Impossible de charger les détails de l'article à modifier.",
      );
    }
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setArticleToEdit(null);
  };

  const handleDelete = (article) => {
    confirm(
      "Supprimer l'article",
      `Êtes-vous sûr de vouloir supprimer l'article "${article.designation}" ?`,
      async () => {
        try {
          await deleteMutation.mutateAsync(article.code_article);
          notify.success("Article supprimé avec succès");
        } catch {
          notify.error(
            "Suppression impossible (article probablement référencé ailleurs).",
          );
        }
      },
    );
  };

  const columns = [
    { field: "designation", headerName: "Désignation", flex: 1, minWidth: 200 },
    {
      field: "categorie_nom",
      headerName: "Catégorie",
      width: 160,
      renderCell: (params) => <EmptyValue value={params.value} />,
    },
    {
      field: "description",
      headerName: "Description",
      width: 130,
      renderCell: (params) => <EmptyValue value={params.value} />,
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
          onEdit={
            canManageCatalogue ? () => openFormModalForEdit(params.row) : null
          }
          onDelete={canManageCatalogue ? () => handleDelete(params.row) : null}
        />
      ),
    },
  ];

  const categoryOptions = [
    { value: "", label: "Toutes catégories" },
    ...categories.map((c) => ({ value: c.categorie_id, label: c.cat_libelle })),
  ];

  return (
    <Box>
      <PageHeader
        actionLabel="Nouvel article"
        onAction={openFormModalForCreate}
        canAction={canManageCatalogue}
        onReset={() => {
          setSearch("");
          setCategorieFiltre("");
          setTypeFiltre("");
        }}
        hasFilters={Boolean(search || categorieFiltre || typeFiltre)}
      >
        <TextField
          placeholder="Rechercher"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          size="small"
          sx={{ flex: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <SearchIcon
                  fontSize="small"
                  sx={{ color: "text.secondary", mr: 1 }}
                />
              ),
            },
          }}
        />
        <SelectFilter
          label="Catégorie"
          value={categorieFiltre}
          onChange={handleCategorieChange}
          options={categoryOptions}
          minWidth={200}
        />
        <SelectFilter
          label="Type"
          value={typeFiltre}
          onChange={handleTypeChange}
          options={[
            { value: "", label: "Tous les types" },
            { value: "true", label: "Immobilisations" },
            { value: "false", label: "Fournitures" },
          ]}
          minWidth={150}
        />
      </PageHeader>
      <ErrorAlert error={error?.message} />

      <PaginatedDataGrid
        rows={data?.articles || []}
        columns={columns}
        loading={isLoading}
        rowCount={data?.totalCount || 0}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={(row) => row.code_article}
        noRowsLabel="Aucun article trouvé"
      />

      <ArticleFormModal
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ["articles"] })
        }
        articleToEdit={articleToEdit}
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
