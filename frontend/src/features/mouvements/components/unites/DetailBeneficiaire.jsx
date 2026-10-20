import { Box, Button, Chip, Paper, Typography } from "@mui/material";
import { Print as PrintIcon } from "@mui/icons-material";

import { BeneficiaireTag } from "@/components/data-display/BeneficiaireTag";
import { EtatBadge } from "@/components/data-display/EtatBadge";
import { ActionButtons } from "@/components/table/ActionButtons";
import { actionsColumn } from "@/components/table/columns";
import { PaginatedDataGrid } from "@/components/table/PaginatedDataGrid";

import { peutRetourner, peutTransferer } from "../../constants/mouvement";

/** 2e tableau : unités du bénéficiaire sélectionné (Article, État, Action). */
export function DetailBeneficiaire({ beneficiaire, list, canManage, onAction }) {
  const columns = [
    {
      field: "article_designation",
      headerName: "Article",
      getText: (row) => `${row.article_designation} ${row.numero_de_serie || ""}`,
      renderCell: ({ row }) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap>
            {row.article_designation}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontFamily="monospace" component="div" sx={{ lineHeight: 1.2 }}>
            {row.article_code}
            {row.numero_de_serie && ` · N° ${row.numero_de_serie}`}
          </Typography>
        </Box>
      ),
    },
    { field: "etat", headerName: "État", autoGrow: false, autoExtraWidth: 56, renderCell: ({ value }) => <EtatBadge etat={value} /> },
    {
      ...actionsColumn(
        ({ row }) => (
          <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center", alignItems: "center" }}>
            <ActionButtons
              onAction1={canManage && peutRetourner(row) ? () => onAction("retour", row) : null}
              action1Label="Retour"
              onAction2={canManage && peutTransferer(row) ? () => onAction("transfert", row) : null}
              action2Label="Transfert"
            />
            {/* Étiquette : le n° d'immobilisation et la date saisis sont enregistrés (gestionnaire du stock). */}
            {canManage && (
              <Button size="small" variant="outlined" startIcon={<PrintIcon fontSize="small" />} onClick={() => onAction("etiquette", row)}
                sx={{ minWidth: 0, px: 1 }} title="Imprimer l'étiquette">
                Étiquette
              </Button>
            )}
          </Box>
        ),
        220,
      ),
      headerName: "Action",
    },
  ];

  return (
    <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5, flexWrap: "wrap", minHeight: 40 }}>
        {beneficiaire ? (
          <>
            <BeneficiaireTag type={beneficiaire.beneficiaire_type} nom={beneficiaire.beneficiaire_nom} />
            <Chip label={`${beneficiaire.nb_unites} article(s)`} size="small" color="primary" variant="outlined" />
          </>
        ) : (
          <Typography variant="h3">Détail</Typography>
        )}
      </Box>
      {beneficiaire ? (
        <PaginatedDataGrid {...list.gridProps} columns={columns} getRowId={(row) => row.unite_id}
          noRowsLabel="Aucune unité pour ce bénéficiaire" aria-label={`Unités de ${beneficiaire.beneficiaire_nom}`} />
      ) : (
        <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
          Aucun bénéficiaire ne correspond aux filtres.
        </Typography>
      )}
    </Paper>
  );
}
