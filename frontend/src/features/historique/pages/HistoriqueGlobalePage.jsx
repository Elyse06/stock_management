import { useEffect, useState, useCallback } from "react";
import { Autocomplete, Box, TextField } from "@mui/material";
import { Inventory as InventoryIcon } from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS } from "../../../constants/api";
import { PageHeader } from "../../../components/common/PageHeader";
import { ErrorAlert } from "../../../components/common/ErrorAlert";
import { SelectFilter } from "../../../components/common/SelectFilter";
import { PaginatedDataGrid } from "../../../components/common/PaginatedDataGrid";
import { EmptyValue } from "../../../components/common/EmptyValue";
import { StatusChip } from "../../../components/common/StatusChip";
import { ActionButtons } from "../../../components/common/ActionButtons";
import { DateCell } from "../../../components/common/DateCell";
import { MouvementDetailModal } from "../../mouvement/components/MouvementDetailModal";

const TYPES_MOUVEMENT = [
  { value: "", label: "Tous les types" },
  { value: "ENTREE", label: "Entrées" },
  { value: "RETOUR", label: "Retours" },
  { value: "SORTIE", label: "Sorties" },
  { value: "TRANSFERT", label: "Transferts" },
  { value: "AJUSTEMENT", label: "Ajustements" },
];

const PERIODES = [
  { value: "tous", label: "Toutes les dates" },
  { value: "aujourd'hui", label: "Aujourd'hui" },
  { value: "semaine", label: "Cette semaine" },
  { value: "mois", label: "Ce mois" },
  { value: "annee", label: "Cette année" },
  { value: "personnalisee", label: "Personnalisée" },
];

function getPeriodeDates(periode) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (periode === "tous") return { debut: null, fin: null };
  if (periode === "aujourd'hui") {
    const fin = new Date(today);
    fin.setHours(23, 59, 59, 999);
    return { debut: today, fin };
  }
  if (periode === "semaine") {
    const debut = new Date(today);
    const jour = debut.getDay();
    debut.setDate(debut.getDate() - (jour === 0 ? 6 : jour - 1));
    const fin = new Date(debut);
    fin.setDate(fin.getDate() + 6);
    fin.setHours(23, 59, 59, 999);
    return { debut, fin };
  }
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

