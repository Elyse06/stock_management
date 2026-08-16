const COULEURS = {
  EN_ATTENTE: "badge-gray",
  EN_COURS: "badge-blue",
  VALIDEE: "badge-green",
  REJETEE: "badge-red",
  ENTREE: "badge-green",
  SORTIE: "badge-red",
  TRANSFERT: "badge-blue",
  REGULARISATION: "badge-amber",
};

export function StatusBadge({ value }) {
  return <span className={`status-badge ${COULEURS[value] || "badge-gray"}`}>{value}</span>;
}
