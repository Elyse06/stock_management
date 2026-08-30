import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Box, CircularProgress } from "@mui/material";

export function ProtectedRoute({ children, action }) {
  const { user, hasAction } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (action && !hasAction(action)) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <h2>Accès refusé</h2>
        <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
      </Box>
    );
  }

  return children;
}

// Composant de chargement pendant l'init auth
export function AuthLoader() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#FFFFFF",
      }}
    >
      <CircularProgress color="primary" />
    </Box>
  );
}