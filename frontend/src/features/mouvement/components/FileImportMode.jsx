import { useRef } from "react";
import { Box, Typography, Paper } from "@mui/material";
import { UploadFile as UploadIcon } from "@mui/icons-material";

export function FileImportMode({ onFileUpload }) {
  const fileInputRef = useRef(null);

  return (
    <Box>
      <Box sx={{ mb: 2, p: 1.5, bgcolor: "#FFF8E1", borderRadius: 1, border: "1px solid #F9A825" }}>
        <Typography variant="body2" fontWeight={600}>
          📁 Uploadez un fichier contenant un numéro de série par ligne.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Formats acceptés : .txt, .csv
        </Typography>
      </Box>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          border: "2px dashed #F9A825",
          borderRadius: 2,
          textAlign: "center",
          bgcolor: "#FFFDE7",
          cursor: "pointer",
          "&:hover": { bgcolor: "#FFF8E1" },
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