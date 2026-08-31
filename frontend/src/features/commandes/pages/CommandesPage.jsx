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
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { apiClient } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { CommandeFormModal } from "../components/CommandeFormModal";
import { CommandeDetailModal } from "../components/CommandeDetailModal";

// ====== CONSTANTES ======
const STATUTS = [
  { value: "EN_ATTENTE", label: "En attente" },
  { value: "EN_COURS", label: "En cours" },
  { value: "VALIDEE", label: "Validée" },
  { value: "REJETEE", label: "Rejetée" },
];

const PERIODES = [
  { value: "tous", label: "Toutes les commandes" },
  { value: "semaine", label: "Cette semaine" },
  { value: "mois", label: "Ce mois" },
  { value: "annee", label: "Cette année" },
];

// Helper pour calculer la plage de dates selon la période
function getDateRangeForPeriode(periodeId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (periodeId === "tous") return { debut: null, fin: null };

  if (periodeId === "semaine") {
    const debut = new Date(today);
    const jour = debut.getDay();
    debut.setDate(debut.getDate() - (jour === 0 ? 6 : jour - 1));
    const fin = new Date(debut);
    fin.setDate(fin.getDate() + 6);
    fin.setHours(23, 59, 59, 999);
    return { debut, fin };
  }

  if (periodeId === "mois") {
    const debut = new Date(today.getFullYear(), today.getMonth(), 1);
    const fin = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    fin.setHours(23, 59, 59, 999);
    return { debut, fin };
  }

  if (periodeId === "annee") {
    const debut = new Date(today.getFullYear(), 0, 1);
    const fin = new Date(today.getFullYear(), 11, 31);
    fin.setHours(23, 59, 59, 999);
    return { debut, fin };
  }

  return { debut: null, fin: null };
}

