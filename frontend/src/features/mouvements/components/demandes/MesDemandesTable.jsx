import { useState } from "react";
import { Box, Button, Chip, Paper, Typography } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { PaginatedDataGrid } from "@/components/table/PaginatedDataGrid";
import { API_ENDPOINTS } from "@/config/endpoints";
import { useNotification } from "@/hooks/useNotification";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { getErrorMessage } from "@/lib/api/errors";

import { annulerDemande, DEMANDES_KEY, libelleDemande, STATUTS_DEMANDE } from "../../api/demandesUnitesApi";

const date = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "—");

export function MesDemandesTable() {
  const queryClient = useQueryClient();
  const notify = useNotification();
  const [aAnnuler, setAAnnuler] = useState(null);
  const liste = usePaginatedList([...DEMANDES_KEY, "mes"], API_ENDPOINTS.DEMANDES_UNITES, { mes: 1 });
  const annulation = useMutation({
    mutationFn: (d) => annulerDemande(d.demande_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEMANDES_KEY });
      notify.success("Demande annulée.");
      setAAnnuler(null);
    },
    onError: (err) => notify.error(getErrorMessage(err, "Impossible d'annuler la demande.")),
  });

  const columns = [
    { field: "date_demande", headerName: "Date", autoGrow: false, autoExtraWidth: 8, valueFormatter: date },
    { field: "type_demande", headerName: "Demande", getText: libelleDemande, renderCell: ({ row }) => libelleDemande(row) },
    {
      field: "article_designation", headerName: "Unité", getText: (r) => `${r.article_designation} ${r.numero_de_serie || ""}`,
      renderCell: ({ row }) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap>{row.article_designation}</Typography>
          {row.numero_de_serie && <Typography variant="caption" color="text.secondary" fontFamily="monospace">N° {row.numero_de_serie}</Typography>}
        </Box>
      ),
    },
    {
      field: "statut", headerName: "Statut", autoGrow: false, autoExtraWidth: 24,
      renderCell: ({ value }) => <Chip size="small" label={STATUTS_DEMANDE[value]?.label} color={STATUTS_DEMANDE[value]?.color} variant="outlined" />,
    },
    { field: "commentaire_traitement", headerName: "Réponse", getText: (r) => r.commentaire_traitement || "—",
      renderCell: ({ value }) => <Typography variant="caption" color="text.secondary">{value || "—"}</Typography> },
    {
      field: "actions", headerName: "", sortable: false, autoGrow: false, autoExtraWidth: 16,
      renderCell: ({ row }) => row.statut === "EN_ATTENTE" && (
        <Button size="small" color="inherit" onClick={() => setAAnnuler(row)}>Annuler</Button>
      ),
    },
  ];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h3" sx={{ mb: 1.5 }}>Mes demandes</Typography>
      <PaginatedDataGrid {...liste.gridProps} columns={columns} getRowId={(r) => r.demande_id} noRowsLabel="Aucune demande" aria-label="Mes demandes" />
      <ConfirmDialog open={Boolean(aAnnuler)} title="Annuler la demande ?" message={aAnnuler ? `${libelleDemande(aAnnuler)} : ${aAnnuler.article_designation}` : ""}
        confirmLabel="Annuler la demande" onConfirm={() => annulation.mutate(aAnnuler)} onCancel={() => setAAnnuler(null)} />
    </Paper>
  );
}
