import { Box, Typography } from "@mui/material";
import { AccountBalance as AccountBalanceIcon, Business as BusinessIcon } from "@mui/icons-material";

import { EmptyValue } from "@/components/data-display/EmptyValue";

/** Nom de site précédé d'une icône Siège / Agence. */
export function SiteLabel({ nom, type, localite }) {
  if (!nom) return <EmptyValue />;
  const Icon = type === "SIEGE" ? AccountBalanceIcon : BusinessIcon;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Icon fontSize="small" />
      <Typography variant="body2">{nom}</Typography>
      {localite && (
        <Typography variant="caption" color="text.secondary">
          ({localite})
        </Typography>
      )}
    </Box>
  );
}
