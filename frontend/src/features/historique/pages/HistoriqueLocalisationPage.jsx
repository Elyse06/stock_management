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
} from "@mui/material";
import {
  Store as StoreIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { apiClient } from "../../../api/client";

function getTodayDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

export function HistoriqueLocalisationPage() {
  // ====== STATE ======
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [rowCount, setRowCount] = useState(0);

  // Filtres
  const [typeLocalisation, setTypeLocalisation] = useState("magasin");
  const [magasinId, setMagasinId] = useState("");
  const [directionId, setDirectionId] = useState("");
  const [dateReference, setDateReference] = useState(getTodayDate);

  // Données de référence
  const [magasins, setMagasins] = useState([]);
  const [directions, setDirections] = useState([]);
  const [dateRecherchee, setDateRecherchee] = useState(null);

  // ====== CHARGEMENT DES MAGASINS ======
  useEffect(() => {
    Promise.all([
      apiClient.get("/api/stock/magasins/", { params: { page_size: 100 } }),
      apiClient.get("/api/employee/direction/", { params: { page_size: 200 } }),
    ])
      .then(([magasinsRes, directionsRes]) => {
        setMagasins(magasinsRes.data.results ?? magasinsRes.data);
        setDirections(directionsRes.data.results ?? directionsRes.data);
      })
      .catch(() => setError("Impossible de charger les magasins et les directions."));
  }, []);

  // ====== CHARGEMENT DES STOCKS ======
  const charger = useCallback(async () => {
    const localisationId = typeLocalisation === "magasin" ? magasinId : directionId;
    if (!localisationId || !dateReference) return;

    setLoading(true);
    setError("");
    try {
      const params = { date: dateReference };
      params[typeLocalisation === "magasin" ? "magasin_id" : "direction_id"] = localisationId;

      const { data } = await apiClient.get("/api/historique/localisation/", { params });
      setStocks(data);
      setRowCount(data.length ?? 0);
      setDateRecherchee(dateReference);
    } catch (err) {
      const detail = err?.response?.data;
      if (detail?.error) {
        setError(detail.error);
      } else {
        setError("Impossible de charger l'historique de localisation.");
      }
      setStocks([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  }, [typeLocalisation, magasinId, directionId, dateReference]);

  useEffect(() => {
    charger();
  }, [charger]);

  // ====== HANDLERS ======
  const handleMagasinChange = (value) => {
    setMagasinId(value);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleTypeLocalisationChange = (value) => {
    setTypeLocalisation(value);
    setMagasinId("");
    setDirectionId("");
    setStocks([]);
    setRowCount(0);
    setDateRecherchee(null);
  };

  const handleDirectionChange = (value) => {
    setDirectionId(value);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleDateChange = (value) => {
    setDateReference(value);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const reinitialiserFiltres = () => {
    setMagasinId("");
    setDirectionId("");
    setTypeLocalisation("magasin");
    setDateReference(getTodayDate());
    setStocks([]);
    setRowCount(0);
    setDateRecherchee(null);
  };

  // ====== COLONNES ======
  const columns = [
    {
      field: "article_code",
      headerName: "Code article",
      width: 150,
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
      field: "article_designation",
      headerName: "Désignation",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "stock",
      headerName: "Stock à la date",
      width: 150,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Chip
          label={params.value}
          color="primary"
          variant="filled"
          sx={{
            fontWeight: 700,
            fontFamily: "monospace",
            fontSize: 14,
          }}
        />
      ),
    },
  ];

  // ====== RENDU ======
  return (
    <Box>
      {/* ====== HEADER ====== */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2">Historique de Localisation</Typography>
        <Typography variant="body2" color="text.secondary">
          Consultez les articles stockés dans un lieu à une date donnée
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
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Type de localisation</InputLabel>
          <Select
            value={typeLocalisation}
            label="Type de localisation"
            onChange={(e) => handleTypeLocalisationChange(e.target.value)}
          >
            <MenuItem value="magasin"><StoreIcon fontSize="small" sx={{ mr: 1, verticalAlign: "middle" }} />Magasin</MenuItem>
            <MenuItem value="direction"><BusinessIcon fontSize="small" sx={{ mr: 1, verticalAlign: "middle" }} />Direction</MenuItem>
          </Select>
        </FormControl>

        {/* Localisation */}
        <FormControl size="small" sx={{ minWidth: 250 }}>
          <InputLabel>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {typeLocalisation === "magasin" ? <StoreIcon fontSize="small" /> : <BusinessIcon fontSize="small" />}
              <span>{typeLocalisation === "magasin" ? "Magasin" : "Direction"}</span>
            </Box>
          </InputLabel>
          {typeLocalisation === "magasin" ? <Select
            value={magasinId}
            label="Magasin"
            onChange={(e) => handleMagasinChange(e.target.value)}
          >
            <MenuItem value="">Sélectionner un magasin...</MenuItem>
            {magasins.map((m) => (
              <MenuItem key={m.magasin_id} value={m.magasin_id}>
                {m.magasin_nom} {m.localite ? `(${m.localite})` : ""}
              </MenuItem>
            ))}
          </Select> : <Select
            value={directionId}
            label="Direction"
            onChange={(e) => handleDirectionChange(e.target.value)}
          >
            <MenuItem value="">Sélectionner une direction...</MenuItem>
            {directions.map((direction) => (
              <MenuItem key={direction.dir_id} value={direction.dir_id}>
                {direction.dir_libelle}
              </MenuItem>
            ))}
          </Select>}
        </FormControl>

        {/* Date */}
        <TextField
          label="Date de référence"
          type="date"
          size="small"
          value={dateReference}
          onChange={(e) => handleDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
          slotProps={{
            input: {
              startAdornment: (
                <CalendarIcon
                  fontSize="small"
                  sx={{ color: "text.secondary", mr: 1 }}
                />
              ),
            },
          }}
        />

        {/* Réinitialiser */}
        {(magasinId || directionId || dateReference) && (
          <Button variant="outlined" size="small" onClick={reinitialiserFiltres}>
            Réinitialiser
          </Button>
        )}
      </Box>

      {/* ====== INFO CONTEXTE ====== */}
      {dateRecherchee && (magasinId || directionId) && (
        <Box
          sx={{
            mb: 2,
            p: 1.5,
            bgcolor: "#FFF8E1",
            borderRadius: 1,
            border: "1px solid #F9A825",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <SearchIcon color="primary" />
          <Typography variant="body2" fontWeight={500}>
            Articles {typeLocalisation === "magasin" ? "stockés au" : "attribués à la"}{" "}
            <strong>
              {typeLocalisation === "magasin"
                ? magasins.find((m) => m.magasin_id === Number(magasinId))?.magasin_nom
                : directions.find((d) => d.dir_id === directionId)?.dir_libelle || "direction"}
            </strong>{" "}
            à la date du{" "}
            <strong>{new Date(dateRecherchee).toLocaleDateString("fr-FR")}</strong>
            {rowCount > 0 && ` — ${rowCount} article(s) trouvé(s)`}
          </Typography>
        </Box>
      )}

      {/* ====== DATAGRID ====== */}
      <Box sx={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={stocks}
          columns={columns}
          loading={loading}
          rowCount={rowCount}
          paginationMode="client"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          getRowId={(row) => row.article_code}
          localeText={{
            noRowsLabel: "Aucun article trouvé pour cette date",
            loadingOverlay: "Chargement...",
          }}
        />
      </Box>
    </Box>
  );
}