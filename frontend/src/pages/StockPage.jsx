import { NavLink, Routes, Route, Navigate } from "react-router-dom";
import { MagasinsPage } from "../features/stock/pages/MagasinsPage";
import { MouvementListPage } from "../features/stock/pages/MouvementListPage";
import { MouvementFormPage } from "../features/stock/pages/MouvementFormPage";
import { InventairePage } from "../features/stock/pages/InventairePage";

export function StockPage() {
  return (
    <div>
      <nav className="subnav">
        <NavLink to="/stock/mouvements" className={({ isActive }) => (isActive ? "active" : "")}>
          Mouvements
        </NavLink>
        <NavLink to="/stock/magasins" className={({ isActive }) => (isActive ? "active" : "")}>
          Magasins
        </NavLink>
        <NavLink to="/stock/inventaires" className={({ isActive }) => (isActive ? "active" : "")}>
          Inventaires
        </NavLink>
      </nav>

      <Routes>
        <Route index element={<Navigate to="mouvements" replace />} />
        <Route path="mouvements" element={<MouvementListPage />} />
        <Route path="mouvements/nouveau" element={<MouvementFormPage />} />
        <Route path="magasins" element={<MagasinsPage />} />
        <Route path="inventaires" element={<InventairePage />} />
      </Routes>
    </div>
  );
}
