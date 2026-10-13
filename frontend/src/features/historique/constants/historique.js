import { bornesPeriode, toISODate } from "@/utils/periodes";

export const TYPES_MOUVEMENT = [
  { value: "", label: "Tous les types" },
  { value: "ENTREE", label: "Entrées" },
  { value: "RETOUR", label: "Retours" },
  { value: "SORTIE", label: "Sorties" },
  { value: "TRANSFERT", label: "Transferts" },
  { value: "AJUSTEMENT", label: "Ajustements" },
];

export const PERIODES = [
  { value: "tous", label: "Toutes les dates" },
  { value: "aujourdhui", label: "Aujourd'hui" },
  { value: "semaine", label: "Cette semaine" },
  { value: "mois", label: "Ce mois" },
  { value: "annee", label: "Cette année" },
  { value: "personnalisee", label: "Personnalisée" },
];

/** Dates ``{date_debut, date_fin}`` à envoyer au backend pour une période. */
export function datesPeriode(periode, debutPerso, finPerso) {
  if (periode === "personnalisee") return { date_debut: debutPerso, date_fin: finPerso };
  const bornes = bornesPeriode(periode);
  return bornes ? { date_debut: toISODate(bornes.debut), date_fin: toISODate(bornes.fin) } : {};
}
