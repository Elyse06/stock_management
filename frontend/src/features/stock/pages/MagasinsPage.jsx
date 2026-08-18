import { useEffect, useState } from "react";
import { listMagasins, createMagasin, updateMagasin, deleteMagasin } from "../api";
import { DataTable } from "../../../components/common/DataTable";
import { Modal } from "../../../components/common/Modal";
import { Notification } from "../../../components/common/Notification";
import { useAuth } from "../../../context/AuthContext";

const CHAMPS_VIDES = { nom: "", localite: "" };

export function MagasinsPage() {
  const { hasProfil } = useAuth();
  const canEdit = hasProfil("Administrateur", "Magasinier", "Gestionnaire");

  const [magasins, setMagasins] = useState([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [champs, setChamps] = useState(CHAMPS_VIDES);

  const charger = () => listMagasins({ page_size: 100 }).then((d) => setMagasins(d.results ?? d));

  useEffect(() => { charger(); }, []);

  const ouvrirCreation = () => { setChamps(CHAMPS_VIDES); setEditing({}); };
  const ouvrirEdition = (m) => { setChamps({ nom: m.nom, localite: m.localite || "" }); setEditing(m); };

  const enregistrer = async (e) => {
    e.preventDefault();
    try {
      if (editing.id) await updateMagasin(editing.id, champs);
      else await createMagasin(champs);
      setEditing(null);
      charger();
    } catch {
      setError("Erreur lors de l'enregistrement du magasin.");
    }
  };

  const supprimer = async (m) => {
    if (!window.confirm(`Supprimer le magasin "${m.nom}" ?`)) return;
    try {
      await deleteMagasin(m.id);
      charger();
    } catch {
      setError("Suppression impossible (des mouvements y sont probablement lies).");
    }
  };

  const columns = [
    { key: "nom", label: "Nom" },
    { key: "localite", label: "Localite" },
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
      <h1>Magasins</h1>
      <div className="toolbar">
        <div className="spacer" />
        {canEdit && <button className="btn btn-primary" onClick={ouvrirCreation}>+ Nouveau magasin</button>}
      </div>
      <Notification type="error" message={error} />
      <DataTable columns={columns} rows={magasins} emptyMessage="Aucun magasin." />

      {editing && (
        <Modal title={editing.id ? "Modifier le magasin" : "Nouveau magasin"} onClose={() => setEditing(null)}>
          <form onSubmit={enregistrer}>
            <div className="form-field">
              <label>Nom</label>
              <input value={champs.nom} onChange={(e) => setChamps({ ...champs, nom: e.target.value })} required autoFocus />
            </div>
            <div className="form-field">
              <label>Localite</label>
              <input value={champs.localite} onChange={(e) => setChamps({ ...champs, localite: e.target.value })} />
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
