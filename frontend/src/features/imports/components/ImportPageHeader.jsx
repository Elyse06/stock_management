import { Box, Typography } from "@mui/material";
import { UploadFile as UploadFileIcon } from "@mui/icons-material";

export function ImportPageHeader({ titre, sousTitre }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
      <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: "primary.main", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <UploadFileIcon />
      </Box>
      <Box>
        <Typography variant="h5" component="h1" fontWeight={600}>
          {titre}
        </Typography>
        {sousTitre && (
          <Typography variant="body2" color="text.secondary">
            {sousTitre}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
