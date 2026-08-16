import { useState, useEffect } from "react";
import { createMouvement } from "../api";
import { listMagasins } from "../../stock/api";
import { listArticles } from "../../catalogue/api";
import { Notification } from "../../../components/common/Notification";

export function MouvementFormModal({
  isOpen,
  type,
  onClose,
  onSuccess,
}) {
  const [magasins, setMagasins] = useState([]);
  const [articles, setArticles] = useState([]);
  
  const [magasinSource, setMagasinSource] = useState("");
  const [magasinDestination, setMagasinDestination] = useState("");
  const [details, setDetails] = useState([
    { article: "", quantite: 1 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Charger les magasins et articles au montage si le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      Promise.all([listMagasins(), listArticles()])
        .then(([magasinsData, articlesData]) => {
          setMagasins(magasinsData.results ?? magasinsData);
          setArticles(articlesData.results ?? articlesData);
        })
        .catch(() => setError("Impossible de charger les données initiales."));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Titres adaptés selon le type
  const titles = {
    ENTREE: "Nouvelle Entrée de stock",
    SORTIE: "Nouvelle Sortie de stock",
    TRANSFERT: "Nouveau Transfert de stock",
  };

  // Gestion des lignes d'articles
  const handleDetailChange = (index, field, value) => {
    const updated = [...details];
    updated[index] = { ...updated[index], [field]: value };
    setDetails(updated);
  };

  const addDetailRow = () => {
    setDetails([...details, { article: "", quantite: 1 }]);
  };

  const removeDetailRow = (index) => {
    if (details.length > 1) {
      setDetails(details.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validations selon le type
    if (type === "SORTIE" || type === "TRANSFERT") {
      if (!magasinSource) return setError("Le magasin source est requis.");
    }
    if (type === "ENTREE" || type === "TRANSFERT") {
      if (!magasinDestination) return setError("Le magasin destination est requis.");
    }
    if (type === "TRANSFERT" && magasinSource === magasinDestination) {
      return setError("Le magasin source et destination doivent être différents.");
    }

    const payload = {
      type_mouvement: type,
      details: details.map((d) => ({
        article: Number(d.article),
        quantite: Number(d.quantite),
      })),
    };

    if (type === "SORTIE" || type === "TRANSFERT") {
      payload.magasin_source = Number(magasinSource);
    }
    if (type === "ENTREE" || type === "TRANSFERT") {
      payload.magasin_destination = Number(magasinDestination);
    }

    setLoading(true);
    try {
      await createMouvement(payload);
      onSuccess(); // Rafraîchit le tableau principal
      onClose();   // Ferme le modal
    } catch {
      setError("Erreur lors de la création du mouvement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={overlayStyle}>
      <div className="modal-content" style={modalStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>{titles[type]}</h2>
          <button type="button" onClick={onClose} className="btn-close" style={{ cursor: "pointer" }}>
            &times;
          </button>
        </div>

        <Notification type="error" message={error} />

        <form onSubmit={handleSubmit}>
          {/* Champ Magasin Source : Uniquement pour SORTIE et TRANSFERT */}
          {(type === "SORTIE" || type === "TRANSFERT") && (
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label>Magasin Source *</label>
              <select
                value={magasinSource}
                onChange={(e) => setMagasinSource(e.target.value)}
                required
                className="form-control"
              >
                <option value="">Sélectionner un magasin</option>
                {magasins.map((m) => (
                  <option key={m.magasin_id} value={m.magasin_id}>
                    {m.nom}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Champ Magasin Destination : Uniquement pour ENTREE et TRANSFERT */}
          {(type === "ENTREE" || type === "TRANSFERT") && (
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label>Magasin Destination *</label>
              <select
                value={magasinDestination}
                onChange={(e) => setMagasinDestination(e.target.value)}
                required
                className="form-control"
              >
                <option value="">Sélectionner un magasin</option>
                {magasins.map((m) => (
                  <option key={m.magasin_id} value={m.magasin_id}>
                    {m.nom}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Liste des articles */}
          <h3>Articles concernés</h3>
          {details.map((row, index) => (
            <div key={index} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <select
                value={row.article}
                onChange={(e) => handleDetailChange(index, "article", e.target.value)}
                required
                style={{ flex: 2 }}
              >
                <option value="">Sélectionner un article</option>
                {articles.map((a) => (
                  <option key={a.article_id} value={a.article_id}>
                    {a.designation}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                value={row.quantite}
                onChange={(e) => handleDetailChange(index, "quantite", e.target.value)}
                required
                style={{ flex: 1 }}
              />

              {details.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDetailRow(index)}
                  className="btn btn-danger"
                >
                  &times;
                </button>
              )}
            </div>
          ))}

          <button type="button" onClick={addDetailRow} className="btn btn-secondary" style={{ marginTop: "0.5rem" }}>
            + Ajouter une ligne
          </button>

          {/* Boutons d'action */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.5rem" }}>
            <button type="button" onClick={onClose} className="btn" disabled={loading}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalStyle = {
  background: "#fff",
  padding: "2rem",
  borderRadius: "8px",
  width: "100%",
  maxWidth: "600px",
  maxHeight: "90vh",
  overflowY: "auto",
};