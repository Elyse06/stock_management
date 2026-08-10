import { useAuth } from "../context/AuthContext";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1>Bienvenue, {user?.username}</h1>
      <p>
        Profil : <strong>{user?.profil_nom}</strong>
      </p>
      <p>
        Utilisez le menu a gauche pour acceder aux modules disponibles pour votre profil.
      </p>
    </div>
  );
}
