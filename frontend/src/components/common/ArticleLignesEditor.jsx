import { useState } from "react";

/**
 * Editeur de lignes article/quantité, réutilisé par les commandes (achats)
 * et les mouvements (stock).
 * Clé primaire Article : code_article (string)
 * Clé étrangère Détail : article (string)
 */
export function ArticleLignesEditor({ lignes, setLignes, articles }) {
  const [articleCode, setArticleCode] = useState("");
  const [quantite, setQuantite] = useState("");

  const ajouterLigne = () => {
    if (!articleCode || !quantite || Number(quantite) <= 0) return;

    const article = articles.find((a) => String(a.code_article) === String(articleCode));

    setLignes([
      ...lignes,
      {
        article: articleCode,
        article_designation: article?.designation || articleCode,
        stock_calcule: article?.stock_calcule ?? 0,
        quantite: Number(quantite),
      },
    ]);

    setArticleCode("");
    setQuantite("");
  };

  const retirerLigne = (index) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  // Récupérer les informations de l'article en cours de sélection
  const selectedArticle = articles.find((a) => String(a.code_article) === String(articleCode));

  return (
    <div>
      <table className="data-table" style={{ marginBottom: "0.75rem", width: "100%" }}>
        <thead>
          <tr>
            <th>Article</th>
            <th style={{ textAlign: "center" }}>Stock Actuel</th>
            <th style={{ textAlign: "center" }}>Quantité Demandée</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lignes.length === 0 && (
            <tr>
              <td colSpan={4} className="empty-message">
                Aucune ligne ajoutée.
              </td>
            </tr>
          )}
          {lignes.map((ligne, index) => (
            <tr key={index}>
              <td>
                <strong>{ligne.article}</strong> - {ligne.article_designation}
              </td>
              <td style={{ textAlign: "center" }}>{ligne.stock_calcule ?? 0}</td>
              <td style={{ textAlign: "center" }}>
                <strong>{ligne.quantite}</strong>
              </td>
              <td style={{ textAlign: "right" }}>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => retirerLigne(index)}
                >
                  Retirer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Formulaire d'ajout de ligne */}
      <div className="ligne-form" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <select
          value={articleCode}
          onChange={(e) => setArticleCode(e.target.value)}
          style={{ flex: 2, padding: "0.4rem" }}
        >
          <option value="">Choisir un article...</option>
          {articles.map((a) => (
            <option key={a.code_article} value={a.code_article}>
              {a.code_article} - {a.designation} (En stock : {a.stock_calcule ?? 0})
            </option>
          ))}
        </select>

        {selectedArticle && (
          <span style={{ fontSize: "0.85rem", color: "#666", whiteSpace: "nowrap" }}>
            Stock : <strong>{selectedArticle.stock_calcule ?? 0}</strong>
          </span>
        )}

        <input
          type="number"
          min="1"
          step="1"
          placeholder="Quantité"
          value={quantite}
          onChange={(e) => setQuantite(e.target.value)}
          style={{ flex: 1, padding: "0.4rem" }}
        />

        <button type="button" className="btn btn-sm btn-secondary" onClick={ajouterLigne}>
          Ajouter
        </button>
      </div>
    </div>
  );
}
