import { useState } from "react";
import { Box, TextField, Typography } from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
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

const ETATS = [
  { value: "", label: "Tous les états" },
  { value: "BON", label: "Bon état" },
  { value: "MOYEN", label: "État moyen" },
  { value: "MAUVAIS", label: "Mauvais état" },
  { value: "HORS_USAGE", label: "Hors usage" },
  { value: "PERDU", label: "Perdu" },
];

export function UnitesArticlePage() {
  const queryClient = useQueryClient();
  const { paginationModel, setPaginationModel, resetPage } = usePagination(25);
  const { canManageInventaire } = usePermission();

  const [search, setSearch] = useState("");
  const [statutFiltre, setStatutFiltre] = useState("");
  const [etatFiltre, setEtatFiltre] = useState("");
  const [articleFiltre, setArticleFiltre] = useState("");

  const [uniteSelectionnee, setUniteSelectionnee] = useState(null);
  const [isRetourModalOpen, setIsRetourModalOpen] = useState(false);
  const [isTransfertModalOpen, setIsTransfertModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "unites-article",
      {
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        search,
        statut: statutFiltre,
        etat: etatFiltre,
        article: articleFiltre,
      },
    ],
    queryFn: async () => {
      const params = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
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
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
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
    /* Implementter si on travail sur le numero de serie
    {
      field: "numero_de_serie",
      headerName: "N° Série",
      width: 150,
      renderCell: (params) => (
        <EmptyValue value={params.value} mono />
      ),
    },
    */
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
        {/**
        <SelectFilter
          label="État"
          value={etatFiltre}
          onChange={(value) => {
            setEtatFiltre(value);
            resetPage();
          }}
          options={ETATS}
          minWidth={150}
        />
        */}
      </PageHeader>
      <ErrorAlert error={error?.message} />

      <PaginatedDataGrid
        rows={data?.unites || []}
        columns={columns}
        loading={isLoading}
        rowCount={data?.totalCount || 0}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={(row) => row.unite_id}
        noRowsLabel="Aucune unité trouvée"
      />

      {uniteSelectionnee && (
        <>
          <RetourStockModal
            unite={uniteSelectionnee}
            isOpen={isRetourModalOpen}
            onClose={closeModal}
            onSuccess={onSuccess}
          />
          <TransfertUniteModal
            unite={uniteSelectionnee}
            isOpen={isTransfertModalOpen}
            onClose={closeModal}
            onSuccess={onSuccess}
          />
        </>
      )}
    </Box>
  );
}