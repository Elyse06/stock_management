import { Component } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import { Error as ErrorIcon, Home as HomeIcon, Refresh as RefreshIcon } from "@mui/icons-material";

import { IS_DEV } from "@/config/env";

/** Intercepte les erreurs de rendu et affiche un écran de secours. */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Point d'entrée pour un service de monitoring (Sentry...).
    if (IS_DEV) console.error("ErrorBoundary :", error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", p: 3 }}>
        <Paper elevation={0} sx={{ p: 4, maxWidth: 600, textAlign: "center", border: "2px solid", borderColor: "primary.main", borderRadius: 2 }}>
          <ErrorIcon sx={{ fontSize: 64, color: "primary.main", mb: 2 }} />
          <Typography variant="h2" gutterBottom>
            Oups ! Une erreur est survenue
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            L'application a rencontré un problème inattendu. Vous pouvez recharger la page ou retourner à l'accueil.
          </Typography>
          {/* Le détail technique n'est affiché qu'en développement. */}
          {IS_DEV && (
            <Box sx={{ mb: 3, p: 2, bgcolor: "tint.main", borderRadius: 1, textAlign: "left", maxHeight: 200, overflow: "auto" }}>
              <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                {error.toString()}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={() => window.location.reload()}>
              Recharger la page
            </Button>
            <Button variant="outlined" startIcon={<HomeIcon />} onClick={() => window.location.assign("/")}>
              Retour à l'accueil
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }
}
