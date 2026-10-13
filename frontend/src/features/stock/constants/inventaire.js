export const STATUTS_INVENTAIRE = [
  { value: "", label: "Tous statuts" },
  { value: "EN_ATTENTE", label: "En attente" },
  { value: "VALIDE", label: "Validé" },
  { value: "REJETE", label: "Rejeté" },
];

export const TYPES_LIEU = [
  { value: "", label: "Tous lieux" },
  { value: "magasin", label: "Magasins" },
  { value: "direction", label: "Directions" },
  { value: "site", label: "Sites" },
  { value: "salle", label: "Salles" },
];

/** Paramètre de filtre du backend pour chaque type de lieu. */
export const PARAM_LIEU = { magasin: "magasin", direction: "service", site: "site", salle: "salle" };

/** Seules les sessions en attente peuvent être modifiées ou validées (règle du backend). */
export const estModifiable = (session) => session?.statut === "EN_ATTENTE";
