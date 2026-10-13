import { Box, Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

/** Page de résultat simple (accès refusé, introuvable...). */
export function ResultPage({ code, title, message }) {
  return (
    <Box sx={{ textAlign: "center", py: 8, px: 2 }}>
      <Typography variant="h1" color="primary" sx={{ fontSize: "3rem", fontWeight: 700 }}>
        {code}
      </Typography>
      <Typography variant="h2" sx={{ mt: 1 }}>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        {message}
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Retour à l'accueil
      </Button>
    </Box>
  );
}
