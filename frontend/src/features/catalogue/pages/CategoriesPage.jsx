import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { apiClient } from "../../../api/client";

export function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });
  const [rowCount, setRowCount] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formLibelle, setFormLibelle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const charger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get("/api/catalogue/categories/", {
        params: {
          page: paginationModel.page + 1,
          page_size: paginationModel.pageSize,
        },
      });
      setCategories(data.results ?? data);
      setRowCount(data.count ?? (data.results ?? data).length);
    } catch {
      setError("Impossible de charger les catégories.");
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize]);

  useEffect(() => {
    charger();
  }, [charger]);

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
    setSaving(true);
    setError("");
    try {
      const payload = {
        cat_libelle: formLibelle.trim(),
        cat_description: formDescription.trim(),
      };
      if (editing?.categorie_id) {
        await apiClient.put(
          `/api/catalogue/categories/${editing.categorie_id}/`,
          payload,
        );
      } else {
        await apiClient.post("/api/catalogue/categories/", payload);
      }
      fermerModal();
      charger();
    } catch {
      setError("Erreur lors de l'enregistrement de la catégorie.");
    } finally {
      setSaving(false);
    }
  };

  const supprimer = async (cat) => {
    if (!window.confirm(`Supprimer la catégorie "${cat.cat_libelle}" ?`))
      return;
    try {
      await apiClient.delete(`/api/catalogue/categories/${cat.categorie_id}/`);
      charger();
    } catch {
      setError(
        "Suppression impossible (des articles utilisent probablement cette catégorie).",
      );
    }
  };

  const columns = [
    {
      field: "categorie_id",
      headerName: "ID",
      width: 80,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "cat_libelle",
      headerName: "Libellé",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "cat_description",
      headerName: "Description",
      flex: 2,
      minWidth: 300,
      renderCell: (params) =>
        params.value || <Chip label="—" size="small" variant="outlined" />,
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
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Modifier">
            <IconButton
              size="small"
              color="primary"
              onClick={() => ouvrirEdition(params.row)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer">
            <IconButton
              size="small"
              color="error"
              onClick={() => supprimer(params.row)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h2">Catégories</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={ouvrirCreation}
        >
          Nouvelle catégorie
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={categories}
          columns={columns}
          loading={loading}
          rowCount={rowCount}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          getRowId={(row) => row.categorie_id}
          localeText={{
            noRowsLabel: "Aucune catégorie",
            loadingOverlay: "Chargement...",
          }}
        />
      </Box>

      <Dialog
        open={modalOpen}
        onClose={fermerModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <form onSubmit={enregistrer}>
          <DialogTitle
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              bgcolor: "#FFF8E1",
              borderBottom: "2px solid",
              borderColor: "primary.main",
            }}
          >
            <Typography variant="h3">
              {editing?.categorie_id
                ? "Modifier la catégorie"
                : "Nouvelle catégorie"}
            </Typography>
            <IconButton onClick={fermerModal} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <TextField
              label="Libellé"
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
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={fermerModal} disabled={saving}>
              Annuler
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving || !formLibelle.trim()}
              startIcon={saving ? <CircularProgress size={16} /> : null}
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
