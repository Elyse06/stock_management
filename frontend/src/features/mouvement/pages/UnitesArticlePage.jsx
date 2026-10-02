import { useState } from "react";
import { Box, TextField, Typography } from "@mui/material";
import { Search as SearchIcon, Person as PersonIcon, Business as BusinessIcon, LocationCity as LocationCityIcon } from "@mui/icons-material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS } from "../../../constants/api";
import { usePagination } from "../../../hooks/usePagination";
import { usePermission } from "../../../hooks/usePermission";
import { PageHeader } from "../../../components/common/PageHeader";
import { ErrorAlert } from "../../../components/common/ErrorAlert";
import { ActionButtons } from "../../../components/common/ActionButtons";
import { PaginatedDataGrid } from "../../../components/common/PaginatedDataGrid";
import { EtatBadge } from "../../../components/common/EtatBadge";
import { RetourStockModal } from "../components/RetourStockModal";
import { TransfertUniteModal } from "../components/TransfertUniteModal";

export function UnitesArticlePage() {
  const queryClient = useQueryClient();
  const { paginationModel, setPaginationModel } = usePagination(25);
  const { canManageInventaire } = usePermission();
  const [search, setSearch] = useState("");
  const [statutFiltre, setStatutFiltre] = useState("");
  const [etatFiltre, setEtatFiltre] = useState("");
  const [articleFiltre, setArticleFiltre] = useState("");
  const [uniteSelectionnee, setUniteSelectionnee] = useState(null);
  const [isRetourModalOpen, setIsRetourModalOpen] = useState(false);
  const [isTransfertModalOpen, setIsTransfertModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["unites-article", {
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
      search,
      statut: statutFiltre,
      etat: etatFiltre,
      article: articleFiltre,
    }],
    queryFn: async () => {
      const params = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
        statut: "ATTRIBUE",
      };
      if (search) params.search = search;
      if (etatFiltre) params.etat = etatFiltre;
      if (articleFiltre) params.article = articleFiltre;

      const { data } = await apiClient.get(API_ENDPOINTS.UNITES_ARTICLE, { params });
      return {
        unites: data.results ?? data,
        totalCount: data.count ?? (data.results ?? data).length,
      };
    },
    keepPreviousData: true,
  });

  // ... (le reste du code pour resumeStock reste inchangé) ...

  const handleRetour = (unite) => {
    setUniteSelectionnee(unite);
    setIsRetourModalOpen(true);
  };

  const handleTransfert = (unite) => {
    setUniteSelectionnee(unite);
    setIsTransfertModalOpen(true);
  };

  const closeModal = () => {
    setUniteSelectionnee(null);
    setIsRetourModalOpen(false);
    setIsTransfertModalOpen(false);
  };

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["unites-article"] });
    closeModal();
  };

  const columns = [
    {
      field: "beneficiaire_type",
      headerName: "Bénéficiaire",
      width: 270,
      renderCell: (params) => {
        const row = params.row;
        const nom = row.employe_attribue_nom || "—";
        const type = row.beneficiaire_type;

        //  Icône et couleur selon le type
        const Icon = type === "EMPLOYE" ? PersonIcon : type === "SITE" ? LocationCityIcon : BusinessIcon;
        const iconColor = type === "EMPLOYE" ? "#1976D2" : type === "SITE" ? "#E65100" : "#7B1FA2";

        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Icon fontSize="small" sx={{ color: iconColor }} />
            <Typography variant="body2">{nom}</Typography>
          </Box>
        );
      },
    },
    {
      field: "article_designation",
      headerName: "Article",
      flex: 1,
      minWidth: 180,
    },
    {
      field: "etat",
      headerName: "État",
      width: 130,
      renderCell: (params) => <EtatBadge etat={params.value} />,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 160,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const unite = params.row;
        const peutRetourner = canManageInventaire && unite.statut === "ATTRIBUE" && unite.etat !== "PERDU";
        const peutTransferer = canManageInventaire && unite.statut === "ATTRIBUE" &&
          unite.etat !== "HORS_USAGE" && unite.etat !== "PERDU";

        return (
          <ActionButtons
            onAction1={peutRetourner ? () => handleRetour(unite) : null}
            action1Label="Retour"
            onAction2={peutTransferer ? () => handleTransfert(unite) : null}
            action2Label="Transfert"
          />
        );
      },
    },
  ];

  return (
    <Box>
      <PageHeader
        onReset={() => {
          setSearch("");
          setStatutFiltre("");
          setEtatFiltre("");
          setArticleFiltre("");
        }}
        hasFilters={Boolean(search || statutFiltre || etatFiltre || articleFiltre)}
      >
        <TextField
          placeholder="Rechercher (bénéficiaire...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ flex: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <SearchIcon fontSize="small" sx={{ color: "text.secondary", mr: 1 }} />
              ),
            },
          }}
        />
      </PageHeader>
      <ErrorAlert error={error?.message} />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.5fr) minmax(420px, 1fr)" }, gap: 2, alignItems: "start" }}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>Unités attribuées</Typography>
          <PaginatedDataGrid
            rows={data?.unites || []}
            columns={columns}
            loading={isLoading}
            rowCount={data?.totalCount || 0}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            getRowId={(row) => row.unite_id}
            noRowsLabel="Aucune unité attribuée"
          />
        </Box>
        {/* ... (le reste du code pour resumeStock reste inchangé) ... */}
      </Box>

      {uniteSelectionnee && (
        <>
          <RetourStockModal unite={uniteSelectionnee} isOpen={isRetourModalOpen} onClose={closeModal} onSuccess={onSuccess} />
          <TransfertUniteModal unite={uniteSelectionnee} isOpen={isTransfertModalOpen} onClose={closeModal} onSuccess={onSuccess} />
        </>
      )}
    </Box>
  );
}