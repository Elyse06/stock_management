import { useEffect, useState } from "react";
import { listFournisseurs, createFournisseur, updateFournisseur, deleteFournisseur } from "../api";
import { DataTable } from "../../../components/common/DataTable";
import { Modal } from "../../../components/common/Modal";
import { Notification } from "../../../components/common/Notification";
import { Pagination } from "../../../components/common/Pagination";
import { useAuth } from "../../../context/AuthContext";

const CHAMPS_VIDES = { nom: "", adresse: "", contact: "" };

export function FournisseursPage() {
  const { hasProfil } = useAuth();
  const canEdit = hasProfil("Administrateur", "Magasinier", "Gestionnaire");

  const [fournisseurs, setFournisseurs] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [champs, setChamps] = useState(CHAMPS_VIDES);

  const charger = async () => {
    const params = { page };
    if (search) params.search = search;
    const data = await listFournisseurs(params);
    setFournisseurs(data.results ?? data);
    setPageInfo({ count: data.count, next: data.next, previous: data.previous });
  };

  useEffect(() => {
    charger();
  }, [page, search]);

  const ouvrirCreation = () => {
    setChamps(CHAMPS_VIDES);
    setEditing({});
  };

  const ouvrirEdition = (f) => {
    setChamps({ nom: f.nom, email: f.email || "", adresse: f.adresse || "", contact: f.contact || "" });
    setEditing(f);
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    try {
      if (editing.fournisseur_id) {
        await updateFournisseur(editing.fournisseur_id, champs);
      } else {
        await createFournisseur(champs);
      }
      setEditing(null);
      charger();
    } catch {
      setError("Erreur lors de l'enregistrement du fournisseur.");
    }
  };

  const supprimer = async (f) => {
    if (!window.confirm(`Supprimer le fournisseur "${f.nom}" ?`)) return;
    try {
      await deleteFournisseur(f.fournisseur_id);
      charger();
    } catch {
      setError("Suppression impossible (des articles y sont probablement lies).");
    }
  };

  const columns = [
    { key: "nom", label: "Nom" },
    { key: "email", label: "Email" },
    { key: "contact", label: "Contact" },
    { key: "adresse", label: "Adresse" },
    {
      key: "actions", label: "",
      render: (row) => canEdit && (
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button className="btn btn-sm btn-secondary" onClick={() => ouvrirEdition(row)}>Modifier</button>
          <button className="btn btn-sm btn-danger" onClick={() => supprimer(row)}>Supprimer</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="toolbar">
        <input
          type="text" placeholder="Rechercher un fournisseur..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <div className="spacer" />
        {canEdit && <button className="btn btn-primary" onClick={ouvrirCreation}>+ Nouveau fournisseur</button>}
      </div>
      <Notification type="error" message={error} />
      <DataTable columns={columns} rows={fournisseurs} emptyMessage="Aucun fournisseur." />
      <Pagination
        page={page} setPage={setPage}
        hasNext={!!pageInfo.next} hasPrevious={!!pageInfo.previous} count={pageInfo.count}
      />

      {editing && (
        <Modal title={editing.id ? "Modifier le fournisseur" : "Nouveau fournisseur"} onClose={() => setEditing(null)}>
          <form onSubmit={enregistrer}>
            <div className="form-field">
              <label>Nom</label>
              <input value={champs.nom} onChange={(e) => setChamps({ ...champs, nom: e.target.value })} required autoFocus />
            </div>
            <div className="form-field">
              <label>Email</label>
              <input value={champs.email} onChange={(e) => setChamps({ ...champs, email: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Contact</label>
              <input value={champs.contact} onChange={(e) => setChamps({ ...champs, contact: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Adresse</label>
              <textarea value={champs.adresse} onChange={(e) => setChamps({ ...champs, adresse: e.target.value })} rows={2} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
