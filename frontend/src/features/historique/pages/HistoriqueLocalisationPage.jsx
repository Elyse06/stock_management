import { useState } from "react";
import { Box, Chip, TextField, Typography } from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import { ErrorAlert } from "@/components/feedback/ErrorAlert";
import { SelectFilter } from "@/components/forms/SelectFilter";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaginatedDataGrid } from "@/components/table/PaginatedDataGrid";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";
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

export function HistoriqueLocalisationPage() {
  const [type, setType] = useState("magasin");
  const [lieuId, setLieuId] = useState("");
  const [date, setDate] = useState(aujourdhuiISO);
  const lieux = useLocalisations(type);
  const { paginationModel, setPaginationModel } = usePagination(DEFAULT_PAGE_SIZE, [type, lieuId, date]);

  const { data: stocks = [], isFetching, error, isSuccess } = useQuery({
    queryKey: ["historique", "localisation", type, lieuId, date],
    queryFn: ({ signal }) => getStocksLocalisation({ date, [lieux.param]: lieuId }, { signal }),
    enabled: Boolean(lieuId && date),
  });

  const lieu = lieux.items.find((item) => String(lieux.id(item)) === String(lieuId));
  const reset = () => {
    setType("magasin");
    setLieuId("");
    setDate(aujourdhuiISO());
  };

  return (
    <Box>
      <PageHeader onReset={reset} hasFilters={Boolean(lieuId || date !== aujourdhuiISO())}>
        <SelectFilter
          label="Type de localisation"
          value={type}
          onChange={(value) => {
            setType(value);
            setLieuId("");
          }}
          minWidth={190}
          options={TYPES_LOCALISATION}
        />
        <SelectFilter label={lieux.label} value={lieuId} onChange={setLieuId} minWidth={250} options={toOptions(lieux.items, lieux.id, lieux.libelle, lieux.placeholder)} />
        <TextField
          label="Date de référence"
          type="date"
          size="small"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: aujourdhuiISO() } }}
          sx={{ minWidth: 180 }}
        />
      </PageHeader>
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

      {/* Situation actuelle des unités en stock (déplacée depuis la page Unités attribuées). */}
      <Box sx={{ mt: 4 }}>
        <ResumeStockUnites />
      </Box>
    </Box>
  );
}
