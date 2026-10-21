import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { Download as DownloadIcon, Inventory as InventoryIcon } from "@mui/icons-material";

/** En-tête de l'historique d'un article : identité, stock actuel, export. */
export function ArticleHistoriqueBandeau({ article, stockActuel, onExport, exporting, exportDisabled }) {
  return (
    <Box
      sx={{
        mb: 2,
        p: 2,
        bgcolor: "#FFF8E1",
        borderRadius: 1,
        border: "1px solid #F9A825",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <InventoryIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="body2" color="text.secondary">
            Article
          </Typography>
          <Typography variant="h3" fontWeight={700}>
            {article.designation}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {article.code_article}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ textAlign: "right" }}>
        <Typography variant="body2" color="text.secondary">
          Stock actuel
        </Typography>
        <Typography variant="h3" fontWeight={700} fontFamily="monospace" color="primary.main">
          {stockActuel}
        </Typography>
      </Box>
      <Button
        variant="contained"
        startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
        onClick={onExport}
        disabled={exporting || exportDisabled}
      >
        {exporting ? "Export..." : "Export Excel"}
      </Button>
    </Box>
  );
}
