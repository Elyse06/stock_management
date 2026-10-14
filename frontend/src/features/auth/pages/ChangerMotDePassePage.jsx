import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, CircularProgress, TextField, Typography } from "@mui/material";

import logo from "@/assets/tahiry-logo.png";
import { PageLoader } from "@/components/feedback/PageLoader";
import { PASSWORD_MIN_LENGTH } from "@/constants/permissions";
import { useNotification } from "@/hooks/useNotification";
import { getErrorMessage, getFieldErrors } from "@/lib/api/errors";

import { useAuth } from "../context/AuthContext";

const VIDE = { ancien: "", nouveau: "", confirmation: "" };

/** Vérifications locales (le serveur applique en plus le refus des mots de passe courants). */
function verifier({ nouveau, confirmation }) {
  const erreurs = {};
  if (nouveau.length < PASSWORD_MIN_LENGTH) erreurs.nouveau = `Au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  else if (/^\d+$/.test(nouveau)) erreurs.nouveau = "Le mot de passe ne peut pas contenir uniquement des chiffres.";
  if (confirmation !== nouveau) erreurs.confirmation = "Les deux mots de passe ne correspondent pas.";
  return erreurs;
}

/**
 * Changement de son mot de passe. Obligatoire tant que le compte a un mot de passe temporaire
 * (comptes créés par import) ; accessible aussi depuis le menu de l'utilisateur.
 */
export function ChangerMotDePassePage() {
  const { user, loading, changerMotDePasse, logout } = useAuth();
  const notify = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(VIDE);
  const [erreurs, setErreurs] = useState({});
  const [erreurGenerale, setErreurGenerale] = useState("");
  const [envoi, setEnvoi] = useState(false);

  if (loading) return <PageLoader fullScreen />;
  if (!user) return <Navigate to="/login" replace />;
  const oblige = Boolean(user.mdp_a_changer);
  const destination = location.state?.from?.pathname?.startsWith("/") ? location.state.from.pathname : "/";

  const champ = (nom) => ({
    value: form[nom],
    onChange: (e) => {
      setForm((f) => ({ ...f, [nom]: e.target.value }));
      setErreurs((er) => ({ ...er, [nom]: undefined }));
    },
    error: Boolean(erreurs[nom]),
    helperText: erreurs[nom],
  });

  const envoyer = async (e) => {
    e.preventDefault();
    setErreurGenerale("");
    const locales = verifier(form);
    if (Object.keys(locales).length) return setErreurs(locales);
    setEnvoi(true);
    try {
      await changerMotDePasse(form.ancien, form.nouveau);
      notify.success("Mot de passe modifié.");
      navigate(destination === "/changer-mot-de-passe" ? "/" : destination, { replace: true });
    } catch (err) {
      const parChamp = getFieldErrors(err);
      if (parChamp.ancien || parChamp.nouveau) setErreurs({ ancien: parChamp.ancien, nouveau: parChamp.nouveau });
      else setErreurGenerale(getErrorMessage(err, "Impossible de modifier le mot de passe."));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", p: { xs: 1.5, sm: 2 } }}>
      <Card sx={{ maxWidth: 460, width: "100%", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", border: "1px solid #E0E0E0",
        borderTop: "4px solid", borderTopColor: "secondary.main" }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 }, "&:last-child": { pb: { xs: 3, sm: 4 } } }}>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Box component="img" src={logo} alt="Tahiry" sx={{ display: "block", width: 150, height: "auto", mx: "auto", mb: 2 }} />
            <Typography variant="h3" component="h1">Changer mon mot de passe</Typography>
            <Typography variant="body2" color="text.secondary">{user.utilisateur_mail}</Typography>
          </Box>
          {oblige && (
            <Alert severity="warning" sx={{ mb: 2.5 }}>
              Votre compte utilise un mot de passe temporaire. Choisissez un mot de passe personnel pour accéder à l'application.
            </Alert>
          )}
          {erreurGenerale && <Alert severity="error" sx={{ mb: 2 }}>{erreurGenerale}</Alert>}
          <form onSubmit={envoyer} noValidate>
            <TextField fullWidth label="Mot de passe actuel" type="password" autoComplete="current-password" required autoFocus
              slotProps={{ htmlInput: { maxLength: 128 } }} sx={{ mb: 2 }} {...champ("ancien")} />
            <TextField fullWidth label="Nouveau mot de passe" type="password" autoComplete="new-password" required
              slotProps={{ htmlInput: { maxLength: 128 } }} sx={{ mb: 2 }} {...champ("nouveau")}
              helperText={erreurs.nouveau || `Au moins ${PASSWORD_MIN_LENGTH} caractères, pas uniquement des chiffres, pas un mot de passe courant.`} />
            <TextField fullWidth label="Confirmer le nouveau mot de passe" type="password" autoComplete="new-password" required
              slotProps={{ htmlInput: { maxLength: 128 } }} sx={{ mb: 3 }} {...champ("confirmation")} />
            <Button type="submit" fullWidth variant="contained" size="large" disabled={envoi} sx={{ py: 1.5, fontWeight: 600 }}>
              {envoi ? <CircularProgress size={24} color="inherit" /> : "Enregistrer le nouveau mot de passe"}
            </Button>
          </form>
          <Box sx={{ textAlign: "center", mt: 2 }}>
            {oblige ? (
              <Button color="inherit" size="small" onClick={logout}>Se déconnecter</Button>
            ) : (
              <Button color="inherit" size="small" onClick={() => navigate(-1)}>Annuler</Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
