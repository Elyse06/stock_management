import { useState, useMemo } from "react";
import { Box, TextField } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS } from "../../../constants/api";
import { usePagination } from "../../../hooks/usePagination";
import { usePermission } from "../../../hooks/usePermission";
import { useNotification } from "../../../components/common/NotificationProvider";
import { PageHeader } from "../../../components/common/PageHeader";
import { FilterBar } from "../../../components/common/FilterBar";
import { ErrorAlert } from "../../../components/common/ErrorAlert";
import { StatusChip } from "../../../components/common/StatusChip";
import { ActionButtons } from "../../../components/common/ActionButtons";
import { EmptyValue } from "../../../components/common/EmptyValue";
import { SelectFilter } from "../../../components/common/SelectFilter";
import { PaginatedDataGrid } from "../../../components/common/PaginatedDataGrid";
import { MouvementFormModal } from "../components/MouvementFormModal";
import { MouvementDetailModal } from "../components/MouvementDetailModal";
import { formatDateTime } from "../../../utils/formatters";

const TYPES = [
  { value: "", label: "Tous" },
  { value: "ENTREE", label: "Entrées" },
  { value: "SORTIE", label: "Sorties" },
  { value: "TRANSFERT", label: "Transferts" },
  { value: "AJUSTEMENT", label: "Ajustements" },
];

export function MouvementsPage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { paginationModel, setPaginationModel, resetPage } = usePagination(25);
  const { canManageCatalogue, canManageInventaire } = usePermission();
  const canEdit = canManageCatalogue || canManageInventaire;

  const [filterType, setFilterType] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [selectedMouvement, setSelectedMouvement] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["mouvements", { page: paginationModel.page + 1, pageSize: paginationModel.pageSize, type: filterType }],
    queryFn: async () => {
      const params = { page: paginationModel.page + 1, page_size: paginationModel.pageSize };
      if (filterType) params.type_mouvement = filterType;

      const { data } = await apiClient.get(API_ENDPOINTS.MOUVEMENTS, { params });
      return {
        mouvements: data.results ?? data,
        totalCount: data.count ?? (data.results ?? data).length,
      };
    },
    keepPreviousData: true,
  });

  const mouvementsFiltres = useMemo(() => {
    const allMouvements = data?.mouvements || [];
    if (!dateDebut && !dateFin) return allMouvements;

    return allMouvements.filter((mouvement) => {
      const mouvementDate = new Date(mouvement.date);
      mouvementDate.setHours(0, 0, 0, 0);
      if (dateDebut) {
        const debut = new Date(dateDebut);
        debut.setHours(0, 0, 0, 0);
        if (mouvementDate < debut) return false;
      }
      if (dateFin) {
        const fin = new Date(dateFin);
        fin.setHours(23, 59, 59, 999);
        if (mouvementDate > fin) return false;
      }
      return true;
    });
  }, [data?.mouvements, dateDebut, dateFin]);

  const reinitialiserFiltres = () => {
    setFilterType("");
    setDateDebut("");
    setDateFin("");
  };

  const columns = [
    { field: "mouvement_id", headerName: "ID", width: 80, headerAlign: "center", align: "center" },
    {
      field: "type_mouvement",
      headerName: "Type",
      width: 120,
      renderCell: (params) => <StatusChip status={params.value} />,
    },
    {
      field: "magasin_source_nom",
      headerName: "Source",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => <EmptyValue value={params.value} />,
    },
    {
      field: "magasin_destination_nom",
      headerName: "Destination",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => <EmptyValue value={params.value} />,
    },
    {
      field: "date",
      headerName: "Date",
      width: 180,
      renderCell: (params) => formatDateTime(params.value),
    },
    {
      field: "nb_articles",
      headerName: "Articles",
      width: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => params.row.details?.length ?? 0,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <ActionButtons
          onView={() => setSelectedMouvement(params.row)}
          canEdit={false}
          canDelete={false}
        />
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Mouvements de stock"
        actionLabel="Nouveau mouvement"
        onAction={() => setIsCreateModalOpen(true)}
        canAction={canEdit}
      />
      <ErrorAlert error={error?.message} />

      <FilterBar
        onReset={reinitialiserFiltres}
        hasFilters={filterType || dateDebut || dateFin}
      >
        <SelectFilter
          label="Type"
          value={filterType}
          onChange={(value) => {
            setFilterType(value);
            resetPage();
          }}
          options={TYPES}
          minWidth={150}
        />
        <TextField
          label="Du"
          type="date"
          size="small"
          value={dateDebut}
          onChange={(e) => setDateDebut(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 150 }}
        />
        <TextField
          label="Au"
          type="date"
          size="small"
          value={dateFin}
          onChange={(e) => setDateFin(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 150 }}
        />
      </FilterBar>

      <PaginatedDataGrid
        rows={mouvementsFiltres}
        columns={columns}
        loading={isLoading}
        rowCount={data?.totalCount || 0}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={(row) => row.mouvement_id}
        noRowsLabel="Aucun mouvement"
      />

      <MouvementDetailModal
        mouvement={selectedMouvement}
        isOpen={Boolean(selectedMouvement)}
        onClose={() => setSelectedMouvement(null)}
      />
      <MouvementFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["mouvements"] })}
      />
    </Box>
  );
}