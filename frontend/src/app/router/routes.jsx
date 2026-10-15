import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import { PageLoader } from "@/components/feedback/PageLoader";
import { MainLayout } from "@/components/layout/MainLayout";

import { ROUTE_ACTIONS } from "./navigation";
import { ProtectedRoute } from "./ProtectedRoute";

/** Charge une page à la demande (un fichier JS par page au lieu d'un bundle unique). */
const page = (loader, name) => lazy(() => loader().then((module) => ({ default: module[name] })));

const LoginPage = page(() => import("@/features/auth/pages/LoginPage"), "LoginPage");
const ChangerMotDePassePage = page(() => import("@/features/auth/pages/ChangerMotDePassePage"), "ChangerMotDePassePage");
const ActivationPage = page(() => import("@/features/auth/pages/ActivationPage"), "ActivationPage");
const DashboardPage = page(() => import("@/features/dashboard/pages/DashboardPage"), "DashboardPage");
const ArticlePremiumPage = page(() => import("@/features/catalogue/pages/ArticlePremiumPage"), "ArticlePremiumPage");
const ArticleListPage = page(() => import("@/features/catalogue/pages/ArticleListPage"), "ArticleListPage");
const CategoriesPage = page(() => import("@/features/catalogue/pages/CategoriesPage"), "CategoriesPage");
const FournisseursPage = page(() => import("@/features/catalogue/pages/FournisseursPage"), "FournisseursPage");
const MagasinsPage = page(() => import("@/features/stock/pages/MagasinsPage"), "MagasinsPage");
const SallesPage = page(() => import("@/features/stock/pages/SallesPage"), "SallesPage");
const InventairePage = page(() => import("@/features/stock/pages/InventairePage"), "InventairePage");
const RealisationTousInventairePage = page(
  () => import("@/features/stock/pages/RealisationTousInventairePage"),
  "RealisationTousInventairePage",
);
const MouvementsPage = page(() => import("@/features/mouvements/pages/MouvementsPage"), "MouvementsPage");
const UnitesArticlePage = page(() => import("@/features/mouvements/pages/UnitesArticlePage"), "UnitesArticlePage");
const CommandesPage = page(() => import("@/features/commandes/pages/CommandesPage"), "CommandesPage");
const HistoriqueGlobalePage = page(() => import("@/features/historique/pages/HistoriqueGlobalePage"), "HistoriqueGlobalePage");
const HistoriqueLocalisationPage = page(
  () => import("@/features/historique/pages/HistoriqueLocalisationPage"),
  "HistoriqueLocalisationPage",
);
const HistoriqueArticlePage = page(() => import("@/features/historique/pages/HistoriqueArticlePage"), "HistoriqueArticlePage");
const ImportImmobilisationsPage = page(
  () => import("@/features/imports/pages/ImportImmobilisationsPage"),
  "ImportImmobilisationsPage",
);
const ImportFournituresPage = page(() => import("@/features/imports/pages/ImportFournituresPage"), "ImportFournituresPage");
const UtilisateursPage = page(() => import("@/features/utilisateurs/pages/UtilisateursPage"), "UtilisateursPage");
const EmployeesPage = page(() => import("@/features/employes/pages/EmployeesPage"), "EmployeesPage");
const ServicesPage = page(() => import("@/features/employes/pages/ServicesPage"), "ServicesPage");
const DirectionsPage = page(() => import("@/features/employes/pages/DirectionsPage"), "DirectionsPage");
const SitesPage = page(() => import("@/features/employes/pages/SitesPage"), "SitesPage");
const NotFoundPage = page(() => import("@/components/feedback/NotFoundPage"), "NotFoundPage");

const PAGES = [
  ["/", DashboardPage],
  ["/catalogue/articles/:code_article", ArticlePremiumPage],
  ["/catalogue/articles", ArticleListPage],
  ["/catalogue/categories", CategoriesPage],
  ["/catalogue/fournisseurs", FournisseursPage],
  ["/magasins", MagasinsPage],
  ["/salles", SallesPage],
  ["/inventaire/mouvements", MouvementsPage],
  ["/inventaire/unites", UnitesArticlePage],
  ["/inventaire/sessions", InventairePage],
  ["/inventaire/sessions/realisation", RealisationTousInventairePage],
  ["/commandes", CommandesPage],
  ["/historique/globale", HistoriqueGlobalePage],
  ["/historique/localisation", HistoriqueLocalisationPage],
  ["/historique/article", HistoriqueArticlePage],
  ["/import/immobilisations", ImportImmobilisationsPage],
  ["/import/fournitures", ImportFournituresPage],
  ["/utilisateurs", UtilisateursPage],
  ["/employes", EmployeesPage],
  ["/employes/services", ServicesPage],
  ["/employes/directions", DirectionsPage],
  ["/employes/sites", SitesPage],
];

/** Anciennes URL conservées pour ne pas casser les favoris. */
const ALIASES = { "/services": "/employes/services", "/directions": "/employes/directions", "/sites": "/employes/sites" };

const guarded = (path, Component) => (
  <ProtectedRoute actions={ROUTE_ACTIONS[path] ?? []}>
    <Component />
  </ProtectedRoute>
);

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader fullScreen />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/changer-mot-de-passe" element={<ChangerMotDePassePage />} />
        <Route path="/activation" element={<ActivationPage />} />
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {PAGES.map(([path, Component]) => (
            <Route key={path} path={path} element={guarded(path, Component)} />
          ))}
          {Object.entries(ALIASES).map(([alias, path]) => (
            <Route key={alias} path={alias} element={guarded(path, PAGES.find(([p]) => p === path)[1])} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
