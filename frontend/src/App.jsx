import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { MainLayout } from "./layouts/MainLayout";
import { LoginPage } from "./features/auth/LoginPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";

import { ArticlePremiumPage } from "./features/catalogue/pages/ArticlePremiumPage";
import { ArticleListPage } from "./features/catalogue/pages/ArticleListPage";
import { CategoriesPage } from "./features/catalogue/pages/CategoriesPage";
import { FournisseursPage } from "./features/catalogue/pages/FournisseursPage";

import { MagasinsPage } from "./features/stock/pages/MagasinsPage";
import { SallesPage } from "./features/stock/pages/SallesPage";
import { MouvementsPage } from "./features/mouvement/pages/MouvementsPage";
import { UnitesArticlePage } from "./features/mouvement/pages/UnitesArticlePage";
import { InventairePage } from "./features/stock/pages/InventairePage";
import { RealisationTousInventairePage } from "./features/stock/pages/RealisationTousInventairePage";

import { CommandesPage } from "./features/commandes/pages/CommandesPage";

import { HistoriqueGlobalePage } from "./features/historique/pages/HistoriqueGlobalePage";
import { HistoriqueLocalisationPage } from "./features/historique/pages/HistoriqueLocalisationPage";
import { HistoriqueArticlePage } from "./features/historique/pages/HistoriqueArticlePage";
import { ImportImmobilisationsPage } from "./features/import/pages/ImportImmobilisationsPage";
import { FournitureImportPage } from "./features/import/pages/ImportFourniturePage";

import { UtilisateursPage } from "./features/user/page/UtilisateursPage";

import { EmployeesPage } from "./features/employes/pages/EmployeesPage";
import { ServicesPage } from "./features/employes/pages/ServicesPage";
import { DirectionsPage } from "./features/employes/pages/DirectionsPage";
import { SitesPage } from "./features/employes/pages/SitesPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />

        <Route path="/catalogue/articles/:code_article" element={<ArticlePremiumPage />} />
        <Route
          path="/catalogue/articles"
          element={
            <ProtectedRoute actions={["CAT_LIRE"]}>
              <ArticleListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/catalogue/categories"
          element={
            <ProtectedRoute actions={["CAT_GERE"]}>
              <CategoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/catalogue/fournisseurs"
          element={
            <ProtectedRoute actions={["CAT_GERE"]}>
              <FournisseursPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/magasins"
          element={
            <ProtectedRoute actions={["INV_GERE"]}>
              <MagasinsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/salles"
          element={
            <ProtectedRoute actions={["CAT_LIRE", "INV_GERE"]}>
              <SallesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventaire/mouvements"
          element={
            <ProtectedRoute actions={["MOV_LIRE"]}>
              <MouvementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventaire/unites"
          element={
            <ProtectedRoute actions={["CAT_LIRE"]}>
              <UnitesArticlePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventaire/sessions"
          element={
            <ProtectedRoute actions={["INV_LIRE"]}>
              <InventairePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventaire/sessions/realisation"
          element={
            <ProtectedRoute actions={["INV_GERE"]}>
              <RealisationTousInventairePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/commandes"
          element={
            <ProtectedRoute actions={["COM_DEM", "COM_VAL"]}>
              <CommandesPage />
            </ProtectedRoute>
          }
        />

        <Route path="/historique/globale" element={<HistoriqueGlobalePage />} />
        <Route
          path="/historique/localisation"
          element={<HistoriqueLocalisationPage />}
        />
        <Route path="/historique/article" element={<HistoriqueArticlePage />} />

        <Route
          path="/import/immobilisations"
          element={
            <ProtectedRoute actions={["CAT_GERE"]}>
              <ImportImmobilisationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/import/fournitures"
          element={
            <ProtectedRoute actions={["CAT_GERE"]}>
              <FournitureImportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/utilisateurs"
          element={
            <ProtectedRoute actions={["USR_GERE", "CAT_GERE"]}>
              <UtilisateursPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employes"
          element={
            <ProtectedRoute>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employes/services"
          element={
            <ProtectedRoute>
              <ServicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/services"
          element={
            <ProtectedRoute>
              <ServicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employes/directions"
          element={
            <ProtectedRoute>
              <DirectionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/directions"
          element={
            <ProtectedRoute>
              <DirectionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employes/sites"
          element={
            <ProtectedRoute>
              <SitesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sites"
          element={
            <ProtectedRoute>
              <SitesPage />
            </ProtectedRoute>
          }
        />

      </Route>
    </Routes>
  );
}

export default App;
