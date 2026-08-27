import { useEffect, useState } from "react";
import { listInventaires, listMagasins } from "../api";
import { DataTable } from "../../../components/common/DataTable";
import { Notification } from "../../../components/common/Notification";
import { useAuth } from "../../../context/AuthContext";
import { InventaireDetailsModal } from "./InventaireDetailsModal";
import { NouvelInventaireModal } from "./NouvelInventaireModal";

export function InventairePage() {
  const { hasProfil } = useAuth();
  const canEdit = hasProfil("Administrateur", "Magasinier");

  const [inventaires, setInventaires] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [error, setError] = useState("");
  
  const [ouvertModalCreation, setOuvertModalCreation] = useState(false);
  const [groupeSelectionne, setGroupeSelectionne] = useState(null);
  
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  const charger = () =>
    listInventaires({ page_size: 50 })
      .then((d) => setInventaires(d.results ?? d))
      .catch(() => setError("Erreur lors du chargement des inventaires."));

  useEffect(() => {
    charger();
    listMagasins({ page_size: 100 }).then((d) => setMagasins(d.results ?? d));
  }, []);

  // Regroupement et filtrage par dates
  const groupesInventaires = Object.values(
    inventaires.reduce((groupes, inventaire) => {
      const date = new Date(inventaire.date).toLocaleDateString("fr-FR");
      const cle = `${inventaire.magasin}-${date}`;

      if (!groupes[cle]) {
        groupes[cle] = {
          id: cle,
          magasin_nom: inventaire.magasin_nom,
          date,
          dateObj: new Date(inventaire.date),
          lignes: [],
        };
      }

      groupes[cle].lignes.push(inventaire);
      return groupes;
    }, {})
  ).filter((groupe) => {
    if (!dateDebut && !dateFin) return true;

    const groupeDate = new Date(groupe.dateObj);
    groupeDate.setHours(0, 0, 0, 0);

    if (dateDebut) {
      const debut = new Date(dateDebut);
      debut.setHours(0, 0, 0, 0);
      if (groupeDate < debut) return false;
    }

    if (dateFin) {
      const fin = new Date(dateFin);
      fin.setHours(23, 59, 59, 999);
      if (groupeDate > fin) return false;
    }

    return true;
  });

  const columns = [
    { key: "magasin_nom", label: "Magasin" },
    { key: "date", label: "Date" },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button className="btn btn-secondary" onClick={() => setGroupeSelectionne(row)}>
          Détails
        </button>
      ),
    },
  ];

  return (
    <div>
      <h1>Inventaires</h1>
      
      {/* Barre d'outils et filtres */}
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
        {canEdit && (
          <button className="btn btn-primary" onClick={() => setOuvertModalCreation(true)}>
            + Nouvel inventaire
          </button>
        )}
      </div>

      <Notification type="error" message={error} />
      
      <DataTable columns={columns} rows={groupesInventaires} emptyMessage="Aucun inventaire enregistré." />

      {/* Modale d'affichage des détails */}
      <InventaireDetailsModal
        groupe={groupeSelectionne}
        onClose={() => setGroupeSelectionne(null)}
      />

      {/* Modale de création */}
      <NouvelInventaireModal
        magasins={magasins}
        isOpen={ouvertModalCreation}
        onClose={() => setOuvertModalCreation(false)}
        onSuccess={() => {
          setOuvertModalCreation(false);
          charger();
        }}
      />
    </div>
  );
}