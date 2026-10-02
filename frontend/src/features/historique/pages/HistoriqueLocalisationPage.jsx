import { useEffect, useState, useCallback } from "react";
import { Box, TextField, Typography, Chip } from "@mui/material";
import {
  CalendarToday as CalendarIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS } from "../../../constants/api";
import { PageHeader } from "../../../components/common/PageHeader";
import { ErrorAlert } from "../../../components/common/ErrorAlert";
import { SelectFilter } from "../../../components/common/SelectFilter";
import { PaginatedDataGrid } from "../../../components/common/PaginatedDataGrid";

function getTodayDate() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export function HistoriqueLocalisationPage() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [typeLocalisation, setTypeLocalisation] = useState("magasin");
  const [magasinId, setMagasinId] = useState("");
  const [directionId, setDirectionId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [dateReference, setDateReference] = useState(getTodayDate);
  const [magasins, setMagasins] = useState([]);
  const [directions, setDirections] = useState([]);
  const [sites, setSites] = useState([]);
  const [dateRecherchee, setDateRecherchee] = useState(null);

  useEffect(() => {
    Promise.all([
      apiClient.get(API_ENDPOINTS.MAGASINS, { params: { page_size: 100 } }),
      apiClient.get(API_ENDPOINTS.DIRECTIONS, { params: { page_size: 200 } }),
      apiClient.get(API_ENDPOINTS.SITES, { params: { page_size: 100 } }),
    ])
      .then(([magasinsRes, directionsRes, sitesRes]) => {
        setMagasins(magasinsRes.data.results ?? magasinsRes.data);
        setDirections(directionsRes.data.results ?? directionsRes.data);
        setSites(sitesRes.data.results ?? sitesRes.data);
      })
      .catch(() => setError("Impossible de charger les magasins, directions et sites."));
  }, []);

  const charger = useCallback(async () => {
    const localisationId = typeLocalisation === "magasin"
      ? magasinId
      : typeLocalisation === "direction"
        ? directionId
        : siteId;
    if (!localisationId || !dateReference) {
      setStocks([]);
      setDateRecherchee(null);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const params = { date: dateReference };
      const parametreLocalisation = {
        magasin: "magasin_id",
        direction: "direction_id",
        site: "site_id",
      }[typeLocalisation];
      params[parametreLocalisation] = localisationId;
      const { data } = await apiClient.get(API_ENDPOINTS.HISTORIQUE_LOCALISATION, { params });
      setStocks(data ?? []);
      setDateRecherchee(dateReference);
      setPaginationModel((previous) => ({ ...previous, page: 0 }));
    } catch (requestError) {
      setError(requestError?.response?.data?.error || "Impossible de charger l'historique de localisation.");
      setStocks([]);
      setDateRecherchee(null);
    } finally {
      setLoading(false);
    }
  }, [typeLocalisation, magasinId, directionId, siteId, dateReference]);

  useEffect(() => {
    charger();
  }, [charger]);

  const handleTypeChange = (value) => {
    setTypeLocalisation(value);
    setMagasinId("");
    setDirectionId("");
    setSiteId("");
    setStocks([]);
    setDateRecherchee(null);
    setPaginationModel((previous) => ({ ...previous, page: 0 }));
  };

  const reinitialiserFiltres = () => {
    setTypeLocalisation("magasin");
    setMagasinId("");
    setDirectionId("");
    setSiteId("");
    setDateReference(getTodayDate());
    setStocks([]);
    setDateRecherchee(null);
    setPaginationModel((previous) => ({ ...previous, page: 0 }));
  };

  const columns = [
    { field: "article_designation", headerName: "Désignation", flex: 1, minWidth: 220 },
    { field: "stock", headerName: "Stock à la date", width: 150, headerAlign: "center", align: "center", renderCell: ({ value }) => <Chip label={value} color="primary" sx={{ fontWeight: 700, fontFamily: "monospace" }} /> },
  ];

  const localisationNom = typeLocalisation === "magasin"
    ? magasins.find((magasin) => String(magasin.magasin_id) === String(magasinId))?.magasin_nom
    : typeLocalisation === "direction"
      ? directions.find((direction) => String(direction.dir_id) === String(directionId))?.dir_libelle
      : sites.find((site) => String(site.site_id) === String(siteId))?.site_nom;
  const hasFilters = Boolean(magasinId || directionId || siteId || dateReference !== getTodayDate());

  return (
    <Box>
      <PageHeader onReset={reinitialiserFiltres} hasFilters={hasFilters}>
        <SelectFilter
          label="Type de localisation"
          value={typeLocalisation}
          onChange={handleTypeChange}
          minWidth={190}
          options={[
            { value: "magasin", label: "Magasin" },
            { value: "direction", label: "Direction" },
            { value: "site", label: "Site" },
          ]}
        />
        <SelectFilter
          label={typeLocalisation === "magasin" ? "Magasin" : typeLocalisation === "direction" ? "Direction" : "Site"}
          value={typeLocalisation === "magasin" ? magasinId : typeLocalisation === "direction" ? directionId : siteId}
          onChange={(value) => {
            if (typeLocalisation === "magasin") setMagasinId(value);
            else if (typeLocalisation === "direction") setDirectionId(value);
            else setSiteId(value);
            setPaginationModel((previous) => ({ ...previous, page: 0 }));
          }}
          minWidth={250}
          options={typeLocalisation === "magasin"
            ? [{ value: "", label: "Sélectionner un magasin..." }, ...magasins.map((magasin) => ({ value: magasin.magasin_id, label: `${magasin.magasin_nom}${magasin.localite ? ` (${magasin.localite})` : ""}` }))]
            : typeLocalisation === "direction"
              ? [{ value: "", label: "Sélectionner une direction..." }, ...directions.map((direction) => ({ value: direction.dir_id, label: direction.dir_libelle }))]
              : [{ value: "", label: "Sélectionner un site..." }, ...sites.map((site) => ({ value: site.site_id, label: `${site.site_nom}${site.localite ? ` (${site.localite})` : ""}` }))]}
        />
        <TextField
          label="Date de référence"
          type="date"
          size="small"
          value={dateReference}
          onChange={(event) => setDateReference(event.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
          slotProps={{ input: { startAdornment: <CalendarIcon fontSize="small" sx={{ color: "text.secondary", mr: 1 }} /> } }}
        />
      </PageHeader>
      <ErrorAlert error={error} onClose={() => setError("")} />
      {dateRecherchee && localisationNom && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: "#FFF8E1", borderRadius: 1, border: "1px solid #F9A825", display: "flex", alignItems: "center", gap: 1 }}>
          <SearchIcon color="primary" />
          <Typography variant="body2" fontWeight={500}>
            Articles {typeLocalisation === "magasin" ? "stockés au" : typeLocalisation === "direction" ? "attribués à la" : "attribués au"} <strong>{localisationNom}</strong> à la date du <strong>{new Date(dateRecherchee).toLocaleDateString("fr-FR")}</strong>{stocks.length > 0 && ` — ${stocks.length} article(s) trouvé(s)`}
          </Typography>
        </Box>
      )}
      <PaginatedDataGrid
        rows={stocks}
        columns={columns}
        loading={loading}
        rowCount={stocks.length}
        paginationMode="client"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={(row) => row.article_code}
        noRowsLabel="Aucun article trouvé pour cette date"
      />
    </Box>
  );
}
