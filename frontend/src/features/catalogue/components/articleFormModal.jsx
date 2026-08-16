import { useEffect, useState } from "react";
import {
  createArticle,
  updateArticle,
  listCategories,
  listFournisseurs,
  addArticleFournisseur,
  updateArticleFournisseur,
  removeArticleFournisseur,
} from "../api";
import { ArticleFournisseurEditor } from "./ArticleFournisseurEditor";
import { Notification } from "../../../components/common/Notification";
import "./article.css";

const MODES_SUIVI = [
  { value: "QUANTITE", label: "Quantité simple" },
  { value: "LOT", label: "Suivi par lot" },
  { value: "NUMERO_SERIE", label: "Suivi par numéro de série" },
];

const CHAMPS_VIDES = {
  code_article: "",
  code_barre: "",
  designation: "",
  description: "",
  marque: "",
  modele: "",
  unite: "",
  mode_suivi: "QUANTITE",
  categorie: "",
};

export function ArticleFormModal({ isOpen, onClose, onSuccess, articleToEdit = null }) {
  const [champs, setChamps] = useState(CHAMPS_VIDES);
  const [lignesFournisseurs, setLignesFournisseurs] = useState([]);
  const [lignesInitiales, setLignesInitiales] = useState([]);
  const [categories, setCategories] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isEditMode = Boolean(articleToEdit);

  useEffect(() => {
    if (isOpen) {
      listCategories().then((d) => setCategories(d.results ?? d));
      listFournisseurs({ page_size: 100 }).then((d) => setFournisseurs(d.results ?? d));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && articleToEdit) {
      setChamps({
        code_article: articleToEdit.code_article ?? "",
        code_barre: articleToEdit.code_barre ?? "",
        designation: articleToEdit.designation ?? "",
        description: articleToEdit.description ?? "",
        marque: articleToEdit.marque ?? "",
        modele: articleToEdit.modele ?? "",
        unite: articleToEdit.unite ?? "",
        mode_suivi: articleToEdit.mode_suivi ?? "QUANTITE",
        categorie: articleToEdit.categorie ?? "",
      });

      const fours = articleToEdit.fournisseurs ?? [];
      setLignesFournisseurs(fours);
      setLignesInitiales(fours);
    } else if (isOpen) {
      setChamps(CHAMPS_VIDES);
      setLignesFournisseurs([]);
      setLignesInitiales([]);
    }
  }, [isOpen, articleToEdit]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") handleClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setChamps(CHAMPS_VIDES);
    setLignesFournisseurs([]);
    setError("");
    onClose();
  };

  const handleChange = (field) => (e) => {
    setChamps({ ...champs, [field]: e.target.value });
  };

  const synchroniserFournisseurs = async (codeArticle) => {
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
          article: codeArticle,
          fournisseur: l.fournisseur,
          prix_achat: l.prix_achat,
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

      if (isEditMode) {
        await updateArticle(articleToEdit.code_article, payload);
        await synchroniserFournisseurs(articleToEdit.code_article);
      } else {
        await createArticle(payload);
        for (const l of lignesFournisseurs) {
          await addArticleFournisseur({
            article: champs.code_article,
            fournisseur: l.fournisseur,
            prix_achat: l.prix_achat,
          });
        }
      }

      if (onSuccess) onSuccess();
      handleClose();
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

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) handleClose();
  };

  return (
    <div className="modal-overlay-form" onClick={handleOverlayClick}>
      <div className="modal-card-form">
        {/* Header */}
        <div className="modal-header-form">
          <div className="modal-title-group-form">
            <span className={`modal-badge-form ${isEditMode ? "edit" : "create"}`}>
              {isEditMode ? "Édition" : "Création"}
            </span>
            <h2 className="modal-title-form">
              {isEditMode ? `Modifier l'article` : "Nouvel Article"}
            </h2>
          </div>
          <button className="modal-close-form" onClick={handleClose} aria-label="Fermer">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="modal-body-form">
          <Notification type="error" message={error} />

          <form onSubmit={handleSubmit} className="form-modern">
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">
                  Code article <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={champs.code_article}
                  onChange={handleChange("code_article")}
                  required
                  disabled={isEditMode}
                  placeholder="ART-XXX"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Code-barre</label>
                <input
                  type="text"
                  className="form-input"
                  value={champs.code_barre}
                  onChange={handleChange("code_barre")}
                  placeholder="Scannez ou saisissez..."
                />
              </div>

              <div className="form-field">
                <label className="form-label">
                  Désignation <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={champs.designation}
                  onChange={handleChange("designation")}
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label">
                  Catégorie <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={champs.categorie}
                  onChange={handleChange("categorie")}
                  required
                >
                  <option value="">Choisir...</option>
                  {categories.map((c) => (
                    <option key={c.categorie_id ?? c.id} value={c.categorie_id ?? c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">Marque</label>
                <input
                  type="text"
                  className="form-input"
                  value={champs.marque}
                  onChange={handleChange("marque")}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Modèle</label>
                <input
                  type="text"
                  className="form-input"
                  value={champs.modele}
                  onChange={handleChange("modele")}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Unité</label>
                <input
                  type="text"
                  className="form-input"
                  value={champs.unite}
                  onChange={handleChange("unite")}
                  placeholder="unité, kg, boîte..."
                />
              </div>

              <div className="form-field">
                <label className="form-label">Mode de suivi</label>
                <select
                  className="form-select"
                  value={champs.mode_suivi}
                  onChange={handleChange("mode_suivi")}
                >
                  {MODES_SUIVI.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field full-width">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={champs.description}
                  onChange={handleChange("description")}
                  rows={3}
                  placeholder="Description détaillée de l'article..."
                />
              </div>
            </div>

            <div className="section-divider">
              <span className="section-divider-text">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Fournisseurs et prix d'achat
              </span>
            </div>

            <ArticleFournisseurEditor
              lignes={lignesFournisseurs}
              setLignes={setLignesFournisseurs}
              fournisseurs={fournisseurs}
            />

            {/* Footer */}
            <div className="modal-footer-form">
              <button type="button" className="btn-modal-form btn-modal-cancel" onClick={handleClose}>
                Annuler
              </button>
              <button type="submit" className="btn-modal-form btn-modal-save" disabled={saving}>
                {saving ? (
                  <>
                    <span className="btn-spinner-form" />
                    Enregistrement...
                  </>
                ) : isEditMode ? (
                  <>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Mettre à jour
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}