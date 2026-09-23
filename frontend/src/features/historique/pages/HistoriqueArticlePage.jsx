import { useEffect, useState, useCallback } from "react";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
  Chip,
} from "@mui/material";
import {
  CalendarToday as CalendarIcon,
  Download as DownloadIcon,
  Inventory as InventoryIcon,
  LocationOn as LocationOnIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS } from "../../../constants/api";
import { PageHeader } from "../../../components/common/PageHeader";
import { ErrorAlert } from "../../../components/common/ErrorAlert";
import { SelectFilter } from "../../../components/common/SelectFilter";
import { PaginatedDataGrid } from "../../../components/common/PaginatedDataGrid";
import { EmptyValue } from "../../../components/common/EmptyValue";
import { StatusChip } from "../../../components/common/StatusChip";
import { DateCell } from "../../../components/common/DateCell";

const PERIODES = [
  { value: "tous", label: "Toutes les dates" },
  { value: "mois", label: "Ce mois" },
  { value: "annee", label: "Cette année" },
  { value: "personnalisee", label: "Personnalisée" },
];

function getPeriodeDates(periode) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (periode === "tous") return { debut: null, fin: null };
  if (periode === "mois") {
    return {
      debut: new Date(today.getFullYear(), today.getMonth(), 1),
      fin: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }
  if (periode === "annee") {
    return {
      debut: new Date(today.getFullYear(), 0, 1),
      fin: new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  }
  return { debut: null, fin: null };
}

function formatDate(date) {
  return date ? date.toISOString().split("T")[0] : "";
}

export function HistoriqueArticlePage() {
  const [articles, setArticles] = useState([]);
  const [articleSelectionne, setArticleSelectionne] = useState(null);
  const [sites, setSites] = useState([]);
  const [siteId, setSiteId] = useState("");
  const [periode, setPeriode] = useState("tous");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [historique, setHistorique] = useState([]);
  const [articleInfo, setArticleInfo] = useState(null);
  const [stockActuel, setStockActuel] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

  useEffect(() => {
    Promise.all([
      apiClient.get(API_ENDPOINTS.ARTICLES, { params: { page_size: 500 } }),
      apiClient.get(API_ENDPOINTS.SITES, { params: { page_size: 100 } }),
    ])
      .then(([articlesRes, sitesRes]) => {
        setArticles(articlesRes.data.results ?? articlesRes.data);
        setSites(sitesRes.data.results ?? sitesRes.data);
      })
      .catch(() => setError("Impossible de charger les données de référence."));
  }, []);

  const getDateParams = useCallback(() => {
    let debut = dateDebut;
    let fin = dateFin;
    if (periode !== "personnalisee") {
      const dates = getPeriodeDates(periode);
      debut = formatDate(dates.debut);
      fin = formatDate(dates.fin);
    }
    return { debut, fin };
  }, [periode, dateDebut, dateFin]);

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
      const { debut, fin } = getDateParams();
      if (siteId) params.site_id = siteId;
      if (debut) params.date_debut = debut;
      if (fin) params.date_fin = fin;

      const { data } = await apiClient.get(
        `${API_ENDPOINTS.HISTORIQUE_ARTICLE}${articleSelectionne.code_article}/`,
        { params }
      );
      setArticleInfo(data.article);
      setHistorique(data.historique ?? []);
      setStockActuel(data.stock_actuel ?? 0);
      setPaginationModel((previous) => ({ ...previous, page: 0 }));
    } catch {
      setError("Impossible de charger l'historique de l'article.");
      setHistorique([]);
      setArticleInfo(null);
      setStockActuel(0);
    } finally {
      setLoading(false);
    }
  }, [articleSelectionne, siteId, getDateParams]);

  useEffect(() => {
    chargerHistorique();
  }, [chargerHistorique]);

  const reinitialiserFiltres = () => {
    setArticleSelectionne(null);
    setSiteId("");
    setPeriode("tous");
    setDateDebut("");
    setDateFin("");
    setHistorique([]);
    setArticleInfo(null);
    setStockActuel(0);
    setPaginationModel((previous) => ({ ...previous, page: 0 }));
  };

  const handleExport = async () => {
    if (!articleSelectionne) return;
    setExporting(true);
    setError("");
    try {
      const params = {};
      const { debut, fin } = getDateParams();
      if (siteId) params.site_id = siteId;
      if (debut) params.date_debut = debut;
      if (fin) params.date_fin = fin;
      const response = await apiClient.get(
        `${API_ENDPOINTS.HISTORIQUE_ARTICLE}${articleSelectionne.code_article}/export/`,
        { params, responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `fiche_article_${articleSelectionne.code_article}.xlsx`;
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

  const columns = [
    { field: "date", headerName: "Date", width: 180, renderCell: (params) => <DateCell value={params.value} showTime /> },
    { field: "type_mouvement", headerName: "Type", width: 130, renderCell: (params) => <StatusChip status={params.value} /> },
    { field: "quantite", headerName: "Quantité", width: 100, headerAlign: "center", align: "center" },
    {
      field: "impact",
      headerName: "Impact",
      width: 100,
      headerAlign: "center",
      align: "center",
      renderCell: ({ value }) => <Typography fontWeight={700} fontFamily="monospace" sx={{ color: value > 0 ? "success.main" : value < 0 ? "error.main" : "text.secondary" }}>{value > 0 ? `+${value}` : value}</Typography>,
    },
    { field: "stock_cumule", headerName: "Stock cumulé", width: 130, headerAlign: "center", align: "center", renderCell: ({ value }) => <Chip label={value} color="primary" size="small" /> },
    { field: "origine", headerName: "Origine", width: 180, renderCell: ({ value }) => <EmptyValue value={value} /> },
    { field: "motif", headerName: "Motif", width: 200, renderCell: ({ value }) => <EmptyValue value={value} /> },
  ];

  const hasFilters = Boolean(articleSelectionne || siteId || periode !== "tous" || dateDebut || dateFin);

  return (
    <Box>
      <PageHeader onReset={reinitialiserFiltres} hasFilters={hasFilters}>
        <Autocomplete
          size="small"
          options={articles}
          value={articleSelectionne}
          onChange={(_, value) => setArticleSelectionne(value)}
          getOptionLabel={(option) => option ? `${option.designation} (${option.code_article})` : ""}
          isOptionEqualToValue={(option, value) => option?.code_article === value?.code_article}
          renderInput={(params) => <TextField {...params} label="Article" placeholder="Rechercher par désignation..." sx={{ minWidth: 300 }} InputProps={{ ...params.InputProps, startAdornment: <InventoryIcon fontSize="small" sx={{ color: "text.secondary", mr: 1 }} /> }} />}
          noOptionsText="Aucun article trouvé"
        />
        <SelectFilter
          label="Site"
          value={siteId}
          onChange={setSiteId}
          minWidth={200}
          options={[{ value: "", label: "Tous les sites" }, ...sites.map((site) => ({ value: site.site_id, label: `${site.site_nom}${site.localite ? ` (${site.localite})` : ""}` }))]}
        />
        <SelectFilter label="Période" value={periode} onChange={setPeriode} minWidth={180} options={PERIODES} />
        {periode === "personnalisee" && (
          <>
            <TextField label="Du" type="date" size="small" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
            <TextField label="Au" type="date" size="small" value={dateFin} onChange={(e) => setDateFin(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
          </>
        )}
      </PageHeader>
      <ErrorAlert error={error} onClose={() => setError("")} />
      {articleInfo && (
        <Box sx={{ mb: 2, p: 2, bgcolor: "#FFF8E1", borderRadius: 1, border: "1px solid #F9A825", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <InventoryIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="body2" color="text.secondary">Article</Typography>
              <Typography variant="h3" fontWeight={700}>{articleInfo.designation}</Typography>
              <Typography variant="body2" color="text.secondary">{articleInfo.code_article}</Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="body2" color="text.secondary">Stock actuel</Typography>
            <Typography variant="h3" fontWeight={700} fontFamily="monospace" color="primary.main">{stockActuel}</Typography>
          </Box>
          <Button variant="contained" startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />} onClick={handleExport} disabled={exporting || historique.length === 0}>{exporting ? "Export..." : "Export Excel"}</Button>
        </Box>
      )}
      <PaginatedDataGrid
        rows={historique}
        columns={columns}
        loading={loading}
        rowCount={historique.length}
        paginationMode="client"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={(row, index) => `${row.date}-${index}`}
        noRowsLabel={articleSelectionne ? "Aucun mouvement pour cet article" : "Sélectionnez un article pour voir son historique"}
      />
    </Box>
  );
}
