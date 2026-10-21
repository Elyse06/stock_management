import { Box, Typography } from "@mui/material";

/** Tuile d'information : pastille d'icône + libellé + valeur. */
export function InfoTile({ icon, label, children }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        p: 1.5,
        border: "1px solid #E0E0E0",
        borderRadius: 1,
        bgcolor: "background.paper",
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          bgcolor: "tint.main",
          color: "primary.main",
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Box sx={{ fontWeight: 500, wordBreak: "break-word" }}>{children}</Box>
      </Box>
    </Box>
  );
}
