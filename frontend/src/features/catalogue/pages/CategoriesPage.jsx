import { useEffect, useState } from "react";
import { listCategories, createCategorie, updateCategorie, deleteCategorie } from "../api";
import { DataTable } from "../../../components/common/DataTable";
import { Modal } from "../../../components/common/Modal";
import { Notification } from "../../../components/common/Notification";
import { useAuth } from "../../../context/AuthContext";

export function CategoriesPage() {
  const { hasProfil } = useAuth();
  const canEdit = hasProfil("Administrateur", "Magasinier");

  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // null = ferme, {} = creation, {...} = edition
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");

  const charger = () => listCategories().then((d) => setCategories(d.results ?? d));

  useEffect(() => {
    charger();
  }, []);

  const ouvrirCreation = () => {
    setNom("");
    setDescription("");
    setEditing({});
  };

  const ouvrirEdition = (cat) => {
    setNom(cat.nom);
    setDescription(cat.description || "");
    setEditing(cat);
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    try {
      if (editing.id) {
        await updateCategorie(editing.id, { nom, description });
      } else {
        await createCategorie({ nom, description });
      }
      setEditing(null);
      charger();
    } catch {
      setError("Erreur lors de l'enregistrement de la categorie.");
    }
  };

  const supprimer = async (cat) => {
    if (!window.confirm(`Supprimer la categorie "${cat.nom}" ?`)) return;
    try {
      await deleteCategorie(cat.id);
      charger();
    } catch {
      setError("Suppression impossible (des articles utilisent probablement cette categorie).");
    }
  };

  const columns = [
    { key: "nom", label: "Nom" },
    { key: "description", label: "Description" },
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
        <div className="spacer" />
        {canEdit && <button className="btn btn-primary" onClick={ouvrirCreation}>+ Nouvelle categorie</button>}
      </div>
      <Notification type="error" message={error} />
      <DataTable columns={columns} rows={categories} emptyMessage="Aucune categorie." />

      {editing && (
        <Modal title={editing.id ? "Modifier la categorie" : "Nouvelle categorie"} onClose={() => setEditing(null)}>
          <form onSubmit={enregistrer}>
            <div className="form-field">
              <label>Nom</label>
              <input value={nom} onChange={(e) => setNom(e.target.value)} required autoFocus />
            </div>
            <div className="form-field">
              <label>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
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
