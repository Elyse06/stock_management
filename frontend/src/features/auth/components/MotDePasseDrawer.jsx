import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Drawer, IconButton, InputAdornment, TextField, Tooltip, Typography } from "@mui/material";
import {
  CheckCircle as OkIcon,
  Close as CloseIcon,
  Key as KeyIcon,
  RadioButtonUnchecked as AFaireIcon,
  Visibility as VoirIcon,
  VisibilityOff as MasquerIcon,
} from "@mui/icons-material";

import { PASSWORD_MIN_LENGTH } from "@/constants/permissions";
import { useNotification } from "@/hooks/useNotification";
import { getErrorMessage, getFieldErrors } from "@/lib/api/errors";

import { useAuth } from "../context/AuthContext";
import { verifierNouveauMotDePasse } from "../utils/motDePasse";

const LARGEUR = 440;
const VIDE = { ancien: "", nouveau: "", confirmation: "" };
const BORDURE = "#E3E9F1";

/** Règles affichées sous le nouveau mot de passe, cochées au fil de la saisie. */
const regles = ({ nouveau, confirmation }) => [
  { texte: `Au moins ${PASSWORD_MIN_LENGTH} caractères`, ok: nouveau.length >= PASSWORD_MIN_LENGTH },
  { texte: "Pas uniquement des chiffres", ok: nouveau.length > 0 && !/^\d+$/.test(nouveau) },
  { texte: "Confirmation identique", ok: confirmation.length > 0 && confirmation === nouveau },
];

