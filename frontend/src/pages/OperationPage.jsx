import { Routes, Route } from "react-router-dom";
import { EntreeListPage } from "../features/mouvement/pages/EntreeListPage";
import { SortieListPage } from "../features/mouvement/pages/SortieListPage";
import { TransfertListPage } from "../features/mouvement/pages/TransfertListPage";

export function OperationEntreePage() {
  return <EntreeListPage />;
}

export function OperationSortiePage() {
  return <SortieListPage />;
}

export function OperationTransfertPage() {
  return <TransfertListPage />;
}
