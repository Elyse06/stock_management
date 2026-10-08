import { useState } from "react";
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography, Button,
} from "@mui/material";
import { 
  Search as SearchIcon, Person as PersonIcon, Business as BusinessIcon, 
  LocationCity as LocationCityIcon, MeetingRoom as MeetingRoomIcon,
  Print as PrintIcon,
} from "@mui/icons-material";
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
import { EtiquetteModal } from "../components/EtiquetteModal";

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
  const [isEtiquetteModalOpen, setIsEtiquetteModalOpen] = useState(false);
  
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
      width: 270,
      renderCell: (params) => {
        const row = params.row;
        const nom = row.employe_attribue_nom || "—";
        const type = row.beneficiaire_type;
        
        const Icon = type === "EMPLOYE"
          ? PersonIcon
          : type === "SITE"
            ? LocationCityIcon
            : type === "SALLE"
              ? MeetingRoomIcon
              : BusinessIcon;
        const iconColor = type === "EMPLOYE"
          ? "#1976D2"
          : type === "SITE"
            ? "#E65100"
            : type === "SALLE"
              ? "#0288D1"
              : "#7B1FA2";
        
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
      width: 220,
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
          <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
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
              sx={{ 
                minWidth: 0, 
                px: 1,
                borderColor: "primary.main",
                color: "primary.main",
                "&:hover": { bgcolor: "#FFF8E1" }
              }}
              title="Imprimer l'étiquette"
            >
              Étiquette
            </Button>
          </Box>
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
          <RetourStockModal unite={uniteSelectionnee} isOpen={isRetourModalOpen} onClose={closeModal} onSuccess={onSuccess} />
          <TransfertUniteModal unite={uniteSelectionnee} isOpen={isTransfertModalOpen} onClose={closeModal} onSuccess={onSuccess} />
          <EtiquetteModal unite={uniteSelectionnee} isOpen={isEtiquetteModalOpen} onClose={closeModal} /> {/* 🆕 */}
        </>
      )}
    </Box>
  );
}