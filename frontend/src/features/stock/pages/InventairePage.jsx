import { useState, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import {
  Business as BusinessIcon,
  Store as StoreIcon,
  LocationCity as LocationCityIcon,
  MeetingRoom as MeetingRoomIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../../api/client";
import { fetchAllPages } from "../../../api/fetchAllPages";
import { API_ENDPOINTS } from "../../../constants/api";
import { usePagination } from "../../../hooks/usePagination";
import { usePermission } from "../../../hooks/usePermission";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { useNotification } from "../../../components/common/NotificationProvider";
import { PageHeader } from "../../../components/common/PageHeader";
import { ErrorAlert } from "../../../components/common/ErrorAlert";
import { StatusChip } from "../../../components/common/StatusChip";
import { CodeChip } from "../../../components/common/CodeChip";
import { EmptyValue } from "../../../components/common/EmptyValue";
import { ActionButtons } from "../../../components/common/ActionButtons";
import { SelectFilter } from "../../../components/common/SelectFilter";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { PaginatedDataGrid } from "../../../components/common/PaginatedDataGrid";
import { InventaireFormModal } from "../components/InventaireFormModal";
import { InventaireDetailsModal } from "../components/InventaireDetailsModal";
import { getLieuMeta } from "../components/lieuMeta";
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
  { value: "site", label: "Sites" },
  { value: "salle", label: "Salles" },
];

// La liste peut fournir nb_lignes (léger) ou, à défaut, tout le tableau lignes
const getNbLignes = (row) => row.nb_lignes ?? row.lignes?.length ?? 0;

export function InventairePage() {
  const notify = useNotification();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const { paginationModel, setPaginationModel, resetPage } = usePagination(20);
  const { canManageInventaire, canValidateInventaire } = usePermission();

  const [statutFiltre, setStatutFiltre] = useState("");
  const [lieuTypeFiltre, setLieuTypeFiltre] = useState("");
  const [lieuIdFiltre, setLieuIdFiltre] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  const { data, isLoading, isPlaceholderData, error } = useQuery({
    queryKey: [
      "inventaires",
      {
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        statut: statutFiltre,
        lieuType: lieuTypeFiltre,
        lieuId: lieuIdFiltre,
      },
    ],
    queryFn: async () => {
      const params = { page: paginationModel.page + 1, page_size: paginationModel.pageSize };
      if (statutFiltre) params.statut = statutFiltre;
      if (lieuTypeFiltre === "magasin" && lieuIdFiltre) params.magasin = lieuIdFiltre;
      if (lieuTypeFiltre === "direction" && lieuIdFiltre) params.service = lieuIdFiltre;
      if (lieuTypeFiltre === "site" && lieuIdFiltre) params.site = lieuIdFiltre;
      if (lieuTypeFiltre === "salle" && lieuIdFiltre) params.salle = lieuIdFiltre;

      const { data } = await apiClient.get(API_ENDPOINTS.INVENTAIRES, { params });
      return {
        sessions: data.results ?? data,
        totalCount: data.count ?? (data.results ?? data).length,
      };
    },
    placeholderData: keepPreviousData,
  });

  const { data: magasins = [] } = useQuery({
    queryKey: ["magasins", "options"],
    queryFn: () => fetchAllPages(API_ENDPOINTS.MAGASINS),
    staleTime: 1000 * 60 * 10,
  });
  const { data: directions = [] } = useQuery({
    queryKey: ["directions", "options"],
    queryFn: () => fetchAllPages(API_ENDPOINTS.DIRECTIONS),
    staleTime: 1000 * 60 * 10,
  });
  const { data: sites = [] } = useQuery({
    queryKey: ["sites", "options"],
    queryFn: () => fetchAllPages(API_ENDPOINTS.SITES),
    staleTime: 1000 * 60 * 10,
  });
  const { data: salles = [] } = useQuery({
    queryKey: ["salles", "options"],
    queryFn: () => fetchAllPages(API_ENDPOINTS.SALLES),
    staleTime: 1000 * 60 * 10,
  });

  const validerMutation = useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.post(`${API_ENDPOINTS.INVENTAIRES}${id}/valider/`);
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["inventaires"] });
      queryClient.invalidateQueries({ queryKey: ["inventaire", id] });
    },
  });

  const lieuOptions = useMemo(() => {
    const base = [{ value: "", label: "Tous" }];
    const avecIcone = (Icon, texte, precision) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Icon fontSize="small" />
        {texte}
        {precision && (
          <Typography variant="caption" color="text.secondary">
            ({precision})
          </Typography>
        )}
      </Box>
    );

    if (lieuTypeFiltre === "magasin") {
      return [
        ...base,
        ...magasins.map((m) => ({
          value: m.magasin_id,
          label: avecIcone(StoreIcon, m.magasin_nom, m.localite_nom),
        })),
      ];
    }
    if (lieuTypeFiltre === "direction") {
      return [
        ...base,
        ...directions.map((d) => ({ value: d.dir_id, label: avecIcone(BusinessIcon, d.dir_libelle) })),
      ];
    }
    if (lieuTypeFiltre === "site") {
      return [
        ...base,
        ...sites.map((s) => ({ value: s.site_id, label: avecIcone(LocationCityIcon, s.site_nom) })),
      ];
    }
    if (lieuTypeFiltre === "salle") {
      return [
        ...base,
        ...salles.map((s) => ({ value: s.salle_id, label: avecIcone(MeetingRoomIcon, s.nom) })),
      ];
    }
    return base;
  }, [lieuTypeFiltre, magasins, directions, sites, salles]);

  const reinitialiserFiltres = () => {
    setStatutFiltre("");
    setLieuTypeFiltre("");
    setLieuIdFiltre("");
    resetPage();
  };

  // Les lignes de l'inventaire sont chargées par le modal lui-même, à l'ouverture
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
      getText: (row) => formatDateTime(row.date_creation),
      renderCell: (params) => formatDateTime(params.value),
    },
    {
      field: "code_reference",
      headerName: "Référence",
      autoGrow: false,
      autoExtraWidth: 16,
      renderCell: (params) => (params.value ? <CodeChip value={params.value} /> : <EmptyValue />),
    },
    {
      field: "lieu_nom",
      headerName: "Lieu",
      autoExtraWidth: 36,
      renderCell: (params) => {
        const meta = getLieuMeta(params.row);
        const { Icon } = meta;
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            <Icon fontSize="small" color={meta.color === "default" ? "action" : meta.color} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {params.value || "—"}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                component="div"
                sx={{ lineHeight: 1.2 }}
              >
                {meta.label}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "nb_lignes",
      headerName: "Articles",
      headerAlign: "center",
      align: "center",
      autoGrow: false,
      getText: (row) => String(getNbLignes(row)),
      renderCell: (params) => getNbLignes(params.row),
    },
    {
      field: "statut",
      headerName: "Statut",
      autoGrow: false,
      autoExtraWidth: 40,
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
            onView={() => setSelectedSession(session)}
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
        actionLabel="Réalisation de l'inventaire"
        onAction={() => navigate("/inventaire/sessions/realisation")}
        canAction={canManageInventaire}
        onReset={reinitialiserFiltres}
        hasFilters={Boolean(statutFiltre || lieuTypeFiltre || lieuIdFiltre)}
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
        loading={isLoading || isPlaceholderData}
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
        isOpen={Boolean(selectedSession)}
        onClose={() => setSelectedSession(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["inventaires"] })}
      />
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
}
