import { Box, Paper, Typography } from "@mui/material";

import { BORDURE } from "../../constants/couleurs";

/** Carte du tableau de bord : titre, sous-titre, action à droite, contenu. */
export function DashboardCard({ titre, sousTitre, action, children, sx, ...props }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        height: "100%",
        borderRadius: 3,
        border: `1px solid ${BORDURE}`,
        boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        ...sx,
      }}
      {...props}
    >
      {(titre || action) && (
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            {titre && (
              <Typography component="h2" sx={{ fontSize: 15, fontWeight: 700, color: "#101828" }}>
                {titre}
              </Typography>
            )}
            {sousTitre && (
              <Typography variant="caption" sx={{ color: "#667085" }}>
                {sousTitre}
              </Typography>
            )}
          </Box>
          {action}
        </Box>
      )}
      {children}
    </Paper>
  );
}

/** Message quand un bloc n'a pas de données. */
export function AucuneDonnee({ texte = "Aucune donnée sur la période." }) {
  return (
    <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", py: 4 }}>
      <Typography variant="body2" color="text.secondary">
        {texte}
      </Typography>
    </Box>
  );
}
