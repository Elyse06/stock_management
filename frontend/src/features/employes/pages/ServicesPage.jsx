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
  AccountTree as AccountTreeIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
import { useNotification } from "../../../components/common/NotificationProvider";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { ErrorAlert } from "../../../components/common/ErrorAlert";

export function ServicesPage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirmDialog();

  const [searchTerm, setSearchTerm] = useState("");
  const [directionFilter, setDirectionFilter] = useState("ALL");

  // Form modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [code, setCode] = useState("");
  const [libelle, setLibelle] = useState("");
  const [directionId, setDirectionId] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});

  // Queries
  const { data: services = [], isLoading, error } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.SERVICES);
      return Array.isArray(data) ? data : data.results || [];
    },
  });

  const { data: directions = [] } = useQuery({
    queryKey: ["directions"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.DIRECTIONS);
      return Array.isArray(data) ? data : data.results || [];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(API_ENDPOINTS.SERVICES, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      notify.success(`Service « ${data.service_libelle} » créé avec succès.`);
      handleCloseModal();
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.SAVE_FAILED;
      notify.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.put(`${API_ENDPOINTS.SERVICES}${id}/`, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      notify.success(`Service mis à jour avec succès.`);
      handleCloseModal();
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.SAVE_FAILED;
      notify.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`${API_ENDPOINTS.SERVICES}${id}/`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      notify.success("Service supprimé avec succès.");
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.DELETE_FAILED;
      notify.error(msg);
    },
  });

  const handleOpenModal = (serv = null) => {
    if (serv) {
      setEditingService(serv);
      setCode(serv.service_code || "");
      setLibelle(serv.service_libelle || "");
      setDirectionId(serv.direction_id || "");
      setDescription(serv.service_description || "");
    } else {
      setEditingService(null);
      setCode("");
      setLibelle("");
      setDirectionId(directions[0]?.dir_id || "DSI");
      setDescription("");
    }
    setErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingService(null);
    setErrors({});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!libelle.trim()) {
      newErrors.libelle = "Le nom du service est requis.";
    }
    if (!directionId) {
      newErrors.directionId = "Veuillez sélectionner une direction.";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      service_code: code.trim() || libelle.slice(0, 4).toUpperCase(),
      service_libelle: libelle.trim(),
      direction_id: directionId,
      service_description: description.trim(),
    };

    if (editingService) {
      updateMutation.mutate({ id: editingService.service_id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (serv) => {
    confirm({
      title: "Supprimer le service ?",
      message: `Êtes-vous sûr de vouloir supprimer le service « ${serv.service_libelle} » ?`,
      onConfirm: () => deleteMutation.mutate(serv.service_id),
    });
  };

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesLibelle = s.service_libelle?.toLowerCase().includes(q);
        const matchesCode = s.service_code?.toLowerCase().includes(q);
        const matchesDir = s.direction_libelle?.toLowerCase().includes(q);
        if (!matchesLibelle && !matchesCode && !matchesDir) return false;
      }
      if (directionFilter !== "ALL") {
        if (s.direction_id !== directionFilter) return false;
      }
      return true;
    });
  }, [services, searchTerm, directionFilter]);

  const totalEmployeesAttached = services.reduce((acc, s) => acc + (s.employees_count || 0), 0);

  return (
    <Box sx={{ maxWidth: 1300, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              bgcolor: "#F3E5F5",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#7B1FA2",
            }}
          >
            <AccountTreeIcon fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Gestion des Services
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unités opérationnelles, divisions d'activités et rattachement aux directions
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
          Nouveau Service
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
                    Total Services
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="text.primary">
                    {services.length}
                  </Typography>
                </Box>
                <Chip label="Unités" size="small" sx={{ bgcolor: "#F3E5F5", color: "#7B1FA2", fontWeight: 700 }} />
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
                    Collaborateurs affectés
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="#2E7D32">
                    {totalEmployeesAttached}
                  </Typography>
                </Box>
                <PeopleIcon sx={{ color: "#2E7D32", fontSize: 32 }} />
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
                    Directions de rattachement
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="#0288D1">
                    {directions.length}
                  </Typography>
                </Box>
                <BusinessIcon sx={{ color: "#0288D1", fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Barre de Recherche & Filtres */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: "1px solid #E0E0E0", borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              size="small"
              fullWidth
              placeholder="Rechercher par nom de service, code ou direction..."
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
              <InputLabel>Filtrer par Direction</InputLabel>
              <Select
                value={directionFilter}
                label="Filtrer par Direction"
                onChange={(e) => setDirectionFilter(e.target.value)}
              >
                <MenuItem value="ALL">Toutes les directions</MenuItem>
                {directions.map((d) => (
                  <MenuItem key={d.dir_id} value={d.dir_id}>
                    {d.dir_libelle} ({d.dir_id})
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
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Libellé du Service</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Direction Parente</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Description & Missions</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5, textAlign: "center" }}>Effectif</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5, textAlign: "center" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    Chargement des services...
                  </TableCell>
                </TableRow>
              ) : filteredServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    Aucun service trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                filteredServices.map((s) => (
                  <TableRow key={s.service_id} hover>
                    <TableCell>
                      <Chip
                        label={s.service_code || `SRV-${s.service_id}`}
                        size="small"
                        sx={{ fontFamily: "monospace", fontWeight: 700, bgcolor: "#F5F5F5" }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{s.service_libelle}</TableCell>
                    <TableCell>
                      <Chip
                        label={s.direction_libelle || s.direction_id || "DSI"}
                        size="small"
                        sx={{ bgcolor: "#E3F2FD", color: "#1565C0", fontWeight: 600, fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary", maxWidth: 350 }}>
                      {s.service_description || "Aucune description fournie"}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${s.employees_count || 0} employé${(s.employees_count || 0) > 1 ? "s" : ""}`}
                        size="small"
                        sx={{
                          bgcolor: (s.employees_count || 0) > 0 ? "#E8F5E9" : "#FAFAFA",
                          color: (s.employees_count || 0) > 0 ? "#2E7D32" : "#9E9E9E",
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Modifier le service">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenModal(s)}
                            sx={{ color: "text.secondary", "&:hover": { color: "#1976D2" } }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer le service">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(s)}
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
              {editingService ? "Modifier le Service" : "Ajouter un nouveau Service"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {editingService ? "Mise à jour des informations de l'unité" : "Création d'une nouvelle unité opérationnelle"}
            </Typography>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              <TextField
                label="Libellé du Service *"
                fullWidth
                size="small"
                value={libelle}
                onChange={(e) => setLibelle(e.target.value)}
                error={Boolean(errors.libelle)}
                helperText={errors.libelle || "Ex: Support IT, Comptabilité Générale, Ventes"}
                autoFocus
              />

              <TextField
                label="Code abrégé"
                fullWidth
                size="small"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                helperText="Ex: SUP_IT, COMPTA, RES_TEL"
              />

              <FormControl fullWidth size="small" error={Boolean(errors.directionId)}>
                <InputLabel>Direction de rattachement *</InputLabel>
                <Select
                  value={directionId}
                  label="Direction de rattachement *"
                  onChange={(e) => setDirectionId(e.target.value)}
                >
                  {directions.map((d) => (
                    <MenuItem key={d.dir_id} value={d.dir_id}>
                      {d.dir_libelle} ({d.dir_id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Description & Attributions"
                fullWidth
                multiline
                rows={3}
                size="small"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Précisez les missions, attributions et compétences couvertes..."
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
              {editingService ? "Enregistrer" : "Créer le service"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </Box>
  );
}
