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
import { useAuth } from "../../../context/AuthContext";

// Champs du formulaire fournisseur (alignés avec le modèle Django)
const EMPTY_FORM = {
  nom: "",
  email: "",
  adresse: "",
  contact: "",
  nif: "",
  stat: "",
};

export function FournisseursPage() {
  const { hasAction, hasAnyAction } = useAuth();

  // TODO: Implémenter les permissions réelles avec hasAction
  // Exemple: const canEdit = hasAction('FOURN_EDIT');
  // Exemple: const canDelete = hasAction('FOURN_DELETE');
  // Pour l'instant, tous les utilisateurs connectés peuvent éditer
  const canEdit = true;

  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [rowCount, setRowCount] = useState(0);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = fermé, {} = création, {...} = édition
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const charger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get("/api/catalogue/fournisseurs/", {
        params: { page: paginationModel.page + 1, page_size: paginationModel.pageSize },
      });
      setFournisseurs(data.results ?? data);
      setRowCount(data.count ?? (data.results ?? data).length);
    } catch {
      setError("Impossible de charger les fournisseurs.");
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize]);

  useEffect(() => {
    charger();
  }, [charger]);

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

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        nom: form.nom.trim(),
        email: form.email.trim(),
        adresse: form.adresse.trim() || null,
        contact: form.contact.trim() || null,
        nif: form.nif.trim() || null,
        stat: form.stat.trim() || null,
      };
      if (editing?.fournisseur_id) {
        await apiClient.put(`/api/catalogue/fournisseurs/${editing.fournisseur_id}/`, payload);
      } else {
        await apiClient.post("/api/catalogue/fournisseurs/", payload);
      }
      fermerModal();
      charger();
    } catch (err) {
      const detail = err?.response?.data;
      if (detail && typeof detail === "object") {
        setError(
          Object.entries(detail)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ")
        );
      } else {
        setError("Erreur lors de l'enregistrement du fournisseur.");
      }
    } finally {
      setSaving(false);
    }
  };

  const supprimer = async (fournisseur) => {
    if (!window.confirm(`Supprimer le fournisseur "${fournisseur.nom}" ?`)) return;
    try {
      await apiClient.delete(`/api/catalogue/fournisseurs/${fournisseur.fournisseur_id}/`);
      charger();
    } catch {
      setError("Suppression impossible (des articles sont probablement liés à ce fournisseur).");
    }
  };

  const columns = [
    {
      field: "fournisseur_id",
      headerName: "ID",
      width: 80,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "nom",
      headerName: "Nom",
      flex: 1,
      minWidth: 180,
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1,
      minWidth: 200,
      renderCell: (params) => params.value || <Chip label="—" size="small" variant="outlined" />,
    },
    {
      field: "contact",
      headerName: "Contact",
      width: 160,
      renderCell: (params) => params.value || <Chip label="—" size="small" variant="outlined" />,
    },
    {
      field: "nif",
      headerName: "NIF",
      width: 140,
      renderCell: (params) => params.value || <Chip label="—" size="small" variant="outlined" />,
    },
    {
      field: "stat",
      headerName: "STAT",
      width: 140,
      renderCell: (params) => params.value || <Chip label="—" size="small" variant="outlined" />,
    },
    {
      field: "adresse",
      headerName: "Adresse",
      flex: 1,
      minWidth: 200,
      renderCell: (params) => params.value || <Chip label="—" size="small" variant="outlined" />,
    },
    ...(canEdit
      ? [
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
        ]
      : []),
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
        <Typography variant="h2">Fournisseurs</Typography>
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={ouvrirCreation}>
            Nouveau fournisseur
          </Button>
        )}
      </Box>

      {/* Erreur */}
      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* DataGrid */}
      <Box sx={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={fournisseurs}
          columns={columns}
          loading={loading}
          rowCount={rowCount}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          getRowId={(row) => row.fournisseur_id}
          localeText={{
            noRowsLabel: "Aucun fournisseur",
            loadingOverlay: "Chargement...",
          }}
        />
      </Box>

      {/* Modal Création / Édition */}
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
              {editing?.fournisseur_id ? "Modifier le fournisseur" : "Nouveau fournisseur"}
            </Typography>
            <IconButton onClick={fermerModal} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
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
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={fermerModal} disabled={saving}>
              Annuler
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving || !form.nom.trim() || !form.email.trim()}
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