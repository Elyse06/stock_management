import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, CircularProgress, TextField, Typography } from "@mui/material";

import logo from "@/assets/tahiry-logo.png";
import { getErrorMessage } from "@/lib/api/errors";

import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Page demandée avant la redirection vers la connexion (chemin interne uniquement).
  const destination = location.state?.from?.pathname?.startsWith("/") ? location.state.from.pathname : "/";
  if (user) return <Navigate to={destination} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Identifiants invalides. Veuillez réessayer."));
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", p: { xs: 1.5, sm: 2 } }}>
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
          <Box sx={{ textAlign: "center", mb: { xs: 3, sm: 4 } }}>
            <Box
              component="img"
              src={logo}
              alt="Tahiry"
              sx={{ display: "block", width: { xs: 150, sm: 190 }, maxWidth: "100%", height: "auto", mx: "auto", mb: 2 }}
            />
            <Typography variant="body2" color="text.secondary">
              Gestion de Stock - Connexion
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} role="alert">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate={false}>
            <TextField
              fullWidth
              label="Adresse e-mail"
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              inputProps={{ maxLength: 254 }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Mot de passe"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              inputProps={{ maxLength: 128 }}
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={submitting}
              sx={{ py: 1.5, fontWeight: 600, fontSize: "1rem" }}
            >
              {submitting ? <CircularProgress size={24} color="inherit" /> : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