function ChampMotDePasse({ label, valeur, onChange, erreur, aide, autoComplete, autoFocus }) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      fullWidth
      label={label}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
      required
      value={valeur}
      onChange={(e) => onChange(e.target.value)}
      error={Boolean(erreur)}
      helperText={erreur || aide}
      slotProps={{
        htmlInput: { maxLength: 128 },
        input: {
          sx: { bgcolor: "#FFFFFF" },
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" edge="end" onClick={() => setVisible((v) => !v)}
                aria-label={visible ? `Masquer : ${label}` : `Afficher : ${label}`}>
                {visible ? <MasquerIcon fontSize="small" /> : <VoirIcon fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

/**
 * Changement de son mot de passe, dans un panneau latéral (même présentation que l'assistant).
 * ``oblige`` : mot de passe temporaire à remplacer avant d'utiliser l'application ; le panneau ne
 * peut alors pas être fermé, seulement quitté par la déconnexion.
 */
export function MotDePasseDrawer({ open, onClose, oblige = false, onSucces }) {
  const { user, changerMotDePasse, logout } = useAuth();
  const notify = useNotification();
  const [form, setForm] = useState(VIDE);
  const [erreurs, setErreurs] = useState({});
  const [erreurGenerale, setErreurGenerale] = useState("");
  const [envoi, setEnvoi] = useState(false);

  // Formulaire vidé à chaque ouverture : aucun mot de passe ne reste en mémoire après fermeture.
  useEffect(() => {
    if (open) {
      setForm(VIDE);
      setErreurs({});
      setErreurGenerale("");
    }
  }, [open]);

  const modifier = (nom) => (valeur) => {
    setForm((f) => ({ ...f, [nom]: valeur }));
    setErreurs((e) => ({ ...e, [nom]: undefined }));
  };

  const fermer = () => {
    if (!oblige && !envoi) onClose?.();
  };

  const envoyer = async (e) => {
    e.preventDefault();
    setErreurGenerale("");
    const locales = verifierNouveauMotDePasse(form);
    if (!form.ancien) locales.ancien = "Saisissez votre mot de passe actuel.";
    if (Object.keys(locales).length) return setErreurs(locales);
    setEnvoi(true);
    try {
      await changerMotDePasse(form.ancien, form.nouveau);
      notify.success("Mot de passe modifié.");
      setForm(VIDE);
      onSucces?.();
      onClose?.();
    } catch (err) {
      const parChamp = getFieldErrors(err);
      if (parChamp.ancien || parChamp.nouveau) setErreurs({ ancien: parChamp.ancien, nouveau: parChamp.nouveau });
      else setErreurGenerale(getErrorMessage(err, "Impossible de modifier le mot de passe."));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={fermer}
      hideBackdrop={oblige}
      sx={{
        "& .MuiDrawer-paper": {
          width: { xs: "100%", sm: LARGEUR }, border: "none", backgroundColor: "tint.light", backgroundImage: "none",
        },
      }}
    >
      <Box
        component="header"
        sx={{
          px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1.5, color: "#FFFFFF",
          background: (t) => `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)`,
          borderBottom: "3px solid", borderBottomColor: "secondary.main",
        }}
      >
        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "secondary.main", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <KeyIcon sx={{ color: "primary.main", fontSize: 21 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h2" sx={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>Changer mon mot de passe</Typography>
          <Typography sx={{ fontSize: 11.5, color: "rgba(255,255,255,0.75)" }} noWrap>{user?.utilisateur_mail}</Typography>
        </Box>
        {!oblige && (
          <Tooltip title="Fermer">
            <IconButton size="small" onClick={fermer} aria-label="Fermer"
              sx={{ color: "rgba(255,255,255,0.85)", "&:hover": { color: "#FFFFFF", bgcolor: "rgba(255,255,255,0.12)" } }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Box component="form" onSubmit={envoyer} noValidate sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 2.5, display: "flex", flexDirection: "column", gap: 2.25 }}>
          {oblige && (
            <Alert severity="warning">
              Votre compte utilise un mot de passe temporaire. Choisissez un mot de passe personnel pour accéder à l'application.
            </Alert>
          )}
          {erreurGenerale && <Alert severity="error">{erreurGenerale}</Alert>}

          <ChampMotDePasse label="Mot de passe actuel" valeur={form.ancien} onChange={modifier("ancien")} erreur={erreurs.ancien}
            autoComplete="current-password" autoFocus />

          <Box sx={{ borderTop: `1px dashed ${BORDURE}` }} />

          <ChampMotDePasse label="Nouveau mot de passe" valeur={form.nouveau} onChange={modifier("nouveau")} erreur={erreurs.nouveau}
            autoComplete="new-password" aide="Le serveur refuse aussi les mots de passe trop courants." />
          <ChampMotDePasse label="Confirmer le nouveau mot de passe" valeur={form.confirmation} onChange={modifier("confirmation")}
            erreur={erreurs.confirmation} autoComplete="new-password" />

          <Box component="ul" aria-label="Règles du mot de passe"
            sx={{ listStyle: "none", m: 0, p: 1.5, bgcolor: "#FFFFFF", border: `1px solid ${BORDURE}`, borderRadius: 2 }}>
            {regles(form).map((regle) => (
              <Box component="li" key={regle.texte} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.25 }}>
                {regle.ok ? <OkIcon sx={{ fontSize: 17, color: "success.main" }} /> : <AFaireIcon sx={{ fontSize: 17, color: "#98A2B3" }} />}
                <Typography sx={{ fontSize: 13, color: regle.ok ? "text.primary" : "text.secondary" }}>{regle.texte}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ px: 2.5, py: 1.75, bgcolor: "#FFFFFF", borderTop: `1px solid ${BORDURE}`, display: "flex", gap: 1, justifyContent: "flex-end" }}>
          {oblige ? (
            <Button color="inherit" onClick={logout} disabled={envoi}>Se déconnecter</Button>
          ) : (
            <Button color="inherit" onClick={fermer} disabled={envoi}>Annuler</Button>
          )}
          <Button type="submit" variant="contained" disableElevation disabled={envoi} sx={{ minWidth: 120, fontWeight: 600 }}>
            {envoi ? <CircularProgress size={20} color="inherit" /> : "Enregistrer"}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
