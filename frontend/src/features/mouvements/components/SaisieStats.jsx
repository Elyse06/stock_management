import { Box, Typography, Chip, Paper } from "@mui/material";
import { Warning as WarningIcon } from "@mui/icons-material";

export function SaisieStats({ nbValides, nbDoublons, quantiteRequise }) {
  const estComplet = quantiteRequise > 0 && nbValides >= quantiteRequise;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 2,
        bgcolor: "#FAFAFA",
        border: "1px solid #E0E0E0",
        borderRadius: 1,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 1,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Total :
        </Typography>
        <Chip
          label={`${nbValides} numéro(s) unique(s)`}
          color="primary"
          size="small"
          sx={{ fontWeight: 700, fontFamily: "monospace" }}
        />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {nbDoublons > 0 && (
          <Chip
            icon={<WarningIcon />}
            label={`${nbDoublons} doublon(s)`}
            color="warning"
            size="small"
          />
        )}
        {quantiteRequise > 0 && (
          <Chip
            label={`${nbValides} / ${quantiteRequise}`}
            color={estComplet ? "success" : "default"}
            size="small"
            variant={estComplet ? "filled" : "outlined"}
          />
        )}
      </Box>
    </Paper>
  );
}