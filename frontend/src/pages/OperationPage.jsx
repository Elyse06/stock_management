import { Routes, Route } from "react-router-dom";
import { EntreeListPage } from "../features/mouvement/pages/EntreeListPage";
import { SortieListPage } from "../features/mouvement/pages/SortieListPage";
import { TransfertListPage } from "../features/mouvement/pages/TransfertListPage";
import { MouvementFormPage } from "../features/mouvement/pages/MouvementFormPage";

export function OperationEntreePage() {
  return (
    <div>
      <Routes>
        <Route index element={<EntreeListPage />} />
        <Route path="mouvements/nouveau" element={<MouvementFormPage />} />
      </Routes>
    </div>
  );
}

export function OperationSortiePage() {
  return (
    <div>
      <Routes>
        <Route index element={<SortieListPage />} />
        <Route path="mouvements/nouveau" element={<MouvementFormPage />} />
      </Routes>
    </div>
  );
}

export function OperationTransfertPage() {
  return (
    <div>
      <Routes>
        <Route index element={<TransfertListPage />} />
        <Route path="mouvements/nouveau" element={<MouvementFormPage />} />
      </Routes>
    </div>
  );
}
