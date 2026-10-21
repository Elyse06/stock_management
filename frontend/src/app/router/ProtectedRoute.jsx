import { Navigate, useLocation } from "react-router-dom";

import { ForbiddenPage } from "@/components/feedback/ForbiddenPage";
import { PageLoader } from "@/components/feedback/PageLoader";
import { useAuth } from "@/features/auth/context/AuthContext";

export function ProtectedRoute({ children, actions = [] }) {
  const { user, loading, hasAnyAction } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader fullScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.mdp_a_changer) return <Navigate to="/changer-mot-de-passe" replace state={{ from: location }} />;
  if (!hasAnyAction(...actions)) return <ForbiddenPage />;
  return children;
}
