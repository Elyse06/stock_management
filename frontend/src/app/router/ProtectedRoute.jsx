import { Navigate, useLocation } from "react-router-dom";

import { ForbiddenPage } from "@/components/feedback/ForbiddenPage";
import { PageLoader } from "@/components/feedback/PageLoader";
import { useAuth } from "@/features/auth/context/AuthContext";

/**
 * Exige une session ; si ``actions`` est fourni, au moins une de ces actions.
 * Un utilisateur sans le droit voit une page « accès refusé » (et non une
 * redirection, qui pouvait boucler sur l'accueil).
 */
export function ProtectedRoute({ children, actions = [] }) {
  const { user, loading, hasAnyAction } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader fullScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!hasAnyAction(...actions)) return <ForbiddenPage />;
  return children;
}
