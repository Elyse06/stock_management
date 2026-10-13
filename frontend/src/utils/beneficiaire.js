/** Types de bénéficiaire et conversion vers les champs attendus par l'API. */

export const TYPES_BENEFICIAIRE = ["EMPLOYE", "DIRECTION", "SITE", "SALLE"];

const ID = { EMPLOYE: "emp_id", DIRECTION: "dir_id", SITE: "site_id", SALLE: "salle_id" };

/** Champs d'écriture des serializers (mouvements, attributions, unités). */
export const CHAMPS_BENEFICIAIRE = {
  EMPLOYE: "employe_beneficiaire",
  DIRECTION: "direction_beneficiaire",
  SITE: "site_beneficiaire",
  SALLE: "salle_beneficiaire",
};

/** Champs de l'action « transférer » d'une unité. */
export const CHAMPS_TRANSFERT = {
  EMPLOYE: "nouvel_employe_beneficiaire",
  DIRECTION: "nouvelle_direction_beneficiaire",
  SITE: "nouveau_site_beneficiaire",
  SALLE: "nouvelle_salle_beneficiaire",
};

export const idBeneficiaire = (type, item) => item?.[ID[type]] ?? null;

/** ``{type, item}`` -> ``{employe_beneficiaire: id}`` (un seul champ renseigné). */
export function beneficiairePayload(value, champs = CHAMPS_BENEFICIAIRE) {
  if (!value?.item) return {};
  return { [champs[value.type]]: idBeneficiaire(value.type, value.item) };
}