export function CommandesPage() {
  const { hasAction } = useAuth();

  // TODO: Implémenter les permissions réelles avec hasAction
  // Exemple: const canCreate = hasAction('COM_DEM');
  // Exemple: const canTraiter = hasAction('COM_VAL');
  // Pour l'instant, tous les utilisateurs connectés peuvent créer/modifier
  const canCreate = true;

  // ====== DATA ======
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [rowCount, setRowCount] = useState(0);

  // ====== FILTRES ======
  const [statutFiltre, setStatutFiltre] = useState("");
  const [periodeFiltre, setPeriodeFiltre] = useState("tous");

  // ====== MODALS ======
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [commandeToEdit, setCommandeToEdit] = useState(null);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // ====== CHARGEMENT DES COMMANDES ======
  const charger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
      };
      if (statutFiltre) params.statut = statutFiltre;

      const { data } = await apiClient.get("/api/commandes/commandes/", { params });
      const allCommandes = data.results ?? data;

      // Filtrage côté client pour la période (l'API ne supporte pas le filtrage par date)
      const { debut, fin } = getDateRangeForPeriode(periodeFiltre);
      const commandesFiltrees = allCommandes.filter((commande) => {
        if (!debut || !fin) return true;
        const commandeDate = new Date(commande.date_commande);
        commandeDate.setHours(0, 0, 0, 0);
        return commandeDate >= debut && commandeDate <= fin;
      });

      setCommandes(commandesFiltrees);
      setRowCount(data.count ?? (data.results ?? data).length);
    } catch {
      setError("Impossible de charger les commandes.");
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize, statutFiltre, periodeFiltre]);

  useEffect(() => {
    charger();
  }, [charger]);

  // ====== HANDLERS ======
  const handleStatutChange = (value) => {
    setStatutFiltre(value);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handlePeriodeChange = (value) => {
    setPeriodeFiltre(value);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const reinitialiserFiltres = () => {
    setStatutFiltre("");
    setPeriodeFiltre("tous");
  };

  const openFormModalForCreate = () => {
    setCommandeToEdit(null);
    setIsFormModalOpen(true);
  };

  const openFormModalForEdit = async (commande) => {
    try {
      const { data } = await apiClient.get(`/api/commandes/commandes/${commande.commande_id}/`);
      setCommandeToEdit(data);
      setIsFormModalOpen(true);
    } catch {
      setError("Impossible de charger les détails de la commande à modifier.");
    }
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setCommandeToEdit(null);
  };

  const openDetailModal = async (commande) => {
    try {
      const { data } = await apiClient.get(`/api/commandes/commandes/${commande.commande_id}/`);
      setSelectedCommande(data);
      setIsDetailModalOpen(true);
    } catch {
      setError("Impossible de charger les détails de la commande.");
    }
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedCommande(null);
  };

  const handleDelete = async (commande) => {
    if (!window.confirm(`Supprimer la commande #${commande.commande_id} ?`)) return;
    try {
      await apiClient.delete(`/api/commandes/commandes/${commande.commande_id}/`);
      charger();
    } catch {
      setError("Suppression impossible (commande probablement traitée ou référencée).");
    }
  };

  // ====== HELPERS ======
  const getStatusColor = (statut) => {
    switch (statut) {
      case "EN_ATTENTE":
        return "warning";
      case "EN_COURS":
        return "info";
      case "VALIDEE":
        return "success";
      case "REJETEE":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusLabel = (statut) => {
    switch (statut) {
      case "EN_ATTENTE":
        return "En attente";
      case "EN_COURS":
        return "En cours";
      case "VALIDEE":
        return "Validée";
      case "REJETEE":
        return "Rejetée";
      default:
        return statut;
    }
  };

  // ====== COLONNES ======
  const columns = [
    {
      field: "commande_id",
      headerName: "#",
      width: 80,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "objet",
      headerName: "Objet",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "statut",
      headerName: "Statut",
      width: 140,
      renderCell: (params) => (
        <Chip
          label={getStatusLabel(params.value)}
          color={getStatusColor(params.value)}
          size="small"
          variant="filled"
        />
      ),
    },
    {
      field: "demandeur",
      headerName: "Demandeur",
      width: 180,
      renderCell: (params) => {
        const row = params.row;
        return row?.demandeur?.nom || row?.employe_demandeur || "—";
      },
    },
    {
      field: "date_commande",
      headerName: "Date demande",
      width: 160,
      renderCell: (params) => new Date(params.value).toLocaleDateString("fr-FR"),
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
      renderCell: (params) => {
        const commande = params.row;
        const canEdit = canCreate && commande.statut === "EN_ATTENTE";

        return (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title="Voir les détails">
              <IconButton
                size="small"
                color="primary"
                onClick={() => openDetailModal(commande)}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {canEdit && (
              <>
                <Tooltip title="Supprimer">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(commande)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
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
          <Typography variant="h2">Commandes</Typography>
          <Typography variant="body2" color="text.secondary">
            Gérez les demandes de matériel et leur traitement
          </Typography>
        </Box>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openFormModalForCreate}
          >
            Nouvelle demande
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
        {/* Filtre période */}
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Période</InputLabel>
          <Select
            value={periodeFiltre}
            label="Période"
            onChange={(e) => handlePeriodeChange(e.target.value)}
          >
            {PERIODES.map((p) => (
              <MenuItem key={p.value} value={p.value}>
                {p.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

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

        {/* Reset filtres */}
        {(statutFiltre || periodeFiltre !== "tous") && (
          <Button variant="outlined" size="small" onClick={reinitialiserFiltres}>
            Réinitialiser
          </Button>
        )}
      </Box>

      {/* ====== DATAGRID ====== */}
      <Box sx={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={commandes}
          columns={columns}
          loading={loading}
          rowCount={rowCount}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          getRowId={(row) => row.commande_id}
          localeText={{
            noRowsLabel: "Aucune commande trouvée",
            loadingOverlay: "Chargement...",
          }}
        />
      </Box>

      {/* ====== MODAL FORMULAIRE ====== */}
      <CommandeFormModal
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        onSuccess={charger}
        commandeToEdit={commandeToEdit}
      />

      {/* ====== MODAL DÉTAILS ====== */}
      <CommandeDetailModal
        commande={selectedCommande}
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        onSuccess={charger}
      />
    </Box>
  );
}