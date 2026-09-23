import { useState, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { Business as BusinessIcon, Store as StoreIcon } from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
import { usePagination } from "../../../hooks/usePagination";
import { usePermission } from "../../../hooks/usePermission";
import { useNotification } from "../../../components/common/NotificationProvider";
import { PageHeader } from "../../../components/common/PageHeader";
import { ErrorAlert } from "../../../components/common/ErrorAlert";
import { StatusChip } from "../../../components/common/StatusChip";
import { ActionButtons } from "../../../components/common/ActionButtons";
import { CodeChip } from "../../../components/common/CodeChip";
import { SelectFilter } from "../../../components/common/SelectFilter";
import { PaginatedDataGrid } from "../../../components/common/PaginatedDataGrid";
import { InventaireFormModal } from "../components/InventaireFormModal";
import { InventaireDetailsModal } from "../components/InventaireDetailsModal";
import { formatDateTime } from "../../../utils/formatters";

const STATUTS = [
  { value: "", label: "Tous statuts" },
  { value: "EN_ATTENTE", label: "En attente" },
  { value: "VALIDE", label: "Validé" },
  { value: "REJETE", label: "Rejeté" },
];

const TYPES_LIEU = [
  { value: "", label: "Tous lieux" },
  { value: "magasin", label: "Magasins" },
  { value: "direction", label: "Directions" },
];

export function InventairePage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { paginationModel, setPaginationModel, resetPage } = usePagination(25);
  const { canManageInventaire, canValidateInventaire } = usePermission();

  const [statutFiltre, setStatutFiltre] = useState("");
  const [lieuTypeFiltre, setLieuTypeFiltre] = useState("");
  const [lieuIdFiltre, setLieuIdFiltre] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["inventaires", {
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
      statut: statutFiltre,
      lieuType: lieuTypeFiltre,
      lieuId: lieuIdFiltre,
    }],
    queryFn: async () => {
      const params = { page: paginationModel.page + 1, page_size: paginationModel.pageSize };
      if (statutFiltre) params.statut = statutFiltre;
      if (lieuTypeFiltre === "magasin" && lieuIdFiltre) params.magasin = lieuIdFiltre;
      if (lieuTypeFiltre === "direction" && lieuIdFiltre) params.service = lieuIdFiltre;

      const { data } = await apiClient.get(API_ENDPOINTS.INVENTAIRES, { params });
      return {
        sessions: data.results ?? data,
        totalCount: data.count ?? (data.results ?? data).length,
      };
    },
    keepPreviousData: true,
  });

  const { data: magasins = [] } = useQuery({
    queryKey: ["magasins", "options"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.MAGASINS, { params: { page_size: 100 } });
      return data.results ?? data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: directions = [] } = useQuery({
    queryKey: ["directions", "options"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.DIRECTIONS, { params: { page_size: 100 } });
      return data.results ?? data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const validerMutation = useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.post(`${API_ENDPOINTS.INVENTAIRES}${id}/valider/`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventaires"] });
    },
  });

  const lieuOptions = useMemo(() => {
    const base = [{ value: "", label: "Tous" }];
    if (lieuTypeFiltre === "magasin") {
      return [
        ...base,
        ...magasins.map((m) => ({
          value: m.magasin_id,
          label: (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <StoreIcon fontSize="small" />
              {m.magasin_nom}
              {m.localite_nom && (
                <Typography variant="caption" color="text.secondary">
                  ({m.localite_nom})
                </Typography>
              )}
            </Box>
          ),
        })),
      ];
    }
    if (lieuTypeFiltre === "direction") {
      return [
        ...base,
        ...directions.map((d) => ({
          value: d.dir_id,
          label: (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <BusinessIcon fontSize="small" />
              {d.dir_libelle}
            </Box>
          ),
        })),
      ];
    }
    return base;
  }, [lieuTypeFiltre, magasins, directions]);

  const reinitialiserFiltres = () => {
    setStatutFiltre("");
    setLieuTypeFiltre("");
    setLieuIdFiltre("");
  };

  const openDetailModal = async (session) => {
    try {
      const { data } = await apiClient.get(`${API_ENDPOINTS.INVENTAIRES}${session.inventaire_id}/`);
      setSelectedSession(data);
      setIsDetailModalOpen(true);
    } catch {
      notify.error("Impossible de charger les détails de l'inventaire.");
    }
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedSession(null);
  };

  const handleValidate = (session) => {
    confirm(
      "Valider l'inventaire",
      `Êtes-vous sûr de vouloir valider l'inventaire "${session.code_reference}" ?`,
      async () => {
        try {
          await validerMutation.mutateAsync(session.inventaire_id);
          notify.success("Inventaire validé avec succès");
        } catch {
          notify.error("Erreur lors de la validation de l'inventaire.");
        }
      }
    );
  };

  const columns = [
    {
      field: "date_creation",
      headerName: "Date de l'inventaire",
      width: 160,
      renderCell: (params) => formatDateTime(params.value),
    },
    { field: "lieu_nom", headerName: "Lieu", flex: 1, minWidth: 150 },
    {
      field: "nb_lignes",
      headerName: "Nombre d'articles",
      width: 170,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => params.row.lignes?.length ?? 0,
    },
    {
      field: "statut",
      headerName: "Statut",
      width: 120,
      renderCell: (params) => <StatusChip status={params.value} />,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const session = params.row;
        const canValidateSession = canValidateInventaire && session.statut === "EN_ATTENTE";
        return (
          <ActionButtons
            onView={() => openDetailModal(session)}
            onValidate={canValidateSession ? () => handleValidate(session) : null}
            canValidate={canValidateSession}
            canEdit={false}
            canDelete={false}
          />
        );
      },
    },
  ];

  return (
    <Box>
      <PageHeader
        title=""
        actionLabel="Nouvel inventaire"
        onAction={() => setIsFormModalOpen(true)}
        canAction={canManageInventaire}
        onReset={reinitialiserFiltres}
        hasFilters={statutFiltre || lieuTypeFiltre || lieuIdFiltre}
      >
        <SelectFilter
          label="Statut"
          value={statutFiltre}
          onChange={(value) => {
            setStatutFiltre(value);
            resetPage();
          }}
          options={STATUTS}
          minWidth={150}
        />
        <SelectFilter
          label="Type de lieu"
          value={lieuTypeFiltre}
          onChange={(value) => {
            setLieuTypeFiltre(value);
            setLieuIdFiltre("");
            resetPage();
          }}
          options={TYPES_LIEU}
          minWidth={150}
        />
        {lieuTypeFiltre && (
          <SelectFilter
            label="Lieu"
            value={lieuIdFiltre}
            onChange={(value) => {
              setLieuIdFiltre(value);
              resetPage();
            }}
            options={lieuOptions}
            minWidth={200}
          />
        )}
      </PageHeader>
      <ErrorAlert error={error?.message} />

      <PaginatedDataGrid
        rows={data?.sessions || []}
        columns={columns}
        loading={isLoading}
        rowCount={data?.totalCount || 0}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={(row) => row.inventaire_id}
        noRowsLabel="Aucun inventaire trouvé"
      />

      <InventaireFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["inventaires"] })}
        magasins={magasins}
        directions={directions}
      />
      <InventaireDetailsModal
        session={selectedSession}
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["inventaires"] })}
      />
    </Box>
  );
}