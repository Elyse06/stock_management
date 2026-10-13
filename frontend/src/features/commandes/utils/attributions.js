/**
 * Règles de l'éditeur d'attributions d'une ligne de commande.
 *
 * Une attribution = ``{type, beneficiaire, quantite}``. Les employés et la
 * direction proposés sont ceux de la direction du demandeur. Tout article,
 * immobilisation comme fourniture, peut aller à n'importe quel type de bénéficiaire.
 */
const ID = { EMPLOYE: "emp_id", DIRECTION: "dir_id", SITE: "site_id", SALLE: "salle_id" };

export const TYPES_ATTRIBUTION = [
  { value: "EMPLOYE", label: "Employé" },
  { value: "DIRECTION", label: "Direction" },
  { value: "SITE", label: "Site" },
  { value: "SALLE", label: "Salle" },
];

export const idDe = (type, beneficiaire) => String(beneficiaire?.[ID[type]] ?? "");

export function libelleBeneficiaire(type, b) {
  if (!b) return "";
  switch (type) {
    case "EMPLOYE":
      return `${b.emp_nom}${b.emp_matricule ? ` (${b.emp_matricule})` : ""}`;
    case "SITE":
      return `${b.site_nom} (${b.site_type === "SIEGE" ? "Siège" : "Agence"})`;
    case "SALLE":
      return `${b.nom}${b.localite_nom ? ` (${b.localite_nom})` : ""}`;
    default:
      return b.dir_libelle || "";
  }
}

const memeTexte = (a, b) => Boolean(a && b) && a.trim().toLowerCase() === b.trim().toLowerCase();

/** Direction du demandeur : par identifiant, sinon par libellé ; jamais de valeur inventée. */
export function directionDuDemandeur(directions, demandeur) {
  if (!demandeur) return null;
  return (
    directions.find((d) => demandeur.emp_dir_id != null && String(d.dir_id) === String(demandeur.emp_dir_id)) ||
    directions.find((d) => memeTexte(d.dir_libelle, demandeur.direction_libelle)) ||
    null
  );
}

export const sommeAttribuee = (attributions, sauf = -1) =>
  attributions.reduce((total, a, i) => (i === sauf ? total : total + (Number(a.quantite) || 0)), 0);

/** Bénéficiaires proposés pour un type (sans ceux déjà choisis sur les autres lignes). */
export function optionsBeneficiaire(type, { attributions, employees, sites, salles, direction }, indexCourant = -1) {
  const dejaPris = (b) =>
    attributions.some((a, i) => i !== indexCourant && a.type === type && idDe(type, a.beneficiaire) === idDe(type, b));
  const courant = attributions[indexCourant]?.beneficiaire;
  const avecCourant = (liste) =>
    courant && attributions[indexCourant]?.type === type && !liste.some((b) => idDe(type, b) === idDe(type, courant))
      ? [...liste, courant]
      : liste;

  switch (type) {
    case "EMPLOYE":
      return avecCourant(
        employees.filter((e) => !dejaPris(e) && (!direction || !e.direction_libelle || memeTexte(e.direction_libelle, direction.dir_libelle))),
      );
    case "SITE":
      return avecCourant(sites.filter((s) => !dejaPris(s)));
    case "SALLE":
      return avecCourant(salles.filter((s) => !dejaPris(s)));
    default:
      return avecCourant(direction ? [direction] : []);
  }
}

/** Corps de requête d'une attribution (un seul champ bénéficiaire renseigné). */
export function attributionPayload(attribution) {
  const champ = {
    EMPLOYE: "employe_beneficiaire",
    DIRECTION: "direction_beneficiaire",
    SITE: "site_beneficiaire",
    SALLE: "salle_beneficiaire",
  }[attribution.type];
  return {
    quantite: attribution.quantite,
    quantite_demandee: attribution.quantite,
    [champ]: attribution.beneficiaire?.[ID[attribution.type]],
  };
}
