import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { listMouvements } from "../api";
import { DataTable } from "../../../components/common/DataTable";
import { Pagination } from "../../../components/common/Pagination";
import { Notification } from "../../../components/common/Notification";

export function SortieListPage() {
  const navigate = useNavigate();
  const [mouvements, setMouvements] = useState([]);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortieSelectionnee, setSortieSelectionnee] = useState(null);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

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
    {
      key: "article_designation", 
      label: "Articles", 
      render: (row) => row.details?.map((d) => d.article_designation).join(", ")
    },
    { key: "magasin_source_nom", label: "Source" },
    {
      key: "date",
      label: "Date",
      render: (row) => new Date(row.date).toLocaleString("fr-FR"),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button
          className="btn btn-secondary"
          onClick={() =>
            setSortieSelectionnee((current) =>
              current?.mouvement_id === row.mouvement_id ? null : row
            )
          }
        >
          {sortieSelectionnee?.mouvement_id === row.mouvement_id ? "Masquer" : "Détails"}
        </button>
      ),
    },
  ];

  const mouvementsFiltres = mouvements.filter((mouvement) => {
    if (!dateDebut && !dateFin) return true;

    const mouvementDate = new Date(mouvement.date);
    mouvementDate.setHours(0, 0, 0, 0);

    if (dateDebut) {
      const debut = new Date(dateDebut);
      debut.setHours(0, 0, 0, 0);
      if (mouvementDate < debut) return false;
    }

    if (dateFin) {
      const fin = new Date(dateFin);
      fin.setHours(23, 59, 59, 999);
      if (mouvementDate > fin) return false;
    }

    return true;
  });

  const sortieDetail =
    sortieSelectionnee &&
    mouvementsFiltres.find((m) => m.mouvement_id === sortieSelectionnee.mouvement_id);

  return (
    <div>
      <h1>Sorties de stock</h1>
      <div className="toolbar">
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div className="form-field" style={{ margin: 0 }}>
            <label style={{ display: "block", marginBottom: "0.25rem" }}>Du</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              style={{ padding: "0.5rem" }}
            />
          </div>
          <div className="form-field" style={{ margin: 0 }}>
            <label style={{ display: "block", marginBottom: "0.25rem" }}>Au</label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              style={{ padding: "0.5rem" }}
            />
          </div>
          {(dateDebut || dateFin) && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setDateDebut("");
                setDateFin("");
              }}
              style={{ padding: "0.5rem 1rem", height: "fit-content" }}
            >
              Réinitialiser
            </button>
          )}
        </div>
        <div className="spacer" />
        <button className="btn btn-primary" onClick={() => navigate("/achats")}>
          Traitement de demande
        </button>
      </div>

      <Notification type="error" message={error} />

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <>
          <DataTable columns={columns} rows={mouvementsFiltres} emptyMessage="Aucune sortie." />

          {sortieDetail && (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1rem",
                border: "1px solid #ddd",
                borderRadius: 8,
              }}
            >
              <h3 style={{ marginTop: 0 }}>Détails de la sortie #{sortieDetail.mouvement_id}</h3>
              <p>
                <strong>Origine :</strong> {sortieDetail.origine || "-"}
              </p>
              <p>
                <strong>Motif :</strong> {sortieDetail.motif || "-"}
              </p>
              <DataTable
                columns={[
                  { key: "article_designation", label: "Article" },
                  { key: "quantite", label: "Quantité" },
                ]}
                rows={sortieDetail.details ?? []}
                emptyMessage="Aucune ligne dans cette sortie."
              />
            </div>
          )}

          <Pagination
            page={page}
            setPage={setPage}
            hasNext={!!pageInfo.next}
            hasPrevious={!!pageInfo.previous}
            count={pageInfo.count}
          />
        </>
      )}
    </div>
  );
}