/**
 * Étiquette d'une unité, sur le modèle des étiquettes en service :
 *
 * - texte imprimé : un code « Bénéficiaire/Site/Catégorie/mois/année/n° immobilisation »,
 *   ex. « TSOBATO/SIEGE/MMB/9/2024/228 » ;
 * - QR code (texte lu au scan), une information par ligne :
 *     TABLE OPEN SPACE POUR 3PERS      ← désignation
 *     DSI                              ← bénéficiaire
 *     SIEGE                            ← site
 *     20/09/2024                       ← date
 *     SIEGE/MMB/septembre/2024/186     ← site/catégorie/mois en lettres/année/n° immobilisation
 */

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** Segment du code : sans « / » (séparateur) ni espaces superflus, en majuscules. */
const segment = (valeur) => (valeur || "").replaceAll("/", "-").replace(/\s+/g, " ").trim().toUpperCase();

/** ``{jour, mois, annee}`` d'une date AAAA-MM-JJ, ou ``null``. */
function partiesDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? { annee: m[1], mois: Number(m[2]), jour: m[3] } : null;
}

export const dateFr = (iso) => {
  const d = partiesDate(iso);
  return d ? `${d.jour}/${String(d.mois).padStart(2, "0")}/${d.annee}` : "";
};

/** Texte imprimé : « Bénéficiaire/Site/Catégorie/mois/année/n° immobilisation » (mois en chiffres). */
export function codeEtiquette(champs) {
  const d = partiesDate(champs.date);
  return [segment(champs.beneficiaire), segment(champs.site), segment(champs.categorie), d ? d.mois : "", d ? d.annee : "", (champs.numero || "").trim()].join("/");
}

/** Contenu du QR code : désignation, bénéficiaire, site, date, puis « Site/Catégorie/mois en lettres/année/n° ». */
export function getContenuQR(champs) {
  const d = partiesDate(champs.date);
  const reference = [segment(champs.site), segment(champs.categorie), d ? MOIS[d.mois - 1] : "", d ? d.annee : "", (champs.numero || "").trim()].join("/");
  return [champs.designation, champs.beneficiaire, champs.site].map((v) => (v || "").trim()).concat(dateFr(champs.date), reference).join("\n");
}

/** Site prérempli : « SIEGE » pour le siège, sinon le nom du site ; une direction est au siège. */
export function siteParDefaut(unite) {
  if (unite?.site_beneficiaire_type === "SIEGE") return "SIEGE";
  if (unite?.site_beneficiaire_nom) return unite.site_beneficiaire_nom;
  return unite?.beneficiaire_type === "DIRECTION" ? "SIEGE" : "";
}

/** Messages d'erreur par champ avant impression (``{}`` si tout est bon). */
export function verifierEtiquette(champs) {
  const erreurs = {};
  if (!champs.beneficiaire.trim()) erreurs.beneficiaire = "Saisissez le bénéficiaire.";
  if (!champs.site.trim()) erreurs.site = "Saisissez le site.";
  if (!champs.categorie.trim()) erreurs.categorie = "Saisissez la catégorie.";
  if (!champs.date) erreurs.date = "Saisissez la date.";
  if (!champs.numero.trim()) erreurs.numero = "Saisissez le n° d'immobilisation.";
  else if (champs.numero.includes("/")) erreurs.numero = "Le n° d'immobilisation ne peut pas contenir « / ».";
  return erreurs;
}

export const CSS_IMPRESSION = `
  @page { margin: 8mm; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; }
  /* Largeur ajustée au texte : le QR code suit le texte sans jamais le recouvrir. Quand la place manque,
     le texte passe à la ligne après un « / » (<wbr>) ou entre deux mots, jamais au milieu d'un mot. */
  .etiquette { display: inline-flex; gap: 6mm; align-items: center; padding: 4mm 5mm; max-width: 194mm;
    box-sizing: border-box; background: #fff; page-break-inside: avoid; }
  .etiquette .code { flex: 0 1 auto; font-size: 13pt; line-height: 1.3; }
  .etiquette svg { width: 30mm; height: 30mm; flex-shrink: 0; }
`;
