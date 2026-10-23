/**
 * Accusé de réception d'une commande : une fois du matériel livré (commande validée, ou en cours mais
 * livrée en partie : un accusé par livraison), pour le gestionnaire (toutes les commandes) et le chef
 * hiérarchique (commandes de sa direction). Le serveur applique les mêmes règles.
 */
export const peutTelechargerFiche = ({ isGestionnaire, canValidateCommande }, commande) =>
  (commande?.statut === "VALIDEE" || Boolean(commande?.livree_partiellement)) && (isGestionnaire || canValidateCommande);

export const TITRE_ACCUSE = "Télécharger l'accusé de réception (PDF)";
