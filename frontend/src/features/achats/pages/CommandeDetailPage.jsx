import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getCommande, traiterCommande } from "../api";
import { listMagasins } from "../../stock/api";
import { DataTable } from "../../../components/common/DataTable";
import { StatusBadge } from "../../../components/common/StatusBadge";
import { Notification } from "../../../components/common/Notification";
import { useAuth } from "../../../context/AuthContext";

export function CommandeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasProfil } = useAuth();
  const peutTraiter = hasProfil("Administrateur", "Gestionnaire");

  const [commande, setCommande] = useState(null);
  const [commentaire, setCommentaire] = useState("");
  const [magasins, setMagasins] = useState([]);
  const [magasinSource, setMagasinSource] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [traitement, setTraitement] = useState(false);

  const charger = () =>
    getCommande(id)
      .then(setCommande)
      .catch(() => setError("Commande introuvable."));

  useEffect(() => {
    charger();
    listMagasins({ page_size: 100 })
      .then((data) => setMagasins(data.results ?? data))
      .catch(() => setMagasins([]));
  }, [id]);

  const traiter = async (statut) => {
    setTraitement(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        statut,
        commentaire_agent: commentaire,
      };

      if (statut === "VALIDEE" && magasinSource) {
        payload.magasin_source = Number(magasinSource);
      }

      const updated = await traiterCommande(id, payload);
      setCommande(updated);
      setSuccess(statut === "VALIDEE" ? "Commande validee." : "Commande rejetee.");
    } catch {
      setError("Erreur lors du traitement de la commande.");
    } finally {
      setTraitement(false);
    }
  };

  if (!commande) return <Notification type="error" message={error} />;

  const columns = [
    { key: "article_designation", label: "Article" },
    { key: "quantite", label: "Quantite" },
  ];

  return (
    <div>
      <Link to="/achats">&larr; Retour aux commandes</Link>
      <h1>Commande #{commande.id}</h1>

      <p><strong>Objet :</strong> {commande.objet}</p>
      <p><strong>Statut :</strong> <StatusBadge value={commande.statut} /></p>
      <p><strong>Demandeur :</strong> {commande.demandeur_username}</p>
      <p><strong>Date de demande :</strong> {new Date(commande.date_demande).toLocaleString("fr-FR")}</p>
      {commande.traitant_username && (
        <p><strong>Traite par :</strong> {commande.traitant_username}</p>
      )}
      {commande.commentaire_agent && (
        <p><strong>Commentaire :</strong> {commande.commentaire_agent}</p>
      )}

      <h2 style={{ fontSize: "1.05rem", marginTop: "1.5rem" }}>Articles demandes</h2>
      <DataTable columns={columns} rows={commande.details} />

      <Notification type="error" message={error} />
      <Notification type="success" message={success} />

      {peutTraiter && commande.statut === "EN_ATTENTE" && (
        <div style={{ marginTop: "1.5rem", maxWidth: 480 }}>
          <div className="form-field">
            <label>Magasin source pour la sortie</label>
            <select
              value={magasinSource}
              onChange={(e) => setMagasinSource(e.target.value)}
              className="form-control"
            >
              <option value="">Sélectionner un magasin</option>
              {magasins.map((magasin) => (
                <option key={magasin.magasin_id} value={magasin.magasin_id}>
                  {magasin.nom} {magasin.localite ? `(${magasin.localite})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Commentaire (optionnel)</label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={2}
            />
          </div>
          <div className="form-actions" style={{ justifyContent: "flex-start" }}>
            <button
              className="btn btn-primary"
              disabled={traitement || !magasinSource}
              onClick={() => traiter("VALIDEE")}
            >
              Valider
            </button>
            <button className="btn btn-danger" disabled={traitement} onClick={() => traiter("REJETEE")}>
              Rejeter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
