import { useState } from "react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, TextField, Tooltip, Typography } from "@mui/material";
import { Block as BlockIcon } from "@mui/icons-material";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SearchField } from "@/components/forms/SearchField";
import { BoutonPdf } from "@/components/table/BoutonPdf";
import { SelectFilter } from "@/components/forms/SelectFilter";
import { PaginatedDataGrid } from "@/components/table/PaginatedDataGrid";
import { API_ENDPOINTS } from "@/config/endpoints";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useNotification } from "@/hooks/useNotification";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { getErrorMessage } from "@/lib/api/errors";

import { DEMANDES_KEY, getUnite, libelleDemande, refuserDemande, STATUTS_DEMANDE } from "../../api/demandesUnitesApi";
import { RetourStockModal } from "../RetourStockModal";
import { TransfertUniteModal } from "../TransfertUniteModal";

const OPTIONS_STATUT = [{ value: "", label: "Tous les statuts" }, ...Object.entries(STATUTS_DEMANDE).map(([value, s]) => ({ value, label: s.label }))];
const date = (iso) => (iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—");

export function DemandesATraiter() {
  const queryClient = useQueryClient();
  const notify = useNotification();
  // Toutes les demandes par défaut (en attente en tête) : une demande traitée reste visible, avec sa fiche PDF.
  const [statut, setStatut] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [traitement, setTraitement] = useState(null); // { demande, unite }
  const [refus, setRefus] = useState(null);
  const [commentaire, setCommentaire] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const liste = usePaginatedList([...DEMANDES_KEY, "gestion"], API_ENDPOINTS.DEMANDES_UNITES, { statut, search });

  const traiter = async (demande) => {
    try {
      setTraitement({ demande, unite: await getUnite(demande.unite_id) });
    } catch (err) {
      notify.error(getErrorMessage(err, "Unité introuvable."));
    }
  };
  const refuser = useMutation({
    mutationFn: () => refuserDemande(refus.demande_id, commentaire.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEMANDES_KEY });
      notify.success("Demande refusée : le demandeur est prévenu par e-mail.");
      setRefus(null);
    },
    onError: (err) => notify.error(getErrorMessage(err, "Impossible de refuser la demande.")),
  });
  const fermer = () => setTraitement(null);

  const columns = [
    { field: "date_demande", headerName: "Date", autoGrow: false, valueFormatter: date },
    { field: "demandeur_nom", headerName: "Demandeur" },
    { field: "type_demande", headerName: "Demande", getText: libelleDemande, renderCell: ({ row }) => libelleDemande(row) },
    {
      field: "article_designation", headerName: "Unité", getText: (r) => `${r.article_designation} ${r.numero_de_serie || ""}`,
      renderCell: ({ row }) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap>{row.article_designation}{row.numero_de_serie && ` · ${row.numero_de_serie}`}</Typography>
          <Typography variant="caption" color="text.secondary">détenue par {row.beneficiaire_actuel?.nom || "—"}</Typography>
        </Box>
      ),
    },
    {
      field: "statut", headerName: "Statut", autoGrow: false, autoExtraWidth: 24,
      renderCell: ({ value }) => <Chip size="small" label={STATUTS_DEMANDE[value]?.label} color={STATUTS_DEMANDE[value]?.color} variant="outlined" />,
    },
    {
      field: "actions", headerName: "Actions", sortable: false, autoGrow: false, autoExtraWidth: 70,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          {row.statut === "EN_ATTENTE" ? (
            <>
              <Button size="small" variant="contained" onClick={() => traiter(row)}>Traiter</Button>
              <Tooltip title="Refuser la demande">
                <IconButton size="small" color="error" aria-label="Refuser la demande" onClick={() => { setRefus(row); setCommentaire(""); }}>
                  <BlockIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <BoutonPdf url={`${API_ENDPOINTS.DEMANDES_UNITES}${row.demande_id}/pdf/`} nomFichier={`demande_${row.demande_id}.pdf`} />
          )}
        </Box>
      ),
    },
  ];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 1.5 }}>
        <SearchField value={searchInput} onChange={setSearchInput} placeholder="Demandeur, équipement..." minWidth={260} />
        <SelectFilter label="Statut" value={statut} onChange={setStatut} options={OPTIONS_STATUT} minWidth={180} />
      </Box>
      <PaginatedDataGrid {...liste.gridProps} columns={columns} getRowId={(r) => r.demande_id}
        noRowsLabel="Aucune demande" aria-label="Demandes de retour et de transfert" />

      {traitement && (
        <>
          <RetourStockModal unite={traitement.unite} demande={traitement.demande} isOpen={traitement.demande.type_demande === "RETOUR"}
            onClose={fermer} onSuccess={fermer} />
          <TransfertUniteModal unite={traitement.unite} demande={traitement.demande} isOpen={traitement.demande.type_demande === "TRANSFERT"}
            onClose={fermer} onSuccess={fermer} />
        </>
      )}
      <Dialog open={Boolean(refus)} onClose={() => setRefus(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Refuser la demande n°{refus?.demande_id}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>{refus && `${libelleDemande(refus)} : ${refus.article_designation} (${refus.demandeur_nom})`}</Typography>
          <TextField fullWidth multiline minRows={2} required autoFocus label="Motif du refus (envoyé au demandeur)"
            value={commentaire} onChange={(e) => setCommentaire(e.target.value)} slotProps={{ htmlInput: { maxLength: 1000 } }} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRefus(null)} color="inherit">Annuler</Button>
          <Button variant="contained" color="error" disabled={!commentaire.trim() || refuser.isPending} onClick={() => refuser.mutate()}>
            Refuser la demande
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}