import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { MainLayout } from "./layouts/MainLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CataloguePage } from "./pages/CataloguePage";
import { StockPage } from "./pages/StockPage";
import { AchatsPage } from "./pages/AchatsPage";
import { UtilisateursPage } from "./pages/UtilisateursPage";
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
            <Route path="/catalogue/*" element={<CataloguePage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/achats" element={<AchatsPage />} />
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
