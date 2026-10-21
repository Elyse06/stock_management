import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";

import logo from "@/assets/tahiry-logo.png";
import { PageLoader } from "@/components/feedback/PageLoader";

import { MotDePasseDrawer } from "../components/MotDePasseDrawer";
import { useAuth } from "../context/AuthContext";

/**
 * Passage obligé tant que le compte garde un mot de passe temporaire : le panneau de changement
 * de mot de passe reste ouvert (sans pouvoir être fermé) devant un fond aux couleurs de l'application.
 * Le changement volontaire se fait depuis le menu de l'utilisateur, sans quitter la page en cours.
 */
export function ChangerMotDePassePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) return <PageLoader fullScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.mdp_a_changer) return <Navigate to="/" replace />;
  const destination = location.state?.from?.pathname?.startsWith("/") ? location.state.from.pathname : "/";

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "tint.light", display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 2, p: 3, pr: { sm: "460px" }, textAlign: "center" }}>
      <Box component="img" src={logo} alt="Tahiry" sx={{ width: 170, height: "auto" }} />
      <Typography color="text.secondary" sx={{ maxWidth: 360 }}>
        Encore une étape : choisissez votre mot de passe personnel pour accéder à l'application.
      </Typography>
      <MotDePasseDrawer open oblige onSucces={() => navigate(destination === "/changer-mot-de-passe" ? "/" : destination, { replace: true })} />
    </Box>
  );
}
