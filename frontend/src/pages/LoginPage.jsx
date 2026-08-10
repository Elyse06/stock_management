import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Notification } from "../components/common/Notification";
import "./LoginPage.css";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [nom_user, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    
    try {
      //console.log("Données soumises :", username, password);
      await login(nom_user, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Identifiants incorrects.");
      } else {
        setError("Impossible de se connecter au serveur.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Gestion de stock</h1>
        <p className="subtitle">Connectez-vous pour continuer</p>

        <Notification type="error" message={error} />

        <label htmlFor="username">Nom d'utilisateur</label>
        <input
          id="username"
          type="text"
          value={nom_user}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          required
        />

        <label htmlFor="password">Mot de passe</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={submitting}>
          {submitting ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
