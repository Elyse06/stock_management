import { useState, useMemo } from "react";
import { Box } from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
import { usePagination } from "../../../hooks/usePagination";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { usePermission } from "../../../hooks/usePermission";
import { useNotification } from "../../../components/common/NotificationProvider";
import { PageHeader } from "../../../components/common/PageHeader";
import { ErrorAlert } from "../../../components/common/ErrorAlert";
import { StatusChip } from "../../../components/common/StatusChip";
import { ActionButtons } from "../../../components/common/ActionButtons";
import { SelectFilter } from "../../../components/common/SelectFilter";
import { PaginatedDataGrid } from "../../../components/common/PaginatedDataGrid";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { CommandeFormModal } from "../components/CommandeFormModal";
import { CommandeDetailModal } from "../components/CommandeDetailModal";
import { formatDateTime } from "../../../utils/formatters";

const STATUTS = [
  { value: "", label: "Tous statuts" },
  { value: "EN_ATTENTE", label: "En attente" },
  { value: "EN_COURS", label: "En cours" },
  { value: "VALIDEE", label: "Validée" },
  { value: "REJETEE", label: "Rejetée" },
];

const PERIODES = [
  { value: "tous", label: "Toutes les commandes" },
  { value: "semaine", label: "Cette semaine" },
  { value: "mois", label: "Ce mois" },
  { value: "annee", label: "Cette année" },
];

function getDateRangeForPeriode(periodeId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (periodeId === "tous") return { debut: null, fin: null };
  if (periodeId === "semaine") {
    const debut = new Date(today);
    const jour = debut.getDay();
    debut.setDate(debut.getDate() - (jour === 0 ? 6 : jour - 1));
    const fin = new Date(debut);
    fin.setDate(fin.getDate() + 6);
    fin.setHours(23, 59, 59, 999);
    return { debut, fin };
  }
  if (periodeId === "mois") {
    const debut = new Date(today.getFullYear(), today.getMonth(), 1);
    const fin = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    fin.setHours(23, 59, 59, 999);
    return { debut, fin };
  }
  if (periodeId === "annee") {
    const debut = new Date(today.getFullYear(), 0, 1);
    const fin = new Date(today.getFullYear(), 11, 31);
    fin.setHours(23, 59, 59, 999);
    return { debut, fin };
  }
  return { debut: null, fin: null };
}

export function CommandesPage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const { paginationModel, setPaginationModel, resetPage } = usePagination(25);
  const { canCreateCommande, canValidateCommande, canManageCatalogue } = usePermission();

  const isAgentPrincipal = canManageCatalogue && canValidateCommande;
  const isAgentSecondaire = !canManageCatalogue && canValidateCommande;
  const isDemandeur = canCreateCommande && !canValidateCommande;

  const [statutFiltre, setStatutFiltre] = useState("");
  const [periodeFiltre, setPeriodeFiltre] = useState("tous");
  const [commandeToEdit, setCommandeToEdit] = useState(null);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["commandes", { page: paginationModel.page + 1, pageSize: paginationModel.pageSize, statut: statutFiltre }],
    queryFn: async () => {
      const params = { page: paginationModel.page + 1, page_size: paginationModel.pageSize };
      if (statutFiltre) params.statut = statutFiltre;

      const { data } = await apiClient.get(API_ENDPOINTS.COMMANDES, { params });
      return {
        commandes: data.results ?? data,
        totalCount: data.count ?? (data.results ?? data).length,
      };
    },
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`${API_ENDPOINTS.COMMANDES}${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commandes"] });
    },
  });

  const commandesFiltrees = useMemo(() => {
    const allCommandes = data?.commandes || [];
    const { debut, fin } = getDateRangeForPeriode(periodeFiltre);
    if (!debut || !fin) return allCommandes;

    return allCommandes.filter((commande) => {
      const commandeDate = new Date(commande.date_commande);
      commandeDate.setHours(0, 0, 0, 0);
      return commandeDate >= debut && commandeDate <= fin;
    });
  }, [data?.commandes, periodeFiltre]);

  const openFormModalForCreate = () => {
    setCommandeToEdit(null);
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setCommandeToEdit(null);
  };

  const openDetailModal = async (commande) => {
    try {
      const { data } = await apiClient.get(`${API_ENDPOINTS.COMMANDES}${commande.commande_id}/`);
      setSelectedCommande(data);
      setIsDetailModalOpen(true);
    } catch {
      notify.error("Impossible de charger les détails de la commande.");
    }
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedCommande(null);
  };

  const handleDelete = (commande) => {
    confirm(
      "Supprimer la commande",
      `Êtes-vous sûr de vouloir supprimer la commande #${commande.commande_id} ?`,
      async () => {
        try {
          await deleteMutation.mutateAsync(commande.commande_id);
          notify.success("Commande supprimée avec succès");
        } catch {
          notify.error("Suppression impossible (commande probablement traitée ou référencée).");
        }
      }
    );
  };

  const columns = [
    {
      field: "date_commande",
      headerName: "Date demande",
      width: 160,
      renderCell: (params) => formatDateTime(params.value),
    },
    {
      field: "demandeur",
      headerName: "Demandeur",
      width: 180,
      renderCell: (params) => params.row?.demandeur?.nom || params.row?.employe_demandeur || "—",
    },
    {
      field: "article_designation",
      headerName: "Articles",
      width: 700,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const articles = params.row.details
          ?.map(
            (detail) =>
              detail.article_designation ??
              detail.article?.designation ??
              detail.designation
          )
          .filter(Boolean)
          .join(", ");

        return articles || <EmptyValue />;
      },
    },
    {
      field: "statut",
      headerName: "Statut",
      width: 140,
      renderCell: (params) => {
        const statusValue = params.value === "VALIDEE" ? "TRAITE" : params.value;
        return <StatusChip status={statusValue} />;
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 200,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const commande = params.row;
        const peutTraiter =
          (isAgentPrincipal && commande.statut === "EN_COURS") ||
          (isAgentSecondaire && commande.statut === "EN_ATTENTE");
        const peutSupprimer = isDemandeur && commande.statut === "EN_ATTENTE";

        return (
          <ActionButtons
            onView={() => openDetailModal(commande)}
            onValidate={peutTraiter ? () => openDetailModal(commande) : null}
            onDelete={peutSupprimer ? () => handleDelete(commande) : null}
            canValidate={peutTraiter}
            canDelete={peutSupprimer}
          />
        );
      },
    },
  ];

  return (
    <Box>
      <PageHeader
        actionLabel="Nouvelle demande"
        onAction={openFormModalForCreate}
        canAction={canCreateCommande}
        onReset={() => {
          setStatutFiltre("");
          setPeriodeFiltre("tous");
        }}
        hasFilters={statutFiltre || periodeFiltre !== "tous"}
      >
        <SelectFilter
          label="Période"
          value={periodeFiltre}
          onChange={(value) => {
            setPeriodeFiltre(value);
            resetPage();
          }}
          options={PERIODES}
          minWidth={200}
        />
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
      </PageHeader>
      <ErrorAlert error={error?.message} />

      <PaginatedDataGrid
        rows={commandesFiltrees}
        columns={columns}
        loading={isLoading}
        rowCount={data?.totalCount || 0}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={(row) => row.commande_id}
        noRowsLabel="Aucune commande trouvée"
      />

      <CommandeFormModal
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["commandes"] })}
        commandeToEdit={commandeToEdit}
      />
      <CommandeDetailModal
        commande={selectedCommande}
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["commandes"] })}
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