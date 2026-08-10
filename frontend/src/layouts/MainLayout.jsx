import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./MainLayout.css";

const NAV_ITEMS = [
  { to: "/", label: "Tableau de bord", profils: null },
  { to: "/catalogue", label: "Catalogue", profils: ["Administrateur", "Magasinier", "Gestionnaire", "Demandeur", "Auditeur"] },
  { to: "/stock", label: "Stock", profils: ["Administrateur", "Magasinier", "Gestionnaire"] },
  { to: "/achats", label: "Commandes", profils: null },
  { to: "/utilisateurs", label: "Utilisateurs", profils: ["Administrateur"] },
];

export function MainLayout() {
  const { user, logout, hasProfil } = useAuth();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-title">Gestion de stock</div>
        <nav>
          {NAV_ITEMS.filter((item) => !item.profils || hasProfil(...item.profils)).map(
            (item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              >
                {item.label}
              </NavLink>
            )
          )}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <span>{user?.username}</span>
          <span className="badge">{user?.profil_nom}</span>
          <button onClick={logout}>Deconnexion</button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
