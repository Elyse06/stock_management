import { useAuth } from "../context/AuthContext";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1>Bienvenue, {user?.nom_user}</h1>
      <p>
        Profil : <strong>{user?.profil_nom}</strong>
      </p>
      <p>
      </p>
    </div>
  );
}
