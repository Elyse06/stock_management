import { useState } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Button,
  Chip,
  IconButton,
} from "@mui/material";
import {
  Search as SearchIcon,
  Print as PrintIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS } from "../../../constants/api";
import { usePagination } from "../../../hooks/usePagination";
import { usePermission } from "../../../hooks/usePermission";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { PageHeader } from "../../../components/common/PageHeader";
import { ErrorAlert } from "../../../components/common/ErrorAlert";
import { ActionButtons } from "../../../components/common/ActionButtons";
import { SelectFilter } from "../../../components/common/SelectFilter";
import { PaginatedDataGrid } from "../../../components/common/PaginatedDataGrid";
import { EtatBadge } from "../../../components/common/EtatBadge";
import { CodeChip } from "../../../components/common/CodeChip";
import { EmptyValue } from "../../../components/common/EmptyValue";
import { BeneficiaireTag } from "../../../components/common/BeneficiaireTag";
import { getBeneficiaireMeta } from "../../../utils/beneficiaireMeta";
import { RetourStockModal } from "../components/RetourStockModal";
import { TransfertUniteModal } from "../components/TransfertUniteModal";
import { EtiquetteModal } from "../components/EtiquetteModal";

const ETATS_RESUME = [
  { value: "BON", label: "Bon" },
  { value: "MOYEN", label: "Moyen" },
  { value: "MAUVAIS", label: "Mauvais" },
  { value: "HORS_USAGE", label: "Hors usage" },
  { value: "PERDU", label: "Perdu" },
];

const TYPES_BENEFICIAIRE = [
  { value: "", label: "Tous" },
  { value: "EMPLOYE", label: "Employés" },
  { value: "DIRECTION", label: "Directions" },
  { value: "SITE", label: "Sites" },
  { value: "SALLE", label: "Salles" },
];

const OPTIONS_ETAT = [{ value: "", label: "Tous les états" }, ...ETATS_RESUME];

