/** Questions proposées au démarrage, selon ce que l'utilisateur a le droit de consulter. */
export function suggestionsPour(droits) {
  const toutes = [
    droits.canReadCatalogue && "Quels articles sont sous le seuil d'alerte ?",
    (droits.canCreateCommande || droits.canValidateCommande) &&
      (droits.canValidateCommande ? "Quelles commandes attendent une validation ?" : "Où en sont mes commandes ?"),
    droits.canReadMouvements && "Quelles sorties de stock cette semaine ?",
    droits.canReadInventaire && "Y a-t-il des inventaires en attente ?",
    droits.canCreateCommande && "Comment faire une demande de matériel ?",
    "Que puis-je faire dans l'application ?",
  ];
  return toutes.filter(Boolean).slice(0, 4);
}
