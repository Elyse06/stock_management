import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getArticle, createArticle, updateArticle,
  listCategories, listFournisseurs,
  addArticleFournisseur, updateArticleFournisseur, removeArticleFournisseur,
} from "../api";
import { ArticleFournisseurEditor } from "../components/ArticleFournisseurEditor";
import { Notification } from "../../../components/common/Notification";

const MODES_SUIVI = [
  { value: "QUANTITE", label: "Quantite simple" },
  { value: "LOT", label: "Suivi par lot" },
  { value: "NUMERO_SERIE", label: "Suivi par numero de serie" },
];

const CHAMPS_VIDES = {
  code_article: "", code_barre: "", designation: "", description: "",
  marque: "", modele: "", unite: "", mode_suivi: "QUANTITE", categorie: "",
};

export function ArticleFormPage() {
  const { code } = useParams();
  const isEdition = Boolean(code);
  const navigate = useNavigate();

  const [champs, setChamps] = useState(CHAMPS_VIDES);
  const [lignesFournisseurs, setLignesFournisseurs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCategories().then((d) => setCategories(d.results ?? d));
    listFournisseurs({ page_size: 100 }).then((d) => setFournisseurs(d.results ?? d));
  }, []);

  useEffect(() => {
    if (!isEdition) return;
    getArticle(code).then((data) => {
      setChamps({
        code_article: data.code_article,
        code_barre: data.code_barre || "",
        designation: data.designation,
        description: data.description || "",
        marque: data.marque || "",
        modele: data.modele || "",
        unite: data.unite || "",
        mode_suivi: data.mode_suivi,
        categorie: data.categorie,
      });
      setLignesFournisseurs(
        (data.fournisseurs || []).map((f) => ({
          id: f.id,
          fournisseur: f.fournisseur,
          fournisseur_nom: f.fournisseur_nom,
          prix_achat: f.prix_achat,
        }))
      );
    });
  }, [code, isEdition]);

  const handleChange = (field) => (e) => {
    setChamps({ ...champs, [field]: e.target.value });
  };

  // Reconcilie les lignes fournisseur affichees avec l'etat reel en base
  const synchroniserFournisseurs = async (articleCode, lignesInitiales) => {
    const idsInitiaux = new Set(lignesInitiales.filter((l) => l.id).map((l) => l.id));
    const idsActuels = new Set(lignesFournisseurs.filter((l) => l.id).map((l) => l.id));

    for (const l of lignesInitiales) {
      if (l.id && !idsActuels.has(l.id)) {
        await removeArticleFournisseur(l.id);
      }
    }
    for (const l of lignesFournisseurs) {
      if (l.id && idsInitiaux.has(l.id)) {
        await updateArticleFournisseur(l.id, { prix_achat: l.prix_achat });
      } else if (!l.id) {
        await addArticleFournisseur({
          article: articleCode, fournisseur: l.fournisseur, prix_achat: l.prix_achat,
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...champs, categorie: Number(champs.categorie) };
      //console.log(champs.categorie);
      const lignesInitiales = isEdition
        ? (await getArticle(code)).fournisseurs.map((f) => ({ id: f.id }))
        : [];

      if (isEdition) {
        await updateArticle(code, payload);
      } else {
        await createArticle(payload);
      }
      await synchroniserFournisseurs(champs.code_article, lignesInitiales);
      navigate("/catalogue");
    } catch (err) {
      setError(
        err.response?.data
          ? JSON.stringify(err.response.data)
          : "Erreur lors de l'enregistrement."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>{isEdition ? "Modifier l'article" : "Nouvel article"}</h1>
      <Notification type="error" message={error} />

      <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div className="form-field">
          <label>Code article</label>
          <input
            value={champs.code_article}
            onChange={handleChange("code_article")}
            disabled={isEdition}
            required
          />
        </div>
        <div className="form-field">
          <label>Code-barre</label>
          <input value={champs.code_barre} onChange={handleChange("code_barre")} />
        </div>
        <div className="form-field">
          <label>Designation</label>
          <input value={champs.designation} onChange={handleChange("designation")} required />
        </div>
        <div className="form-field">
          <label>Description</label>
          <textarea value={champs.description} onChange={handleChange("description")} rows={3} />
        </div>
        <div className="form-field">
          <label>Marque</label>
          <input value={champs.marque} onChange={handleChange("marque")} />
        </div>
        <div className="form-field">
          <label>Modele</label>
          <input value={champs.modele} onChange={handleChange("modele")} />
        </div>
        <div className="form-field">
          <label>Unite</label>
          <input value={champs.unite} onChange={handleChange("unite")} placeholder="unite, kg, boite..." />
        </div>
        <div className="form-field">
          <label>Mode de suivi</label>
          <select value={champs.mode_suivi} onChange={handleChange("mode_suivi")}>
            {MODES_SUIVI.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Categorie</label>
          <select value={champs.categorie} onChange={handleChange("categorie")} required>
            <option value="">Choisir...</option>
            {categories.map((c) => (
              <option key={c.categorie_id} value={c.categorie_id}>{c.nom}</option>
            ))}
          </select>
        </div>

        <label style={{ fontSize: "0.9rem", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
          Fournisseurs et prix d'achat
        </label>
        <ArticleFournisseurEditor
          lignes={lignesFournisseurs}
          setLignes={setLignesFournisseurs}
          fournisseurs={fournisseurs}
        />

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/catalogue")}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
