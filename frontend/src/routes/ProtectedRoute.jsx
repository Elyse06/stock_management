import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Box, CircularProgress } from "@mui/material";

export function ProtectedRoute({ children, actions }) {
  const { user, hasAnyAction } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (actions && !hasAnyAction(...actions)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

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