import { useState } from "react";
import { Box } from "@mui/material";

import { StatusChip } from "@/components/data-display/StatusChip";
import { ErrorAlert } from "@/components/feedback/ErrorAlert";
import { DateRangeFilter } from "@/components/forms/DateRangeFilter";
import { SelectFilter } from "@/components/forms/SelectFilter";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionButtons } from "@/components/table/ActionButtons";
import { actionsColumn } from "@/components/table/columns";
import { PaginatedDataGrid } from "@/components/table/PaginatedDataGrid";
import { API_ENDPOINTS } from "@/config/endpoints";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { getErrorMessage } from "@/lib/api/errors";
import { formatDateTime } from "@/utils/formatters";

import { MouvementDetailModal } from "../components/MouvementDetailModal";
import { MouvementFormModal } from "../components/MouvementFormModal";
import { getTrajet, TYPES_MOUVEMENT } from "../constants/mouvement";

export function MouvementsPage() {
  const { canManageMouvements } = usePermission();
  const [type, setType] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [selected, setSelected] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const list = usePaginatedList(["mouvements"], API_ENDPOINTS.MOUVEMENTS, {
    type_mouvement: type,
    date_debut: dateDebut,
    date_fin: dateFin,
  });

  const reset = () => {
    setType("");
    setDateDebut("");
    setDateFin("");
  };

  const columns = [
    { field: "date", headerName: "Date", getText: (row) => formatDateTime(row.date), renderCell: ({ value }) => formatDateTime(value) },
    { field: "type_mouvement", headerName: "Type", autoExtraWidth: 40, renderCell: ({ value }) => <StatusChip status={value} /> },
    { field: "trajet", headerName: "Trajet", getText: getTrajet, renderCell: ({ row }) => getTrajet(row) },
    { field: "nb_articles", headerName: "Articles", headerAlign: "center", align: "center", autoGrow: false, renderCell: ({ value }) => value ?? 0 },
    { field: "quantite_totale", headerName: "Quantité", headerAlign: "center", align: "center", autoGrow: false, renderCell: ({ value }) => value ?? 0 },
    {
      ...actionsColumn(({ row }) => <ActionButtons onView={() => setSelected(row)} canEdit={false} canDelete={false} />, 100),
      headerName: "Détails",
    },
  ];

  return (
    <Box>
      <PageHeader
        actionLabel="Nouveau mouvement"
        onAction={() => setCreateOpen(true)}
        canAction={canManageMouvements}
        onReset={reset}
        hasFilters={Boolean(type || dateDebut || dateFin)}
      >
        <SelectFilter label="Type" value={type} onChange={setType} options={TYPES_MOUVEMENT} />
        <DateRangeFilter start={dateDebut} end={dateFin} onStartChange={setDateDebut} onEndChange={setDateFin} />
      </PageHeader>
      <ErrorAlert error={list.error && getErrorMessage(list.error)} />

      <PaginatedDataGrid {...list.gridProps} columns={columns} getRowId={(row) => row.mouvement_id} noRowsLabel="Aucun mouvement" />

      <MouvementDetailModal mouvement={selected} isOpen={Boolean(selected)} onClose={() => setSelected(null)} />
      <MouvementFormModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </Box>
  );
}
