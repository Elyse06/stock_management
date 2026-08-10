import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/*
rediriger vers "/login" si non connecté
si connecté, diriger directement vers "/" avec son profil verifié
 */
export function ProtectedRoute({ children, profils }) {
  const { user, hasProfil } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profils && !hasProfil(...profils)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
