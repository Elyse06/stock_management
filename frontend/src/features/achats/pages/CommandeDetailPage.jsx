import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getCommande, traiterCommande } from "../api";
import { listMagasins } from "../../stock/api";
import { listArticles } from "../../catalogue/api";
import { DataTable } from "../../../components/common/DataTable";
import { StatusBadge } from "../../../components/common/StatusBadge";
import { Notification } from "../../../components/common/Notification";
import { useAuth } from "../../../context/AuthContext";

export function CommandeDetailPage({ commandeId, onClose, onUpdated }) {
  const { id: routeId } = useParams();
  const id = commandeId ?? routeId;
  const { hasProfil } = useAuth();
  const peutTraiter = hasProfil("Administrateur", "Gestionnaire");

  const [commande, setCommande] = useState(null);
  const [commentaire, setCommentaire] = useState("");
  const [magasins, setMagasins] = useState([]);
  const [articles, setArticles] = useState([]); 
  const [magasinSource, setMagasinSource] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [traitement, setTraitement] = useState(false);

  useEffect(() => {
    getCommande(id).then(setCommande);
    listMagasins({ page_size: 100 }).then((data) =>
      setMagasins(data.results ?? data),
    );
  }, [id]);

  useEffect(() => {
    const params = { page_size: 1000 };

    // Si un magasin est sélectionné, on demande le stock spécifique à ce magasin
    if (magasinSource) {
      params.magasin_id = magasinSource;
    }

    listArticles(params)
      .then((data) => setArticles(data.results ?? data))
      .catch(() => setArticles([]));
  }, [magasinSource]);

  // 3. Calcul du stock par article par rapport au magasin sélectionné
  const detailsAvecStock = (commande?.details || []).map((item) => {
    const articleInfo = articles.find((a) => a.code_article === item.article);
    const stockDispo = articleInfo ? Number(articleInfo.stock_calcule) : 0;
    const quantiteDemandee = Number(item.quantite);

    return {
      ...item,
      stock_disponible: stockDispo,
      est_insuffisant: quantiteDemandee > stockDispo,
    };
  });

  // Vérifier si un des articles a une quantité demandée > au stock disponible
  const stockInsuffisantGlobal = detailsAvecStock.some(
    (item) => item.est_insuffisant,
  );

  const traiter = async (statut) => {
    // Si la validation est demandée mais que le stock est insuffisant, bloquer
    if (statut === "VALIDEE" && stockInsuffisantGlobal) {
      setError(
        "Impossible de valider : la quantité demandée dépasse le stock disponible pour un ou plusieurs articles.",
      );
      return;
    }

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
      onUpdated?.();
      const messages = {
        EN_COURS: "Commande mise en cours.",
        VALIDEE: "Commande validée.",
        REJETEE: "Commande rejetée.",
      };
      setSuccess(messages[statut]);
    } catch {
      setError("Erreur lors du traitement de la commande.");
    } finally {
      setTraitement(false);
    }
  };

  if (!commande) return <Notification type="error" message={error} />;

  const columns = [
    { key: "article_designation", label: "Article" },
    { key: "quantite", label: "Quantité demandée" },
    ...(commande.statut !== "VALIDEE"
      ? [{
          key: "stock_disponible",
          label: "Stock disponible",
          render: (row) => (
            <span
              style={{
                color: row.est_insuffisant ? "red" : "inherit",
                fontWeight: row.est_insuffisant ? "bold" : "normal",
              }}
            >
              {row.stock_disponible} {row.est_insuffisant && "(Insuffisant)"}
            </span>
          ),
        }]
      : []),
  ];

  return (
    <div>
      <p>Commande de {commande.demandeur_username}</p>

      <p>
        <strong>Objet :</strong> {commande.objet}
      </p>
      <p>
        <strong>Statut :</strong> <StatusBadge value={commande.statut} />
      </p>
      <p>
        <strong>Demandeur :</strong> {commande.demandeur_username}
      </p>
      <p>
        <strong>Date de demande :</strong>{" "}
        {new Date(commande.date_comande).toLocaleString("fr-FR")}
      </p>
      {commande.traitant_username && (
        <p>
          <strong>Traité par :</strong> {commande.traitant_username}
        </p>
      )}
      {commande.commentaire_agent && (
        <p>
          <strong>Commentaire :</strong> {commande.commentaire_agent}
        </p>
      )}

      <h2 style={{ fontSize: "1.05rem", marginTop: "1.5rem" }}>
        Articles demandés
      </h2>
      <DataTable columns={columns} rows={detailsAvecStock} />

      <Notification type="error" message={error} />
      <Notification type="success" message={success} />

      {peutTraiter && ["EN_ATTENTE", "EN_COURS"].includes(commande.statut) && (
        <div style={{ marginTop: "1.5rem", maxWidth: 480 }}>
          {stockInsuffisantGlobal && (
            <Notification
              type="error"
              message="Attention : Le stock est insuffisant pour valider cette commande."
            />
          )}

          <div className="form-field">
            <label>Magasin source pour la sortie</label>
            <select
              value={magasinSource}
              onChange={(e) => setMagasinSource(e.target.value)}
              className="form-control"
            >
              <option value="">Sélectionner un magasin</option>
              {magasins.map((m) => (
                <option key={m.magasin_id} value={m.magasin_id}>
                  {m.nom}
                </option>
              ))}
            </select>
          </div>

          <DataTable columns={columns} rows={detailsAvecStock} />

          <div className="form-field">
            <label>Commentaire (optionnel)</label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={2}
            />
          </div>

          <div
            className="form-actions"
            style={{ justifyContent: "flex-start" }}
          >
            <button
              className="btn btn-primary"
              disabled={traitement || stockInsuffisantGlobal || !magasinSource}
              onClick={() => traiter("VALIDEE")}
              title={
                stockInsuffisantGlobal ? "Stock disponible insuffisant" : ""
              }
            >
              Valider
            </button>
            {commande.statut === "EN_ATTENTE" && (
              <button
                className="btn btn-primary"
                disabled={traitement || !magasinSource}
                onClick={() => traiter("EN_COURS")}
              >
                Mettre en cours
              </button>
            )}
            <button
              className="btn btn-danger"
              disabled={traitement}
              onClick={() => traiter("REJETEE")}
            >
              Rejeter
            </button>
            {onClose ? (
              <button type="button" className="btn btn-secondary" onClick={onClose}>Fermer</button>
            ) : (
              <Link to="/achats">&larr; Retour aux commandes</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
