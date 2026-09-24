import { useState } from "react";
import {
  Box,
  TextField,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
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

const ETATS_RESUME = [
  { value: "BON", label: "Bon" },
  { value: "MOYEN", label: "Moyen" },
  { value: "MAUVAIS", label: "Mauvais" },
  { value: "HORS_USAGE", label: "Hors usage" },
  { value: "PERDU", label: "Perdu" },
];

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

  const { data: resumeStock = [], isLoading: isLoadingResume, error: resumeError } = useQuery({
    queryKey: ["unites-article-resume-stock"],
    queryFn: async () => {
      const unitesEnStock = [];
      let page = 1;
      let nextPage = true;

      while (nextPage) {
        const { data } = await apiClient.get(API_ENDPOINTS.UNITES_ARTICLE, {
          params: { page, statut: "EN_STOCK" },
        });
        unitesEnStock.push(...(data.results ?? data));
        nextPage = Boolean(data.next);
        page += 1;
      }

      const resumeParArticle = new Map();
      unitesEnStock.forEach((unite) => {
        if (!resumeParArticle.has(unite.article_code)) {
          resumeParArticle.set(unite.article_code, {
            article_code: unite.article_code,
            article_designation: unite.article_designation,
            total: 0,
            etats: Object.fromEntries(ETATS_RESUME.map(({ value }) => [value, 0])),
          });
        }

        const resume = resumeParArticle.get(unite.article_code);
        resume.total += 1;
        if (resume.etats[unite.etat] !== undefined) resume.etats[unite.etat] += 1;
      });

      return [...resumeParArticle.values()].sort((a, b) =>
        a.article_designation.localeCompare(b.article_designation)
      );
    },
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

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.5fr) minmax(420px, 1fr)" },
          gap: 2,
          alignItems: "start",
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Unités attribuées
          </Typography>
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

        <Paper variant="outlined" sx={{ overflow: "hidden" }}>
          <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="h6">Résumé des unités en stock</Typography>
            <Typography variant="body2" color="text.secondary">
              Répartition par état et par article
            </Typography>
          </Box>
          {resumeError ? (
            <Box sx={{ p: 2 }}>
              <Typography color="error">Impossible de charger le résumé.</Typography>
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Article</TableCell>
                    <TableCell align="right">Unités</TableCell>
                    {ETATS_RESUME.map(({ value, label }) => (
                      <TableCell key={value} align="right">{label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoadingResume ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">Chargement...</TableCell>
                    </TableRow>
                  ) : resumeStock.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">Aucune unité en stock</TableCell>
                    </TableRow>
                  ) : (
                    resumeStock.map((resume) => (
                      <TableRow key={resume.article_code} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{resume.article_designation}</Typography>
                          <Typography variant="caption" color="text.secondary">{resume.article_code}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{resume.total}</TableCell>
                        {ETATS_RESUME.map(({ value }) => (
                          <TableCell key={value} align="right">{resume.etats[value]}</TableCell>
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
        </>
      )}
    </Box>
  );
}