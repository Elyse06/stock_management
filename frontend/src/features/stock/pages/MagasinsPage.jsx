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
  AccountBalance as AccountBalanceIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { apiClient } from "../../../api/client";

const EMPTY_FORM = {
  magasin_nom: "",
  localite: "",
};

export function MagasinsPage() {
  const [magasins, setMagasins] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });
  const [rowCount, setRowCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const charger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get("/api/stock/magasins/", {
        params: {
          page: paginationModel.page + 1,
          page_size: paginationModel.pageSize,
        },
      });
      setMagasins(data.results ?? data);
      setRowCount(data.count ?? (data.results ?? data).length);
    } catch {
      setError("Impossible de charger les magasins.");
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize]);

  useEffect(() => {
    charger();
  }, [charger]);

  // Charger les sites au montage
  useEffect(() => {
    apiClient
      .get("/api/employee/sites/", { params: { page_size: 100 } })
      .then((res) => setSites(res.data.results ?? res.data))
      .catch(() => {});
  }, []);

  const ouvrirCreation = () => {
    setForm(EMPTY_FORM);
    setEditing({});
    setModalOpen(true);
  };

  const ouvrirEdition = (magasin) => {
    setForm({
      magasin_nom: magasin.magasin_nom || "",
      localite: magasin.localite || "", // ID du site
    });
    setEditing(magasin);
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
        magasin_nom: form.magasin_nom.trim(),
        localite: form.localite ? Number(form.localite) : null,
      };
      if (editing?.magasin_id) {
        await apiClient.put(
          `/api/stock/magasins/${editing.magasin_id}/`,
          payload
        );
      } else {
        await apiClient.post("/api/stock/magasins/", payload);
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
        setError("Erreur lors de l'enregistrement du magasin.");
      }
    } finally {
      setSaving(false);
    }
  };

  const supprimer = async (magasin) => {
    if (!window.confirm(`Supprimer le magasin "${magasin.magasin_nom}" ?`))
      return;
    try {
      await apiClient.delete(`/api/stock/magasins/${magasin.magasin_id}/`);
      charger();
    } catch {
      setError(
        "Suppression impossible (des mouvements y sont probablement liés)."
      );
    }
  };

  const getSiteIcon = (type) => {
    return type === "SIEGE" ? (
      <AccountBalanceIcon fontSize="small" sx={{ mr: 0.5 }} />
    ) : (
      <BusinessIcon fontSize="small" sx={{ mr: 0.5 }} />
    );
  };

  const columns = [
    {
      field: "magasin_id",
      headerName: "ID",
      width: 80,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "magasin_nom",
      headerName: "Nom",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "localite_nom",
      headerName: "Site",
      flex: 1,
      minWidth: 200,
      renderCell: (params) => {
        const nom = params.row.localite_nom;
        const type = params.row.localite_type;
        if (!nom) return <Chip label="—" size="small" variant="outlined" />;
        return (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {getSiteIcon(type)}
            <Chip
              label={type === "SIEGE" ? "Siège" : "Agence"}
              size="small"
              color={type === "SIEGE" ? "primary" : "secondary"}
              sx={{ mr: 1 }}
            />
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
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h2">Magasins</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={ouvrirCreation}
        >
          Nouveau magasin
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={magasins}
          columns={columns}
          loading={loading}
          rowCount={rowCount}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          getRowId={(row) => row.magasin_id}
          localeText={{
            noRowsLabel: "Aucun magasin",
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
              {editing?.magasin_id ? "Modifier le magasin" : "Nouveau magasin"}
            </Typography>
            <IconButton onClick={fermerModal} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
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
            <FormControl fullWidth margin="normal">
              <InputLabel>Site (Siège/Agence)</InputLabel>
              <Select
                value={form.localite}
                label="Site (Siège/Agence)"
                onChange={handleChange("localite")}
              >
                <MenuItem value="">-- Aucun site --</MenuItem>
                {sites.map((s) => (
                  <MenuItem key={s.site_id} value={s.site_id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {getSiteIcon(s.site_type)}
                      <Chip
                        label={s.site_type === "SIEGE" ? "Siège" : "Agence"}
                        size="small"
                        color={s.site_type === "SIEGE" ? "primary" : "secondary"}
                      />
                      <Typography variant="body2">{s.site_nom}</Typography>
                      {s.localite && (
                        <Typography variant="caption" color="text.secondary">
                          ({s.localite})
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={fermerModal} disabled={saving}>
              Annuler
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving || !form.magasin_nom.trim()}
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