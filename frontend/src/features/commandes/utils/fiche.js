export const peutTelechargerFiche = ({ isGestionnaire, canValidateCommande }, commande) =>
  commande?.statut === "VALIDEE" && (isGestionnaire || canValidateCommande);

export const TITRE_ACCUSE = "Télécharger l'accusé de réception (PDF)";
