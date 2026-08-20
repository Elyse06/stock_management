import { useEffect, useState, useCallback } from "react";
import { listMouvements } from "../api";
import { DataTable } from "../../../components/common/DataTable";
import { Pagination } from "../../../components/common/Pagination";
import { Notification } from "../../../components/common/Notification";
import { MouvementFormModal } from "./MouvementFormPage";

export function EntreeListPage() {
  const [mouvements, setMouvements] = useState([]);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entreeSelectionnee, setEntreeSelectionnee] = useState(null);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  const charger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listMouvements({ page, type: "ENTREE" });
      setMouvements(data.results ?? data);
      setPageInfo({ count: data.count, next: data.next, previous: data.previous });
    } catch {
      setError("Impossible de charger les entrées.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    charger();
  }, [charger]);

  const columns = [
    { key: "magasin_destination_nom", label: "Destination" },
    {
      key: "date",
      label: "Date",
      render: (row) => new Date(row.date).toLocaleString("fr-FR"),
    },
    {
      key: "nb_lignes",
      label: "Nombre d'articles",
      render: (row) => row.details?.length ?? 0,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button
          className="btn btn-secondary"
          onClick={() =>
            setEntreeSelectionnee((current) =>
              current?.mouvement_id === row.mouvement_id ? null : row
            )
          }
        >
          {entreeSelectionnee?.mouvement_id === row.mouvement_id ? "Masquer" : "Détails"}
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

  const entreeDetail =
    entreeSelectionnee &&
    mouvementsFiltres.find((m) => m.mouvement_id === entreeSelectionnee.mouvement_id);

  return (
    <div>
      <h1>Entrées de stock</h1>
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
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          + Nouvelle entrée
        </button>
      </div>

      <Notification type="error" message={error} />

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <>
          <DataTable columns={columns} rows={mouvementsFiltres} emptyMessage="Aucune entrée." />
          <Pagination
            page={page}
            setPage={setPage}
            hasNext={!!pageInfo.next}
            hasPrevious={!!pageInfo.previous}
            count={pageInfo.count}
          />
        </>
      )}

      {entreeDetail && (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1rem",
                border: "1px solid #ddd",
                borderRadius: 8,
              }}
            >
              <h3 style={{ marginTop: 0 }}>Détails de l'entrée #{entreeDetail.mouvement_id}</h3>
              {
                entreeDetail.details && entreeDetail.details.length > 0 ? (
                  <DataTable
                    columns={[
                      { key: "article_designation", label: "Article" },
                      { key: "quantite", label: "Quantité" },
                    ]}
                    rows={entreeDetail.details ?? []}
                    emptyMessage="Aucune ligne dans cette entrée."
                  />
                ) : null
              }
            </div>
          )}

      <MouvementFormModal
        isOpen={isModalOpen}
        type="ENTREE"
        onClose={() => setIsModalOpen(false)}
        onSuccess={charger}
      />
    </div>
  );
}