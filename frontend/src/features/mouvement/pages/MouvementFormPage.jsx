import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createMouvement } from "../api";
import { listMagasins } from "../../stock/api";
import { listArticles } from "../../catalogue/api";
import { ArticleLignesEditor } from "../../../components/common/ArticleLignesEditor";
import { Notification } from "../../../components/common/Notification";

const TYPES = [
  { value: "ENTREE", label: "Entree" },
  { value: "SORTIE", label: "Sortie" },
  { value: "TRANSFERT", label: "Transfert" },
];

export function MouvementFormPage() {
  const navigate = useNavigate();
  const [type, setType] = useState("ENTREE");
  const [magasinSource, setMagasinSource] = useState("");
  const [magasinDestination, setMagasinDestination] = useState("");
  const [motif, setMotif] = useState("");
  const [origine, setOrigine] = useState("");
  const [lignes, setLignes] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listMagasins({ page_size: 100 }).then((d) => setMagasins(d.results ?? d));
    listArticles({ page_size: 200 }).then((d) => setArticles(d.results ?? d));
  }, []);

  const requiertSource = type === "SORTIE" || type === "TRANSFERT";
  const requiertDestination = type === "ENTREE" || type === "TRANSFERT";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lignes.length === 0) {
      setError("Ajoutez au moins un article au mouvement.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createMouvement({
        type_mouvement,
        magasin_source: requiertSource ? Number(magasinSource) : null,
        magasin_destination: requiertDestination ? Number(magasinDestination) : null,
        motif,
        origine,
        details: lignes.map((l) => ({ article: l.article, quantite: l.quantite })),
      });
      navigate("/stock/mouvements");
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.non_field_errors?.[0] || (data ? JSON.stringify(data) : "Erreur lors de la creation.")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>Nouveau mouvement</h1>
      <Notification type="error" message={error} />

      <form onSubmit={handleSubmit} style={{ maxWidth: 520 }}>
        <div className="form-field">
          <label>Type de mouvement</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {requiertSource && (
          <div className="form-field">
            <label>Magasin source</label>
            <select value={magasinSource} onChange={(e) => setMagasinSource(e.target.value)} required>
              <option value="">Choisir...</option>
              {magasins.map((m) => <option key={m.magasin_id} value={m.magasin_id}>{m.nom}</option>)}
            </select>
          </div>
        )}

        {requiertDestination && (
          <div className="form-field">
            <label>Magasin destination</label>
            <select value={magasinDestination} onChange={(e) => setMagasinDestination(e.target.value)} required>
              <option value="">Choisir...</option>
              {magasins.map((m) => <option key={m.magasin_id} value={m.magasin_id}>{m.nom}</option>)}
            </select>
          </div>
        )}

        {type === "TRANSFERT" && magasinSource && magasinDestination && magasinSource === magasinDestination && (
          <Notification type="error" message="Source et destination doivent etre differents." />
        )}

        <div className="form-field">
          <label>Motif (optionnel)</label>
          <input value={motif} onChange={(e) => setMotif(e.target.value)} />
        </div>

        <div className="form-field">
          <label>Origine (optionnel)</label>
          <input value={origine} onChange={(e) => setOrigine(e.target.value)} />
        </div>

        <label style={{ fontSize: "0.9rem", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
          Articles concernes
        </label>
        <ArticleLignesEditor lignes={lignes} setLignes={setLignes} articles={articles} />

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/stock/mouvements")}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
