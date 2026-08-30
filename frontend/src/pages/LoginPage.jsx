import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// MUI Components
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [utilisateur_mail, setUtilisateurMail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // ✅ Appel de la fonction login avec utilisateur_mail
      await login(utilisateur_mail, password);
      navigate("/"); // Redirection vers le tableau de bord en cas de succès
    } catch (err) {
      // Gestion des erreurs (message du backend ou message par défaut)
      setError(
        err.response?.data?.detail || "Identifiants invalides. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#FFFFFF", // ✅ Fond blanc partout
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          border: "1px solid #E0E0E0",
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Header de la carte */}
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                bgcolor: "primary.main", // ✅ Jaune du thème
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 700,
                fontSize: 24,
                mx: "auto",
                mb: 2,
              }}
            >
              P
            </Box>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Paositra
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestion de Stock - Connexion
            </Typography>
          </Box>

          {/* Message d'erreur */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Adresse e-mail"
              type="email"
              value={utilisateur_mail}
              onChange={(e) => setUtilisateurMail(e.target.value)}
              required
              autoFocus
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                fontWeight: 600,
                fontSize: "1rem",
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}