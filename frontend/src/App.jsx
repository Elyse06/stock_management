import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { MainLayout } from "./layouts/MainLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ArticleListPage } from "./features/catalogue/pages/ArticleListPage";
import { InventairePage } from "./features/stock/pages/InventairePage";
import { MagasinsPage } from "./features/stock/pages/MagasinsPage";
import { FournisseursPage } from "./features/catalogue/pages/FournisseursPage";
import { AchatsPage } from "./pages/AchatsPage";
import { UserListPage } from "./features/user/pages/UserListPage";
import { EntreeListPage } from "./features/mouvement/pages/EntreeListPage";
import { SortieListPage } from "./features/mouvement/pages/SortieListPage";
import { TransfertListPage } from "./features/mouvement/pages/TransfertListPage";
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
        <Route path="/" element={<DashboardPage />} />
        <Route path="/catalogue/*" element={<ArticleListPage />} />
        <Route path="/stock/*" element={<InventairePage />} />
        <Route path="/magasins" element={<MagasinsPage />} />
        <Route path="/fournisseurs" element={<FournisseursPage />} />
        <Route path="/achats/*" element={<AchatsPage />} />
        <Route path="/operations/entree/*" element={<EntreeListPage />} />
        <Route path="/operations/sortie/*" element={<SortieListPage />} />
        <Route path="/operations/transfert/*" element={<TransfertListPage />} />
        <Route
          path="/utilisateurs"
          element={
            <ProtectedRoute profils={["Administrateur"]}>
              <UserListPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;