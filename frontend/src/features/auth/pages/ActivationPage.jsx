import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, CircularProgress, TextField, Typography } from "@mui/material";

import logo from "@/assets/tahiry-logo.png";
import { useNotification } from "@/hooks/useNotification";
import { getErrorMessage, getFieldErrors } from "@/lib/api/errors";

import { verifierActivation } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import { AIDE_MOT_DE_PASSE, verifierNouveauMotDePasse } from "../utils/motDePasse";

const CLE = "tahiry.activation";

const lireAdresse = () => decodeURIComponent(window.location.hash.replace(/^#/, ""));

function jetonInitial() {
  try {
    return lireAdresse() || sessionStorage.getItem(CLE) || "";
  } catch {
    return lireAdresse();
  }
}

function memoriser(jeton) {
  try {
    sessionStorage.setItem(CLE, jeton);
  } catch {
  }
}

function oublier() {
  try {
    sessionStorage.removeItem(CLE);
  } catch {
  }
}

function retirerDeLAdresse() {
  const jeton = lireAdresse();
  if (!jeton) return "";
  memoriser(jeton);
  window.history.replaceState(null, "", window.location.pathname);
  return jeton;
}

function Cadre({ children }) {
  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", p: { xs: 1.5, sm: 2 } }}>
      <Card sx={{ maxWidth: 460, width: "100%", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", border: "1px solid #E0E0E0",
        borderTop: "4px solid", borderTopColor: "secondary.main" }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 }, "&:last-child": { pb: { xs: 3, sm: 4 } } }}>
          <Box component="img" src={logo} alt="Tahiry" sx={{ display: "block", width: 150, height: "auto", mx: "auto", mb: 2 }} />
          {children}
        </CardContent>
      </Card>
    </Box>
  );
}

export function ActivationPage() {
  const { activerCompte } = useAuth();
  const notify = useNotification();
  const navigate = useNavigate();
  const [jeton, setJeton] = useState(jetonInitial);
  const [compte, setCompte] = useState(null);
  const [lienInvalide, setLienInvalide] = useState(jeton ? "" : "Ce lien d'activation est incomplet.");
  const [form, setForm] = useState({ nouveau: "", confirmation: "" });
  const [erreurs, setErreurs] = useState({});
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    retirerDeLAdresse();
    const nouveauLien = () => {
      const nouveau = retirerDeLAdresse();
      if (!nouveau) return;
      setJeton(nouveau);
      setCompte(null);
      setLienInvalide("");
      setForm({ nouveau: "", confirmation: "" });
      setErreurs({});
    };
    window.addEventListener("hashchange", nouveauLien);
    return () => window.removeEventListener("hashchange", nouveauLien);
  }, []);

  useEffect(() => {
    if (!jeton) return undefined;
    let actif = true;
    verifierActivation(jeton)
      .then((donnees) => actif && setCompte(donnees))
      .catch((err) => {
        if (!actif) return;
        oublier(); 
        setLienInvalide(getErrorMessage(err, "Ce lien d'activation n'est pas valide."));
      });
    return () => { actif = false; };
  }, [jeton]);

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
    const locales = verifierNouveauMotDePasse(form);
    if (Object.keys(locales).length) return setErreurs(locales);
    setEnvoi(true);
    try {
      await activerCompte(jeton, form.nouveau);
      oublier();
      notify.success("Votre compte est activé. Bienvenue !");
      navigate("/", { replace: true });
    } catch (err) {
      const parChamp = getFieldErrors(err);
      if (parChamp.nouveau) setErreurs({ nouveau: parChamp.nouveau });
      else setLienInvalide(getErrorMessage(err, "Impossible d'activer le compte."));
    } finally {
      setEnvoi(false);
    }
  };

  if (lienInvalide) {
    return (
      <Cadre>
        <Typography variant="h3" component="h1" align="center" gutterBottom>Lien d'activation invalide</Typography>
        <Alert severity="error" sx={{ mb: 2 }}>{lienInvalide}</Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Demandez à l'administrateur de l'application de vous renvoyer un lien d'activation. Si votre compte est déjà
          activé, connectez-vous avec votre mot de passe.
        </Typography>
        <Button fullWidth variant="outlined" onClick={() => navigate("/login")}>Aller à la page de connexion</Button>
      </Cadre>
    );
  }

  if (!compte) {
    return (
      <Cadre>
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress aria-label="Vérification du lien" /></Box>
      </Cadre>
    );
  }

  return (
    <Cadre>
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <Typography variant="h3" component="h1">Activer mon compte</Typography>
        <Typography variant="body2" color="text.secondary">
          {compte.nom ? `${compte.nom} · ` : ""}{compte.utilisateur_mail}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ mb: 2.5 }}>
        Choisissez votre mot de passe.
      </Typography>
      <form onSubmit={envoyer} noValidate>
        <TextField fullWidth label="Mot de passe" type="password" autoComplete="new-password" required autoFocus
          slotProps={{ htmlInput: { maxLength: 128 } }} sx={{ mb: 2 }} {...champ("nouveau")} helperText={erreurs.nouveau || AIDE_MOT_DE_PASSE} />
        <TextField fullWidth label="Confirmer le mot de passe" type="password" autoComplete="new-password" required
          slotProps={{ htmlInput: { maxLength: 128 } }} sx={{ mb: 3 }} {...champ("confirmation")} />
        <Button type="submit" fullWidth variant="contained" size="large" disabled={envoi} sx={{ py: 1.5, fontWeight: 600 }}>
          {envoi ? <CircularProgress size={24} color="inherit" /> : "Activer mon compte"}
        </Button>
      </form>
    </Cadre>
  );
}