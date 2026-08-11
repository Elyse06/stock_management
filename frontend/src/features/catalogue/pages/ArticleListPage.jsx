import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { listArticles, listCategories, deleteArticle } from "../api";
import { DataTable } from "../../../components/common/DataTable";
import { Pagination } from "../../../components/common/Pagination";
import { Notification } from "../../../components/common/Notification";
import { useAuth } from "../../../context/AuthContext";

export function ArticleListPage() {
  const { hasProfil } = useAuth();
  const canEdit = hasProfil("Administrateur","Gestionnaire", "Magasinier");

  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categorieFiltre, setCategorieFiltre] = useState("");
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const charger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page };
      if (search) params.search = search;
      if (categorieFiltre) params.categorie = categorieFiltre;
      const data = await listArticles(params);
      setArticles(data.results ?? data);
      setPageInfo({ count: data.count, next: data.next, previous: data.previous });
    } catch (err) {
      setError("Impossible de charger les articles.");
    } finally {
      setLoading(false);
    }
  }, [page, search, categorieFiltre]);

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
      setError("Suppression impossible (article probablement reference ailleurs).");
    }
  };

  const columns = [
    { key: "code_article", label: "Code" },
    { key: "designation", label: "Designation" },
    { key: "categorie_nom", label: "Categorie" },
    { key: "mode_suivi", label: "Suivi" },
    {
      key: "actions",
      label: "",
      render: (row) =>
        canEdit && (
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <Link className="btn btn-sm btn-secondary" to={`/catalogue/${row.code_article}/modifier`}>
              Modifier
            </Link>
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
          placeholder="Rechercher (code, designation, code-barre)..."
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
          <option value="">Toutes categories</option>
          {categories.map((c) => (
            <option key={c.categorie_id} value={c.categorie_id}>
              {c.nom}
            </option>
          ))}
        </select>
        <div className="spacer" />
        {canEdit && (
          <Link className="btn btn-primary" to="/catalogue/nouveau">
            + Nouvel article
          </Link>
        )}
      </div>

      <Notification type="error" message={error} />

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <>
          <DataTable columns={columns} rows={articles} emptyMessage="Aucun article trouve." />
          <Pagination
            page={page}
            setPage={setPage}
            hasNext={!!pageInfo.next}
            hasPrevious={!!pageInfo.previous}
            count={pageInfo.count}
          />
        </>
      )}
    </div>
  );
}
