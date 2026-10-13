/** Contenu des étiquettes d'unités (code lisible + contenu du QR code). */

const MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

const dateAcquisition = (unite) => unite.date_attribution || unite.date_creation;

/** Site où se trouve l'unité (fourni par l'API : site direct, de la salle ou de l'employé). */
const nomSite = (unite) => unite.site_beneficiaire_nom || null;

export function genererCodeEtiquette(unite) {
  const date = dateAcquisition(unite) ? new Date(dateAcquisition(unite)) : null;
  const site = nomSite(unite) || "INCONNU";
  const categorie = unite.article_categorie || "DIVERS";
  const mois = date ? MOIS_FR[date.getMonth()] : "inconnu";
  const jour = date ? date.getDate() : "00";
  return `${site}/${categorie}/${mois}/${jour}`.toUpperCase();
}

export function getContenuQR(unite) {
  const date = dateAcquisition(unite);
  return [
    unite.article_designation || "—",
    unite.employe_attribue_nom || "—",
    nomSite(unite) || "—",
    date ? new Date(date).toLocaleDateString("fr-FR") : "—",
    genererCodeEtiquette(unite),
  ].join("\n");
}

export const CSS_IMPRESSION = `
  body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
  .etiquette { border: 2px solid #000; padding: 15px; width: 300px; page-break-inside: avoid; }
  .etiquette svg { width: 150px; height: 150px; display: block; margin: 0 auto 10px; }
  .code-etiquette { font-size: 14px; font-weight: bold; text-align: center; word-break: break-all; font-family: monospace; }
  @media print { body { padding: 0; } }
`;
