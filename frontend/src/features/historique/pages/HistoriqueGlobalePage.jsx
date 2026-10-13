import { useState } from "react";
import { Box } from "@mui/material";

import { DateCell } from "@/components/data-display/DateCell";
import { EmptyValue } from "@/components/data-display/EmptyValue";
import { StatusChip } from "@/components/data-display/StatusChip";
import { ErrorAlert } from "@/components/feedback/ErrorAlert";
import { DateRangeFilter } from "@/components/forms/DateRangeFilter";
import { SelectFilter } from "@/components/forms/SelectFilter";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionButtons } from "@/components/table/ActionButtons";
import { actionsColumn } from "@/components/table/columns";
import { PaginatedDataGrid } from "@/components/table/PaginatedDataGrid";
import { API_ENDPOINTS } from "@/config/endpoints";
import { ArticleAutocomplete } from "@/components/forms/ArticleAutocomplete";
import { MouvementDetailModal } from "@/features/mouvements/components/MouvementDetailModal";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { toOptions, useArticles, useMagasins } from "@/hooks/useReferenceData";
import { getErrorMessage } from "@/lib/api/errors";

import { datesPeriode, PERIODES, TYPES_MOUVEMENT } from "../constants/historique";

const designations = (row) => row.details?.map((d) => d.article_designation).filter(Boolean).join(", ");

export function HistoriqueGlobalePage() {
  const { data: magasins = [] } = useMagasins();
  const { data: articles = [] } = useArticles();
  const [periode, setPeriode] = useState("mois");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [magasinId, setMagasinId] = useState("");
  const [type, setType] = useState("");
  const [article, setArticle] = useState(null);
  const [selected, setSelected] = useState(null);

  const list = usePaginatedList(
    ["historique", "globale"],
    API_ENDPOINTS.HISTORIQUE_GLOBALE,
    { ...datesPeriode(periode, dateDebut, dateFin), magasin_id: magasinId, type_mouvement: type, article_designation: article?.designation },
  );

  const reset = () => {
    setPeriode("mois");
    setDateDebut("");
    setDateFin("");
    setMagasinId("");
    setType("");
    setArticle(null);
  };

  const columns = [
    { field: "date", headerName: "Date", renderCell: ({ value }) => <DateCell value={value} showTime /> },
    { field: "type_mouvement", headerName: "Type", autoExtraWidth: 40, renderCell: ({ value }) => <StatusChip status={value} /> },
    {
      field: "nb_articles",
      headerName: "Nombre d'articles",
      headerAlign: "center",
      align: "center",
      getText: (row) => String(row.details?.length ?? 0),
      renderCell: ({ row }) => row.details?.length ?? 0,
    },
    { field: "article_designation", headerName: "Articles", getText: designations, renderCell: ({ row }) => <EmptyValue value={designations(row)} /> },
    { ...actionsColumn(({ row }) => <ActionButtons onView={() => setSelected(row)} canEdit={false} canDelete={false} />, 100), headerName: "Détails" },
  ];

  return (
    <Box>
      <PageHeader onReset={reset} hasFilters={Boolean(periode !== "mois" || magasinId || type || article)}>
        <ArticleAutocomplete articles={articles} value={article} onChange={setArticle} sx={{ minWidth: 280 }} />
        <SelectFilter
          label="Magasin"
          value={magasinId}
          onChange={setMagasinId}
          minWidth={180}
          options={toOptions(magasins, (m) => m.magasin_id, (m) => `${m.magasin_nom}${m.localite_nom ? ` (${m.localite_nom})` : ""}`, "Tous les magasins")}
        />
        <SelectFilter label="Type" value={type} onChange={setType} options={TYPES_MOUVEMENT} />
        <SelectFilter label="Période" value={periode} onChange={setPeriode} minWidth={180} options={PERIODES} />
        {periode === "personnalisee" && <DateRangeFilter start={dateDebut} end={dateFin} onStartChange={setDateDebut} onEndChange={setDateFin} />}
      </PageHeader>
      <ErrorAlert error={list.error && getErrorMessage(list.error, "Impossible de charger l'historique.")} />
      <PaginatedDataGrid {...list.gridProps} columns={columns} getRowId={(row) => row.mouvement_id} noRowsLabel="Aucun mouvement trouvé" />
      <MouvementDetailModal mouvement={selected} isOpen={Boolean(selected)} onClose={() => setSelected(null)} />
    </Box>
  );
}
