import { useState } from "react";

/**
 * Editeur de lignes article/quantite, reutilise par les commandes (achats)
 * et les mouvements (stock). Gere l'etat local ; la sauvegarde reelle
 * est faite par le composant parent lors de la soumission du formulaire.
 */
export function ArticleLignesEditor({ lignes, setLignes, articles }) {
  const [articleCode, setArticleCode] = useState("");
  const [quantite, setQuantite] = useState("");

  const ajouterLigne = () => {
    if (!articleCode || !quantite) return;
    const article = articles.find((a) => a.code_article === articleCode);
    setLignes([
      ...lignes,
      { article: articleCode, article_designation: article?.designation, quantite },
    ]);
    setArticleCode("");
    setQuantite("");
  };

  const retirerLigne = (index) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  return (
    <div>
      <table className="data-table" style={{ marginBottom: "0.75rem" }}>
        <thead>
          <tr>
            <th>Article</th>
            <th>Quantite</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lignes.length === 0 && (
            <tr>
              <td colSpan={3} className="empty-message">Aucune ligne ajoutee.</td>
            </tr>
          )}
          {lignes.map((ligne, index) => (
            <tr key={index}>
              <td>{ligne.article_designation || ligne.article}</td>
              <td>{ligne.quantite}</td>
              <td>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => retirerLigne(index)}>
                  Retirer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ligne-form">
        <select value={articleCode} onChange={(e) => setArticleCode(e.target.value)}>
          <option value="">Choisir un article...</option>
          {articles.map((a) => (
            <option key={a.code_article} value={a.code_article}>
              {a.code_article} - {a.designation}
            </option>
          ))}
        </select>
        <input
          type="number" min="0" step="1" placeholder="Quantite"
          value={quantite} onChange={(e) => setQuantite(e.target.value)}
        />
        <button type="button" className="btn btn-sm btn-secondary" onClick={ajouterLigne}>
          Ajouter
        </button>
      </div>
    </div>
  );
}
