import { useState } from "react";
import { Box, Button, Chip, Typography } from "@mui/material";
import { Print as PrintIcon } from "@mui/icons-material";

import { BeneficiaireTag } from "@/components/data-display/BeneficiaireTag";
import { EtatBadge } from "@/components/data-display/EtatBadge";
import { ErrorAlert } from "@/components/feedback/ErrorAlert";
import { SearchField } from "@/components/forms/SearchField";
import { SelectFilter } from "@/components/forms/SelectFilter";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionButtons } from "@/components/table/ActionButtons";
import { actionsColumn } from "@/components/table/columns";
import { PaginatedDataGrid } from "@/components/table/PaginatedDataGrid";
import { API_ENDPOINTS } from "@/config/endpoints";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { getErrorMessage } from "@/lib/api/errors";
import { getBeneficiaireMeta } from "@/utils/beneficiaireMeta";

import { BeneficiaireTypeChips } from "../components/BeneficiaireTypeChips";
import { EtiquetteModal } from "../components/EtiquetteModal";
import { ResumeStockUnites } from "../components/ResumeStockUnites";
import { RetourStockModal } from "../components/RetourStockModal";
import { TransfertUniteModal } from "../components/TransfertUniteModal";
import { ETATS_UNITE, peutRetourner, peutTransferer } from "../constants/mouvement";

const OPTIONS_ETAT = [{ value: "", label: "Tous les états" }, ...ETATS_UNITE];

export function UnitesArticlePage() {
  const { canManageInventaire } = usePermission();
  const [searchInput, setSearchInput] = useState("");
  const [type, setType] = useState("");
  const [etat, setEtat] = useState("");
  const [modal, setModal] = useState({ type: null, unite: null });
  const search = useDebouncedValue(searchInput.trim());

  const list = usePaginatedList(["unites"], API_ENDPOINTS.UNITES_ARTICLE, {
    statut: "ATTRIBUE",
    search,
    beneficiaire_type: type,
    etat,
  });

  const fermer = () => setModal({ type: null, unite: null });
  const reset = () => {
    setSearchInput("");
    setType("");
    setEtat("");
  };

  const columns = [
    {
      field: "beneficiaire_type",
      headerName: "Bénéficiaire",
      getText: (row) => row.employe_attribue_nom || "—",
      autoExtraWidth: 36,
      renderCell: ({ row }) => (
        <BeneficiaireTag
          type={row.beneficiaire_type}
          nom={row.employe_attribue_nom}
          onClick={row.employe_attribue_nom ? () => setSearchInput(row.employe_attribue_nom) : undefined}
        />
      ),
    },
    {
      field: "article_designation",
      headerName: "Article",
      renderCell: ({ row, value }) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontFamily="monospace" component="div" sx={{ lineHeight: 1.2 }}>
            {row.article_code}
          </Typography>
        </Box>
      ),
    },
    { field: "etat", headerName: "État", autoGrow: false, autoExtraWidth: 56, renderCell: ({ value }) => <EtatBadge etat={value} /> },
    actionsColumn(
      ({ row }) => (
        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center", alignItems: "center" }}>
          <ActionButtons
            onAction1={canManageInventaire && peutRetourner(row) ? () => setModal({ type: "retour", unite: row }) : null}
            action1Label="Retour"
            onAction2={canManageInventaire && peutTransferer(row) ? () => setModal({ type: "transfert", unite: row }) : null}
            action2Label="Transfert"
          />
          <Button
            size="small"
            variant="outlined"
            startIcon={<PrintIcon fontSize="small" />}
            onClick={() => setModal({ type: "etiquette", unite: row })}
            sx={{ minWidth: 0, px: 1 }}
            title="Imprimer l'étiquette"
          >
            Étiquette
          </Button>
        </Box>
      ),
      220,
    ),
  ];

  return (
    <Box>
      <PageHeader onReset={reset} hasFilters={Boolean(searchInput || type || etat)}>
        <SearchField value={searchInput} onChange={setSearchInput} placeholder="Bénéficiaire, article, n° de série..." minWidth={260} />
        <SelectFilter label="État" value={etat} onChange={setEtat} options={OPTIONS_ETAT} minWidth={160} />
        <BeneficiaireTypeChips value={type} onChange={setType} />
      </PageHeader>
      <ErrorAlert error={list.error && getErrorMessage(list.error)} />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.5fr) minmax(420px, 1fr)" }, gap: 2, alignItems: "start" }}>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 1 }}>
            <Typography variant="h3">Unités attribuées</Typography>
            <Chip label={`${list.rowCount} unité(s)`} size="small" color="primary" variant="outlined" />
            {search && <Chip label={`Recherche : « ${search} »`} size="small" onDelete={() => setSearchInput("")} />}
            {type && <Chip label={getBeneficiaireMeta(type).label} size="small" onDelete={() => setType("")} />}
            {etat && <Chip label={ETATS_UNITE.find((e) => e.value === etat)?.label} size="small" onDelete={() => setEtat("")} />}
          </Box>
          <PaginatedDataGrid {...list.gridProps} columns={columns} getRowId={(row) => row.unite_id} noRowsLabel="Aucune unité attribuée" />
        </Box>
        <ResumeStockUnites />
      </Box>

      {modal.unite && (
        <>
          <RetourStockModal unite={modal.unite} isOpen={modal.type === "retour"} onClose={fermer} onSuccess={fermer} />
          <TransfertUniteModal unite={modal.unite} isOpen={modal.type === "transfert"} onClose={fermer} onSuccess={fermer} />
          <EtiquetteModal unite={modal.unite} isOpen={modal.type === "etiquette"} onClose={fermer} />
        </>
      )}
    </Box>
  );
}
