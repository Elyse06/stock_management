import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Alert,
  Chip,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { apiClient } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { ArticleModal } from "../components/ArticleModal";
import { ArticleFormModal } from "../components/ArticleFormModal";

export function ArticleListPage() {
  const { hasAction, hasAnyAction } = useAuth();

  // TODO: Implémenter les permissions réelles avec hasAction
  // Exemple: const canCreate = hasAction('ART_CREATE');
  // Exemple: const canUpdate = hasAction('ART_UPDATE');
  // Exemple: const canDelete = hasAction('ART_DELETE');
  // Pour l'instant, tous les utilisateurs connectés peuvent éditer
  const canEdit = true;

  // ====== DATA ======
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [rowCount, setRowCount] = useState(0);

  // ====== FILTRES ======
  const [search, setSearch] = useState("");
  const [categorieFiltre, setCategorieFiltre] = useState("");

  // ====== MODALS ======
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [articleToEdit, setArticleToEdit] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  // ====== CHARGEMENT DES CATÉGORIES (une seule fois) ======
  useEffect(() => {
    apiClient
      .get("/api/catalogue/categories/", { params: { page_size: 100 } })
      .then((res) => setCategories(res.data.results ?? res.data))
      .catch(() => {});
  }, []);

  // ====== CHARGEMENT DES ARTICLES ======
  const charger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
      };
      if (search) params.search = search;
      if (categorieFiltre) params.categorie = categorieFiltre;

      const { data } = await apiClient.get("/api/catalogue/articles/", { params });
      setArticles(data.results ?? data);
      setRowCount(data.count ?? (data.results ?? data).length);
    } catch {
      setError("Impossible de charger les articles.");
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize, search, categorieFiltre]);

  useEffect(() => {
    charger();
  }, [charger]);

  // ====== HANDLERS ======
  const handleSearchChange = (value) => {
    setSearch(value);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleCategorieChange = (value) => {
    setCategorieFiltre(value);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const openDetailModal = (article) => {
    setSelectedArticle(article);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedArticle(null);
  };

  const openFormModalForCreate = () => {
    setArticleToEdit(null);
    setIsFormModalOpen(true);
  };

  const openFormModalForEdit = async (article) => {
    try {
      const { data } = await apiClient.get(`/api/catalogue/articles/${article.code_article}/`);
      setArticleToEdit(data);
      setIsFormModalOpen(true);
    } catch {
      setError("Impossible de charger les détails de l'article à modifier.");
    }
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setArticleToEdit(null);
  };

  const handleDelete = async (article) => {
    if (!window.confirm(`Supprimer l'article "${article.designation}" ?`)) return;
    try {
      await apiClient.delete(`/api/catalogue/articles/${article.code_article}/`);
      charger();
    } catch {
      setError("Suppression impossible (article probablement référencé ailleurs).");
    }
  };

  // ====== COULEUR CATÉGORIE ======
  const getCategorieColor = (cat) => {
    if (!cat) return "default";
    const c = cat.toLowerCase();
    if (c.includes("info")) return "info";
    if (c.includes("bureau")) return "primary";
    if (c.includes("consommable")) return "warning";
    return "default";
  };

  // ====== COLONNES ======
  const columns = [
    {
      field: "code_article",
      headerName: "Code",
      width: 130,
      renderCell: (params) => (
        <Typography
          variant="body2"
          fontFamily="monospace"
          fontWeight={600}
          sx={{
            bgcolor: "#FFF8E1",
            px: 1,
            py: 0.3,
            borderRadius: 0.5,
            border: "1px solid #F9A825",
          }}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: "designation",
      headerName: "Désignation",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "categorie_nom",
      headerName: "Catégorie",
      width: 160,
      renderCell: (params) =>
        params.value ? (
          <Chip
            label={params.value}
            color={getCategorieColor(params.value)}
            size="small"
            variant="outlined"
          />
        ) : (
          <Chip label="—" size="small" variant="outlined" />
        ),
    },
    {
      field: "marque_libelle",
      headerName: "Marque",
      width: 130,
      renderCell: (params) => params.value || <Chip label="—" size="small" variant="outlined" />,
    },
    {
      field: "stock_calcule",
      headerName: "Stock",
      width: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Chip
          label={params.value ?? 0}
          size="small"
          color={params.value > 0 ? "success" : "error"}
          variant="filled"
        />
      ),
    },
    ...(canEdit
      ? [
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
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <Tooltip title="Détails">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => openDetailModal(params.row)}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Modifier">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => openFormModalForEdit(params.row)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Supprimer">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(params.row)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ),
          },
        ]
      : []),
  ];

  return (
    <Box>
      {/* ====== HEADER ====== */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h2">Catalogue des articles</Typography>
          <Typography variant="body2" color="text.secondary">
            Gérez votre inventaire, filtres et actions en un seul endroit
          </Typography>
        </Box>
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openFormModalForCreate}>
            Nouvel article
          </Button>
        )}
      </Box>

      {/* ====== ERREUR ====== */}
      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* ====== TOOLBAR (recherche + filtre) ====== */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          alignItems: "center",
          mb: 2,
          p: 2,
          bgcolor: "#FAFAFA",
          borderRadius: 1,
          border: "1px solid #E0E0E0",
        }}
      >
        {/* Recherche */}
        <TextField
          placeholder="Rechercher (code, désignation, code-barre)..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
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

        {/* Filtre catégorie */}
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Catégorie</InputLabel>
          <Select
            value={categorieFiltre}
            label="Catégorie"
            onChange={(e) => handleCategorieChange(e.target.value)}
          >
            <MenuItem value="">Toutes catégories</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.categorie_id} value={c.categorie_id}>
                {c.cat_libelle}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Reset filtres */}
        {(search || categorieFiltre) && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setSearch("");
              setCategorieFiltre("");
            }}
          >
            Réinitialiser
          </Button>
        )}
      </Box>

      {/* ====== DATAGRID ====== */}
      <Box sx={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={articles}
          columns={columns}
          loading={loading}
          rowCount={rowCount}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          getRowId={(row) => row.code_article}
          localeText={{
            noRowsLabel: "Aucun article trouvé",
            loadingOverlay: "Chargement...",
          }}
        />
      </Box>

      {/* ====== MODAL DÉTAILS ====== */}
      <ArticleModal
        article={selectedArticle}
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        onEdit={openFormModalForEdit}
      />

      {/* ====== MODAL FORMULAIRE ====== */}
      <ArticleFormModal
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        onSuccess={charger}
        articleToEdit={articleToEdit}
      />
    </Box>
  );
}