import React, { useEffect, useState, useCallback } from "react";
import { listArticles, listCategories, deleteArticle, getArticle } from "../api";
import { DataTable } from "../../../components/common/DataTable";
import { Pagination } from "../../../components/common/Pagination";
import { Notification } from "../../../components/common/Notification";
import { useAuth } from "../../../context/AuthContext";
import { ArticleModal } from "../components/articleModal";
import { ArticleFormModal } from "../components/articleFormModal";

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

  // Ouvrir le formulaire en mode CRÉATION
  const openFormModalForCreate = () => {
    setArticleToEdit(null);
    setIsModalFormOpen(true);
  };

  // Ouvrir le formulaire en mode ÉDITION
  const openFormModalForEdit = async (article) => {
    try {
      // Charger la donnée complète pour avoir les fournisseurs attachés
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
    charger(); // Recharger la liste instantanément après un ajout ou une mise à jour
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
    { key: "code_article", label: "Code" },
    { key: "designation", label: "Désignation" },
    { key: "categorie_nom", label: "Catégorie" },
    {
      key: "actions",
      label: "",
      render: (row) =>
        canEdit && (
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button className="btn btn-sm btn-info" onClick={() => openModal(row)}>
              Détails
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => openFormModalForEdit(row)}
            >
              Modifier
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(row)}>
              Supprimer
            </button>
          </div>
        ),
    },
  ];

  return (
    <div>
      <div className="toolbar">
        <input
          type="text"
          placeholder="Rechercher (code, désignation, code-barre)..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <select
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
          <button className="btn btn-primary" onClick={openFormModalForCreate}>
            + Nouvel article
          </button>
        )}
      </div>

      <Notification type="error" message={error} />

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <>
          <DataTable columns={columns} rows={articles} emptyMessage="Aucun article trouvé." />
          <Pagination
            page={page}
            setPage={setPage}
            hasNext={!!pageInfo.next}
            hasPrevious={!!pageInfo.previous}
            count={pageInfo.count}
          />
        </>
      )}

      {/* Modale de Détail */}
      <ArticleModal article={selectedArticle} isOpen={isModalOpen} onClose={closeModal} />

      {/* Modale de Formulaire (Création & Modification) */}
      <ArticleFormModal
        isOpen={isModalFormOpen}
        onClose={closeFormModal}
        onSuccess={handleSavedSuccess}
        articleToEdit={articleToEdit}
      />
    </div>
  );
}