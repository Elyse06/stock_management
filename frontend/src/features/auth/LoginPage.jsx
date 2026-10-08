import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/tahiry-logo.png";

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
      await login(utilisateur_mail, password);
      navigate("/");
    } catch (err) {
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
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#FFFFFF",
        p: { xs: 1.5, sm: 2 },
      }}
    >
      <Card
        sx={{
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          border: "1px solid #E0E0E0",
          borderTop: "4px solid",
          borderTopColor: "secondary.main",
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 }, "&:last-child": { pb: { xs: 3, sm: 4 } } }}>
          {/* Header de la carte */}
          <Box sx={{ textAlign: "center", mb: { xs: 3, sm: 4 } }}>
            <Box
              component="img"
              src={logo}
              alt="Tahiry"
              sx={{
                display: "block",
                width: { xs: 150, sm: 190 },
                maxWidth: "100%",
                height: "auto",
                mx: "auto",
                mb: 2,
              }}
            />
            <Typography variant="body2" color="text.secondary">
              Gestion de Stock - Connexion
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

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