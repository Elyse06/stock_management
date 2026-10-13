import { Box, CircularProgress } from "@mui/material";

/** Indicateur de chargement (page entière ou zone de contenu). */
export function PageLoader({ fullScreen = false }) {
  return (
    <Box
      role="progressbar"
      aria-label="Chargement"
      sx={{
        minHeight: fullScreen ? "100vh" : 240,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CircularProgress color="primary" />
    </Box>
  );
}
