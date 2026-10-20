/** Étiquette d'une unité : champs imprimés et contenu du QR code (les mêmes informations). */

/** Champs de l'étiquette, dans l'ordre d'impression. */
export const CHAMPS_ETIQUETTE = [
  { cle: "categorie", libelle: "Catégorie" },
  { cle: "designation", libelle: "Désignation" },
  { cle: "beneficiaire", libelle: "Bénéficiaire" },
  { cle: "date", libelle: "Date" },
  { cle: "numero", libelle: "N° immobilisation" },
];

const dateFr = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR") : "");

/** Valeurs affichées : la date AAAA-MM-JJ devient JJ/MM/AAAA. */
export const valeursImprimees = (champs) => ({ ...champs, date: dateFr(champs.date) });

/** Contenu du QR code : une ligne « Libellé : valeur » par champ. */
export function getContenuQR(champs) {
  const valeurs = valeursImprimees(champs);
  return CHAMPS_ETIQUETTE.map(({ cle, libelle }) => `${libelle} : ${valeurs[cle] || "—"}`).join("\n");
}

export const CSS_IMPRESSION = `
  @page { margin: 8mm; }
  body { margin: 0; font-family: Arial, sans-serif; color: #000; }
  .etiquette { display: flex; gap: 12px; align-items: center; border: 2px solid #000; border-radius: 6px; padding: 10px 12px;
    width: 92mm; box-sizing: border-box; page-break-inside: avoid; }
  .etiquette svg { width: 30mm; height: 30mm; flex-shrink: 0; }
  .etiquette .champs { flex: 1; min-width: 0; }
  .etiquette .ligne { font-size: 9pt; line-height: 1.35; }
  .etiquette .libelle { color: #444; }
  .etiquette .valeur { font-weight: bold; word-break: break-word; }
  .etiquette .numero { font-family: monospace; font-size: 11pt; }
`;
