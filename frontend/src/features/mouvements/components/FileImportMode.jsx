import { useRef } from "react";
import { Box, Typography, Paper, Alert } from "@mui/material";
import { UploadFile as UploadIcon } from "@mui/icons-material";

export function FileImportMode({ onFileUpload }) {
  const fileInputRef = useRef(null);

  return (
    <Box>
      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        Uploadez un fichier contenant un numéro de série par ligne (formats .txt ou .csv).
      </Alert>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          border: "2px dashed",
          borderColor: "primary.light",
          borderRadius: 2,
          textAlign: "center",
          bgcolor: "tint.light",
          cursor: "pointer",
          "&:hover": { bgcolor: "tint.main" },
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
        <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
          Cliquez pour sélectionner un fichier
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Formats acceptés : .txt, .csv (un numéro par ligne)
        </Typography>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv"
          onChange={onFileUpload}
          style={{ display: "none" }}
        />
      </Paper>
    </Box>
  );
}