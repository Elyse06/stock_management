import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Tooltip, Typography } from "@mui/material";

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
import { useCrudMutations } from "@/hooks/useCrudMutations";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { getErrorMessage } from "@/lib/api/errors";
import { formatDateTime } from "@/utils/formatters";

import { commandesApi } from "../api/commandesApi";
import { CommandeDetailModal } from "../components/CommandeDetailModal";
import { bornesPeriode, PERIODES, STATUTS_COMMANDE } from "../constants/commande";
import { useCommandeRoles } from "../hooks/useCommandeRoles";
import { peutTelechargerFiche, TITRE_ACCUSE } from "../utils/fiche";

const getDemandeurNom = (row) => row?.demandeur?.nom || row?.employe_demandeur || "—";
const getArticlesLabel = (row) =>
  (row?.details ?? []).map((d) => d.libelle || d.article_designation).filter(Boolean).join(", ");

export function CommandesPage() {
  const { canCreateCommande, isDemandeur, isAgentPrincipal, peutTraiter } = useCommandeRoles();
  const droits = usePermission();
  const { user } = droits;
  // Le backend ne montre les commandes qu'à partir de l'employé lié au compte (sauf au gestionnaire).
  const sansEmploye = Boolean(user) && !user.employe && !isAgentPrincipal;
  const { confirm, dialogProps } = useConfirmDialog();
  const { remove } = useCrudMutations(commandesApi, [["commandes"]], { deleted: "Commande supprimée avec succès" });
  const [statut, setStatut] = useState("");
  const [periode, setPeriode] = useState("tous");
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const list = usePaginatedList(["commandes"], API_ENDPOINTS.COMMANDES, { statut });

  // Le backend ne filtre pas par date : la période s'applique à la page affichée.
  const rows = useMemo(() => {
    const bornes = bornesPeriode(periode);
    if (!bornes) return list.rows;
    return list.rows.filter((c) => {
      const date = new Date(c.date_commande);
      return date >= bornes.debut && date <= bornes.fin;
    });
  }, [list.rows, periode]);

  const askDelete = (commande) =>
    confirm("Supprimer la commande", `Êtes-vous sûr de vouloir supprimer la commande #${commande.commande_id} ?`, () =>
      remove.mutate(commande.commande_id),
    );

  const columns = [
    { field: "date_commande", headerName: "Date demande", getText: (row) => formatDateTime(row.date_commande), renderCell: ({ value }) => formatDateTime(value) },
    { field: "demandeur", headerName: "Demandeur", getText: getDemandeurNom, renderCell: ({ row }) => getDemandeurNom(row) },
    {
      field: "article_designation",
      headerName: "Articles",
      getText: getArticlesLabel,
      renderCell: ({ row }) => {
        const label = getArticlesLabel(row);
        if (!label) return <EmptyValue />;
        return (
          <Tooltip title={label}>
            <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
              {label}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      field: "statut",
      headerName: "Statut",
      autoExtraWidth: 40,
      renderCell: ({ row, value }) => (
        <StatusChip status={row.livree_partiellement ? "LIVREE_PARTIELLEMENT" : value === "VALIDEE" ? "TRAITE" : value} />
      ),
    },
    actionsColumn(
      ({ row }) => {
        const traitable = peutTraiter(row);
        // Le backend n'autorise la suppression que d'une commande EN_ATTENTE, par son demandeur.
        const supprimable = isDemandeur && row.statut === "EN_ATTENTE";
        return (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ActionButtons
              onView={() => setSelected(row)}
              onValidate={traitable ? () => setSelected(row) : null}
              onDelete={supprimable ? () => askDelete(row) : null}
              canValidate={traitable}
              canDelete={supprimable}
            />
            {/* Fiche PDF : réservée au gestionnaire (vérifié aussi par l'API). */}
            {peutTelechargerFiche(droits, row) && (
              <BoutonPdf url={`${API_ENDPOINTS.COMMANDES}${row.commande_id}/pdf/`} nomFichier={`accuse_reception_commande_${row.commande_id}.pdf`} titre={TITRE_ACCUSE} />
            )}
          </Box>
        );
      },
      190,
    ),
  ];

  return (
    <Box>
      <PageHeader
        actionLabel="Nouvelle demande"
        onAction={() => navigate("/commandes/nouvelle")}
        canAction={canCreateCommande}
        onReset={() => {
          setStatut("");
          setPeriode("tous");
        }}
        hasFilters={Boolean(statut || periode !== "tous")}
      >
        <SelectFilter label="Période" value={periode} onChange={setPeriode} options={PERIODES} minWidth={200} />
        <SelectFilter label="Statut" value={statut} onChange={setStatut} options={STATUTS_COMMANDE} />
      </PageHeader>
      <ErrorAlert error={list.error && getErrorMessage(list.error)} />
      {sansEmploye && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
          Votre compte n'est rattaché à aucun employé : aucune commande ne peut vous être affichée. Demandez à un
          administrateur de vous associer à votre fiche employé.
        </Alert>
      )}

      <PaginatedDataGrid {...list.gridProps} rows={rows} columns={columns} getRowId={(row) => row.commande_id} noRowsLabel="Aucune commande trouvée" />

      <CommandeDetailModal commande={selected} isOpen={Boolean(selected)} onClose={() => setSelected(null)} onCommandeModifiee={setSelected} />
      <ConfirmDialog {...dialogProps} />
    </Box>
  );
}