export function UnitesArticlePage() {
  const queryClient = useQueryClient();
  const { paginationModel, setPaginationModel, resetPage } = usePagination(20);
  const { canManageInventaire } = usePermission();

  const [searchInput, setSearchInput] = useState("");
  const [typeFiltre, setTypeFiltre] = useState("");
  const [etatFiltre, setEtatFiltre] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 400);

  const [uniteSelectionnee, setUniteSelectionnee] = useState(null);
  const [isRetourModalOpen, setIsRetourModalOpen] = useState(false);
  const [isTransfertModalOpen, setIsTransfertModalOpen] = useState(false);
  const [isEtiquetteModalOpen, setIsEtiquetteModalOpen] = useState(false);

  const { data, isLoading, isPlaceholderData, error } = useQuery({
    queryKey: [
      "unites-article",
      {
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        search,
        type: typeFiltre,
        etat: etatFiltre,
      },
    ],
    queryFn: async () => {
      const params = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
        statut: "ATTRIBUE",
      };
      if (search) params.search = search;
      if (typeFiltre) params.beneficiaire_type = typeFiltre;
      if (etatFiltre) params.etat = etatFiltre;

      const { data } = await apiClient.get(API_ENDPOINTS.UNITES_ARTICLE, { params });
      return {
        unites: data.results ?? data,
        totalCount: data.count ?? (data.results ?? data).length,
      };
    },
    placeholderData: keepPreviousData,
  });

  const {
    data: resumeStock = [],
    isLoading: isLoadingResume,
    error: resumeError,
  } = useQuery({
    queryKey: ["unites-article-resume-stock"],
    queryFn: async () => {
      const { data: resume } = await apiClient.get(API_ENDPOINTS.RESUME_STOCK_UNITES);
      return resume;
    },
  });

  // ---- Filtres ----
  const changerRecherche = (value) => {
    setSearchInput(value);
    resetPage();
  };
  const changerType = (value) => {
    setTypeFiltre(value);
    resetPage();
  };
  const changerEtat = (value) => {
    setEtatFiltre(value);
    resetPage();
  };
  const reinitialiser = () => {
    setSearchInput("");
    setTypeFiltre("");
    setEtatFiltre("");
    resetPage();
  };

  // ---- Modals ----
  const handleRetour = (unite) => {
    setUniteSelectionnee(unite);
    setIsRetourModalOpen(true);
  };
  const handleTransfert = (unite) => {
    setUniteSelectionnee(unite);
    setIsTransfertModalOpen(true);
  };
  const handleImprimerEtiquette = (unite) => {
    setUniteSelectionnee(unite);
    setIsEtiquetteModalOpen(true);
  };
  const closeModal = () => {
    setUniteSelectionnee(null);
    setIsRetourModalOpen(false);
    setIsTransfertModalOpen(false);
    setIsEtiquetteModalOpen(false);
  };
  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["unites-article"] });
    queryClient.invalidateQueries({ queryKey: ["unites-article-resume-stock"] });
    closeModal();
  };

  const columns = [
    {
      field: "beneficiaire_type",
      headerName: "Bénéficiaire",
      getText: (row) => row.employe_attribue_nom || "—",
      autoExtraWidth: 36,
      renderCell: (params) => (
        <BeneficiaireTag
          type={params.row.beneficiaire_type}
          nom={params.row.employe_attribue_nom}
          onClick={
            params.row.employe_attribue_nom
              ? () => changerRecherche(params.row.employe_attribue_nom)
              : undefined
          }
        />
      ),
    },
    {
      field: "article_designation",
      headerName: "Article",
      renderCell: (params) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap>
            {params.value}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            fontFamily="monospace"
            component="div"
            sx={{ lineHeight: 1.2 }}
          >
            {params.row.article_code}
          </Typography>
        </Box>
      ),
    },
    {
      field: "etat",
      headerName: "État",
      autoGrow: false,
      autoExtraWidth: 56,
      renderCell: (params) => <EtatBadge etat={params.value} />,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 220,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const unite = params.row;
        const peutRetourner =
          canManageInventaire && unite.statut === "ATTRIBUE" && unite.etat !== "PERDU";
        const peutTransferer =
          canManageInventaire &&
          unite.statut === "ATTRIBUE" &&
          unite.etat !== "HORS_USAGE" &&
          unite.etat !== "PERDU";

        return (
          <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center", alignItems: "center" }}>
            <ActionButtons
              onAction1={peutRetourner ? () => handleRetour(unite) : null}
              action1Label="Retour"
              onAction2={peutTransferer ? () => handleTransfert(unite) : null}
              action2Label="Transfert"
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<PrintIcon fontSize="small" />}
              onClick={() => handleImprimerEtiquette(unite)}
              sx={{ minWidth: 0, px: 1, "&:hover": { bgcolor: "tint.main" } }}
              title="Imprimer l'étiquette"
            >
              Étiquette
            </Button>
          </Box>
        );
      },
    },
  ];

  const total = data?.totalCount ?? 0;

  return (
    <Box>
      <PageHeader
        onReset={reinitialiser}
        hasFilters={Boolean(searchInput || typeFiltre || etatFiltre)}
      >
        <TextField
          placeholder="Bénéficiaire, article, n° de série..."
          value={searchInput}
          onChange={(e) => changerRecherche(e.target.value)}
          size="small"
          sx={{ flex: { sm: 1 }, minWidth: { sm: 260 } }}
          slotProps={{
            input: {
              startAdornment: (
                <SearchIcon fontSize="small" sx={{ color: "text.secondary", mr: 1 }} />
              ),
              endAdornment: searchInput ? (
                <IconButton size="small" onClick={() => changerRecherche("")}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              ) : null,
            },
          }}
        />
        <SelectFilter
          label="État"
          value={etatFiltre}
          onChange={changerEtat}
          options={OPTIONS_ETAT}
          minWidth={160}
        />
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", width: { xs: "100%", md: "auto" } }}>
          {TYPES_BENEFICIAIRE.map(({ value, label }) => {
            const selected = typeFiltre === value;
            const Icon = value ? getBeneficiaireMeta(value).Icon : null;
            return (
              <Chip
                key={value || "tous"}
                label={label}
                size="small"
                icon={Icon ? <Icon /> : undefined}
                clickable
                onClick={() => changerType(value)}
                color={selected ? "primary" : "default"}
                variant={selected ? "filled" : "outlined"}
              />
            );
          })}
        </Box>
      </PageHeader>
      <ErrorAlert error={error?.message} />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.5fr) minmax(420px, 1fr)" },
          gap: 2,
          alignItems: "start",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 1 }}>
            <Typography variant="h3">Unités attribuées</Typography>
            <Chip label={`${total} unité(s)`} size="small" color="primary" variant="outlined" />
            {search && (
              <Chip
                label={`Recherche : « ${search} »`}
                size="small"
                onDelete={() => changerRecherche("")}
              />
            )}
            {typeFiltre && (
              <Chip
                label={getBeneficiaireMeta(typeFiltre).label}
                size="small"
                onDelete={() => changerType("")}
              />
            )}
            {etatFiltre && (
              <Chip
                label={ETATS_RESUME.find((e) => e.value === etatFiltre)?.label}
                size="small"
                onDelete={() => changerEtat("")}
              />
            )}
          </Box>

          <PaginatedDataGrid
            rows={data?.unites || []}
            columns={columns}
            loading={isLoading || isPlaceholderData}
            rowCount={total}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            getRowId={(row) => row.unite_id}
            noRowsLabel="Aucune unité attribuée"
          />
        </Box>

        <Paper variant="outlined" sx={{ overflow: "hidden", minWidth: 0 }}>
          <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="h3">Résumé des unités en stock</Typography>
            <Typography variant="body2" color="text.secondary">
              Répartition par état et par article
            </Typography>
          </Box>
          {resumeError ? (
            <Box sx={{ p: 2 }}>
              <Typography color="error">Impossible de charger le résumé.</Typography>
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: { xs: 420, lg: 600 } }}>
              <Table
                size="small"
                stickyHeader
                sx={{
                  "& .MuiTableCell-head": {
                    bgcolor: "tint.main",
                    fontWeight: 600,
                    borderBottom: "2px solid",
                    borderColor: "secondary.main",
                  },
                  "& .MuiTableBody-root .MuiTableRow-root:hover": { bgcolor: "tint.light" },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>Article</TableCell>
                    <TableCell align="right">Unités</TableCell>
                    {ETATS_RESUME.map(({ value, label }) => (
                      <TableCell key={value} align="right">
                        {label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoadingResume ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        Chargement...
                      </TableCell>
                    </TableRow>
                  ) : resumeStock.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        Aucune unité en stock
                      </TableCell>
                    </TableRow>
                  ) : (
                    resumeStock.map((resume) => (
                      <TableRow key={resume.article_code}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {resume.article_designation}
                          </Typography>
                          <CodeChip value={resume.article_code} />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {resume.total}
                        </TableCell>
                        {ETATS_RESUME.map(({ value }) => (
                          <TableCell key={value} align="right">
                            {resume.etats?.[value] ?? 0}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>

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
          <EtiquetteModal
            unite={uniteSelectionnee}
            isOpen={isEtiquetteModalOpen}
            onClose={closeModal}
          />
        </>
      )}
    </Box>
  );
}
