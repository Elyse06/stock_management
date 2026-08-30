import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { MainLayout } from "./layouts/MainLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";

// Catalogue
import { ArticleListPage } from "./features/catalogue/pages/ArticleListPage";
import { CategoriesPage } from "./features/catalogue/pages/CategoriesPage";
import { MarquesPage } from "./features/catalogue/pages/MarquesPage";
import { FournisseursPage } from "./features/catalogue/pages/FournisseursPage";

// Stock / Inventaire
import { MagasinsPage } from "./features/stock/pages/MagasinsPage";
import { MouvementsPage } from "./features/mouvement/pages/MouvementsPage";
import { InventairePage } from "./features/stock/pages/InventairePage";

// Commandes
import { AchatsPage } from "./pages/AchatsPage";

import "./components/common/common.css";

function App() {
  return (
    <Routes>
      {/* Route publique : Login */}
      <Route path="/login" element={<LoginPage />} />

      {/* Routes protégées avec Layout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Tableau de bord */}
        <Route path="/" element={<DashboardPage />} />

        {/* ====== CATALOGUE ====== */}
        <Route path="/catalogue/articles" element={<ArticleListPage />} />
        <Route path="/catalogue/categories" element={<CategoriesPage />} />
        <Route path="/catalogue/marques" element={<MarquesPage />} />
        <Route path="/catalogue/fournisseurs" element={<FournisseursPage />} />

        {/* ====== INVENTAIRE ====== */}
        <Route path="/magasins" element={<MagasinsPage />} />
        <Route path="/inventaire/mouvements" element={<MouvementsPage />} />
        <Route path="/inventaire/sessions" element={<InventairePage />} />

        {/* ====== COMMANDES ====== */}
        <Route path="/commandes" element={<AchatsPage />} />
      </Route>
    </Routes>
  );
}

export default App;