import { Box, Typography, Divider, Chip } from "@mui/material";
import {
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  Label as LabelIcon,
  Straighten as StraightenIcon,
  Description as DescriptionIcon,
  QrCode as QrCodeIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { CodeChip } from "../../../components/common/CodeChip";
import { EmptyValue } from "../../../components/common/EmptyValue";

export function ArticleIdentityCard({ article, stocks_par_magasin }) {
  const stock_total = Object.values(stocks_par_magasin).reduce((sum, val) => {
    const quantite = typeof val === "object" && val !== null ? val.stock : val;
    return sum + (quantite || 0);
  }, 0);

  const est_en_rupture = stock_total === 0;
  const est_sous_seuil = stock_total > 0 && stock_total < article.seuil;

  return (
    <Box
      sx={{
        p: 2,
        border: "1px solid #E0E0E0",
        borderRadius: 1,
        bgcolor: "#FFFFFF",
        position: "sticky",
        top: 80,
      }}
    >
      {/* Code article */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          Code article
        </Typography>
        <CodeChip value={article.code_article} />
      </Box>

      {/* Catégorie */}
      {article.categorie && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <CategoryIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Catégorie
            </Typography>
          </Box>
          <Typography variant="body1" fontWeight={500}>
            {article.categorie}
          </Typography>
        </Box>
      )}

      {/* Marque */}
      {article.marque && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <LabelIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Marque
            </Typography>
          </Box>
          <Typography variant="body1">{article.marque}</Typography>
        </Box>
      )}

      {/* Unité */}
      {article.unite && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <StraightenIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Unité
            </Typography>
          </Box>
          <Typography variant="body1">{article.unite}</Typography>
        </Box>
      )}

      {/* Seuil */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Seuil de réapprovisionnement
        </Typography>
        <Typography variant="body1" fontWeight={600} fontFamily="monospace">
          {article.seuil}
        </Typography>
      </Box>

      {/* Description */}
      {article.description && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Description
          </Typography>
          <Box
            sx={{
              bgcolor: "#FAFAFA",
              p: 1.5,
              borderRadius: 1,
              border: "1px solid #E0E0E0",
            }}
          >
            <Typography variant="body2">{article.description}</Typography>
          </Box>
        </Box>
      )}

      {/* Code-barre */}
      {article.code_barre && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <QrCodeIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Code-barre
            </Typography>
          </Box>
          <Typography variant="body2" fontFamily="monospace">
            {article.code_barre}
          </Typography>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {/* STOCK TOTAL - KPI principal */}
      <Box
        sx={{
          p: 2,
          bgcolor: est_en_rupture ? "#FFEBEE" : "#FFF8E1",
          borderRadius: 1,
          border: `1px solid ${est_en_rupture ? "#D32F2F" : "#F9A825"}`,
          textAlign: "center",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            mb: 1,
          }}
        >
          <InventoryIcon color="primary" />
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            Stock total
          </Typography>
        </Box>
        <Typography
          variant="h2"
          fontWeight={700}
          fontFamily="monospace"
          color={est_en_rupture ? "error.main" : "primary.main"}
        >
          {stock_total}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {article.unite || "unités"}
        </Typography>

        {/* Badges de statut */}
        <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mt: 1.5 }}>
          {est_en_rupture && (
            <Chip
              icon={<WarningIcon />}
              label="En rupture"
              color="error"
              size="small"
            />
          )}
          {est_sous_seuil && (
            <Chip
              icon={<WarningIcon />}
              label="Sous seuil"
              color="warning"
              size="small"
            />
          )}
        </Box>
      </Box>

      {/* Répartition par magasin */}
      {Object.keys(stocks_par_magasin).length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1, fontWeight: 600 }}
          >
            Répartition par magasin
          </Typography>
          {Object.entries(stocks_par_magasin).map(([magasin, stockData]) => (
            <Box
              key={magasin}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                py: 0.5,
                borderBottom: "1px solid #E0E0E0",
              }}
            >
              <Typography variant="body2">{magasin}</Typography>
              <Typography
                variant="body2"
                fontWeight={600}
                fontFamily="monospace"
              >
                {typeof stockData === "object" && stockData !== null
                  ? stockData.stock
                  : stockData}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}