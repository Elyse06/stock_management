import { Box, Typography } from "@mui/material";

export function InventaireStatsCards({ nbArticles, nbEcarts, ecartTotal }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2, mb: 3 }}>
      <Box sx={{ p: 2, bgcolor: "#FAFAFA", borderRadius: 1, border: "1px solid #E0E0E0", textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">Articles comptés</Typography>
        <Typography variant="h2" color="primary.main">{nbArticles}</Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: "#FAFAFA", borderRadius: 1, border: "1px solid #E0E0E0", textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">Articles avec écart</Typography>
        <Typography variant="h2" color={nbEcarts > 0 ? "error.main" : "success.main"}>{nbEcarts}</Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: "#FAFAFA", borderRadius: 1, border: "1px solid #E0E0E0", textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">Écart total</Typography>
        <Typography variant="h2" sx={{ color: ecartTotal === 0 ? "success.main" : "error.main" }}>
          {ecartTotal > 0 ? `+${ecartTotal}` : ecartTotal}
        </Typography>
      </Box>
    </Box>
  );
}