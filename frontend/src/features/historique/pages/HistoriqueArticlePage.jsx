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
  Alert,
  Chip,
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import {
  Download as DownloadIcon,
  Search as SearchIcon,
  Inventory as InventoryIcon,
  Store as StoreIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { apiClient } from "../../../api/client";

// ====== CONSTANTES ======
const PERIODES_PREDEFINIES = [
  { value: "tous", label: "Toutes les dates" },
  { value: "mois", label: "Ce mois" },
  { value: "annee", label: "Cette année" },
  { value: "personnalisee", label: "Personnalisée" },
];

// ====== HELPERS ======
function getPeriodeDates(periodeId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (periodeId === "tous") return { debut: null, fin: null };

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

function getTypeColor(type) {
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
}

function getTypeLabel(type) {
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
}

// ====== COMPOSANT ======
export function HistoriqueArticlePage() {
  // ====== STATE ======
  const [articles, setArticles] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [articleSelectionne, setArticleSelectionne] = useState(null);
  const [magasinId, setMagasinId] = useState("");
  const [periode, setPeriode] = useState("tous");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  const [historique, setHistorique] = useState([]);
  const [articleInfo, setArticleInfo] = useState(null);
  const [stockActuel, setStockActuel] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  // ====== CHARGEMENT DES DONNÉES DE RÉFÉRENCE ======
  useEffect(() => {
    Promise.all([
      apiClient.get("/api/catalogue/articles/", { params: { page_size: 500 } }),
      apiClient.get("/api/stock/magasins/", { params: { page_size: 100 } }),
    ])
      .then(([articlesRes, magasinsRes]) => {
        setArticles(articlesRes.data.results ?? articlesRes.data);
        setMagasins(magasinsRes.data.results ?? magasinsRes.data);
      })
      .catch(() => setError("Impossible de charger les données."));
  }, []);

  // ====== CHARGEMENT DE L'HISTORIQUE ======
  const chargerHistorique = useCallback(async () => {
    if (!articleSelectionne) {
      setHistorique([]);
      setArticleInfo(null);
      setStockActuel(0);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const params = {};
      if (magasinId) params.magasin_id = magasinId;

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

      const { data } = await apiClient.get(
        `/api/historique/article/${articleSelectionne.code_article}/`,
        { params }
      );

      setArticleInfo(data.article);
      setHistorique(data.historique);
      setStockActuel(data.stock_actuel);
    } catch {
      setError("Impossible de charger l'historique de l'article.");
      setHistorique([]);
      setArticleInfo(null);
      setStockActuel(0);
    } finally {
      setLoading(false);
    }
  }, [articleSelectionne, magasinId, periode, dateDebut, dateFin]);

  useEffect(() => {
    chargerHistorique();
  }, [chargerHistorique]);

  // ====== HANDLERS ======
  const handleArticleChange = (newValue) => {
    setArticleSelectionne(newValue);
  };

  const handleMagasinChange = (value) => {
    setMagasinId(value);
  };

  const handlePeriodeChange = (value) => {
    setPeriode(value);
  };

  const handleDateDebutChange = (value) => {
    setDateDebut(value);
  };

  const handleDateFinChange = (value) => {
    setDateFin(value);
  };

  const reinitialiserFiltres = () => {
    setMagasinId("");
    setPeriode("tous");
    setDateDebut("");
    setDateFin("");
  };

  // ====== EXPORT EXCEL ======
  const handleExport = async () => {
    if (!articleSelectionne) return;

    setExporting(true);
    setError("");
    try {
      const params = {};
      if (magasinId) params.magasin_id = magasinId;

      let debut = dateDebut;
      let fin = dateFin;

      if (periode !== "personnalisee") {
        const dates = getPeriodeDates(periode);
        debut = dates.debut ? formatDate(dates.debut) : null;
        fin = dates.fin ? formatDate(dates.fin) : null;
      }

      if (debut) params.date_debut = debut;
      if (fin) params.date_fin = fin;

      const response = await apiClient.get(
        `/api/historique/article/${articleSelectionne.code_article}/export/`,
        { params, responseType: "blob" }
      );

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `fiche_article_${articleSelectionne.code_article}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Impossible d'exporter la fiche article.");
    } finally {
      setExporting(false);
    }
  };

  // ====== COLONNES DATAGRID ======
  const columns = [
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
      field: "magasin_source",
      headerName: "Source",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => params.value || "—",
    },
    {
      field: "magasin_destination",
      headerName: "Destination",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => params.value || "—",
    },
    {
      field: "quantite",
      headerName: "Quantité",
      width: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Typography
          variant="body2"
          fontWeight={600}
          fontFamily="monospace"
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: "impact",
      headerName: "Impact",
      width: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const impact = params.value;
        const color =
          impact > 0
            ? "success.main"
            : impact < 0
            ? "error.main"
            : "text.secondary";
        return (
          <Typography
            variant="body2"
            fontWeight={700}
            fontFamily="monospace"
            sx={{ color }}
          >
            {impact > 0 ? `+${impact}` : impact}
          </Typography>
        );
      },
    },
    {
      field: "stock_cumule",
      headerName: "Stock cumulé",
      width: 130,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Chip
          label={params.value}
          color="primary"
          size="small"
          sx={{
            fontWeight: 700,
            fontFamily: "monospace",
          }}
        />
      ),
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
      field: "motif",
      headerName: "Motif",
      width: 200,
      renderCell: (params) => (
        <Typography variant="body2" noWrap title={params.value}>
          {params.value || "—"}
        </Typography>
      ),
    },
  ];

  // ====== RENDU ======
  return (
    <Box>
      {/* ====== HEADER ====== */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2">Historique Article</Typography>
        <Typography variant="body2" color="text.secondary">
          Consultez la fiche de stock d'un article au fil du temps
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
        {/* Article */}
        <Autocomplete
          options={articles}
          getOptionLabel={(option) =>
            `${option.code_article} - ${option.designation}`
          }
          isOptionEqualToValue={(option, value) =>
            option?.code_article === value?.code_article
          }
          value={articleSelectionne}
          onChange={(_, newValue) => handleArticleChange(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Article"
              placeholder="Rechercher un article..."
              size="small"
              sx={{ minWidth: 300 }}
              slotProps={{
                input: {
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InventoryIcon
                        fontSize="small"
                        sx={{ color: "text.secondary", mr: 1 }}
                      />
                      {params.InputProps.startAdornment}
                    </>
                  ),
                },
              }}
            />
          )}
          noOptionsText="Aucun article trouvé"
        />

        {/* Magasin */}
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <StoreIcon fontSize="small" />
              <span>Magasin</span>
            </Box>
          </InputLabel>
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

        {/* Période */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <CalendarIcon fontSize="small" />
              <span>Période</span>
            </Box>
          </InputLabel>
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

        {/* Dates personnalisées */}
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

        {/* Réinitialiser */}
        {(magasinId || periode !== "tous" || dateDebut || dateFin) && (
          <Button variant="outlined" size="small" onClick={reinitialiserFiltres}>
            Réinitialiser
          </Button>
        )}
      </Box>

      {/* ====== INFO ARTICLE + STOCK ACTUEL ====== */}
      {articleInfo && (
        <Box
          sx={{
            mb: 2,
            p: 2,
            bgcolor: "#FFF8E1",
            borderRadius: 1,
            border: "1px solid #F9A825",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <InventoryIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Article
              </Typography>
              <Typography variant="h3" fontWeight={700}>
                {articleInfo.code_article}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {articleInfo.designation}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ textAlign: "right" }}>
            <Typography variant="body2" color="text.secondary">
              Stock actuel
            </Typography>
            <Typography
              variant="h3"
              fontWeight={700}
              fontFamily="monospace"
              color="primary.main"
            >
              {stockActuel}
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={
              exporting ? <CircularProgress size={16} /> : <DownloadIcon />
            }
            onClick={handleExport}
            disabled={!articleSelectionne || exporting || historique.length === 0}
          >
            {exporting ? "Export..." : "Export Excel"}
          </Button>
        </Box>
      )}

      {/* ====== DATAGRID ====== */}
      <Box sx={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={historique}
          columns={columns}
          loading={loading}
          paginationMode="client"
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          disableRowSelectionOnClick
          getRowId={(row, index) => `${row.date}-${index}`}
          localeText={{
            noRowsLabel: articleSelectionne
              ? "Aucun mouvement pour cet article"
              : "Sélectionnez un article pour voir son historique",
            loadingOverlay: "Chargement...",
          }}
        />
      </Box>
    </Box>
  );
}