import { useEffect, useState, useCallback } from "react";
import { listMouvements } from "../api";
import { DataTable } from "../../../components/common/DataTable";
import { Pagination } from "../../../components/common/Pagination";
import { Notification } from "../../../components/common/Notification";
import { MouvementFormModal } from "./MouvementFormPage";

export function SortieListPage() {
  const [mouvements, setMouvements] = useState([]);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const charger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listMouvements({ page, type: "SORTIE" });
      setMouvements(data.results ?? data);
      setPageInfo({ count: data.count, next: data.next, previous: data.previous });
    } catch {
      setError("Impossible de charger les sorties.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    charger();
  }, [charger]);

  const columns = [
    { key: "mouvement_id", label: "#" },
    { key: "magasin_source_nom", label: "Source" },
    {
      key: "date",
      label: "Date",
      render: (row) => new Date(row.date).toLocaleString("fr-FR"),
    },
    {
      key: "nb_lignes",
      label: "Articles",
      render: (row) => row.details?.length ?? 0,
    },
  ];

  return (
    <div>
      <h1>Sorties de stock</h1>
      <div className="toolbar">
        <div className="spacer" />
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          + Nouvelle sortie
        </button>
      </div>

      <Notification type="error" message={error} />

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <>
          <DataTable columns={columns} rows={mouvements} emptyMessage="Aucune sortie." />
          <Pagination
            page={page}
            setPage={setPage}
            hasNext={!!pageInfo.next}
            hasPrevious={!!pageInfo.previous}
            count={pageInfo.count}
          />
        </>
      )}

      <MouvementFormModal
        isOpen={isModalOpen}
        type="SORTIE"
        onClose={() => setIsModalOpen(false)}
        onSuccess={charger}
      />
    </div>
  );
}