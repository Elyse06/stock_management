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
  Avatar,
  Stack,
  InputAdornment,
  TablePagination,
} from "@mui/material";
import {
  PersonAdd as PersonAddIcon,
  UploadFile as UploadFileIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  LocationOn as LocationOnIcon,
  AccountTree as AccountTreeIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material";
import * as XLSX from "xlsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
import { useNotification } from "../../../components/common/NotificationProvider";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { ErrorAlert } from "../../../components/common/ErrorAlert";
import { EmployeeFormDialog } from "../components/EmployeeFormDialog";
import { EmployeeDetailDialog } from "../components/EmployeeDetailDialog";
import { EmployeeImportDialog } from "../components/EmployeeImportDialog";

export function EmployeesPage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirmDialog();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [siteFilter, setSiteFilter] = useState("ALL");
  const [directionFilter, setDirectionFilter] = useState("ALL");
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [statutFilter, setStatutFilter] = useState("ALL");

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  // Queries
  const {
    data: employees = [],
    isLoading: employeesLoading,
    error: employeesError,
  } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.EMPLOYEES);
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

  const { data: directions = [] } = useQuery({
    queryKey: ["directions"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.DIRECTIONS);
      return Array.isArray(data) ? data : data.results || [];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.SERVICES);
      return Array.isArray(data) ? data : data.results || [];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(API_ENDPOINTS.EMPLOYEES, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["directions"] });
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      notify.success(`L'employé ${data.emp_nom} (${data.emp_matricule}) a été créé avec succès.`);
      setFormOpen(false);
      setEditingEmployee(null);
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.SAVE_FAILED;
      notify.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.put(`${API_ENDPOINTS.EMPLOYEES}${id}/`, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["directions"] });
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      notify.success(`L'employé ${data.emp_nom} a été mis à jour avec succès.`);
      setFormOpen(false);
      setEditingEmployee(null);
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.SAVE_FAILED;
      notify.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`${API_ENDPOINTS.EMPLOYEES}${id}/`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["directions"] });
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      notify.success("L'employé a été supprimé du registre.");
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || ERROR_MESSAGES.DELETE_FAILED;
      notify.error(msg);
    },
  });

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesNom = emp.emp_nom?.toLowerCase().includes(q);
        const matchesMatricule = emp.emp_matricule?.toLowerCase().includes(q) || emp.emp_id?.toLowerCase().includes(q);
        const matchesFonction = emp.emp_fonction?.toLowerCase().includes(q);
        const matchesContact = emp.emp_contact?.toLowerCase().includes(q);
        const matchesEmail = emp.emp_email?.toLowerCase().includes(q);
        const matchesService = emp.service_libelle?.toLowerCase().includes(q);
        const matchesDirection = emp.direction_libelle?.toLowerCase().includes(q);
        if (!matchesNom && !matchesMatricule && !matchesFonction && !matchesContact && !matchesEmail && !matchesService && !matchesDirection) {
          return false;
        }
      }

      // Site filter
      if (siteFilter !== "ALL") {
        const matchesSite = emp.site_id === Number(siteFilter) || emp.site_nom === siteFilter;
        if (!matchesSite) return false;
      }

      // Direction filter
      if (directionFilter !== "ALL") {
        const matchesDir = emp.direction_id === directionFilter || emp.direction_libelle === directionFilter;
        if (!matchesDir) return false;
      }

      // Service filter
      if (serviceFilter !== "ALL") {
        const matchesServ = emp.service_id === Number(serviceFilter) || emp.service_libelle === serviceFilter;
        if (!matchesServ) return false;
      }

      // Statut filter
      if (statutFilter !== "ALL") {
        if (emp.statut !== statutFilter) return false;
      }

      return true;
    });
  }, [employees, searchTerm, siteFilter, directionFilter, serviceFilter, statutFilter]);

  // Paginated slice
  const paginatedEmployees = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredEmployees.slice(start, start + rowsPerPage);
  }, [filteredEmployees, page, rowsPerPage]);

  const handleExport = () => {
    const exportData = filteredEmployees.map((e) => ({
      Matricule: e.emp_matricule || e.emp_id,
      Nom: e.emp_nom,
      Fonction: e.emp_fonction || "",
      Service: e.service_libelle || "",
      Direction: e.direction_libelle || "",
      Site: e.site_nom || "",
      Contact: e.emp_contact || "",
      Email: e.emp_email || "",
      Statut: e.statut || "ACTIF",
      DateEmbauche: e.date_embauche || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employes");
    XLSX.writeFile(workbook, `registre_employes_paositra_${new Date().toISOString().slice(0, 10)}.xlsx`);
    notify.success("Exportation du registre terminée.");
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSiteFilter("ALL");
    setDirectionFilter("ALL");
    setServiceFilter("ALL");
    setStatutFilter("ALL");
    setPage(0);
  };

  const handleDelete = (emp) => {
    confirm({
      title: "Supprimer l'employé ?",
      message: `Êtes-vous sûr de vouloir supprimer définitivement ${emp.emp_nom} (${emp.emp_matricule}) ? Cette action est irréversible.`,
      onConfirm: () => deleteMutation.mutate(emp.emp_id),
    });
  };

  const activeEmployeesCount = employees.filter((e) => e.statut === "ACTIF" || !e.statut).length;

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto" }}>
      {/* Header & Statistiques */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                bgcolor: "primary.main",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#000",
                boxShadow: "0 2px 8px rgba(249, 168, 37, 0.3)",
              }}
            >
              <PeopleIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Gestion des Employés
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Répertoire du personnel, affectations aux directions & services, et import massif
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Boutons d'action principaux */}
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => setImportOpen(true)}
            sx={{
              fontWeight: 600,
              textTransform: "none",
              borderColor: "primary.dark",
              color: "primary.dark",
              "&:hover": { borderColor: "primary.main", bgcolor: "#FFF8E1" },
            }}
          >
            Importer des données
          </Button>

          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            sx={{ fontWeight: 600, textTransform: "none", color: "text.primary", borderColor: "#E0E0E0" }}
          >
            Exporter
          </Button>

          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => {
              setEditingEmployee(null);
              setFormOpen(true);
            }}
            sx={{
              bgcolor: "primary.main",
              color: "#000000",
              fontWeight: 700,
              textTransform: "none",
              px: 2.5,
              boxShadow: "0 2px 6px rgba(249, 168, 37, 0.4)",
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            Nouvel Employé
          </Button>
        </Stack>
      </Box>

      {/* Cartes KPI */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: "1px solid #E0E0E0", borderRadius: 2 }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase" }}>
                    Total Collaborateurs
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="text.primary">
                    {employees.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "#E3F2FD", color: "#1976D2", width: 44, height: 44 }}>
                  <PeopleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: "1px solid #E0E0E0", borderRadius: 2 }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase" }}>
                    Actifs en Service
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="#2E7D32">
                    {activeEmployeesCount}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "#E8F5E9", color: "#2E7D32", width: 44, height: 44 }}>
                  <PeopleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: "1px solid #E0E0E0", borderRadius: 2 }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase" }}>
                    Directions
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="#0288D1">
                    {directions.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "#E1F5FE", color: "#0288D1", width: 44, height: 44 }}>
                  <BusinessIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: "1px solid #E0E0E0", borderRadius: 2 }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase" }}>
                    Sites & Établissements
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="#F57F17">
                    {sites.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "#FFF8E1", color: "#F57F17", width: 44, height: 44 }}>
                  <LocationOnIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Barre de Recherche et Filtres */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: "1px solid #E0E0E0", borderRadius: 2 }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              size="small"
              fullWidth
              placeholder="Rechercher par nom, matricule, fonction, contact..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
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

          <Grid item xs={6} sm={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Site</InputLabel>
              <Select
                value={siteFilter}
                label="Site"
                onChange={(e) => {
                  setSiteFilter(e.target.value);
                  setPage(0);
                }}
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

          <Grid item xs={6} sm={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Direction</InputLabel>
              <Select
                value={directionFilter}
                label="Direction"
                onChange={(e) => {
                  setDirectionFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="ALL">Toutes les directions</MenuItem>
                {directions.map((d) => (
                  <MenuItem key={d.dir_id} value={d.dir_id}>
                    {d.dir_libelle}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Service</InputLabel>
              <Select
                value={serviceFilter}
                label="Service"
                onChange={(e) => {
                  setServiceFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="ALL">Tous les services</MenuItem>
                {services.map((serv) => (
                  <MenuItem key={serv.service_id} value={serv.service_id}>
                    {serv.service_libelle}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={1.5}>
            <FormControl size="small" fullWidth>
              <InputLabel>Statut</InputLabel>
              <Select
                value={statutFilter}
                label="Statut"
                onChange={(e) => {
                  setStatutFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="ALL">Tous</MenuItem>
                <MenuItem value="ACTIF">Actif</MenuItem>
                <MenuItem value="INACTIF">Inactif</MenuItem>
                <MenuItem value="CONGE">En congé</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={0.5} sx={{ textAlign: "right" }}>
            <Tooltip title="Réinitialiser les filtres">
              <IconButton size="small" onClick={handleResetFilters}>
                <FilterListIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {employeesError && (
        <ErrorAlert message={employeesError.message || ERROR_MESSAGES.LOAD_FAILED} sx={{ mb: 2 }} />
      )}

      {/* Table des Employés */}
      <Paper elevation={0} sx={{ border: "1px solid #E0E0E0", borderRadius: 2, overflow: "hidden" }}>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: "#FAFAFA" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Matricule</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Collaborateur</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Fonction</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Rattachement (Direction / Service)</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Site / Établissement</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Contact</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5, textAlign: "center" }}>Statut</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5, textAlign: "center" }}>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {employeesLoading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    Chargement du répertoire des employés...
                  </TableCell>
                </TableRow>
              ) : paginatedEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    <PeopleIcon sx={{ fontSize: 48, color: "#BDBDBD", mb: 1, display: "block", mx: "auto" }} />
                    Aucun employé trouvé selon vos critères de recherche.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEmployees.map((emp) => {
                  const initials = emp.emp_nom
                    ? emp.emp_nom
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "EP";

                  return (
                    <TableRow key={emp.emp_id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                      {/* Matricule */}
                      <TableCell>
                        <Chip
                          label={emp.emp_matricule || emp.emp_id}
                          size="small"
                          sx={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            bgcolor: "#FFF8E1",
                            color: "#E65100",
                            border: "1px solid #FFE082",
                          }}
                        />
                      </TableCell>

                      {/* Nom & Avatar */}
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: "primary.main",
                              color: "#000",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {initials}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600} color="text.primary">
                              {emp.emp_nom}
                            </Typography>
                            {emp.emp_email && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                {emp.emp_email}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Fonction */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {emp.emp_fonction || "Non précisé"}
                        </Typography>
                      </TableCell>

                      {/* Direction & Service */}
                      <TableCell>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3 }}>
                          <Typography variant="body2" fontWeight={600} color="primary.dark">
                            {emp.direction_libelle || emp.direction_id || "Direction Générale"}
                          </Typography>
                          {emp.service_libelle && (
                            <Typography variant="caption" color="text.secondary">
                              ↳ {emp.service_libelle}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* Site */}
                      <TableCell>
                        <Typography variant="body2" color="text.primary">
                          {emp.site_nom || "Non assigné"}
                        </Typography>
                      </TableCell>

                      {/* Contact */}
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {emp.emp_contact || "-"}
                        </Typography>
                      </TableCell>

                      {/* Statut */}
                      <TableCell align="center">
                        {emp.statut === "INACTIF" ? (
                          <Chip label="Inactif" size="small" sx={{ bgcolor: "#EEEEEE", color: "#616161", fontSize: 11 }} />
                        ) : emp.statut === "CONGE" ? (
                          <Chip label="En congé" size="small" sx={{ bgcolor: "#FFF3E0", color: "#E65100", fontSize: 11 }} />
                        ) : (
                          <Chip label="Actif" size="small" sx={{ bgcolor: "#E8F5E9", color: "#2E7D32", fontWeight: 600, fontSize: 11 }} />
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="Voir la fiche détaillée">
                            <IconButton
                              size="small"
                              onClick={() => setDetailEmployee(emp)}
                              sx={{ color: "text.secondary", "&:hover": { color: "primary.dark" } }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Modifier">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingEmployee(emp);
                                setFormOpen(true);
                              }}
                              sx={{ color: "text.secondary", "&:hover": { color: "#1976D2" } }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Supprimer">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(emp)}
                              sx={{ color: "text.secondary", "&:hover": { color: "#D32F2F" } }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredEmployees.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Lignes par page :"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
        />
      </Paper>

      {/* Dialog Ajout / Modification */}
      <EmployeeFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingEmployee(null);
        }}
        onSubmit={(payload) => {
          if (editingEmployee) {
            updateMutation.mutate({ id: editingEmployee.emp_id, payload });
          } else {
            createMutation.mutate(payload);
          }
        }}
        loading={createMutation.isPending || updateMutation.isPending}
        initialData={editingEmployee}
        sites={sites}
        directions={directions}
        services={services}
      />

      {/* Dialog Détails Fiche Employé */}
      <EmployeeDetailDialog
        open={Boolean(detailEmployee)}
        onClose={() => setDetailEmployee(null)}
        employee={detailEmployee}
        onEdit={(emp) => {
          setEditingEmployee(emp);
          setFormOpen(true);
        }}
      />

      {/* Dialog Import Fichier Employés */}
      <EmployeeImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImportSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["employees"] });
          queryClient.invalidateQueries({ queryKey: ["services"] });
          queryClient.invalidateQueries({ queryKey: ["directions"] });
          queryClient.invalidateQueries({ queryKey: ["sites"] });
        }}
      />

      {/* Dialog de confirmation globale */}
      <ConfirmDialog {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </Box>
  );
}
