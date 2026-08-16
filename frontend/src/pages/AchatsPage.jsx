import { Routes, Route } from "react-router-dom";
import { CommandeListPage } from "../features/achats/pages/CommandeListPage";
import { CommandeFormPage } from "../features/achats/pages/CommandeFormPage";
import { CommandeDetailPage } from "../features/achats/pages/CommandeDetailPage";

export function AchatsPage() {
  return (
    <Routes>
      <Route index element={<CommandeListPage />} />
      <Route path="nouveau" element={<CommandeFormPage />} />
      <Route path=":id" element={<CommandeDetailPage />} />
    </Routes>
  );
}
