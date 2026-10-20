import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

import { ErrorAlert } from "@/components/feedback/ErrorAlert";
import { SearchField } from "@/components/forms/SearchField";
import { SelectFilter } from "@/components/forms/SelectFilter";
import { TypeArticleFilter } from "@/components/forms/TypeArticleFilter";
import { PaginationBar } from "@/components/table/PaginationBar";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { MouvementFormModal } from "@/features/mouvements/components/MouvementFormModal";
import { getErrorMessage } from "@/lib/api/errors";

import { optionsMois } from "../constants/kpis";
import { useKPIDetail } from "../hooks/useKPIDetail";

import { KPITable } from "./kpi/KPITable";

const FERME = { open: false, article: null, quantite: 1 };

/** Détail d'un indicateur du tableau de bord. */
export function KPIDetailModal({ kpiType, isOpen, onClose }) {
  const navigate = useNavigate();
  const { canManageMouvements } = usePermission();
  const { config, list, search, setSearch, mois, setMois, typeArticle, setTypeArticle, totalQuantite } = useKPIDetail(kpiType, isOpen);
  const [entree, setEntree] = useState(FERME);

  if (!config) return null;
  const { Icon } = config;

  // Créer une entrée de stock exige INV_GERE (règle du backend).
  const onAction =
    config.action === "view_article"
      ? (row) => {
          navigate(`/catalogue/articles/${encodeURIComponent(row.code_article)}`);
          onClose();
        }
      : config.action === "create_entree" && canManageMouvements
        ? (row) => setEntree({ open: true, article: row.code_article, quantite: row.quantite_suggeree || 1 })
        : null;

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} maxWidth="lg" fullWidth slotProps={{ paper: { sx: { borderRadius: 2 } } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#FFF8E1", borderBottom: "2px solid", borderColor: "primary.main" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Icon />
            <Typography variant="h3" component="span">
              {config.title}
            </Typography>
            {config.badge && <Chip label={config.badge.label} sx={{ bgcolor: config.badge.color, color: "white", fontWeight: 600 }} size="small" />}
          </Box>
          <IconButton onClick={onClose} size="small" aria-label="Fermer">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <ErrorAlert error={list.error && getErrorMessage(list.error)} />
          <Box sx={{ display: "flex", gap: 2, mb: 2, mt: 1, flexWrap: "wrap" }}>
            {config.searchable && <SearchField value={search} onChange={setSearch} />}
            <TypeArticleFilter value={typeArticle} onChange={setTypeArticle} />
            {config.parMois && <SelectFilter label="Mois" value={mois} onChange={setMois} options={optionsMois()} minWidth={200} />}
          </Box>
          {config.showTotal && totalQuantite > 0 && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: "#FFF8E1", borderRadius: 1, border: "1px solid #F9A825", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2" fontWeight={600}>
                Total de la période
              </Typography>
              <Typography variant="h4" fontWeight={700} fontFamily="monospace" color="primary.main">
                {totalQuantite}
              </Typography>
            </Box>
          )}
          <Box sx={{ border: "1px solid #E0E0E0", borderRadius: 1, overflowX: "auto" }}>
            <KPITable config={config} rows={list.rows} loading={list.loading} onAction={onAction} />
          </Box>
          <PaginationBar count={list.rowCount} paginationModel={list.paginationModel} onPaginationModelChange={list.setPaginationModel} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} variant="contained">
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      <MouvementFormModal
        isOpen={entree.open}
        onClose={() => setEntree(FERME)}
        preselectedArticle={entree.article}
        preselectedQuantite={entree.quantite}
      />
    </>
  );
}
