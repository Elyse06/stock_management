import { useState } from "react";

/**
 * Editeur des lignes fournisseur/prix d'un article.
 * Fonctionne en local (le parent envoie les lignes lors de l'enregistrement) :
 * plus simple a raisonner qu'un appel API a chaque ligne ajoutee/retiree.
 */
export function ArticleFournisseurEditor({ lignes, setLignes, fournisseurs }) {
  const [fournisseurId, setFournisseurId] = useState("");
  const [prix, setPrix] = useState("");

  const ajouterLigne = () => {
    if (!fournisseurId || !prix) return;
    const fournisseur = fournisseurs.find((f) => String(f.fournisseur_id) === fournisseurId);
    setLignes([
      ...lignes,
      { fournisseur: Number(fournisseurId), fournisseur_nom: fournisseur?.nom, prix_achat: prix },
    ]);
    setFournisseurId("");
    setPrix("");
  };

  const retirerLigne = (index) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  return (
    <div>
      <table className="data-table" style={{ marginBottom: "0.75rem" }}>
        <thead>
          <tr>
            <th>Fournisseur</th>
            <th>Prix d'achat</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lignes.length === 0 && (
            <tr>
              <td colSpan={3} className="empty-message">
                Aucun fournisseur associe.
              </td>
            </tr>
          )}
          {lignes.map((ligne, index) => (
            <tr key={index}>
              <td>{ligne.fournisseur_nom}</td>
              <td>{ligne.prix_achat}</td>
              <td>
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

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <select value={fournisseurId} onChange={(e) => setFournisseurId(e.target.value)}>
          <option value="">Choisir un fournisseur...</option>
          {fournisseurs
            .filter((f) => !lignes.some((l) => l.fournisseur === f.fournisseur_id))
            .map((f) => (
              <option key={f.fournisseur_id} value={f.fournisseur_id}>
                {f.nom}
              </option>
            ))}
        </select>
        <input
          type="number"
          step="0.01"
          placeholder="Prix"
          value={prix}
          onChange={(e) => setPrix(e.target.value)}
          style={{ width: "100px" }}
        />
        <button type="button" className="btn btn-sm btn-secondary" onClick={ajouterLigne}>
          Ajouter
        </button>
      </div>
    </div>
  );
}
