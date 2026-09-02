import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { MainLayout } from "./layouts/MainLayout";
import { LoginPage } from "./features/auth/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";

import { ArticleListPage } from "./features/catalogue/pages/ArticleListPage";
import { CategoriesPage } from "./features/catalogue/pages/CategoriesPage";
import { MarquesPage } from "./features/catalogue/pages/MarquesPage";
import { FournisseursPage } from "./features/catalogue/pages/FournisseursPage";

import { MagasinsPage } from "./features/stock/pages/MagasinsPage";
import { MouvementsPage } from "./features/mouvement/pages/MouvementsPage";
import { InventairePage } from "./features/stock/pages/InventairePage";

import { CommandesPage } from "./features/commandes/pages/CommandesPage";


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
          path="/catalogue/marques" 
          element={
            <ProtectedRoute actions={["CAT_GERE"]}>
              <MarquesPage />
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
          path="/inventaire/mouvements" 
          element={
            <ProtectedRoute actions={["MOV_LIRE"]}>
              <MouvementsPage />
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
          path="/commandes" 
          element={
            <ProtectedRoute actions={["COM_DEM", "COM_VAL"]}>
              <CommandesPage />
            </ProtectedRoute>
          } 
        />
      </Route>
    </Routes>
  );
}

export default App;