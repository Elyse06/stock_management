/**
 * Libellés français des champs renvoyés par l'API, pour préfixer les erreurs
 * de validation (« Fonction : Ce champ ne peut être vide. » au lieu du seul
 * message, qui ne disait pas quel champ corriger).
 */
export const FIELD_LABELS = {
  emp_nom: "Nom", emp_matricule: "Matricule", emp_fonction: "Fonction", emp_contact: "Contact",
  emp_site_id: "Site", emp_dir_id: "Direction", emp_serv_id: "Service",
  site_nom: "Nom du site", site_type: "Type", localite: "Localité",
  dir_libelle: "Direction", dir_description: "Description",
  serv_libelle: "Service", serv_dir_id: "Direction parente",
  cat_libelle: "Code catégorie", cat_description: "Description",
  nom: "Nom", email: "Email", contact: "Contact", nif: "NIF", stat: "STAT", adresse: "Adresse",
  code_article: "Code article", designation: "Désignation", categorie: "Catégorie", seuil: "Seuil",
  unite: "Unité", mode_suivi: "Mode de suivi", is_immobilisation: "Type",
  magasin_nom: "Nom du magasin", magasin_source: "Magasin source", magasin_destination: "Magasin destination",
  quantite: "Quantité", numeros_de_serie: "Numéros de série", prix_achat: "Prix d'achat", fournisseur: "Fournisseur",
  details: "Articles", lignes: "Lignes", objet: "Objet", employe_demandeur: "Demandeur",
  utilisateur_mail: "Email", utilisateur_mdp: "Mot de passe", actions: "Permissions", emp_id: "Employé",
  motif: "Motif", commentaire: "Commentaire", commentaire_agent: "Commentaire",
};

/** ``emp_date_entree`` -> « Date entree » quand le champ n'est pas répertorié. */
export function libelleChamp(champ) {
  if (FIELD_LABELS[champ]) return FIELD_LABELS[champ];
  const texte = champ.replace(/^(emp|cat|dir|serv|site|utilisateur)_/, "").replace(/_/g, " ").trim();
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}
