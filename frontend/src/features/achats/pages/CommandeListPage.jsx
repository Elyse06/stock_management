import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { listCommandes } from "../api";
import { DataTable } from "../../../components/common/DataTable";
import { Pagination } from "../../../components/common/Pagination";
import { StatusBadge } from "../../../components/common/StatusBadge";
import { Notification } from "../../../components/common/Notification";

const STATUTS = ["EN_ATTENTE", "EN_COURS", "VALIDEE", "REJETEE"];

export function CommandeListPage() {
  const [commandes, setCommandes] = useState([]);
  const [statutFiltre, setStatutFiltre] = useState("");
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const charger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page };
      if (statutFiltre) params.statut = statutFiltre;
      const data = await listCommandes(params);
      setCommandes(data.results ?? data);
      setPageInfo({ count: data.count, next: data.next, previous: data.previous });
    } catch {
      setError("Impossible de charger les commandes.");
    } finally {
      setLoading(false);
    }
  }, [page, statutFiltre]);

  useEffect(() => {
    charger();
  }, [charger]);

  const columns = [
    { key: "commande_id", label: "#" },
    { key: "objet", label: "Objet" },
    { key: "statut", label: "Statut", render: (row) => <StatusBadge value={row.statut} /> },
    { key: "demandeur_username", label: "Demandeur" },
    {
      key: "date_comande", label: "Date demande",
      render: (row) => new Date(row.date_comande).toLocaleDateString("fr-FR"),
    },
    {
      key: "actions", label: "",
      render: (row) => (
        <Link className="btn btn-sm btn-secondary" to={`/achats/${row.commande_id}`}>
          Voir
        </Link>
      ),
    },
  ];

  return (
    <div>
      <h1>Commandes</h1>
      <div className="toolbar">
        <select
          value={statutFiltre}
          onChange={(e) => { setStatutFiltre(e.target.value); setPage(1); }}
        >
          <option value="">Tous statuts</option>
          {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="spacer" />
        <Link className="btn btn-primary" to="/achats/nouveau">+ Nouvelle demande</Link>
      </div>

      <Notification type="error" message={error} />

      {loading ? <p>Chargement...</p> : (
        <>
          <DataTable columns={columns} rows={commandes} emptyMessage="Aucune commande." />
          <Pagination
            page={page} setPage={setPage}
            hasNext={!!pageInfo.next} hasPrevious={!!pageInfo.previous} count={pageInfo.count}
          />
        </>
      )}
    </div>
  );
}
