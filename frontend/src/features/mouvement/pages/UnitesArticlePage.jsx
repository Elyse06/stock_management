import { useState } from "react";
import { Box, TextField, Chip, Typography } from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS } from "../../../constants/api";
import { usePagination } from "../../../hooks/usePagination";
import { usePermission } from "../../../hooks/usePermission";
import { PageHeader } from "../../../components/common/PageHeader";
import { FilterBar } from "../../../components/common/FilterBar";
import { ErrorAlert } from "../../../components/common/ErrorAlert";
import { ActionButtons } from "../../../components/common/ActionButtons";
import { SelectFilter } from "../../../components/common/SelectFilter";
import { PaginatedDataGrid } from "../../../components/common/PaginatedDataGrid";
import { CodeChip } from "../../../components/common/CodeChip";
import { EmptyValue } from "../../../components/common/EmptyValue";
import { EtatBadge } from "../../../components/common/EtatBadge";
import { StatusChip } from "../../../components/common/StatusChip";
import { Person as PersonIcon, Business as BusinessIcon } from "@mui/icons-material";
import { RetourStockModal } from "../components/RetourStockModal";
import { TransfertUniteModal } from "../components/TransfertUniteModal";

const STATUTS = [
  { value: "", label: "Tous les statuts" },
  { value: "EN_STOCK", label: "En stock" },
  { value: "ATTRIBUE", label: "Attribué" },
];

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
      if (statutFiltre) params.statut = statutFiltre;
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
      field: "unite_id",
      headerName: "ID",
      width: 80,
      renderCell: (params) => (
        <Typography variant="body2" fontFamily="monospace">
          #{params.value}
        </Typography>
      ),
    },
    {
      field: "article_code",
      headerName: "Article",
      width: 130,
      renderCell: (params) => <CodeChip value={params.value} />,
    },
    {
      field: "article_designation",
      headerName: "Désignation",
      flex: 1,
      minWidth: 180,
    },
    {
      field: "numero_de_serie",
      headerName: "N° Série",
      width: 150,
      renderCell: (params) => (
        <EmptyValue value={params.value} mono />
      ),
    },
    {
      field: "statut",
      headerName: "Statut",
      width: 120,
      renderCell: (params) => <StatusChip status={params.value} type="unite" />,
    },
    {
      field: "etat",
      headerName: "État",
      width: 130,
      renderCell: (params) => <EtatBadge etat={params.value} />,
    },
    {
      field: "beneficiaire_type",
      headerName: "Bénéficiaire",
      width: 200,
      renderCell: (params) => {
        const row = params.row;
        const nom = row.employe_attribue_nom || "—";
        const type = row.beneficiaire_type;
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {type === "EMPLOYE" ? (
              <PersonIcon fontSize="small" color="primary" />
            ) : type === "DIRECTION" ? (
              <BusinessIcon fontSize="small" color="secondary" />
            ) : (
              <EmptyValue value={null} />
            )}
            <Typography variant="body2">{nom}</Typography>
          </Box>
        );
      },
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
        title="Unités d'article"
        subtitle="Gérez les unités individuelles (immobilisations)"
      />
      <ErrorAlert error={error?.message} />

      <FilterBar
        onReset={() => {
          setSearch("");
          setStatutFiltre("");
          setEtatFiltre("");
          setArticleFiltre("");
        }}
        hasFilters={Boolean(search || statutFiltre || etatFiltre || articleFiltre)}
      >
        <TextField
          placeholder="Rechercher (n° série, bénéficiaire...)"
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
          label="État"
          value={etatFiltre}
          onChange={(value) => {
            setEtatFiltre(value);
            resetPage();
          }}
          options={ETATS}
          minWidth={150}
        />
        <TextField
          placeholder="Code article"
          value={articleFiltre}
          onChange={(e) => {
            setArticleFiltre(e.target.value);
            resetPage();
          }}
          size="small"
          sx={{ minWidth: 150 }}
        />
      </FilterBar>

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