export const TYPES_MOUVEMENT = [
  { value: "", label: "Tous" },
  { value: "ENTREE", label: "Entrées" },
  { value: "SORTIE", label: "Sorties" },
  { value: "TRANSFERT", label: "Transferts" },
  { value: "AJUSTEMENT", label: "Ajustements" },
  { value: "RETOUR", label: "Retours" },
];

/** « Magasin A → Magasin B » (ou l'origine pour une entrée sans source). */
export const getTrajet = (row) => {
  const source = row.magasin_source_nom || (row.type_mouvement === "ENTREE" ? row.origine : "") || "—";
  return `${source} → ${row.magasin_destination_nom || "—"}`;
};

export const ETATS_UNITE = [
  { value: "BON", label: "Bon" },
  { value: "MOYEN", label: "Moyen" },
  { value: "MAUVAIS", label: "Mauvais" },
  { value: "HORS_USAGE", label: "Hors usage" },
  { value: "PERDU", label: "Perdu" },
];

export const FILTRES_BENEFICIAIRE = [
  { value: "", label: "Tous" },
  { value: "EMPLOYE", label: "Employés" },
  { value: "DIRECTION", label: "Directions" },
  { value: "SITE", label: "Sites" },
  { value: "SALLE", label: "Salles" },
];

/** Règles du backend : retour impossible si perdue ; transfert impossible si hors usage ou perdue. */
export const peutRetourner = (unite) => unite.statut === "ATTRIBUE" && unite.etat !== "PERDU";
export const peutTransferer = (unite) => unite.statut === "ATTRIBUE" && !["HORS_USAGE", "PERDU"].includes(unite.etat);
