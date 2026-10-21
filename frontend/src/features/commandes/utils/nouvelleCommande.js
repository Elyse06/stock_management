/**
 * Règles de la page « Nouvelle commande » : une ligne porte soit un article existant, soit la
 * spécification d'un nouvel article (que le gestionnaire créera), avec sa quantité et sa répartition.
 */
import { attributionPayload, idDe, sommeAttribuee } from "./attributions";

export const MODE_EXISTANT = "EXISTANT";
export const MODE_NOUVEAU = "NOUVEAU";
export const SPECIFICATION_MAX = 255;

let compteur = 0;

export const formulaireVide = (mode = MODE_EXISTANT) => ({ mode, article: null, specification: "", quantite: 1, attributions: [] });

export const nouvelleCle = () => `ligne-${++compteur}`;

/** Message bloquant pour ajouter (ou mettre à jour) la ligne, ou ``null``. */
export function erreurLigne(form, lignes, cleEnEdition) {
  if (form.mode === MODE_EXISTANT) {
    if (!form.article) return "Choisissez un article.";
    const doublon = lignes.some((l) => l.cle !== cleEnEdition && l.mode === MODE_EXISTANT && l.article?.code_article === form.article.code_article);
    if (doublon) return "Cet article est déjà dans la liste : cliquez sur sa ligne pour la modifier.";
  } else if (!form.specification.trim()) {
    return "Décrivez le nouvel article souhaité.";
  }
  const quantite = Number(form.quantite);
  if (!Number.isInteger(quantite) || quantite < 1) return "La quantité doit être un nombre entier supérieur à 0.";
  if (sommeAttribuee(form.attributions) > quantite) return "La répartition dépasse la quantité : ajustez les attributions.";
  return null;
}

/** Quantité non répartie, attribuée au demandeur à l'enregistrement. */
export const resteAuDemandeur = (ligne) => Math.max(Number(ligne.quantite) - sommeAttribuee(ligne.attributions), 0);

/**
 * Répartition envoyée au serveur : celle saisie, complétée par le reste pour le demandeur (ajouté à son
 * attribution s'il en a déjà une). Sans aucune répartition, le serveur attribue tout au demandeur.
 */
export function attributionsCompletes(ligne, demandeur) {
  const reste = resteAuDemandeur(ligne);
  if (!ligne.attributions.length || !reste || !demandeur) return ligne.attributions;
  const index = ligne.attributions.findIndex((a) => a.type === "EMPLOYE" && idDe("EMPLOYE", a.beneficiaire) === String(demandeur.emp_id));
  if (index >= 0) {
    return ligne.attributions.map((a, i) => (i === index ? { ...a, quantite: Number(a.quantite) + reste } : a));
  }
  return [...ligne.attributions, { type: "EMPLOYE", beneficiaire: demandeur, quantite: reste }];
}

export const libelleLigne = (ligne) => (ligne.mode === MODE_EXISTANT ? ligne.article?.designation : ligne.specification);

export function payloadCommande({ objet, lignes, demandeur }) {
  return {
    objet: objet.trim(),
    employe_demandeur: demandeur.emp_id,
    details: lignes.map((ligne) => {
      const attributions = attributionsCompletes(ligne, demandeur);
      return {
        ...(ligne.mode === MODE_EXISTANT ? { article: ligne.article.code_article } : { specification: ligne.specification.trim() }),
        quantite: Number(ligne.quantite),
        ...(attributions.length ? { attributions: attributions.map(attributionPayload) } : {}),
      };
    }),
  };
}
