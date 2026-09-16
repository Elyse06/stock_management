import { Component } from "react";
import { Box, Typography, Button, Paper } from "@mui/material";
import { Error as ErrorIcon, Refresh as RefreshIcon, Home as HomeIcon } from "@mui/icons-material";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Ici tu peux envoyer l'erreur à un service de monitoring (Sentry, etc.)
    // logErrorToService(error, errorInfo);
    
    this.setState({ errorInfo });
  }

  handleReload = () => window.location.reload();

  handleGoHome = () => (window.location.href = "/");

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            bgcolor: "#FFFFFF",
            p: 3,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 4,
              maxWidth: 600,
              textAlign: "center",
              border: "2px solid",
              borderColor: "primary.main",
              borderRadius: 2,
            }}
          >
            <ErrorIcon sx={{ fontSize: 64, color: "primary.main", mb: 2 }} />
            <Typography variant="h2" gutterBottom>
              Oups ! Une erreur est survenue
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              L'application a rencontré un problème inattendu. 
              Vous pouvez recharger la page ou retourner à l'accueil.
            </Typography>
            
            {process.env.NODE_ENV === "development" && this.state.error && (
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  bgcolor: "#FFF8E1",
                  borderRadius: 1,
                  textAlign: "left",
                  maxHeight: 200,
                  overflow: "auto",
                }}
              >
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Détails de l'erreur :
                </Typography>
                <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                  {this.state.error.toString()}
                </Typography>
              </Box>
            )}
            
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleReload}
              >
                Recharger la page
              </Button>
              <Button
                variant="outlined"
                startIcon={<HomeIcon />}
                onClick={this.handleGoHome}
              >
                Retour à l'accueil
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;