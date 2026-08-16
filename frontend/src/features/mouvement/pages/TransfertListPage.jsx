import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { listMouvements } from "../api";
import { DataTable } from "../../../components/common/DataTable";
import { Pagination } from "../../../components/common/Pagination";
import { StatusBadge } from "../../../components/common/StatusBadge";
import { Notification } from "../../../components/common/Notification";

const TYPES = ["ENTREE", "SORTIE", "TRANSFERT"];

export function TransfertListPage() {
  const [mouvements, setMouvements] = useState([]);
  const [typeFiltre, setTypeFiltre] = useState("");
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const charger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page };
      if (typeFiltre) params.type = typeFiltre;
      const data = await listMouvements(params);
      setMouvements(data.results ?? data);
      setPageInfo({ count: data.count, next: data.next, previous: data.previous });
    } catch {
      setError("Impossible de charger les mouvements.");
    } finally {
      setLoading(false);
    }
  }, [page, typeFiltre]);

  useEffect(() => { charger(); }, [charger]);

  const columns = [
    { key: "mouvement_id", label: "#" },
    { key: "type_mouvement", label: "Type", render: (row) => <StatusBadge value={row.type_mouvement} /> },
    { key: "magasin_source_nom", label: "Source" },
    { key: "magasin_destination_nom", label: "Destination" },
    {
      key: "date", label: "Date",
      render: (row) => new Date(row.date).toLocaleString("fr-FR"),
    },
    {
      key: "nb_lignes", label: "Articles",
      render: (row) => row.details?.length ?? 0,
    },
  ];

  return (
    <div>
      <h1>Mouvements de stock</h1>
      <div className="toolbar">
        <select value={typeFiltre} onChange={(e) => { setTypeFiltre(e.target.value); setPage(1); }}>
          <option value="">Tous types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="spacer" />
        <Link className="btn btn-primary" to="/stock/mouvements/nouveau">+ Nouveau mouvement</Link>
      </div>

      <Notification type="error" message={error} />

      {loading ? <p>Chargement...</p> : (
        <>
          <DataTable columns={columns} rows={mouvements} emptyMessage="Aucun mouvement." />
          <Pagination
            page={page} setPage={setPage}
            hasNext={!!pageInfo.next} hasPrevious={!!pageInfo.previous} count={pageInfo.count}
          />
        </>
      )}
    </div>
  );
}
