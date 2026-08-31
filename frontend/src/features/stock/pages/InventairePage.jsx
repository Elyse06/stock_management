import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Alert,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { apiClient } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { InventaireFormModal } from "../components/InventaireFormModal";
import { InventaireDetailsModal } from "../components/InventaireDetailsModal";

// ====== CONSTANTES ======
const STATUTS = [
  { value: "EN_ATTENTE", label: "En attente" },
  { value: "VALIDE", label: "Validé" },
  { value: "REJETE", label: "Rejeté" },
];

export function InventairePage() {
  const { hasAction } = useAuth();

  // TODO: Implémenter les permissions réelles avec hasAction
  // Exemple: const canCreate = hasAction('INV_GERE');
  // Exemple: const canValidate = hasAction('INV_VAL');
  const canCreate = true;
  const canValidate = true;

  // ====== DATA ======
  const [sessions, setSessions] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [rowCount, setRowCount] = useState(0);

  // ====== FILTRES ======
  const [statutFiltre, setStatutFiltre] = useState("");
  const [lieuTypeFiltre, setLieuTypeFiltre] = useState(""); // "magasin" | "service" | ""
  const [lieuIdFiltre, setLieuIdFiltre] = useState("");

  // ====== MODALS ======
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // ====== CHARGEMENT DES DONNÉES DE RÉFÉRENCE ======
  useEffect(() => {
    Promise.all([
      apiClient.get("/api/stock/magasins/", { params: { page_size: 100 } }),
      apiClient.get("/api/employee/service/", { params: { page_size: 100 } }),
    ])
      .then(([magasinsRes, servicesRes]) => {
        setMagasins(magasinsRes.data.results ?? magasinsRes.data);
        setServices(servicesRes.data.results ?? servicesRes.data);
      })
      .catch(() => {});
  }, []);

  // ====== CHARGEMENT DES SESSIONS ======
  const charger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
      };
      if (statutFiltre) params.statut = statutFiltre;
      if (lieuTypeFiltre === "magasin" && lieuIdFiltre) {
        params.magasin = lieuIdFiltre;
      }
      if (lieuTypeFiltre === "service" && lieuIdFiltre) {
        params.service = lieuIdFiltre;
      }

      const { data } = await apiClient.get("/api/stock/inventaires/", { params });
      setSessions(data.results ?? data);
      setRowCount(data.count ?? (data.results ?? data).length);
    } catch {
      setError("Impossible de charger les inventaires.");
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize, statutFiltre, lieuTypeFiltre, lieuIdFiltre]);

  useEffect(() => {
    charger();
  }, [charger]);

  // ====== HANDLERS ======
  const handleStatutChange = (value) => {
    setStatutFiltre(value);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleLieuTypeChange = (value) => {
    setLieuTypeFiltre(value);
    setLieuIdFiltre(""); // Reset du lieu sélectionné
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleLieuIdChange = (value) => {
    setLieuIdFiltre(value);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const reinitialiserFiltres = () => {
    setStatutFiltre("");
    setLieuTypeFiltre("");
    setLieuIdFiltre("");
  };

  const openFormModal = () => {
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
  };

  const openDetailModal = async (session) => {
    try {
      const { data } = await apiClient.get(`/api/stock/inventaires/${session.inventaire_id}/`);
      setSelectedSession(data);
      setIsDetailModalOpen(true);
    } catch {
      setError("Impossible de charger les détails de l'inventaire.");
    }
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedSession(null);
  };

  // ====== HELPERS ======
  const getStatutColor = (statut) => {
    switch (statut) {
      case "EN_ATTENTE":
        return "warning";
      case "VALIDE":
        return "success";
      case "REJETE":
        return "error";
      default:
        return "default";
    }
  };

  const getStatutLabel = (statut) => {
    switch (statut) {
      case "EN_ATTENTE":
        return "En attente";
      case "VALIDE":
        return "Validé";
      case "REJETE":
        return "Rejeté";
      default:
        return statut;
    }
  };

  // ====== COLONNES ======
  const columns = [
    {
      field: "code_reference",
      headerName: "Référence",
      flex: 1,
      minWidth: 180,
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
      field: "lieu_nom",
      headerName: "Lieu",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "date_creation",
      headerName: "Date création",
      width: 160,
      renderCell: (params) => new Date(params.value).toLocaleDateString("fr-FR"),
    },
    {
      field: "statut",
      headerName: "Statut",
      width: 140,
      renderCell: (params) => (
        <Chip
          label={getStatutLabel(params.value)}
          color={getStatutColor(params.value)}
          size="small"
          variant="filled"
        />
      ),
    },
    {
      field: "nb_lignes",
      headerName: "Articles",
      width: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => params.row.lignes?.length ?? 0,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const session = params.row;
        const canValidateSession = canValidate && session.statut === "EN_ATTENTE";

        return (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title="Voir les détails">
              <IconButton
                size="small"
                color="primary"
                onClick={() => openDetailModal(session)}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {canValidateSession && (
              <Tooltip title="Valider l'inventaire">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => openDetailModal(session)}
                >
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
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
          <Typography variant="h2">Inventaires</Typography>
          <Typography variant="body2" color="text.secondary">
            Gérez les sessions d'inventaire et leur validation
          </Typography>
        </Box>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openFormModal}
          >
            Nouvel inventaire
          </Button>
        )}
      </Box>

      {/* ====== ERREUR ====== */}
      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* ====== TOOLBAR (filtres) ====== */}
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
        {/* Filtre statut */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Statut</InputLabel>
          <Select
            value={statutFiltre}
            label="Statut"
            onChange={(e) => handleStatutChange(e.target.value)}
          >
            <MenuItem value="">Tous statuts</MenuItem>
            {STATUTS.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Filtre type de lieu */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Type de lieu</InputLabel>
          <Select
            value={lieuTypeFiltre}
            label="Type de lieu"
            onChange={(e) => handleLieuTypeChange(e.target.value)}
          >
            <MenuItem value="">Tous lieux</MenuItem>
            <MenuItem value="magasin">Magasins</MenuItem>
            <MenuItem value="service">Départements</MenuItem>
          </Select>
        </FormControl>

        {/* Filtre lieu spécifique */}
        {lieuTypeFiltre && (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Lieu</InputLabel>
            <Select
              value={lieuIdFiltre}
              label="Lieu"
              onChange={(e) => handleLieuIdChange(e.target.value)}
            >
              <MenuItem value="">Tous</MenuItem>
              {lieuTypeFiltre === "magasin"
                ? magasins.map((m) => (
                    <MenuItem key={m.magasin_id} value={m.magasin_id}>
                      {m.magasin_nom}
                    </MenuItem>
                  ))
                : services.map((s) => (
                    <MenuItem key={s.serv_id} value={s.serv_id}>
                      {s.serv_libelle}
                    </MenuItem>
                  ))}
            </Select>
          </FormControl>
        )}

        {/* Reset filtres */}
        {(statutFiltre || lieuTypeFiltre || lieuIdFiltre) && (
          <Button variant="outlined" size="small" onClick={reinitialiserFiltres}>
            Réinitialiser
          </Button>
        )}
      </Box>

      {/* ====== DATAGRID ====== */}
      <Box sx={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={sessions}
          columns={columns}
          loading={loading}
          rowCount={rowCount}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          getRowId={(row) => row.inventaire_id}
          localeText={{
            noRowsLabel: "Aucun inventaire trouvé",
            loadingOverlay: "Chargement...",
          }}
        />
      </Box>

      {/* ====== MODAL FORMULAIRE ====== */}
      <InventaireFormModal
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        onSuccess={charger}
        magasins={magasins}
        services={services}
      />

      {/* ====== MODAL DÉTAILS ====== */}
      <InventaireDetailsModal
        session={selectedSession}
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        onSuccess={charger}
      />
    </Box>
  );
}