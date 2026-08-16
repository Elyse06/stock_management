import { useEffect, useState } from "react";
import { listInventaires, createInventaire, listMagasins } from "../api";
import { listArticles } from "../../catalogue/api";
import { DataTable } from "../../../components/common/DataTable";
import { Modal } from "../../../components/common/Modal";
import { Notification } from "../../../components/common/Notification";
import { useAuth } from "../../../context/AuthContext";

export function InventairePage() {
  const { hasProfil } = useAuth();
  const canEdit = hasProfil("Administrateur", "Magasinier");

  const [inventaires, setInventaires] = useState([]);
  const [articles, setArticles] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [error, setError] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [article, setArticle] = useState("");
  const [magasin, setMagasin] = useState("");
  const [quantiteTheorique, setQuantiteTheorique] = useState("");
  const [quantitePhysique, setQuantitePhysique] = useState("");

  const charger = () => listInventaires({ page_size: 50 }).then((d) => setInventaires(d.results ?? d));

  useEffect(() => {
    charger();
    listArticles({ page_size: 200 }).then((d) => setArticles(d.results ?? d));
    listMagasins({ page_size: 100 }).then((d) => setMagasins(d.results ?? d));
  }, []);

  const ecartPreview =
    quantiteTheorique !== "" && quantitePhysique !== ""
      ? Number(quantitePhysique) - Number(quantiteTheorique)
      : null;

  const ouvrirCreation = () => {
    setArticle(""); setMagasin(""); setQuantiteTheorique(""); setQuantitePhysique("");
    setOuvert(true);
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    try {
      await createInventaire({
        article, magasin,
        quantite_theorique: quantiteTheorique,
        quantite_physique: quantitePhysique,
      });
      setOuvert(false);
      charger();
    } catch {
      setError("Erreur lors de l'enregistrement de l'inventaire.");
    }
  };

  const columns = [
    { key: "article_designation", label: "Article" },
    { key: "magasin_nom", label: "Magasin" },
    { key: "quantite_theorique", label: "Theorique" },
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
      <DataTable columns={columns} rows={inventaires} emptyMessage="Aucun inventaire enregistre." />

      {ouvert && (
        <Modal title="Nouvel inventaire" onClose={() => setOuvert(false)}>
          <form onSubmit={enregistrer}>
            <div className="form-field">
              <label>Article</label>
              <select value={article} onChange={(e) => setArticle(e.target.value)} required>
                <option value="">Choisir...</option>
                {articles.map((a) => (
                  <option key={a.code_article} value={a.code_article}>{a.designation}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Magasin</label>
              <select value={magasin} onChange={(e) => setMagasin(e.target.value)} required>
                <option value="">Choisir...</option>
                {magasins.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Quantite theorique (systeme)</label>
              <input
                type="number" step="0.01" value={quantiteTheorique}
                onChange={(e) => setQuantiteTheorique(e.target.value)} required
              />
            </div>
            <div className="form-field">
              <label>Quantite physique (comptee)</label>
              <input
                type="number" step="0.01" value={quantitePhysique}
                onChange={(e) => setQuantitePhysique(e.target.value)} required
              />
            </div>
            {ecartPreview !== null && (
              <Notification
                type={ecartPreview === 0 ? "success" : "error"}
                message={`Ecart calcule : ${ecartPreview > 0 ? "+" : ""}${ecartPreview}`}
              />
            )}
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setOuvert(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
