import { useState } from "react";
import { Alert, Box, Chip, TextField, Typography } from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import { ErrorAlert } from "@/components/feedback/ErrorAlert";
import { SelectFilter } from "@/components/forms/SelectFilter";
import { TypeArticleFilter } from "@/components/forms/TypeArticleFilter";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaginatedDataGrid } from "@/components/table/PaginatedDataGrid";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { usePagination } from "@/hooks/usePagination";
import { toOptions } from "@/hooks/useReferenceData";
import { getErrorMessage } from "@/lib/api/errors";
import { aujourdhuiISO } from "@/utils/periodes";

import { getStocksLocalisation } from "../api/historiqueApi";
import { ResumeStockUnites } from "../components/ResumeStockUnites";
import { TYPES_LOCALISATION, useLocalisations } from "../hooks/useLocalisations";

const COLUMNS = [
  { field: "article_designation", headerName: "Désignation" },
  {
    field: "stock",
    headerName: "Stock à la date",
    headerAlign: "center",
    align: "center",
    autoExtraWidth: 24,
    renderCell: ({ value }) => <Chip label={value} color="primary" sx={{ fontWeight: 700, fontFamily: "monospace" }} />,
  },
];

/**
 * Stock d'un lieu à une date. Sans le droit de lire les mouvements (profils Standard et Chef
 * hiérarchique), seule la direction de l'utilisateur est consultable : choix pré-remplis et verrouillés
 * (le serveur refuse aussi les autres lieux).
 */
export function HistoriqueLocalisationPage() {
  const { canReadMouvements, user } = usePermission();
  const restreint = !canReadMouvements;
  const maDirection = user?.employe?.emp_dir_id ?? "";
  const [type, setType] = useState(restreint ? "direction" : "magasin");
  const [lieuId, setLieuId] = useState(restreint ? String(maDirection) : "");
  const [date, setDate] = useState(aujourdhuiISO);
  const [typeArticle, setTypeArticle] = useState("");
  const lieux = useLocalisations(type);
  const { paginationModel, setPaginationModel } = usePagination(DEFAULT_PAGE_SIZE, [type, lieuId, date, typeArticle]);

  const { data: stocks = [], isFetching, error, isSuccess } = useQuery({
    queryKey: ["historique", "localisation", type, lieuId, date, typeArticle],
    queryFn: ({ signal }) => getStocksLocalisation({ date, [lieux.param]: lieuId, is_immobilisation: typeArticle }, { signal }),
    enabled: Boolean(lieuId && date),
  });

  const lieu = lieux.items.find((item) => String(lieux.id(item)) === String(lieuId));
  const reset = () => {
    if (!restreint) {
      setType("magasin");
      setLieuId("");
    }
    setDate(aujourdhuiISO());
    setTypeArticle("");
  };

  return (
    <Box>
      <PageHeader onReset={reset} hasFilters={Boolean(typeArticle) || (restreint ? date !== aujourdhuiISO() : Boolean(lieuId || date !== aujourdhuiISO()))}>
        <SelectFilter
          label="Type de localisation"
          disabled={restreint}
          value={type}
          onChange={(value) => {
            setType(value);
            setLieuId("");
          }}
          minWidth={190}
          options={TYPES_LOCALISATION}
        />
        <SelectFilter label={lieux.label} value={lieuId} onChange={setLieuId} minWidth={250} disabled={restreint} options={toOptions(lieux.items, lieux.id, lieux.libelle, lieux.placeholder)} />
        <TextField
          label="Date de référence"
          type="date"
          size="small"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: aujourdhuiISO() } }}
          sx={{ minWidth: 180 }}
        />
        <TypeArticleFilter value={typeArticle} onChange={setTypeArticle} />
      </PageHeader>
      {restreint && !maDirection && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Votre compte n'est rattaché à aucune direction : l'historique de localisation n'est pas disponible.
        </Alert>
      )}
      <ErrorAlert error={error && getErrorMessage(error, "Impossible de charger l'historique de localisation.")} />
      {isSuccess && lieu && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: "#FFF8E1", borderRadius: 1, border: "1px solid #F9A825", display: "flex", alignItems: "center", gap: 1 }}>
          <SearchIcon color="primary" />
          <Typography variant="body2" fontWeight={500}>
            Articles {lieux.description} <strong>{lieux.nom(lieu)}</strong> à la date du{" "}
            <strong>{new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR")}</strong>
            {stocks.length > 0 && ` — ${stocks.length} article(s) trouvé(s)`}
          </Typography>
        </Box>
      )}
      <PaginatedDataGrid
        rows={lieuId ? stocks : []}
        columns={COLUMNS}
        loading={isFetching}
        rowCount={lieuId ? stocks.length : 0}
        paginationMode="client"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={(row) => row.article_code}
        noRowsLabel={lieuId ? "Aucun article trouvé pour cette date" : "Sélectionnez une localisation"}
      />

      {/* Situation actuelle des unités en stock (gestion du stock seulement). */}
      {!restreint && (
        <Box sx={{ mt: 4 }}>
          <ResumeStockUnites />
        </Box>
      )}
    </Box>
  );
}
