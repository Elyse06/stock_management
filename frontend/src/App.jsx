import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { MainLayout } from "./layouts/MainLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ArticleListPage } from "./features/catalogue/pages/ArticleListPage";
import { InventairePage } from "./features/stock/pages/InventairePage";
import { MagasinsPage } from "./features/stock/pages/MagasinsPage";
import { FournisseursPage } from "./features/catalogue/pages/FournisseursPage";
import { AchatsPage } from "./pages/AchatsPage";
import { UtilisateursPage } from "./pages/UtilisateursPage";
import { EntreeListPage } from "./features/mouvement/pages/EntreeListPage";
import { SortieListPage } from "./features/mouvement/pages/SortieListPage";
import { TransfertListPage } from "./features/mouvement/pages/TransfertListPage";
import "./App.css";
import "./components/common/common.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
                  <UtilisateursPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
