export function ArticleLignesEditor({ lignes, setLignes, articles }) {
  const handleAddLigne = () => {
    setLignes([...lignes, { article: "", quantite: 1, stock_calcule: 0 }]);
  };

  const handleRemoveLigne = (index) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  const handleChangeArticle = (index, articleId) => {
    const selectedArticle = articles.find((a) => String(a.article_id ?? a.id) === String(articleId));

    const updated = [...lignes];
    updated[index] = {
      ...updated[index],
      article: articleId,
      article_designation: selectedArticle?.designation ?? "",
      stock_calcule: selectedArticle?.stock_calcule ?? 0,
    };
    setLignes(updated);
  };

  const handleChangeQuantite = (index, quantite) => {
    const updated = [...lignes];
    updated[index] = {
      ...updated[index],
      quantite: quantite,
    };
    setLignes(updated);
  };

  return (
    <div className="article-lignes-editor">
      {lignes.map((ligne, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "0.75rem",
            background: "#f9f9f9",
            padding: "0.5rem",
            borderRadius: "4px",
          }}
        >
          {/* Sélection de l'article fournisseur avec indication du stock */}
          <div style={{ flex: 2 }}>
            <select
              value={ligne.article}
              onChange={(e) => handleChangeArticle(index, e.target.value)}
              required
              style={{ width: "100%", padding: "0.5rem" }}
            >
              <option value="">-- Sélectionner un article --</option>
              {articles.map((art) => {
                const id = art.article_id ?? art.id;
                return (
                  <option key={id} value={id}>
                    {art.designation} (En stock : {art.stock_calcule})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Badge récapitulatif du stock actuel en magasin */}
          <div style={{ minWidth: "100px", fontSize: "0.85rem", color: "#555" }}>
            Stock actuel : <strong>{ligne.stock_calcule ?? 0}</strong>
          </div>

          {/* Champ pour la quantité voulue dans la demande d'achat */}
          <div style={{ flex: 1 }}>
            <input
              type="number"
              min="1"
              placeholder="Qté voulue"
              value={ligne.quantite}
              onChange={(e) => handleChangeQuantite(index, e.target.value)}
              required
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </div>

          <button
            type="button"
            className="btn btn-danger"
            onClick={() => handleRemoveLigne(index)}
            title="Supprimer la ligne"
            style={{ padding: "0.4rem 0.75rem" }}
          >
            &times;
          </button>
        </div>
      ))}

      <button
        type="button"
        className="btn btn-secondary"
        onClick={handleAddLigne}
        style={{ marginTop: "0.5rem" }}
      >
        + Ajouter un article
      </button>
    </div>
  );
}