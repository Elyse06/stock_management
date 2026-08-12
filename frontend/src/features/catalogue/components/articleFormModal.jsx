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
  const [lignesInitiales, setLignesInitiales] = useState([]); // Pour traquer les suppressions
  const [categories, setCategories] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isEditMode = Boolean(articleToEdit);

  // Charger les référentiels
  useEffect(() => {
    if (isOpen) {
      listCategories().then((d) => setCategories(d.results ?? d));
      listFournisseurs({ page_size: 100 }).then((d) => setFournisseurs(d.results ?? d));
    }
  }, [isOpen]);

  // Préremplir le formulaire si mode ÉDITION
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

  // Fermeture par la touche Echap
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

  // Synchronisation des fournisseurs (Ajout / Modification / Suppression)
  const synchroniserFournisseurs = async (codeArticle) => {
    const idsInitiaux = new Set(lignesInitiales.filter((l) => l.id).map((l) => l.id));
    const idsActuels = new Set(lignesFournisseurs.filter((l) => l.id).map((l) => l.id));

    // 1. Supprimer les fournisseurs retirés
    for (const l of lignesInitiales) {
      if (l.id && !idsActuels.has(l.id)) {
        await removeArticleFournisseur(l.id);
      }
    }

    // 2. Ajouter ou mettre à jour les fournisseurs
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
        // Mode ÉDITION
        await updateArticle(articleToEdit.code_article, payload);
        await synchroniserFournisseurs(articleToEdit.code_article);
      } else {
        // Mode CRÉATION
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

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1050,
        padding: "1.5rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "2rem",
          borderRadius: "10px",
          width: "90vw",
          maxWidth: "1000px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>
          {isEditMode ? `Modifier l'article "${articleToEdit.designation}"` : "Nouvel Article"}
        </h2>

        <Notification type="error" message={error} />

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flex: 1,
          }}
        >
          <div style={{ overflowY: "auto", paddingRight: "0.5rem", flex: 1 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem 1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <div className="form-field" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Code article *</label>
                <input
                  value={champs.code_article}
                  onChange={handleChange("code_article")}
                  required
                  disabled={isEditMode} // Le code ne doit généralement pas être modifiable
                  style={{
                    padding: "0.5rem",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    backgroundColor: isEditMode ? "#e9ecef" : "#fff",
                  }}
                />
              </div>

              <div className="form-field" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Code-barre</label>
                <input
                  value={champs.code_barre}
                  onChange={handleChange("code_barre")}
                  style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                />
              </div>

              <div className="form-field" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Désignation *</label>
                <input
                  value={champs.designation}
                  onChange={handleChange("designation")}
                  required
                  style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                />
              </div>

              <div className="form-field" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Catégorie *</label>
                <select
                  value={champs.categorie}
                  onChange={handleChange("categorie")}
                  required
                  style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                >
                  <option value="">Choisir...</option>
                  {categories.map((c) => (
                    <option key={c.categorie_id ?? c.id} value={c.categorie_id ?? c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Marque</label>
                <input
                  value={champs.marque}
                  onChange={handleChange("marque")}
                  style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                />
              </div>

              <div className="form-field" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Modèle</label>
                <input
                  value={champs.modele}
                  onChange={handleChange("modele")}
                  style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                />
              </div>

              <div className="form-field" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Unité</label>
                <input
                  value={champs.unite}
                  onChange={handleChange("unite")}
                  placeholder="unité, kg, boîte..."
                  style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                />
              </div>

              <div className="form-field" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Mode de suivi</label>
                <select
                  value={champs.mode_suivi}
                  onChange={handleChange("mode_suivi")}
                  style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                >
                  {MODES_SUIVI.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className="form-field"
                style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "0.25rem" }}
              >
                <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Description</label>
                <textarea
                  value={champs.description}
                  onChange={handleChange("description")}
                  rows={2}
                  style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", resize: "vertical" }}
                />
              </div>
            </div>

            <hr style={{ border: "0", borderTop: "1px solid #eee", margin: "1.5rem 0" }} />

            <label style={{ fontWeight: 600, fontSize: "0.95rem", display: "block", marginBottom: "0.75rem" }}>
              Fournisseurs et prix d'achat
            </label>

            <ArticleFournisseurEditor
              lignes={lignesFournisseurs}
              setLignes={setLignesFournisseurs}
              fournisseurs={fournisseurs}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              marginTop: "1.5rem",
              paddingTop: "1rem",
              borderTop: "1px solid #eee",
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Enregistrement..." : isEditMode ? "Mettre à jour" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}