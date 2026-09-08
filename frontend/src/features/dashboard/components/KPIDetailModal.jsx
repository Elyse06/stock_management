import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Close as CloseIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  Add as AddIcon,
  CalendarMonth as CalendarMonthIcon,
} from "@mui/icons-material";
import { useKPIModalData } from "../hooks/useKPIModalData";
import { MouvementFormModal } from "../../mouvement/components/MouvementFormModal";

// ====== CONFIGURATION DES KPIs ======
const KPI_CONFIG = {
  total_articles: {
    title: "Liste des articles",
    icon: <InventoryIcon />,
    endpoint: "/api/dashboard/kpis/articles/",
    columns: [
      { field: "code_article", label: "Code", width: 120 },
      { field: "designation", label: "Désignation", flex: 1 },
      { field: "categorie_nom", label: "Catégorie", width: 150 },
      { field: "stock_calcule", label: "Stock", width: 100, align: "center" },
    ],
    action: "view_article",
  },
  produits_en_rupture: {
    title: "Produits en rupture de stock",
    icon: <WarningIcon />,
    endpoint: "/api/dashboard/kpis/ruptures/",
    badge: { color: "error.main", label: "CRITIQUE" },
    columns: [
      { field: "code_article", label: "Code", width: 120 },
      { field: "designation", label: "Désignation", flex: 1 },
      { field: "categorie_nom", label: "Catégorie", width: 150 },
      { field: "dernier_mouvement", label: "Dernier mouvement", width: 150 },
    ],
    action: "create_entree",
  },
  produits_sous_seuil: {
    title: "Produits sous le seuil",
    icon: <WarningIcon />,
    endpoint: "/api/dashboard/kpis/sous-seuil/",
    badge: { color: "warning.main", label: "ATTENTION" },
    columns: [
      { field: "code_article", label: "Code", width: 120 },
      { field: "designation", label: "Désignation", flex: 1 },
      { field: "stock_calcule", label: "Stock", width: 80, align: "center" },
      { field: "seuil", label: "Seuil", width: 80, align: "center" },
      { field: "quantite_suggeree", label: "Qté suggérée", width: 120, align: "center" },
      { field: "niveau_urgence", label: "Urgence", width: 120 },
    ],
    action: "create_entree",
  },
  entrees_du_mois: {
    title: "Entrées du mois",
    icon: <ArrowDownwardIcon />,
    endpoint: "/api/dashboard/kpis/entrees-mois/",
    columns: [
      { field: "date", label: "Date", width: 150 },
      { field: "article_code", label: "Article", width: 120 },
      { field: "article_designation", label: "Désignation", flex: 1 },
      { field: "quantite", label: "Quantité", width: 100, align: "center" },
      { field: "magasin_destination", label: "Magasin", width: 150 },
    ],
    showTotal: true,
  },
  sorties_du_mois: {
    title: "Sorties du mois",
    icon: <ArrowUpwardIcon />,
    endpoint: "/api/dashboard/kpis/sorties-mois/",
    columns: [
      { field: "date", label: "Date", width: 150 },
      { field: "article_code", label: "Article", width: 120 },
      { field: "article_designation", label: "Désignation", flex: 1 },
      { field: "quantite", label: "Quantité", width: 100, align: "center" },
      { field: "beneficiaire", label: "Bénéficiaire", width: 150 },
    ],
    showTotal: true,
  },
};

