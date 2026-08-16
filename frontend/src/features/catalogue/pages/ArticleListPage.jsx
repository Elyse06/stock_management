import React, { useEffect, useState, useCallback } from "react";
import { listArticles, listCategories, deleteArticle, getArticle } from "../api";
import { DataTable } from "../../../components/common/DataTable";
import { Pagination } from "../../../components/common/Pagination";
import { Notification } from "../../../components/common/Notification";
import { useAuth } from "../../../context/AuthContext";
import { ArticleModal } from "../components/articleModal";
import { ArticleFormModal } from "../components/articleFormModal";
import "../components/article.css";

export function ArticleListPage() {
  const { hasProfil } = useAuth();
  const canEdit = hasProfil("Administrateur", "Gestionnaire", "Magasinier");

  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categorieFiltre, setCategorieFiltre] = useState("");
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({
    count: 0,
    next: null,
    previous: null,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Modale de détail
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modale Formulaire (Création & Modification)
  const [articleToEdit, setArticleToEdit] = useState(null);
  const [isModalFormOpen, setIsModalFormOpen] = useState(false);

  const openModal = (article) => {
    setSelectedArticle(article);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedArticle(null);
  };

  const openFormModalForCreate = () => {
    setArticleToEdit(null);
    setIsModalFormOpen(true);
  };

  const openFormModalForEdit = async (article) => {
    try {
      const fullArticle = await getArticle(article.code_article);
      setArticleToEdit(fullArticle);
      setIsModalFormOpen(true);
    } catch (err) {
      setError("Impossible de charger les détails de l'article à modifier.");
    }
  };

  const closeFormModal = () => {
    setIsModalFormOpen(false);
    setArticleToEdit(null);
  };

  const charger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page };
      if (search) params.search = search;
      if (categorieFiltre) params.categorie = categorieFiltre;
      const data = await listArticles(params);
      setArticles(data.results ?? data);
      setPageInfo({
        count: data.count,
        next: data.next,
        previous: data.previous,
      });
    } catch (err) {
      setError("Impossible de charger les articles.");
    } finally {
      setLoading(false);
    }
  }, [page, search, categorieFiltre]);

  const handleSavedSuccess = () => {
    charger();
  };

  useEffect(() => {
    listCategories().then((data) => setCategories(data.results ?? data));
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleDelete = async (article) => {
    if (!window.confirm(`Supprimer l'article "${article.designation}" ?`)) return;
    try {
      await deleteArticle(article.code_article);
      charger();
    } catch (err) {
      setError("Suppression impossible (article probablement référencé ailleurs).");
    }
  };

  const columns = [
    {
      key: "code_article",
      label: "Code",
      render: (row) => <span className="cell-code">{row.code_article}</span>,
    },
    {
      key: "designation",
      label: "Désignation",
      render: (row) => <span className="cell-designation">{row.designation}</span>,
    },
    {
      key: "categorie_nom",
      label: "Catégorie",
      render: (row) => (
        <span className={`cell-category cat-${(row.categorie_nom || "").toLowerCase().replace(/\s+/g, "-")}`}>
          {row.categorie_nom || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (row) =>
        canEdit && (
          <div className="actions-cell">
            <button className="btn-action btn-action-info" onClick={() => openModal(row)} title="Détails">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              <span className="btn-label">Détails</span>
            </button>
            <button
              className="btn-action btn-action-edit"
              onClick={() => openFormModalForEdit(row)}
              title="Modifier"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              <span className="btn-label">Modifier</span>
            </button>
            <button
              className="btn-action btn-action-delete"
              onClick={() => handleDelete(row)}
              title="Supprimer"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              <span className="btn-label">Supprimer</span>
            </button>
          </div>
        ),
    },
  ];

  // Skeleton rows pendant le chargement
  const skeletonRows = Array.from({ length: 5 }, (_, i) => (
    <tr key={`sk-${i}`} className="skeleton-row">
      <td><div className="skeleton skeleton-sm" /></td>
      <td><div className="skeleton skeleton-md" /></td>
      <td><div className="skeleton skeleton-sm" /></td>
      <td><div className="skeleton skeleton-lg" /></td>
    </tr>
  ));

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Catalogue des Articles</h1>
        <p className="page-subtitle">Gérez votre inventaire, filtres et actions en un seul endroit</p>
      </div>

      <Notification type="error" message={error} />

      <div className="toolbar-modern">
        <div className="search-box">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Rechercher (code, désignation, code-barre)..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={categorieFiltre}
          onChange={(e) => {
            setCategorieFiltre(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c.categorie_id} value={c.categorie_id}>
              {c.nom}
            </option>
          ))}
        </select>

        <div className="spacer" />

        {canEdit && (
          <button className="btn-primary-modern" onClick={openFormModalForCreate}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
            </svg>
            Nouvel article
          </button>
        )}
      </div>

      <div className="table-card">
        {loading ? (
          <table className="data-table-modern">
            <thead>
              <tr>
                <th>Code</th>
                <th>Désignation</th>
                <th>Catégorie</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>{skeletonRows}</tbody>
          </table>
        ) : articles.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
            <p>Aucun article trouvé</p>
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={articles}
              emptyMessage=""
              tableClassName="data-table-modern"
            />
            <div className="pagination-modern">
              <div className="pagination-info">
                Affichage de <strong>{(page - 1) * 10 + 1}-{Math.min(page * 10, pageInfo.count)}</strong> sur <strong>{pageInfo.count}</strong> articles
              </div>
              <Pagination
                page={page}
                setPage={setPage}
                hasNext={!!pageInfo.next}
                hasPrevious={!!pageInfo.previous}
                count={pageInfo.count}
                btnClassName="page-btn"
                activeClassName="active"
              />
            </div>
          </>
        )}
      </div>

      <ArticleModal article={selectedArticle} isOpen={isModalOpen} onClose={closeModal} />
      <ArticleFormModal
        isOpen={isModalFormOpen}
        onClose={closeFormModal}
        onSuccess={handleSavedSuccess}
        articleToEdit={articleToEdit}
      />
    </div>
  );
}