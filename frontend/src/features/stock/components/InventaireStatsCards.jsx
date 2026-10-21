import { Box, Typography } from "@mui/material";

function StatCard({ label, children }) {
  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2 },
        bgcolor: "#FAFAFA",
        borderRadius: 1,
        border: "1px solid #E0E0E0",
        textAlign: "center",
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: 11, sm: 13 } }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

export function InventaireStatsCards({ nbArticles, nbEcarts, ecartTotal }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: { xs: 1, sm: 2 },
        mb: 3,
      }}
    >
      <StatCard label="Articles comptés">
        <Typography variant="h2" color="primary.main">
          {nbArticles}
        </Typography>
      </StatCard>
      <StatCard label="Articles avec écart">
        <Typography variant="h2" color={nbEcarts > 0 ? "error.main" : "success.main"}>
          {nbEcarts}
        </Typography>
      </StatCard>
      <StatCard label="Écart total">
        <Typography variant="h2" sx={{ color: ecartTotal === 0 ? "success.main" : "error.main" }}>
          {ecartTotal > 0 ? `+${ecartTotal}` : ecartTotal}
        </Typography>
      </StatCard>
    </Box>
  );
}
