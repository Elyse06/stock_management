import { DataTable } from "../../../components/common/DataTable";
import { Modal } from "../../../components/common/Modal";

export function InventaireDetailsModal({ groupe, onClose }) {
  if (!groupe) return null;

  const columns = [
    { key: "article_designation", label: "Article" },
    { key: "quantite_theorique", label: "Théorique" },
    { key: "quantite_physique", label: "Physique" },
    {
      key: "ecart",
      label: "Écart",
      render: (row) => (
        <span style={{ color: Number(row.ecart) === 0 ? "#166534" : "#991b1b", fontWeight: 600 }}>
          {row.ecart}
        </span>
      ),
    },
    { key: "commentaire", label: "Commentaire" },
  ];

  return (
    <Modal
      title={`Détails de l'inventaire du ${groupe.date}`}
      onClose={onClose}
    >
      <p>
        <strong>Magasin :</strong> {groupe.magasin_nom}
      </p>
      <DataTable
        columns={columns}
        rows={groupe.lignes}
        emptyMessage="Aucun article dans cet inventaire."
      />
    </Modal>
  );
}