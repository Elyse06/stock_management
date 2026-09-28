import { useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Stack,
  InputAdornment,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  LocationOn as LocationOnIcon,
  People as PeopleIcon,
  AccountTree as AccountTreeIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
import { useNotification } from "../../../components/common/NotificationProvider";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { ErrorAlert } from "../../../components/common/ErrorAlert";

export function DirectionsPage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirmDialog();

  const [searchTerm, setSearchTerm] = useState("");
  const [siteFilter, setSiteFilter] = useState("ALL");

  // Form modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDir, setEditingDir] = useState(null);
  const [code, setCode] = useState("");
  const [libelle, setLibelle] = useState("");
  const [siteId, setSiteId] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});

  // Queries
  const { data: directions = [], isLoading, error } = useQuery({
    queryKey: ["directions"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.DIRECTIONS);
      return Array.isArray(data) ? data : data.results || [];
    },
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.SITES);
      return Array.isArray(data) ? data : data.results || [];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(API_ENDPOINTS.DIRECTIONS, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["directions"] });
      notify.success(`Direction « ${data.dir_libelle} » créée avec succès.`);
      handleCloseModal();
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.SAVE_FAILED;
      notify.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.put(`${API_ENDPOINTS.DIRECTIONS}${id}/`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["directions"] });
      notify.success(`Direction mise à jour avec succès.`);
      handleCloseModal();
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.SAVE_FAILED;
      notify.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`${API_ENDPOINTS.DIRECTIONS}${id}/`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["directions"] });
      notify.success("Direction supprimée.");
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.DELETE_FAILED;
      notify.error(msg);
    },
  });

  const handleOpenModal = (dir = null) => {
    if (dir) {
      setEditingDir(dir);
      setCode(dir.dir_id || "");
      setLibelle(dir.dir_libelle || "");
      setSiteId(dir.site_id || dir.site || (sites[0]?.site_id || ""));
      setDescription(dir.dir_description || "");
    } else {
      setEditingDir(null);
      setCode("");
      setLibelle("");
      setSiteId(sites[0]?.site_id || "");
      setDescription("");
    }
    setErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingDir(null);
    setErrors({});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!libelle.trim()) {
      newErrors.libelle = "Le nom de la direction est requis.";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      dir_id: (code || libelle.slice(0, 4).toUpperCase()).trim(),
      dir_libelle: libelle.trim(),
      site_id: siteId || 1,
      dir_description: description.trim(),
    };

    if (editingDir) {
      updateMutation.mutate({ id: editingDir.dir_id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (dir) => {
    confirm({
      title: "Supprimer la direction ?",
      message: `Êtes-vous sûr de vouloir supprimer la direction « ${dir.dir_libelle} » (${dir.dir_id}) ?`,
      onConfirm: () => deleteMutation.mutate(dir.dir_id),
    });
  };

  const filteredDirections = useMemo(() => {
    return directions.filter((d) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesLibelle = d.dir_libelle?.toLowerCase().includes(q);
        const matchesCode = d.dir_id?.toLowerCase().includes(q);
        const matchesSite = d.site_nom?.toLowerCase().includes(q);
        if (!matchesLibelle && !matchesCode && !matchesSite) return false;
      }
      if (siteFilter !== "ALL") {
        if (d.site_id !== Number(siteFilter) && d.site !== Number(siteFilter)) return false;
      }
      return true;
    });
  }, [directions, searchTerm, siteFilter]);

  const totalEmployees = directions.reduce((acc, d) => acc + (d.employees_count || 0), 0);
  const totalServices = directions.reduce((acc, d) => acc + (d.services_count || 0), 0);

  return (
    <Box sx={{ maxWidth: 1300, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              bgcolor: "#E1F5FE",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0288D1",
            }}
          >
            <BusinessIcon fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Gestion des Directions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Grandes divisions administratives et organisationnelles de l'entreprise
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenModal()}
          sx={{
            bgcolor: "primary.main",
            color: "#000",
            fontWeight: 700,
            textTransform: "none",
            px: 2.5,
            boxShadow: "0 2px 6px rgba(249, 168, 37, 0.4)",
            "&:hover": { bgcolor: "primary.dark" },
          }}
        >
          Nouvelle Direction
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ border: "1px solid #E0E0E0", borderRadius: 2 }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase" }}>
                    Total Directions
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="text.primary">
                    {directions.length}
                  </Typography>
                </Box>
                <Chip label="Pôles" size="small" sx={{ bgcolor: "#E1F5FE", color: "#0288D1", fontWeight: 700 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ border: "1px solid #E0E0E0", borderRadius: 2 }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase" }}>
                    Services rattachés
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="#7B1FA2">
                    {totalServices}
                  </Typography>
                </Box>
                <AccountTreeIcon sx={{ color: "#7B1FA2", fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ border: "1px solid #E0E0E0", borderRadius: 2 }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase" }}>
                    Effectif total couvert
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="#2E7D32">
                    {totalEmployees}
                  </Typography>
                </Box>
                <PeopleIcon sx={{ color: "#2E7D32", fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recherche et filtres */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: "1px solid #E0E0E0", borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              size="small"
              fullWidth
              placeholder="Rechercher par nom de direction, code ou site..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <IconButton size="small" onClick={() => setSearchTerm("")}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                ) : null,
              }}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <FormControl size="small" fullWidth>
              <InputLabel>Filtrer par Site</InputLabel>
              <Select
                value={siteFilter}
                label="Filtrer par Site"
                onChange={(e) => setSiteFilter(e.target.value)}
              >
                <MenuItem value="ALL">Tous les sites</MenuItem>
                {sites.map((s) => (
                  <MenuItem key={s.site_id} value={s.site_id}>
                    {s.site_nom}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {error && <ErrorAlert message={error.message || ERROR_MESSAGES.LOAD_FAILED} sx={{ mb: 2 }} />}

      {/* Table */}
      <Paper elevation={0} sx={{ border: "1px solid #E0E0E0", borderRadius: 2, overflow: "hidden" }}>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: "#FAFAFA" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Code Direction</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Libellé</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Site / Établissement Principal</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5, textAlign: "center" }}>Services</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5, textAlign: "center" }}>Effectif</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5, textAlign: "center" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    Chargement des directions...
                  </TableCell>
                </TableRow>
              ) : filteredDirections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    Aucune direction trouvée.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDirections.map((d) => (
                  <TableRow key={d.dir_id} hover>
                    <TableCell>
                      <Chip
                        label={d.dir_id}
                        size="small"
                        sx={{ fontFamily: "monospace", fontWeight: 800, bgcolor: "#E1F5FE", color: "#0288D1" }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{d.dir_libelle}</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                        <LocationOnIcon fontSize="small" sx={{ color: "text.secondary", fontSize: 16 }} />
                        <Typography variant="body2">{d.site_nom || "Non assigné"}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary", maxWidth: 320 }}>
                      {d.dir_description || "Aucune description fournie"}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${d.services_count || 0} service${(d.services_count || 0) > 1 ? "s" : ""}`}
                        size="small"
                        sx={{ bgcolor: "#F3E5F5", color: "#7B1FA2", fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${d.employees_count || 0} employé${(d.employees_count || 0) > 1 ? "s" : ""}`}
                        size="small"
                        sx={{
                          bgcolor: (d.employees_count || 0) > 0 ? "#E8F5E9" : "#FAFAFA",
                          color: (d.employees_count || 0) > 0 ? "#2E7D32" : "#9E9E9E",
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Modifier la direction">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenModal(d)}
                            sx={{ color: "text.secondary", "&:hover": { color: "#1976D2" } }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer la direction">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(d)}
                            sx={{ color: "text.secondary", "&:hover": { color: "#D32F2F" } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal Ajout / Modification */}
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={700}>
              {editingDir ? "Modifier la Direction" : "Ajouter une Direction"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {editingDir ? `Mise à jour de la direction ${editingDir.dir_id}` : "Création d'une nouvelle direction organisationnelle"}
            </Typography>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              <TextField
                label="Libellé de la Direction *"
                fullWidth
                size="small"
                value={libelle}
                onChange={(e) => {
                  setLibelle(e.target.value);
                  if (!editingDir && !code) {
                    setCode(e.target.value.slice(0, 4).toUpperCase());
                  }
                }}
                error={Boolean(errors.libelle)}
                helperText={errors.libelle || "Ex: Direction des Ressources Humaines"}
                autoFocus
              />

              <TextField
                label="Code abrégé *"
                fullWidth
                size="small"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={Boolean(editingDir)}
                helperText="Ex: DRH, DSI, DFAC (identifiant unique)"
              />

              <FormControl fullWidth size="small">
                <InputLabel>Site / Établissement Principal</InputLabel>
                <Select
                  value={siteId}
                  label="Site / Établissement Principal"
                  onChange={(e) => setSiteId(e.target.value)}
                >
                  {sites.map((s) => (
                    <MenuItem key={s.site_id} value={s.site_id}>
                      {s.site_nom} ({s.site_type})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Description & Périmètre de compétences"
                fullWidth
                multiline
                rows={3}
                size="small"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Rôle stratégique, responsabilités, attributions..."
              />
            </Stack>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2, bgcolor: "#FAFAFA" }}>
            <Button onClick={handleCloseModal} color="inherit">
              Annuler
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{ bgcolor: "primary.main", color: "#000", fontWeight: 700, "&:hover": { bgcolor: "primary.dark" } }}
            >
              {editingDir ? "Enregistrer" : "Créer la direction"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </Box>
  );
}