export function HistoriqueGlobalePage() {
  const [mouvements, setMouvements] = useState([]);
  const [articles, setArticles] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [rowCount, setRowCount] = useState(0);
  const [periode, setPeriode] = useState("mois");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [magasinId, setMagasinId] = useState("");
  const [typeMouvement, setTypeMouvement] = useState("");
  const [articleSelectionne, setArticleSelectionne] = useState(null);
  const [selectedMouvement, setSelectedMouvement] = useState(null);

  useEffect(() => {
    Promise.all([
      apiClient.get(API_ENDPOINTS.MAGASINS, { params: { page_size: 100 } }),
      apiClient.get(API_ENDPOINTS.ARTICLES, { params: { page_size: 500 } }),
    ])
      .then(([magasinsRes, articlesRes]) => {
        setMagasins(magasinsRes.data.results ?? magasinsRes.data);
        setArticles(articlesRes.data.results ?? articlesRes.data);
      })
      .catch(() => setError("Impossible de charger les filtres."));
  }, []);

  const charger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
      };
      let debut = dateDebut;
      let fin = dateFin;
      if (periode !== "personnalisee") {
        const dates = getPeriodeDates(periode);
        debut = formatDate(dates.debut);
        fin = formatDate(dates.fin);
      }
      if (debut) params.date_debut = debut;
      if (fin) params.date_fin = fin;
      if (magasinId) params.magasin_id = magasinId;
      if (typeMouvement) params.type_mouvement = typeMouvement;
      if (articleSelectionne) params.article_designation = articleSelectionne.designation;

      const { data } = await apiClient.get(API_ENDPOINTS.HISTORIQUE_GLOBALE, { params });
      setMouvements(data.results ?? data);
      setRowCount(data.count ?? (data.results ?? data).length);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "Impossible de charger l'historique.");
      setMouvements([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize, periode, dateDebut, dateFin, magasinId, typeMouvement, articleSelectionne]);

  useEffect(() => {
    charger();
  }, [charger]);

  const resetPage = () => setPaginationModel((previous) => ({ ...previous, page: 0 }));
  const updateFilter = (setter) => (value) => {
    setter(value);
    resetPage();
  };
  const reinitialiserFiltres = () => {
    setPeriode("mois");
    setDateDebut("");
    setDateFin("");
    setMagasinId("");
    setTypeMouvement("");
    setArticleSelectionne(null);
    resetPage();
  };

  const columns = [
    {
      field: "date",
      headerName: "Date",
      width: 180,
      renderCell: (params) => <DateCell value={params.value} showTime />,
    },
    {
      field: "type_mouvement",
      headerName: "Type",
      width: 130,
      renderCell: (params) => <StatusChip status={params.value} />,
    },
    {
      field: "nb_articles",
      headerName: "Nombre d'articles",
      width: 150,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => params.row.details?.length ?? 0,
    },
    {
      field: "article_designation",
      headerName: "Articles",
      flex: 1,
      minWidth: 300,
      renderCell: (params) => {
        const designations = params.row.details?.map((detail) => detail.article_designation).filter(Boolean).join(", ");
        return <EmptyValue value={designations} />;
      },
    },
    {
      field: "actions",
      headerName: "Détails",
      width: 100,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <ActionButtons onView={() => setSelectedMouvement(params.row)} canEdit={false} canDelete={false} />
      ),
    },
  ];

  const hasFilters = Boolean(
    periode !== "mois" || dateDebut || dateFin || magasinId || typeMouvement || articleSelectionne
  );

  return (
    <Box>
      <PageHeader
        onReset={reinitialiserFiltres}
        hasFilters={hasFilters}
      >
        <Autocomplete
          size="small"
          options={articles}
          value={articleSelectionne}
          onChange={(_, value) => updateFilter(setArticleSelectionne)(value)}
          getOptionLabel={(option) => option?.designation || ""}
          isOptionEqualToValue={(option, value) => option?.code_article === value?.code_article}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Article"
              placeholder="Rechercher par désignation..."
              sx={{ minWidth: 280 }}
              InputProps={{
                ...params.InputProps,
                startAdornment: <InventoryIcon fontSize="small" sx={{ color: "text.secondary", mr: 1 }} />,
              }}
            />
          )}
          noOptionsText="Aucun article trouvé"
        />
        <SelectFilter
          label="Magasin"
          value={magasinId}
          onChange={updateFilter(setMagasinId)}
          minWidth={180}
          options={[{ value: "", label: "Tous les magasins" }, ...magasins.map((magasin) => ({
            value: magasin.magasin_id,
            label: `${magasin.magasin_nom}${magasin.localite ? ` (${magasin.localite})` : ""}`,
          }))]}
        />
        <SelectFilter
          label="Type"
          value={typeMouvement}
          onChange={updateFilter(setTypeMouvement)}
          minWidth={150}
          options={TYPES_MOUVEMENT}
        />
        <SelectFilter
          label="Période"
          value={periode}
          onChange={updateFilter(setPeriode)}
          minWidth={180}
          options={PERIODES}
        />
        {periode === "personnalisee" && (
          <>
            <TextField label="Du" type="date" size="small" value={dateDebut} onChange={(e) => updateFilter(setDateDebut)(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
            <TextField label="Au" type="date" size="small" value={dateFin} onChange={(e) => updateFilter(setDateFin)(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
          </>
        )}
      </PageHeader>
      <ErrorAlert error={error} onClose={() => setError("")} />
      <PaginatedDataGrid
        rows={mouvements}
        columns={columns}
        loading={loading}
        rowCount={rowCount}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={(row) => row.mouvement_id}
        noRowsLabel="Aucun mouvement trouvé"
      />
      <MouvementDetailModal
        mouvement={selectedMouvement}
        isOpen={Boolean(selectedMouvement)}
        onClose={() => setSelectedMouvement(null)}
      />
    </Box>
  );
}
