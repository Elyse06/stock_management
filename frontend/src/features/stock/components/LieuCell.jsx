import { Box, Typography } from "@mui/material";

import { getLieuMeta } from "../utils/lieuMeta";

/** Lieu d'une session d'inventaire avec icône et type. */
export function LieuCell({ session, nom }) {
  const meta = getLieuMeta(session);
  const { Icon } = meta;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
      <Icon fontSize="small" color={meta.color === "default" ? "action" : meta.color} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap>
          {nom || "—"}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.2 }}>
          {meta.label}
        </Typography>
      </Box>
    </Box>
  );
}
