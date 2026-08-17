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
  
  const [origine, setOrigine] = useState("");
  const [motif, setMotif] = useState("");
  const [magasinSource, setMagasinSource] = useState("");
  const [magasinDestination, setMagasinDestination] = useState("");
  
  const [details, setDetails] = useState([
    { article: "", quantite: 1 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setOrigine("");
      setMotif("");
      setMagasinSource("");
      setMagasinDestination("");
      setDetails([{ article: "", quantite: 1 }]);
      setError("");

      Promise.all([listMagasins(), listArticles()])
        .then(([magasinsData, articlesData]) => {
          setMagasins(magasinsData.results ?? magasinsData);
          setArticles(articlesData.results ?? articlesData);
        })
        .catch(() => setError("Impossible de charger les données initiales."));
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const titles = {
    ENTREE: "Nouvelle Entrée de stock",
    SORTIE: "Nouvelle Sortie de stock",
    TRANSFERT: "Nouveau Transfert de stock",
  };

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

    const hasInvalidArticle = details.some((d) => !d.article || String(d.article).trim() === "");
    if (hasInvalidArticle) {
      return setError("Veuillez sélectionner un article valide pour chaque ligne.");
    }

    if (type === "ENTREE" && !magasinDestination) {
      return setError("Le magasin destination est requis.");
    }

    if (type === "SORTIE" && !magasinSource) {
      return setError("Le magasin source est requis.");
    }

    if (type === "TRANSFERT") {
      if (!magasinSource) return setError("Le magasin source est requis.");
      if (!magasinDestination) return setError("Le magasin destination est requis.");
      if (magasinSource === magasinDestination) {
        return setError("Le magasin source et destination doivent être différents.");
      }
    }

    // Le backend Django gère la 'date' et 'mouvement_id' automatiquement
    const payload = {
      type_mouvement: type,
      details: details.map((d) => ({
        article: String(d.article),
        quantite: parseInt(d.quantite, 10),
      })),
    };

    if (type === "ENTREE") {
      payload.magasin_destination = Number(magasinDestination);
      payload.origine = origine.trim();
    } else if (type === "SORTIE") {
      payload.magasin_source = Number(magasinSource);
      payload.motif = motif.trim();
    } else if (type === "TRANSFERT") {
      payload.magasin_source = Number(magasinSource);
      payload.magasin_destination = Number(magasinDestination);
    }

    setLoading(true);
    try {
      await createMouvement(payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || "Erreur lors de l'enregistrement du mouvement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={overlayStyle}>
      <div className="modal-content" style={modalStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>{titles[type]}</h2>
          <button type="button" onClick={onClose} className="btn-close" style={{ cursor: "pointer", border: "none", background: "none", fontSize: "1.5rem" }}>
            &times;
          </button>
        </div>

        <Notification type="error" message={error} />

        <form onSubmit={handleSubmit}>
          {/* Origine (ENTREE) */}
          {type === "ENTREE" && (
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label>Origine / Provenance</label>
              <input
                type="text"
                maxLength={50}
                placeholder="Ex: Fournisseur XYZ, Achat direct..."
                value={origine}
                onChange={(e) => setOrigine(e.target.value)}
                className="form-control"
                style={{ width: "100%", padding: "0.5rem" }}
              />
            </div>
          )}

          {/* Magasin Source (SORTIE / TRANSFERT) */}
          {(type === "SORTIE" || type === "TRANSFERT") && (
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label>Magasin Source *</label>
              <select
                value={magasinSource}
                onChange={(e) => setMagasinSource(e.target.value)}
                required
                className="form-control"
                style={{ width: "100%", padding: "0.5rem" }}
              >
                <option value="">Sélectionner un magasin</option>
                {magasins.map((m) => (
                  <option key={m.magasin_id} value={m.magasin_id}>
                    {m.nom} {m.localite ? `(${m.localite})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Magasin Destination (ENTREE / TRANSFERT) */}
          {(type === "ENTREE" || type === "TRANSFERT") && (
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label>Magasin Destination *</label>
              <select
                value={magasinDestination}
                onChange={(e) => setMagasinDestination(e.target.value)}
                required
                className="form-control"
                style={{ width: "100%", padding: "0.5rem" }}
              >
                <option value="">Sélectionner un magasin</option>
                {magasins.map((m) => (
                  <option key={m.magasin_id} value={m.magasin_id}>
                    {m.nom} {m.localite ? `(${m.localite})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Motif (SORTIE) */}
          {type === "SORTIE" && (
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label>Motif de la sortie</label>
              <input
                type="text"
                maxLength={50}
                placeholder="Ex: Affectation agent, Panne, Perte..."
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                className="form-control"
                style={{ width: "100%", padding: "0.5rem" }}
              />
            </div>
          )}

          {/* Liste des Articles */}
          <h3 style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>Articles concernés</h3>
          {details.map((row, index) => (
            <div key={index} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
              <select
                value={row.article}
                onChange={(e) => handleDetailChange(index, "article", e.target.value)}
                required
                style={{ flex: 3, padding: "0.5rem" }}
              >
                <option value="">-- Sélectionner un article --</option>
                {articles.map((a) => {
                  // Récupère l'identifiant exact de l'article (ex: a.code_article, a.code, ou a.id)
                  const articleKey = a.code_article || a.code || a.article_id || a.id;
                  return (
                    <option key={articleKey} value={articleKey}>
                      {articleKey} - {a.designation}
                    </option>
                  );
                })}
              </select>

              <input
                type="number"
                min="1"
                placeholder="Qté"
                value={row.quantite}
                onChange={(e) => handleDetailChange(index, "quantite", e.target.value)}
                required
                style={{ flex: 1, padding: "0.5rem" }}
              />

              {details.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDetailRow(index)}
                  className="btn btn-danger"
                  style={{ padding: "0.5rem 0.75rem" }}
                >
                  &times;
                </button>
              )}
            </div>
          ))}

          <button 
            type="button" 
            onClick={addDetailRow} 
            className="btn btn-secondary" 
            style={{ marginTop: "0.5rem" }}
          >
            + Ajouter une ligne
          </button>

          {/* Actions */}
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