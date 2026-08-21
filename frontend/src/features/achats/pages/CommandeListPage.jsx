import { useEffect, useState, useCallback } from "react";
import { listCommandes } from "../api";
import { DataTable } from "../../../components/common/DataTable";
import { Pagination } from "../../../components/common/Pagination";
import { StatusBadge } from "../../../components/common/StatusBadge";
import { Notification } from "../../../components/common/Notification";
import { Modal } from "../../../components/common/Modal";
import { CommandeFormPage } from "./CommandeFormPage";
import { CommandeDetailPage } from "./CommandeDetailPage";

const STATUTS = ["EN_ATTENTE", "EN_COURS", "VALIDEE", "REJETEE"];

const PERIODES = [
  { id: "tous", label: "Tous les commandes" },
  { id: "semaine", label: "Cette semaine" },
  { id: "mois", label: "Ce mois" },
  { id: "annee", label: "Cette année" },
];

function getDateRangeForPeriode(periodeId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (periodeId === "tous") {
    return { debut: null, fin: null };
  }

  if (periodeId === "semaine") {
    const debut = new Date(today);
    const jour = debut.getDay();
    debut.setDate(debut.getDate() - (jour === 0 ? 6 : jour - 1));
    const fin = new Date(debut);
    fin.setDate(fin.getDate() + 6);
    fin.setHours(23, 59, 59, 999);
    return { debut, fin };
  }

  if (periodeId === "mois") {
    const debut = new Date(today.getFullYear(), today.getMonth(), 1);
    const fin = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    fin.setHours(23, 59, 59, 999);
    return { debut, fin };
  }

  if (periodeId === "annee") {
    const debut = new Date(today.getFullYear(), 0, 1);
    const fin = new Date(today.getFullYear(), 11, 31);
    fin.setHours(23, 59, 59, 999);
    return { debut, fin };
  }

  return { debut: null, fin: null };
}

export function CommandeListPage() {
  const [commandes, setCommandes] = useState([]);
  const [statutFiltre, setStatutFiltre] = useState("");
  const [periodeFiltre, setPeriodeFiltre] = useState("tous");
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const charger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page };
      if (statutFiltre) params.statut = statutFiltre;
      const data = await listCommandes(params);
      const allCommandes = data.results ?? data;
      
      const { debut, fin } = getDateRangeForPeriode(periodeFiltre);
      const commandesFiltrees = allCommandes.filter((commande) => {
        if (!debut || !fin) return true;
        const commandeDate = new Date(commande.date_comande);
        commandeDate.setHours(0, 0, 0, 0);
        return commandeDate >= debut && commandeDate <= fin;
      });
      
      setCommandes(commandesFiltrees);
      setPageInfo({ count: data.count, next: data.next, previous: data.previous });
    } catch {
      setError("Impossible de charger les commandes.");
    } finally {
      setLoading(false);
    }
  }, [page, statutFiltre, periodeFiltre]);

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
        <button className="btn btn-sm btn-secondary" onClick={() => setModal({ type: "detail", id: row.commande_id })}>
          Voir
        </button>
      ),
    },
  ];

  return (
    <div>
      <h1>Commandes</h1>
      <div className="toolbar">
        <div style={{ display: "flex", gap: "1rem" }}>
          <select
            value={periodeFiltre}
            onChange={(e) => { setPeriodeFiltre(e.target.value); setPage(1); }}
          >
            {PERIODES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <select
            value={statutFiltre}
            onChange={(e) => { setStatutFiltre(e.target.value); setPage(1); }}
          >
            <option value="">Tous statuts</option>
            {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="spacer" />
        <button className="btn btn-primary" onClick={() => setModal({ type: "nouveau" })}>
          + Nouvelle demande
        </button>
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

      {modal?.type === "nouveau" && (
        <Modal title="Nouvelle demande" onClose={() => setModal(null)} className="modal-box-wide">
          <CommandeFormPage
            onClose={() => setModal(null)}
            onCreated={() => { setModal(null); charger(); }}
          />
        </Modal>
      )}

      {modal?.type === "detail" && (
        <Modal title={`Commande #${modal.id}`} onClose={() => setModal(null)} className="modal-box-wide">
          <CommandeDetailPage
            commandeId={modal.id}
            onClose={() => setModal(null)}
            onUpdated={charger}
          />
        </Modal>
      )}
    </div>
  );
}
