/** Statuts d'une commande « traitée » (décision prise). */
export const STATUTS_TRAITES = ["VALIDEE", "REJETEE"];

/**
 * Fiche PDF d'une commande : le gestionnaire pour toutes ; le chef hiérarchique pour les commandes déjà
 * traitées de sa direction (le serveur applique les mêmes règles).
 */
export const peutTelechargerFiche = ({ isGestionnaire, canValidateCommande }, commande) =>
  isGestionnaire || (canValidateCommande && STATUTS_TRAITES.includes(commande?.statut));
