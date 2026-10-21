import { useState } from "react";
import { Box, Chip, Typography } from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";

import { DateCell } from "@/components/data-display/DateCell";
import { EmptyValue } from "@/components/data-display/EmptyValue";
import { StatusChip } from "@/components/data-display/StatusChip";
import { useNotification } from "@/hooks/useNotification";
import { ErrorAlert } from "@/components/feedback/ErrorAlert";
import { DateRangeFilter } from "@/components/forms/DateRangeFilter";
import { SelectFilter } from "@/components/forms/SelectFilter";
import { TypeArticleFilter } from "@/components/forms/TypeArticleFilter";
import { filtrerParType } from "@/constants/articles";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaginatedDataGrid } from "@/components/table/PaginatedDataGrid";
import { ArticleAutocomplete } from "@/components/forms/ArticleAutocomplete";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";
import { usePagination } from "@/hooks/usePagination";
import { toOptions, useArticles, useSites } from "@/hooks/useReferenceData";
import { getErrorMessage } from "@/lib/api/errors";
import { downloadBlob, safeFilename } from "@/utils/export";

import { exportHistoriqueArticle, getHistoriqueArticle } from "../api/historiqueApi";
import { ArticleHistoriqueBandeau } from "../components/ArticleHistoriqueBandeau";
import { datesPeriode, PERIODES } from "../constants/historique";

const PERIODES_ARTICLE = PERIODES.filter((p) => ["tous", "mois", "annee", "personnalisee"].includes(p.value));
const optional = ({ value }) => <EmptyValue value={value} />;

const COLUMNS = [
  { field: "date", headerName: "Date", renderCell: ({ value }) => <DateCell value={value} showTime /> },
  { field: "type_mouvement", headerName: "Type", autoExtraWidth: 40, renderCell: ({ value }) => <StatusChip status={value} /> },
  { field: "quantite", headerName: "Quantité", headerAlign: "center", align: "center" },
  {
    field: "impact",
    headerName: "Impact",
    headerAlign: "center",
    align: "center",
    renderCell: ({ value }) => (
      <Typography fontWeight={700} fontFamily="monospace" sx={{ color: value > 0 ? "success.main" : value < 0 ? "error.main" : "text.secondary" }}>
        {value > 0 ? `+${value}` : value}
      </Typography>
    ),
  },
  { field: "beneficiaire_nom", headerName: "Bénéficiaire", renderCell: optional },
  { field: "stock_cumule", headerName: "Stock cumulé", headerAlign: "center", align: "center", autoExtraWidth: 24, renderCell: ({ value }) => <Chip label={value} color="primary" size="small" /> },
  { field: "origine", headerName: "Origine", renderCell: optional },
  { field: "motif", headerName: "Motif", renderCell: optional },
];

export function HistoriqueArticlePage() {
  const notify = useNotification();
  const { data: articles = [] } = useArticles();
  const { data: sites = [] } = useSites();
  const [article, setArticle] = useState(null);
  const [typeArticle, setTypeArticle] = useState("");
  const [siteId, setSiteId] = useState("");
  const [periode, setPeriode] = useState("tous");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  const params = { site_id: siteId, ...datesPeriode(periode, dateDebut, dateFin) };
  const { paginationModel, setPaginationModel } = usePagination(DEFAULT_PAGE_SIZE, [article?.code_article, params]);

  const { data, isFetching, error } = useQuery({
    queryKey: ["historique", "article", article?.code_article, params],
    queryFn: ({ signal }) => getHistoriqueArticle(article.code_article, params, { signal }),
    enabled: Boolean(article),
    // Identifiant stable par ligne (plusieurs mouvements peuvent partager la même date).
    select: (res) => ({ ...res, historique: (res.historique ?? []).map((ligne, index) => ({ ...ligne, _id: index })) }),
  });
  const historique = article ? (data?.historique ?? []) : [];

  const exporter = useMutation({
    mutationFn: () => exportHistoriqueArticle(article.code_article, params),
    onSuccess: (blob) => downloadBlob(blob, `fiche_article_${safeFilename(article.code_article)}.xlsx`),
    onError: (err) => notify.error(getErrorMessage(err, "Impossible d'exporter la fiche article.")),
  });

  const reset = () => {
    setArticle(null);
    setTypeArticle("");
    setSiteId("");
    setPeriode("tous");
    setDateDebut("");
    setDateFin("");
  };

  return (
    <Box>
      <PageHeader onReset={reset} hasFilters={Boolean(article || typeArticle || siteId || periode !== "tous")}>
        <TypeArticleFilter value={typeArticle} onChange={(v) => { setTypeArticle(v); setArticle(null); }} />
        <ArticleAutocomplete articles={filtrerParType(articles, typeArticle)} value={article} onChange={setArticle} sx={{ minWidth: 300 }} />
        <SelectFilter
          label="Site"
          value={siteId}
          onChange={setSiteId}
          minWidth={200}
          options={toOptions(sites, (s) => s.site_id, (s) => `${s.site_nom}${s.localite ? ` (${s.localite})` : ""}`, "Tous les sites")}
        />
        <SelectFilter label="Période" value={periode} onChange={setPeriode} minWidth={180} options={PERIODES_ARTICLE} />
        {periode === "personnalisee" && <DateRangeFilter start={dateDebut} end={dateFin} onStartChange={setDateDebut} onEndChange={setDateFin} />}
      </PageHeader>
      <ErrorAlert error={error && getErrorMessage(error, "Impossible de charger l'historique de l'article.")} />
      {article && data?.article && (
        <ArticleHistoriqueBandeau
          article={data.article}
          stockActuel={data.stock_actuel ?? 0}
          onExport={() => exporter.mutate()}
          exporting={exporter.isPending}
          exportDisabled={historique.length === 0}
        />
      )}
      <PaginatedDataGrid
        rows={historique}
        columns={COLUMNS}
        loading={isFetching}
        rowCount={historique.length}
        paginationMode="client"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={(row) => row._id}
        noRowsLabel={article ? "Aucun mouvement pour cet article" : "Sélectionnez un article pour voir son historique"}
      />
    </Box>
  );
}
