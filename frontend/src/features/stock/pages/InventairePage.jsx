import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";

import { CodeChip } from "@/components/data-display/CodeChip";
import { EmptyValue } from "@/components/data-display/EmptyValue";
import { StatusChip } from "@/components/data-display/StatusChip";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { ErrorAlert } from "@/components/feedback/ErrorAlert";
import { SelectFilter } from "@/components/forms/SelectFilter";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionButtons } from "@/components/table/ActionButtons";
import { actionsColumn } from "@/components/table/columns";
import { PaginatedDataGrid } from "@/components/table/PaginatedDataGrid";
import { API_ENDPOINTS } from "@/config/endpoints";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { getErrorMessage } from "@/lib/api/errors";
import { formatDateTime } from "@/utils/formatters";

import { InventaireDetailsModal } from "../components/InventaireDetailsModal";
import { LieuCell } from "../components/LieuCell";
import { estModifiable, PARAM_LIEU, STATUTS_INVENTAIRE, TYPES_LIEU } from "../constants/inventaire";
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
        <ActionButtons
          onView={() => setSelected(row)}
          onValidate={peutValider ? () => askValidate(row) : null}
          canValidate={peutValider}
          canEdit={false}
          canDelete={false}
        />
      );
    }, 120),
  ];

  return (
    <Box>
      <PageHeader
        actionLabel="Réalisation de l'inventaire"
        onAction={() => navigate("/inventaire/sessions/realisation")}
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
    </Box>
  );
}
