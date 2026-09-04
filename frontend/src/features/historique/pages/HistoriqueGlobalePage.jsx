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
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { apiClient } from "../../../api/client";

// ====== CONSTANTES ======
const TYPES_MOUVEMENT = [
  { value: "", label: "Tous les types" },
  { value: "ENTREE", label: "Entrée" },
  { value: "SORTIE", label: "Sortie" },
  { value: "TRANSFERT", label: "Transfert" },
  { value: "AJUSTEMENT", label: "Ajustement" },
];

const PERIODES_PREDEFINIES = [
  { value: "tous", label: "Toutes les dates" },
  { value: "aujourd'hui", label: "Aujourd'hui" },
  { value: "semaine", label: "Cette semaine" },
  { value: "mois", label: "Ce mois" },
  { value: "annee", label: "Cette année" },
  { value: "personnalisee", label: "Personnalisée" },
];

// ====== HELPERS ======
function getPeriodeDates(periodeId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (periodeId === "tous") return { debut: null, fin: null };

  if (periodeId === "aujourd'hui") {
    const fin = new Date(today);
    fin.setHours(23, 59, 59, 999);
    return { debut: today, fin };
  }

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

function formatDate(date) {
  if (!date) return "";
  return date.toISOString().split("T")[0];
}

// ====== COMPOSANT ======
export function HistoriqueGlobalePage() {
  // ====== STATE ======
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [rowCount, setRowCount] = useState(0);

  // Filtres
  const [periode, setPeriode] = useState("mois");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [magasinId, setMagasinId] = useState("");
  const [typeMouvement, setTypeMouvement] = useState("");
  const [articleCode, setArticleCode] = useState("");

  // Données de référence
  const [magasins, setMagasins] = useState([]);

  // Modal détails
  const [selectedMouvement, setSelectedMouvement] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // ====== CHARGEMENT DES MAGASINS ======
  useEffect(() => {
    apiClient
      .get("/api/stock/magasins/", { params: { page_size: 100 } })
      .then((res) => setMagasins(res.data.results ?? res.data))
      .catch(() => {});
  }, []);

  // ====== CHARGEMENT DES MOUVEMENTS ======
  const charger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
      };

      // Calcul des dates selon la période
      let debut = dateDebut;
      let fin = dateFin;

      if (periode !== "personnalisee") {
        const dates = getPeriodeDates(periode);
        debut = dates.debut ? formatDate(dates.debut) : null;
        fin = dates.fin ? formatDate(dates.fin) : null;
      }

      if (debut) params.date_debut = debut;
      if (fin) params.date_fin = fin;
      if (magasinId) params.magasin_id = magasinId;
      if (typeMouvement) params.type_mouvement = typeMouvement;
      if (articleCode) params.article_code = articleCode;

      const { data } = await apiClient.get("/api/historique/globale/", { params });
      setMouvements(data.results ?? data);
      setRowCount(data.count ?? (data.results ?? data).length);
    } catch {
      setError("Impossible de charger l'historique.");
    } finally {
      setLoading(false);
    }
  }, [
    paginationModel.page,
    paginationModel.pageSize,
    periode,
    dateDebut,
    dateFin,
    magasinId,
    typeMouvement,
    articleCode,
  ]);

  useEffect(() => {
    charger();
  }, [charger]);

  // ====== HANDLERS ======
  const handlePeriodeChange = (value) => {
    setPeriode(value);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleDateDebutChange = (value) => {
    setDateDebut(value);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleDateFinChange = (value) => {
    setDateFin(value);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleMagasinChange = (value) => {
    setMagasinId(value);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleTypeChange = (value) => {
    setTypeMouvement(value);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleArticleChange = (value) => {
    setArticleCode(value);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const reinitialiserFiltres = () => {
    setPeriode("mois");
    setDateDebut("");
    setDateFin("");
    setMagasinId("");
    setTypeMouvement("");
    setArticleCode("");
  };

  const openDetailModal = (mouvement) => {
    setSelectedMouvement(mouvement);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedMouvement(null);
  };

  // ====== HELPERS D'AFFICHAGE ======
  const getTypeColor = (type) => {
    switch (type) {
      case "ENTREE":
        return "success";
      case "SORTIE":
        return "error";
      case "TRANSFERT":
        return "info";
      case "AJUSTEMENT":
        return "warning";
      default:
        return "default";
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "ENTREE":
        return "Entrée";
      case "SORTIE":
        return "Sortie";
      case "TRANSFERT":
        return "Transfert";
      case "AJUSTEMENT":
        return "Ajustement";
      default:
        return type;
    }
  };

  // ====== COLONNES ======
  const columns = [
    {
      field: "mouvement_id",
      headerName: "ID",
      width: 80,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "date",
      headerName: "Date",
      width: 180,
      renderCell: (params) => new Date(params.value).toLocaleString("fr-FR"),
    },
    {
      field: "type_mouvement",
      headerName: "Type",
      width: 120,
      renderCell: (params) => (
        <Chip
          label={getTypeLabel(params.value)}
          color={getTypeColor(params.value)}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: "magasin_source_nom",
      headerName: "Source",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => params.value || "—",
    },
    {
      field: "magasin_destination_nom",
      headerName: "Destination",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => params.value || "—",
    },
    {
      field: "nb_articles",
      headerName: "Articles",
      width: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => params.row.details?.length ?? 0,
    },
    {
      field: "origine",
      headerName: "Origine",
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2" noWrap title={params.value}>
          {params.value || "—"}
        </Typography>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Tooltip title="Voir les détails">
          <IconButton
            size="small"
            color="primary"
            onClick={() => openDetailModal(params.row)}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  // ====== MODAL DÉTAILS ======
  const renderDetailModal = () => {
    if (!selectedMouvement) return null;

    return (
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1300,
        }}
        onClick={closeDetailModal}
      >
        <Box
          sx={{
            bgcolor: "#FFFFFF",
            borderRadius: 2,
            p: 3,
            maxWidth: 600,
            width: "90%",
            maxHeight: "80vh",
            overflow: "auto",
            border: "1px solid #E0E0E0",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Typography variant="h3" sx={{ mb: 2 }}>
            Mouvement #{selectedMouvement.mouvement_id}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Type
            </Typography>
            <Chip
              label={getTypeLabel(selectedMouvement.type_mouvement)}
              color={getTypeColor(selectedMouvement.type_mouvement)}
              size="small"
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Date
            </Typography>
            <Typography variant="body1">
              {new Date(selectedMouvement.date).toLocaleString("fr-FR")}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Source → Destination
            </Typography>
            <Typography variant="body1">
              {selectedMouvement.magasin_source_nom || "—"} →{" "}
              {selectedMouvement.magasin_destination_nom || "—"}
            </Typography>
          </Box>

          {selectedMouvement.origine && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Origine
              </Typography>
              <Typography variant="body1">{selectedMouvement.origine}</Typography>
            </Box>
          )}

          {selectedMouvement.motif && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Motif
              </Typography>
              <Typography variant="body1">{selectedMouvement.motif}</Typography>
            </Box>
          )}

          <Typography variant="h3" sx={{ mb: 1, mt: 3 }}>
            Articles ({selectedMouvement.details?.length ?? 0})
          </Typography>

          <Box
            sx={{
              border: "1px solid #E0E0E0",
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            {selectedMouvement.details?.length > 0 ? (
              <Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr",
                    bgcolor: "#FFF8E1",
                    borderBottom: "2px solid #F9A825",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  <Box sx={{ p: 1, borderRight: "1px solid #E0E0E0" }}>Article</Box>
                  <Box sx={{ p: 1, borderRight: "1px solid #E0E0E0", textAlign: "center" }}>
                    Code
                  </Box>
                  <Box sx={{ p: 1, textAlign: "center" }}>Quantité</Box>
                </Box>
                {selectedMouvement.details.map((detail, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr",
                      borderBottom: "1px solid #E0E0E0",
                      "&:hover": { bgcolor: "#FFFDE7" },
                    }}
                  >
                    <Box sx={{ p: 1, borderRight: "1px solid #E0E0E0" }}>
                      <Typography variant="body2" fontWeight={500}>
                        {detail.article_designation}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        p: 1,
                        borderRight: "1px solid #E0E0E0",
                        textAlign: "center",
                        fontFamily: "monospace",
                        fontSize: 12,
                      }}
                    >
                      {detail.article}
                    </Box>
                    <Box sx={{ p: 1, textAlign: "center", fontWeight: 600 }}>
                      {detail.quantite}
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Aucun article
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={closeDetailModal} variant="contained">
              Fermer
            </Button>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      {/* ====== HEADER ====== */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2">Historique Global</Typography>
        <Typography variant="body2" color="text.secondary">
          Consultez tous les mouvements de stock sur une période donnée
        </Typography>
      </Box>

      {/* ====== ALERTES ====== */}
      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* ====== FILTRES ====== */}
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
          flexWrap: "wrap",
        }}
      >
        {/* Période */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Période</InputLabel>
          <Select
            value={periode}
            label="Période"
            onChange={(e) => handlePeriodeChange(e.target.value)}
          >
            {PERIODES_PREDEFINIES.map((p) => (
              <MenuItem key={p.value} value={p.value}>
                {p.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Date début (si période personnalisée) */}
        {periode === "personnalisee" && (
          <>
            <TextField
              label="Du"
              type="date"
              size="small"
              value={dateDebut}
              onChange={(e) => handleDateDebutChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 150 }}
            />
            <TextField
              label="Au"
              type="date"
              size="small"
              value={dateFin}
              onChange={(e) => handleDateFinChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 150 }}
            />
          </>
        )}

        {/* Magasin */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Magasin</InputLabel>
          <Select
            value={magasinId}
            label="Magasin"
            onChange={(e) => handleMagasinChange(e.target.value)}
          >
            <MenuItem value="">Tous les magasins</MenuItem>
            {magasins.map((m) => (
              <MenuItem key={m.magasin_id} value={m.magasin_id}>
                {m.magasin_nom} {m.localite ? `(${m.localite})` : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Type de mouvement */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={typeMouvement}
            label="Type"
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            {TYPES_MOUVEMENT.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Recherche article */}
        <TextField
          label="Code article"
          size="small"
          value={articleCode}
          onChange={(e) => handleArticleChange(e.target.value)}
          placeholder="Ex: ART001"
          sx={{ width: 150 }}
          slotProps={{
            input: {
              startAdornment: (
                <SearchIcon fontSize="small" sx={{ color: "text.secondary", mr: 1 }} />
              ),
            },
          }}
        />

        {/* Réinitialiser */}
        {(periode !== "mois" ||
          dateDebut ||
          dateFin ||
          magasinId ||
          typeMouvement ||
          articleCode) && (
          <Button variant="outlined" size="small" onClick={reinitialiserFiltres}>
            Réinitialiser
          </Button>
        )}
      </Box>

      {/* ====== DATAGRID ====== */}
      <Box sx={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={mouvements}
          columns={columns}
          loading={loading}
          rowCount={rowCount}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          getRowId={(row) => row.mouvement_id}
          localeText={{
            noRowsLabel: "Aucun mouvement trouvé",
            loadingOverlay: "Chargement...",
          }}
        />
      </Box>

      {/* ====== MODAL DÉTAILS ====== */}
      {isDetailModalOpen && renderDetailModal()}
    </Box>
  );
}