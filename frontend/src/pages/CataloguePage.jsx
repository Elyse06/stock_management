import { NavLink, Routes, Route, Navigate } from "react-router-dom";
import { ArticleListPage } from "../features/catalogue/pages/ArticleListPage";
import { ArticleFormPage } from "../features/catalogue/pages/ArticleFormPage";
import { CategoriesPage } from "../features/catalogue/pages/CategoriesPage";

export function CataloguePage() {
  return (
    <div>
      {/*
      <h1>Catalogue</h1>
      <nav className="subnav">
        <NavLink to="/catalogue" end className={({ isActive }) => (isActive ? "active" : "")}>
          Articles
        </NavLink>
        <NavLink to="/catalogue/categories" className={({ isActive }) => (isActive ? "active" : "")}>
          Categories
        </NavLink>
      </nav>
      */}

      <Routes>
        <Route index element={<ArticleListPage />} />
        <Route path="nouveau" element={<ArticleFormPage />} />
        <Route path=":code/modifier" element={<ArticleFormPage />} />
        {/* 
        <Route path="categories" element={<CategoriesPage />} />
        */}
        <Route path="*" element={<Navigate to="/catalogue" replace />} />
      </Routes>
    </div>
  );
}
