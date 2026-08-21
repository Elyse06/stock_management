import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCommande } from "../api";
import { listArticles } from "../../catalogue/api";
import { ArticleLignesEditor } from "../../../components/common/ArticleLignesEditor";
import { Notification } from "../../../components/common/Notification";

const OBJETS_DEMANDE = [
  "Utilisation simple",
  "Nouveau membres",
  "Remplacement de matériel",
  "Autre",
];

export function CommandeFormPage({ onClose, onCreated }) {
  const navigate = useNavigate();
  const [objet, setObjet] = useState("");
  const [lignes, setLignes] = useState([]);
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listArticles({ page_size: 200 }).then((d) => setArticles(d.results ?? d));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lignes.length === 0) {
      setError("Ajoutez au moins un article a la demande.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createCommande({
        objet,
        details: lignes.map((l) => ({
          article: l.article,
          designation: l.article_designation,
          quantite: l.quantite,
        })),
      });
      if (onCreated) {
        onCreated();
      } else {
        navigate("/achats");
      }
    } catch (err) {
      setError(
        err.response?.data ? JSON.stringify(err.response.data) : "Erreur lors de la creation."
      );
    } finally {
      setSaving(false);
    }
  };

    return (
    <div>
      <Notification type="error" message={error} />
      <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
        <div className="form-field">
          <label>Objet de la demande</label>
          <select value={objet} onChange={(e) => setObjet(e.target.value)} required>
            <option value="">Objet</option>
            {OBJETS_DEMANDE.map((objetOption) => (
              <option key={objetOption} value={objetOption}>
                {objetOption}
              </option>
            ))}
          </select>
        </div>
        <label style={{ fontSize: "0.9rem", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
          Articles demandes
        </label>
        <ArticleLignesEditor lignes={lignes} setLignes={setLignes} articles={articles} />
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose || (() => navigate("/achats"))}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Envoi..." : "Envoyer la demande"}
            </button>
        </div>
      </form>
      </div>
  );
}