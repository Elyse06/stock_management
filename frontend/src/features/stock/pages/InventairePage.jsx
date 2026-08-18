import { useEffect, useState } from "react";
import { listInventaires, createInventaire, listMagasins, listMouvements } from "../api";
import { DataTable } from "../../../components/common/DataTable";
import { Modal } from "../../../components/common/Modal";
import { Notification } from "../../../components/common/Notification";
import { useAuth } from "../../../context/AuthContext";

export function InventairePage() {
  const { hasProfil } = useAuth();
  const canEdit = hasProfil("Administrateur", "Magasinier");

  const [inventaires, setInventaires] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [error, setError] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [magasin, setMagasin] = useState("");
  const [inventaireLignes, setInventaireLignes] = useState([]);
  const [chargementStock, setChargementStock] = useState(false);

  const charger = () => listInventaires({ page_size: 50 }).then((d) => setInventaires(d.results ?? d));

  useEffect(() => {
    charger();
    listMagasins({ page_size: 100 }).then((d) => setMagasins(d.results ?? d));
  }, []);

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

          for (const detail of mouvement.details ?? []) {
            const articleCode = detail.article;
            const articleDesignation = detail.article_designation || articleCode;
            const quantite = Number(detail.quantite) || 0;
            const articleEntry = map.get(articleCode) ?? {
              article: articleCode,
              designation: articleDesignation,
              quantite_theorique: 0,
            };

            if (mouvement.type_mouvement === "ENTREE" && magasinDestination === Number(magasin)) {
              articleEntry.quantite_theorique += quantite;
            }

            if (mouvement.type_mouvement === "SORTIE" && magasinSource === Number(magasin)) {
              articleEntry.quantite_theorique -= quantite;
            }

            if (mouvement.type_mouvement === "TRANSFERT") {
              if (magasinDestination === Number(magasin)) articleEntry.quantite_theorique += quantite;
              if (magasinSource === Number(magasin)) articleEntry.quantite_theorique -= quantite;
            }

            map.set(articleCode, articleEntry);
          }
        }

        const lignes = Array.from(map.values())
          .map((ligne) => ({
            ...ligne,
            quantite_theorique: Number(ligne.quantite_theorique) || 0,
            quantite_physique: "",
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

  const ouvrirCreation = () => {
    setMagasin("");
    setInventaireLignes([]);
    setError("");
    setOuvert(true);
  };

  const majLigne = (articleCode, value) => {
    setInventaireLignes((prev) =>
      prev.map((ligne) =>
        ligne.article === articleCode
          ? {
              ...ligne,
              quantite_physique: value,
            }
          : ligne
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
        });
      }

      setOuvert(false);
      setMagasin("");
      setInventaireLignes([]);
      setError("");
      charger();
    } catch {
      setError("Erreur lors de l'enregistrement de l'inventaire.");
    }
  };

  const columns = [
    { key: "article_designation", label: "Article" },
    { key: "magasin_nom", label: "Magasin" },
    { key: "quantite_theorique", label: "Théorique" },
    { key: "quantite_physique", label: "Physique" },
    {
      key: "ecart", label: "Ecart",
      render: (row) => (
        <span style={{ color: Number(row.ecart) === 0 ? "#166534" : "#991b1b", fontWeight: 600 }}>
          {row.ecart}
        </span>
      ),
    },
    {
      key: "date", label: "Date",
      render: (row) => new Date(row.date).toLocaleDateString("fr-FR"),
    },
  ];

  return (
    <div>
      <h1>Inventaires</h1>
      <div className="toolbar">
        <div className="spacer" />
        {canEdit && <button className="btn btn-primary" onClick={ouvrirCreation}>+ Nouvel inventaire</button>}
      </div>

      <Notification type="error" message={error} />
      <DataTable columns={columns} rows={inventaires} emptyMessage="Aucun inventaire enregistré." />

      {ouvert && (
        <Modal title="Nouvel inventaire" onClose={() => setOuvert(false)}>
          <form onSubmit={enregistrer}>
            <div className="form-field">
              <label>Magasin</label>
              <select value={magasin} onChange={(e) => setMagasin(e.target.value)} required>
                <option value="">Choisir un magasin...</option>
                {magasins.map((m) => (
                  <option key={m.magasin_id ?? m.id} value={m.magasin_id ?? m.id}>{m.nom}</option>
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
                          <th>Ecart</th>
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
                                  onChange={(e) => majLigne(ligne.article, e.target.value)}
                                  style={{ width: "100%" }}
                                />
                              </td>
                              <td style={{ color: ecart === 0 ? "#166534" : "#991b1b", fontWeight: 600 }}>
                                {ecart}
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
              <button type="button" className="btn btn-secondary" onClick={() => setOuvert(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={!magasin || inventaireLignes.length === 0}>
                Enregistrer
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
