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
  LocationOn as LocationOnIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Phone as PhoneIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
import { useNotification } from "../../../components/common/NotificationProvider";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { ErrorAlert } from "../../../components/common/ErrorAlert";

const SITE_TYPES = [
  { value: "SIEGE", label: "Siège National", color: "#F57F17", bg: "#FFF8E1" },
  { value: "AGENCE", label: "Agence Principale", color: "#1976D2", bg: "#E3F2FD" },
  { value: "CENTRE DE TRI", label: "Centre de Tri Postal", color: "#7B1FA2", bg: "#F3E5F5" },
  { value: "GUICHET", label: "Guichet Annexe", color: "#388E3C", bg: "#E8F5E9" },
];

export function SitesPage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirmDialog();

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Form modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [nom, setNom] = useState("");
  const [type, setType] = useState("AGENCE");
  const [localite, setLocalite] = useState("");
  const [adresse, setAdresse] = useState("");
  const [contact, setContact] = useState("");
  const [errors, setErrors] = useState({});

  // Queries
  const { data: sites = [], isLoading, error } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.SITES);
      return Array.isArray(data) ? data : data.results || [];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(API_ENDPOINTS.SITES, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      notify.success(`Site « ${data.site_nom} » créé avec succès.`);
      handleCloseModal();
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.SAVE_FAILED;
      notify.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.put(`${API_ENDPOINTS.SITES}${id}/`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      notify.success(`Site mis à jour avec succès.`);
      handleCloseModal();
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.SAVE_FAILED;
      notify.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`${API_ENDPOINTS.SITES}${id}/`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      notify.success("Site supprimé.");
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.DELETE_FAILED;
      notify.error(msg);
    },
  });

  const handleOpenModal = (site = null) => {
    if (site) {
      setEditingSite(site);
      setNom(site.site_nom || "");
      setType(site.site_type || "AGENCE");
      setLocalite(site.localite || "");
      setAdresse(site.adresse || "");
      setContact(site.contact || "");
    } else {
      setEditingSite(null);
      setNom("");
      setType("AGENCE");
      setLocalite("Antananarivo");
      setAdresse("");
      setContact("");
    }
    setErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingSite(null);
    setErrors({});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!nom.trim()) {
      newErrors.nom = "Le nom du site est requis.";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      site_nom: nom.trim(),
      site_type: type,
      localite: localite.trim() || "Antananarivo",
      adresse: adresse.trim(),
      contact: contact.trim(),
    };

    if (editingSite) {
      updateMutation.mutate({ id: editingSite.site_id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (site) => {
    confirm({
      title: "Supprimer le site ?",
      message: `Êtes-vous sûr de vouloir supprimer le site « ${site.site_nom} » ?`,
      onConfirm: () => deleteMutation.mutate(site.site_id),
    });
  };

  const filteredSites = useMemo(() => {
    return sites.filter((s) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesNom = s.site_nom?.toLowerCase().includes(q);
        const matchesLoc = s.localite?.toLowerCase().includes(q);
        const matchesAdr = s.adresse?.toLowerCase().includes(q);
        if (!matchesNom && !matchesLoc && !matchesAdr) return false;
      }
      if (typeFilter !== "ALL") {
        if (s.site_type !== typeFilter) return false;
      }
      return true;
    });
  }, [sites, searchTerm, typeFilter]);

  const totalEmployees = sites.reduce((acc, s) => acc + (s.employees_count || 0), 0);
  const totalDirections = sites.reduce((acc, s) => acc + (s.directions_count || 0), 0);

  const getTypeChip = (siteType) => {
    const found = SITE_TYPES.find((t) => t.value === siteType);
    if (!found) return <Chip label={siteType || "Autre"} size="small" />;
    return (
      <Chip
        label={found.label}
        size="small"
        sx={{ bgcolor: found.bg, color: found.color, fontWeight: 700, fontSize: 11 }}
      />
    );
  };

  return (
    <Box sx={{ maxWidth: 1300, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              bgcolor: "#FFF8E1",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#F57F17",
            }}
          >
            <LocationOnIcon fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Gestion des Sites & Établissements
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Implantations géographiques, sièges, agences postales et centres logistiques
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
          Nouveau Site
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
                    Total Établissements
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="text.primary">
                    {sites.length}
                  </Typography>
                </Box>
                <Chip label="Sites" size="small" sx={{ bgcolor: "#FFF8E1", color: "#F57F17", fontWeight: 700 }} />
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
                    Effectif Total Hébergé
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

        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ border: "1px solid #E0E0E0", borderRadius: 2 }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase" }}>
                    Directions Rattachées
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="#0288D1">
                    {totalDirections}
                  </Typography>
                </Box>
                <BusinessIcon sx={{ color: "#0288D1", fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Barre de Recherche et Filtres */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: "1px solid #E0E0E0", borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              size="small"
              fullWidth
              placeholder="Rechercher par nom de site, ville, adresse..."
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
              <InputLabel>Type d'établissement</InputLabel>
              <Select
                value={typeFilter}
                label="Type d'établissement"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="ALL">Tous les types</MenuItem>
                {SITE_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
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
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Nom de l'établissement</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Localité / Ville</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Adresse</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Téléphone</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5, textAlign: "center" }}>Directions</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5, textAlign: "center" }}>Effectif</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5, textAlign: "center" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    Chargement des sites...
                  </TableCell>
                </TableRow>
              ) : filteredSites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    Aucun site trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSites.map((s) => (
                  <TableRow key={s.site_id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{s.site_nom}</TableCell>
                    <TableCell>{getTypeChip(s.site_type)}</TableCell>
                    <TableCell>
                      <Chip label={s.localite || "Antananarivo"} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary", maxWidth: 280 }}>
                      {s.adresse || "-"}
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {s.contact ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <PhoneIcon fontSize="small" sx={{ fontSize: 15, color: "text.secondary" }} />
                          <Typography variant="caption">{s.contact}</Typography>
                        </Box>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${s.directions_count || 0}`}
                        size="small"
                        sx={{ bgcolor: "#E1F5FE", color: "#0288D1", fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${s.employees_count || 0}`}
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
                        <Tooltip title="Modifier le site">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenModal(s)}
                            sx={{ color: "text.secondary", "&:hover": { color: "#1976D2" } }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer le site">
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
              {editingSite ? "Modifier le Site" : "Ajouter un Site"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {editingSite ? `Mise à jour des coordonnées de ${editingSite.site_nom}` : "Enregistrement d'un nouvel établissement ou agence"}
            </Typography>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              <TextField
                label="Nom de l'établissement *"
                fullWidth
                size="small"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                error={Boolean(errors.nom)}
                helperText={errors.nom || "Ex: Agence Principale Mahajanga"}
                autoFocus
              />

              <FormControl fullWidth size="small">
                <InputLabel>Type d'établissement</InputLabel>
                <Select
                  value={type}
                  label="Type d'établissement"
                  onChange={(e) => setType(e.target.value)}
                >
                  {SITE_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Localité / Ville"
                fullWidth
                size="small"
                value={localite}
                onChange={(e) => setLocalite(e.target.value)}
                placeholder="Ex: Antananarivo, Toamasina, Mahajanga, Fianarantsoa..."
              />

              <TextField
                label="Adresse postale / géographique"
                fullWidth
                size="small"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="Ex: Boulevard de la République, BP 102"
              />

              <TextField
                label="Contact téléphonique"
                fullWidth
                size="small"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Ex: +261 20 22 000 00"
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
              {editingSite ? "Enregistrer" : "Créer le site"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </Box>
  );
}
