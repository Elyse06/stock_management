export const STATUTS_COMMANDE = [
  { value: "", label: "Tous statuts" },
  { value: "EN_ATTENTE", label: "En attente" },
  { value: "EN_COURS", label: "En cours" },
  { value: "VALIDEE", label: "Validée" },
  { value: "REJETEE", label: "Rejetée" },
];

export const PERIODES = [
  { value: "tous", label: "Toutes les commandes" },
  { value: "semaine", label: "Cette semaine" },
  { value: "mois", label: "Ce mois" },
  { value: "annee", label: "Cette année" },
];

/** Longueur maximale de l'objet d'une demande (saisi librement). */
export const OBJET_MAX = 100;

export { bornesPeriode } from "@/utils/periodes";