// ====== COMPOSANT ======
export function KPIDetailModal({ kpiType, isOpen, onClose, onDashboardRefresh }) {
  const navigate = useNavigate();
  const config = KPI_CONFIG[kpiType];

  const [moisSelectionne, setMoisSelectionne] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const extraParams = {};
  if (kpiType === "entrees_du_mois" || kpiType === "sorties_du_mois") {
    extraParams.mois = moisSelectionne;
  }
  
  const {
    data,
    loading,
    error,
    pagination,
    rowCount,
    totalQuantite,
    search,
    goToNextPage,
    goToPrevPage,
    handleSearch,
    charger,
  } = useKPIModalData(kpiType, extraParams);

  // ✅ État pour le modal de création d'entrée
  const [mouvementModal, setMouvementModal] = useState({
    open: false,
    article: null,
    quantite: 1,
  });

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setMoisSelectionne(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    }
  }, [isOpen, kpiType]);

  const handleAction = (row) => {
    if (config.action === "view_article") {
      navigate(`/catalogue/articles/${row.code_article}`);
      onClose();
    } else if (config.action === "create_entree") {
      // ✅ Ouvre le MouvementFormModal avec l'article pré-rempli
      setMouvementModal({
        open: true,
        article: row.code_article,
        quantite: row.quantite_suggeree || 1,
      });
    }
  };

  const handleCloseMouvementModal = () => {
    setMouvementModal({ open: false, article: null, quantite: 1 });
  };

  const handleMouvementSuccess = () => {
    // Rafraîchir les données du KPI modal
    charger();
    // Rafraîchir le Dashboard parent (KPIs)
    if (onDashboardRefresh) onDashboardRefresh();
  };

  const getUrgencyColor = (niveau) => {
    switch (niveau) {
      case "critique": return "error";
      case "urgent": return "warning";
      case "attention": return "info";
      default: return "default";
    }
  };

  const getUrgencyLabel = (niveau) => {
    switch (niveau) {
      case "critique": return "Critique";
      case "urgent": return "Urgent";
      case "attention": return "Attention";
      default: return niveau;
    }
  };

  if (!config) return null;

  return (
    <>
      {/* ====== MODAL DÉTAIL KPI ====== */}
      <Dialog
        open={isOpen}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "#FFF8E1",
            borderBottom: "2px solid",
            borderColor: "primary.main",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {config.icon}
            <Typography variant="h3">{config.title}</Typography>
            {config.badge && (
              <Chip
                label={config.badge.label}
                sx={{ bgcolor: config.badge.color, color: "white", fontWeight: 600 }}
                size="small"
              />
            )}
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          {error && (
            <Alert severity="error" onClose={() => {}} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Barre de recherche */}
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
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
            
            {/* ✅ Sélecteur de mois pour Entrées/Sorties */}
            {(kpiType === "entrees_du_mois" || kpiType === "sorties_du_mois") && (
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <CalendarMonthIcon fontSize="small" />
                    <span>Mois</span>
                  </Box>
                </InputLabel>
                <Select
                  value={moisSelectionne}
                  label="Mois"
                  onChange={(e) => {
                    setMoisSelectionne(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                >
                  {/* Générer les 12 derniers mois + 3 mois futurs */}
                  {Array.from({ length: 15 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - 6 + i);
                    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
                    const label = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
                    return (
                      <MenuItem key={value} value={value}>
                        {label.charAt(0).toUpperCase() + label.slice(1)}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            )}
          </Box>

          {config.showTotal && totalQuantite > 0 && (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: "#FFF8E1",
                borderRadius: 1,
                border: "1px solid #F9A825",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="body2" fontWeight={600}>
                Total de la période
              </Typography>
              <Typography
                variant="h4"
                fontWeight={700}
                fontFamily="monospace"
                color="primary.main"
              >
                {totalQuantite}
              </Typography>
            </Box>
          )}

          <Box sx={{ border: "1px solid #E0E0E0", borderRadius: 1, overflow: "hidden" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {config.columns.map((col) => (
                    <TableCell
                      key={col.field}
                      sx={{
                        bgcolor: "#FFF8E1",
                        fontWeight: 600,
                        borderBottom: "2px solid #F9A825",
                        width: col.width,
                        textAlign: col.align || "left",
                      }}
                    >
                      {col.label}
                    </TableCell>
                  ))}
                  {config.action && (
                    <TableCell
                      sx={{
                        bgcolor: "#FFF8E1",
                        fontWeight: 600,
                        borderBottom: "2px solid #F9A825",
                        width: 100,
                        textAlign: "center",
                      }}
                    >
                      Action
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={config.columns.length + (config.action ? 1 : 0)}
                      align="center"
                      sx={{ py: 4 }}
                    >
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={config.columns.length + (config.action ? 1 : 0)}
                      align="center"
                      sx={{ py: 4 }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Aucune donnée disponible
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row, idx) => (
                    <TableRow key={idx} sx={{ "&:hover": { bgcolor: "#FFFDE7" } }}>
                      {config.columns.map((col) => (
                        <TableCell key={col.field} sx={{ textAlign: col.align || "left" }}>
                          {col.field === "code_article" || col.field === "article_code" ? (
                            <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                              {row[col.field]}
                            </Typography>
                          ) : col.field === "niveau_urgence" ? (
                            <Chip
                              label={getUrgencyLabel(row[col.field])}
                              color={getUrgencyColor(row[col.field])}
                              size="small"
                            />
                          ) : col.field === "dernier_mouvement" || col.field === "date" ? (
                            <Typography variant="body2">
                              {row[col.field]
                                ? new Date(row[col.field]).toLocaleString("fr-FR", {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Jamais"}
                            </Typography>
                          ) : col.field === "stock_calcule" || col.field === "quantite" || col.field === "quantite_suggeree" ? (
                            <Typography variant="body2" fontWeight={700} fontFamily="monospace">
                              {row[col.field]}
                            </Typography>
                          ) : (
                            <Typography variant="body2">
                              {row[col.field] ?? "—"}
                            </Typography>
                          )}
                        </TableCell>
                      ))}
                      {config.action && (
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleAction(row)}
                          >
                            {config.action === "view_article" ? (
                              <VisibilityIcon fontSize="small" />
                            ) : (
                              <AddIcon fontSize="small" />
                            )}
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {rowCount} élément(s)
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                disabled={pagination.page <= 1}
                onClick={goToPrevPage}
              >
                Précédent
              </Button>
              <Typography variant="body2" sx={{ px: 2, py: 0.5 }}>
                Page {pagination.page}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                disabled={data.length < pagination.pageSize}
                onClick={goToNextPage}
              >
                Suivant
              </Button>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} variant="contained">
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* ====== MODAL CRÉATION D'ENTRÉE ====== */}
      <MouvementFormModal
        isOpen={mouvementModal.open}
        onClose={handleCloseMouvementModal}
        onSuccess={handleMouvementSuccess}
        preselectedArticle={mouvementModal.article}
        preselectedQuantite={mouvementModal.quantite}
      />
    </>
  );
}