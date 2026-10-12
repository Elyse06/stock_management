import { useState } from "react";
import { Box, TextField } from "@mui/material";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS } from "../../../constants/api";
import { usePagination } from "../../../hooks/usePagination";
import { usePermission } from "../../../hooks/usePermission";
import { PageHeader } from "../../../components/common/PageHeader";
import { ErrorAlert } from "../../../components/common/ErrorAlert";
import { StatusChip } from "../../../components/common/StatusChip";
import { ActionButtons } from "../../../components/common/ActionButtons";
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
  { value: "RETOUR", label: "Retours" },
];

/** "Magasin A → Magasin B" (ou l'origine pour une entrée sans source). */
const getTrajet = (row) => {
  const source =
    row.magasin_source_nom || (row.type_mouvement === "ENTREE" ? row.origine : "") || "—";
  const destination = row.magasin_destination_nom || "—";
  return `${source} → ${destination}`;
};

export function MouvementsPage() {
  const queryClient = useQueryClient();
  const { paginationModel, setPaginationModel, resetPage } = usePagination(20);
  const { canManageCatalogue, canManageInventaire } = usePermission();
  const canEdit = canManageCatalogue || canManageInventaire;

  const [filterType, setFilterType] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [selectedMouvement, setSelectedMouvement] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data, isLoading, isPlaceholderData, error } = useQuery({
    queryKey: [
      "mouvements",
      {
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        type: filterType,
        dateDebut,
        dateFin,
      },
    ],
    queryFn: async () => {
      const params = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
      };
      if (filterType) params.type_mouvement = filterType;
      if (dateDebut) params.date_debut = dateDebut;
      if (dateFin) params.date_fin = dateFin;

      const { data } = await apiClient.get(API_ENDPOINTS.MOUVEMENTS, { params });
      return {
        mouvements: data.results ?? data,
        totalCount: data.count ?? (data.results ?? data).length,
      };
    },
    placeholderData: keepPreviousData,
  });

  const reinitialiserFiltres = () => {
    setFilterType("");
    setDateDebut("");
    setDateFin("");
    resetPage();
  };

  const columns = [
    {
      field: "date",
      headerName: "Date",
      getText: (row) => formatDateTime(row.date),
      renderCell: (params) => formatDateTime(params.value),
    },
    {
      field: "type_mouvement",
      headerName: "Type",
      autoExtraWidth: 40,
      renderCell: (params) => <StatusChip status={params.value} />,
    },
    {
      field: "trajet",
      headerName: "Origine → Destination",
      getText: getTrajet,
      renderCell: (params) => getTrajet(params.row),
    },
    {
      field: "nb_articles",
      headerName: "Articles",
      headerAlign: "center",
      align: "center",
      autoGrow: false,
      renderCell: (params) => params.value ?? 0,
    },
    {
      field: "quantite_totale",
      headerName: "Qté totale",
      headerAlign: "center",
      align: "center",
      autoGrow: false,
      renderCell: (params) => params.value ?? 0,
    },
    {
      field: "actions",
      headerName: "Détails",
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
        actionLabel="Nouveau mouvement"
        onAction={() => setIsCreateModalOpen(true)}
        canAction={canEdit}
        onReset={reinitialiserFiltres}
        hasFilters={Boolean(filterType || dateDebut || dateFin)}
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
          onChange={(e) => {
            setDateDebut(e.target.value);
            resetPage();
          }}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: { xs: "100%", sm: 160 } }}
        />
        <TextField
          label="Au"
          type="date"
          size="small"
          value={dateFin}
          onChange={(e) => {
            setDateFin(e.target.value);
            resetPage();
          }}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: { xs: "100%", sm: 160 } }}
        />
      </PageHeader>
      <ErrorAlert error={error?.message} />

      <PaginatedDataGrid
        rows={data?.mouvements || []}
        columns={columns}
        loading={isLoading || isPlaceholderData}
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
