import { useEffect, useState } from "react";
import { createInventaire, listMouvements } from "../api";
import { Modal } from "../../../components/common/Modal";

export function NouvelInventaireModal({ magasins, isOpen, onClose, onSuccess }) {
  const [magasin, setMagasin] = useState("");
  const [inventaireLignes, setInventaireLignes] = useState([]);
  const [chargementStock, setChargementStock] = useState(false);
  const [error, setError] = useState("");

  // Réinitialiser le formulaire au changement du magasin sélectionné
  useEffect(() => {
    if (!magasin) {
      setInventaireLignes([]);
      return;
    }

    const chargerStockDuMagasin = async () => {
      setChargementStock(true);
      setError("");

      try {
        const data = await listMouvements({ page_size: 500 });
        const mouvements = data.results ?? data;
        const map = new Map();

        for (const mouvement of mouvements) {
          const magasinSource = Number(mouvement.magasin_source);
          const magasinDestination = Number(mouvement.magasin_destination);
          const currentMagasin = Number(magasin);

          for (const detail of mouvement.details ?? []) {
            const articleCode = detail.article;
            const articleDesignation = detail.article_designation || articleCode;
            const quantite = Number(detail.quantite) || 0;

            const articleEntry = map.get(articleCode) ?? {
              article: articleCode,
              designation: articleDesignation,
              quantite_theorique: 0,
              commentaire: "",
            };

            if (mouvement.type_mouvement === "ENTREE" && magasinDestination === currentMagasin) {
              articleEntry.quantite_theorique += quantite;
            }

            if (mouvement.type_mouvement === "SORTIE" && magasinSource === currentMagasin) {
              articleEntry.quantite_theorique -= quantite;
            }

            if (mouvement.type_mouvement === "TRANSFERT") {
              if (magasinDestination === currentMagasin) articleEntry.quantite_theorique += quantite;
              if (magasinSource === currentMagasin) articleEntry.quantite_theorique -= quantite;
            }

            map.set(articleCode, articleEntry);
          }
        }

        const lignes = Array.from(map.values())
          .map((ligne) => ({
            ...ligne,
            quantite_theorique: Number(ligne.quantite_theorique) || 0,
            quantite_physique: "",
            commentaire: "",
          }))
          .sort((a, b) => a.designation.localeCompare(b.designation));

        setInventaireLignes(lignes);
      } catch {
        setError("Impossible de charger les articles du magasin choisi.");
        setInventaireLignes([]);
      } finally {
        setChargementStock(false);
      }
    };

    chargerStockDuMagasin();
  }, [magasin]);

  const majLigne = (articleCode, champ, value) => {
    setInventaireLignes((prev) =>
      prev.map((ligne) =>
        ligne.article === articleCode ? { ...ligne, [champ]: value } : ligne
      )
    );
  };

  const enregistrer = async (e) => {
    e.preventDefault();

    const lignesValides = inventaireLignes.filter(
      (ligne) => ligne.quantite_physique !== "" && ligne.quantite_physique !== null
    );

    if (!lignesValides.length) {
      setError("Aucune quantité physique renseignée.");
      return;
    }

    try {
      for (const ligne of lignesValides) {
        await createInventaire({
          article: ligne.article,
          magasin: Number(magasin),
          quantite_theorique: Number(ligne.quantite_theorique),
          quantite_physique: Number(ligne.quantite_physique),
          commentaire: ligne.commentaire || "",
        });
      }

      setMagasin("");
      setInventaireLignes([]);
      setError("");
      onSuccess(); // Recharge la liste parente et ferme la modale
    } catch {
      setError("Erreur lors de l'enregistrement de l'inventaire.");
    }
  };

  if (!isOpen) return null;

  return (
    <Modal title="Nouvel inventaire" onClose={onClose}>
      {error && <p style={{ color: "#991b1b", marginBottom: "1rem" }}>{error}</p>}
      
      <form onSubmit={enregistrer}>
        <div className="form-field">
          <label>Magasin</label>
          <select value={magasin} onChange={(e) => setMagasin(e.target.value)} required>
            <option value="">Choisir un magasin...</option>
            {magasins.map((m) => (
              <option key={m.magasin_id ?? m.id} value={m.magasin_id ?? m.id}>
                {m.nom}
              </option>
            ))}
          </select>
        </div>

        {magasin && (
          <>
            {chargementStock ? (
              <p>Chargement des articles du magasin...</p>
            ) : inventaireLignes.length === 0 ? (
              <p>Aucun article stocké dans ce magasin pour le moment.</p>
            ) : (
              <div style={{ marginTop: "1rem" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th>Théorique</th>
                      <th>Physique</th>
                      <th>Écart</th>
                      <th>Commentaire</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventaireLignes.map((ligne) => {
                      const ecart = Number(ligne.quantite_physique || 0) - Number(ligne.quantite_theorique || 0);

                      return (
                        <tr key={ligne.article}>
                          <td>{ligne.designation}</td>
                          <td>{ligne.quantite_theorique}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={ligne.quantite_physique}
                              onChange={(e) => majLigne(ligne.article, "quantite_physique", e.target.value)}
                              style={{ width: "100%" }}
                            />
                          </td>
                          <td style={{ color: ecart === 0 ? "#166534" : "#991b1b", fontWeight: 600 }}>
                            {ecart}
                          </td>
                          <td>
                            <input
                              type="text"
                              value={ligne.commentaire}
                              onChange={(e) => majLigne(ligne.article, "commentaire", e.target.value)}
                              style={{ width: "100%" }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <div className="form-actions" style={{ marginTop: "1rem" }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" disabled={!magasin || inventaireLignes.length === 0}>
            Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
}