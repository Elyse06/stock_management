import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";

import { CodeChip } from "@/components/data-display/CodeChip";
import { EmptyValue } from "@/components/data-display/EmptyValue";
import { StatusChip } from "@/components/data-display/StatusChip";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { ErrorAlert } from "@/components/feedback/ErrorAlert";
import { SelectFilter } from "@/components/forms/SelectFilter";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionButtons } from "@/components/table/ActionButtons";
import { BoutonPdf } from "@/components/table/BoutonPdf";
import { actionsColumn } from "@/components/table/columns";
import { PaginatedDataGrid } from "@/components/table/PaginatedDataGrid";
import { API_ENDPOINTS } from "@/config/endpoints";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { getErrorMessage } from "@/lib/api/errors";
import { formatDateTime } from "@/utils/formatters";

import { InventaireDetailsModal } from "../components/InventaireDetailsModal";
import { ChoixTypeInventaire } from "../components/realisation/ChoixTypeInventaire";
import { LieuCell } from "../components/LieuCell";
import { estModifiable, PARAM_LIEU, STATUTS_INVENTAIRE, TYPES_LIEU } from "../constants/inventaire";
import { libelleTypeSession } from "../constants/typeInventaire";
import { useLieuOptions } from "../hooks/useLieuOptions";
import { useValiderInventaire } from "../hooks/useValiderInventaire";

// La liste peut fournir nb_lignes (léger) ou, à défaut, tout le tableau lignes
const getNbLignes = (row) => row.nb_lignes ?? row.lignes?.length ?? 0;

export function InventairePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { confirm, dialogProps } = useConfirmDialog();
  const { canManageInventaire, canValidateInventaire } = usePermission();
  const valider = useValiderInventaire();

  const [statut, setStatut] = useState("");
  const [lieuType, setLieuType] = useState("");
  const [lieuId, setLieuId] = useState("");
  const [selected, setSelected] = useState(null);
  const [choixType, setChoixType] = useState(false);
  const lieuOptions = useLieuOptions(lieuType);

  const filters = { statut, ...(lieuType && lieuId ? { [PARAM_LIEU[lieuType]]: lieuId } : {}) };
  const list = usePaginatedList(["inventaires"], API_ENDPOINTS.INVENTAIRES, filters);

  const askValidate = (session) =>
    confirm("Valider l'inventaire", `Êtes-vous sûr de vouloir valider l'inventaire « ${session.code_reference} » ?`, () =>
      valider.mutate(session.inventaire_id),
    );

  const reset = () => {
    setStatut("");
    setLieuType("");
    setLieuId("");
  };

  const columns = [
    {
      field: "date_creation",
      headerName: "Date de l'inventaire",
      getText: (row) => formatDateTime(row.date_creation),
      renderCell: ({ value }) => formatDateTime(value),
    },
    {
      field: "code_reference",
      headerName: "Référence",
      autoGrow: false,
      autoExtraWidth: 16,
      renderCell: ({ value }) => (value ? <CodeChip value={value} /> : <EmptyValue />),
    },
    { field: "lieu_nom", headerName: "Lieu", autoExtraWidth: 36, renderCell: ({ row, value }) => <LieuCell session={row} nom={value} /> },
    {
      field: "type_articles", headerName: "Type", autoGrow: false,
      getText: (row) => libelleTypeSession(row.type_articles), renderCell: ({ value }) => libelleTypeSession(value),
    },
    {
      field: "nb_lignes",
      headerName: "Articles",
      headerAlign: "center",
      align: "center",
      autoGrow: false,
      getText: (row) => String(getNbLignes(row)),
      renderCell: ({ row }) => getNbLignes(row),
    },
    { field: "statut", headerName: "Statut", autoGrow: false, autoExtraWidth: 40, renderCell: ({ value }) => <StatusChip status={value} /> },
    actionsColumn(({ row }) => {
      const peutValider = canValidateInventaire && estModifiable(row);
      return (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <ActionButtons
            onView={() => setSelected(row)}
            onValidate={peutValider ? () => askValidate(row) : null}
            canValidate={peutValider}
            canEdit={false}
            canDelete={false}
          />
          {/* Fiche PDF avec signatures : inventaires validés seulement. */}
          {row.statut === "VALIDE" && (
            <BoutonPdf url={`${API_ENDPOINTS.INVENTAIRES}${row.inventaire_id}/pdf/`} nomFichier={`inventaire_${row.code_reference}.pdf`}
              titre="Fiche PDF de l'inventaire" />
          )}
        </Box>
      );
    }, 150),
  ];

  return (
    <Box>
      <PageHeader
        actionLabel="Réalisation de l'inventaire"
        onAction={() => setChoixType(true)}
        canAction={canManageInventaire}
        onReset={reset}
        hasFilters={Boolean(statut || lieuType || lieuId)}
      >
        <SelectFilter label="Statut" value={statut} onChange={setStatut} options={STATUTS_INVENTAIRE} />
        <SelectFilter
          label="Type de lieu"
          value={lieuType}
          onChange={(value) => {
            setLieuType(value);
            setLieuId("");
          }}
          options={TYPES_LIEU}
        />
        {lieuType && <SelectFilter label="Lieu" value={lieuId} onChange={setLieuId} options={lieuOptions} minWidth={200} />}
      </PageHeader>
      <ErrorAlert error={list.error && getErrorMessage(list.error)} />

      <PaginatedDataGrid {...list.gridProps} columns={columns} getRowId={(row) => row.inventaire_id} noRowsLabel="Aucun inventaire trouvé" />

      <InventaireDetailsModal
        session={selected}
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["inventaires"] })}
      />
      <ConfirmDialog {...dialogProps} />
      {/* Avant la réalisation : immobilisations ou fournitures. */}
      <Dialog open={choixType} onClose={() => setChoixType(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: "tint.main",
          borderBottom: "2px solid", borderColor: "secondary.main" }}>
          Que voulez-vous inventorier ?
          <IconButton size="small" onClick={() => setChoixType(false)} aria-label="Fermer"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "20px !important" }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Seuls les articles du type choisi seront proposés au comptage.
          </Typography>
          <ChoixTypeInventaire onChoisir={(cle) => navigate(`/inventaire/sessions/realisation?type=${cle}`)} />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
