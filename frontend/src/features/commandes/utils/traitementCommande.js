/**
 * Règles du traitement d'une commande (pré-validation et validation finale).
 *
 * Seules les attributions encore EN_ATTENTE se décident : une ligne refusée (par le chef à la
 * pré-validation) ou déjà livrée ne revient pas dans le traitement.
 *
 * Décisions :
 * - pré-validation (chef)      : VALIDEE (quantité ajustable) ou REFUSEE ;
 * - validation finale (gest.)  : VALIDEE = « livrer maintenant » (une partie possible : le reste est
 *   « en attente d'achat » ou « non accordé »), EN_ATTENTE = « en attente d'achat », ou REFUSEE.
 */

export const estSuiviParSerie = (article) => Boolean(article?.is_immobilisation && article?.mode_suivi === "NUMERO_SERIE");

export const DECIDEES = ["VALIDEE", "REFUSEE", "EN_ATTENTE"];

const quantiteDemandee = (attr) => Number(attr.quantite_demandee ?? attr.quantite);

/** Attributions à décider : celles encore en attente. */
export const attributionsATraiter = (detail) => (detail.attributions || []).filter((a) => a.statut === "EN_ATTENTE");

/** Décision initiale : chaque attribution en attente est proposée « validée / livrée » pour la quantité demandée. */
export function validationsInitiales(commande) {
  const initial = {};
  commande?.details?.forEach((detail) =>
    attributionsATraiter(detail).forEach((attr) => {
      initial[attr.id] = { statut: "VALIDEE", quantite_validee: quantiteDemandee(attr), motif_refus: "", reste: "EN_ATTENTE", motif_reste: "" };
    }),
  );
  return initial;
}

export function quantiteValidee(detail, validations) {
  return attributionsATraiter(detail).reduce((total, attr) => {
    const decision = validations[attr.id];
    return decision?.statut === "VALIDEE" ? total + Number(decision.quantite_validee || quantiteDemandee(attr)) : total;
  }, 0);
}

/** Y a-t-il quelque chose à livrer maintenant (et donc une sortie de stock) ? */
export const aDesLivraisons = (validations) => Object.values(validations || {}).some((d) => d.statut === "VALIDEE");

/** Y a-t-il au moins une livraison ou un refus (sinon rien à enregistrer) ? */
export const aDesDecisions = (validations) => Object.values(validations || {}).some((d) => d.statut === "VALIDEE" || d.statut === "REFUSEE");

/** Message d'erreur bloquant, ou ``null``. */
export function verifierTraitement({ statut, commande, validations, magasinSource, unitesSelectionnees, getArticle, isAgentPrincipal, specifications = {} }) {
  if (statut === "REJETEE") return null;
  const finale = statut === "VALIDEE";
  if (finale && isAgentPrincipal) {
    if (!aDesDecisions(validations)) return "Livrez ou refusez au moins une ligne (le reste peut rester en attente d'achat).";
    if (aDesLivraisons(validations) && !magasinSource) return "Veuillez sélectionner un magasin source pour la sortie de stock.";
  }

  for (const detail of commande.details || []) {
    const aTraiter = attributionsATraiter(detail);
    if (detail.est_nouvel_article && !detail.article) {
      if (detail.id in specifications && !specifications[detail.id].trim()) {
        return "La spécification d'un nouvel article ne peut pas être vide.";
      }
      const accordee = aTraiter.some((attr) => validations[attr.id]?.statut === "VALIDEE");
      if (finale && accordee) {
        return `« ${detail.specification} » : créez l'article ou associez un article existant avant de le livrer (ou mettez-le en attente d'achat).`;
      }
    }
    const article = getArticle(detail.article);
    const nom = article?.designation ?? detail.libelle ?? detail.article_designation;
    for (const attr of aTraiter) {
      const decision = validations[attr.id];
      if (!DECIDEES.includes(decision?.statut)) return `Veuillez statuer sur toutes les lignes pour « ${nom} ».`;
      if (decision.statut === "REFUSEE" && !decision.motif_refus?.trim()) return `Indiquez le motif du refus pour « ${nom} ».`;
      if (decision.statut === "VALIDEE") {
        const q = Number(decision.quantite_validee);
        if (!Number.isInteger(q) || q < 1) return `La quantité pour « ${nom} » doit être un nombre entier supérieur à 0.`;
        if (q > quantiteDemandee(attr)) return `La quantité pour « ${nom} » dépasse la quantité demandée (${quantiteDemandee(attr)}).`;
      }
    }

    if (finale && estSuiviParSerie(article)) {
      const total = quantiteValidee(detail, validations);
      const selection = unitesSelectionnees[detail.id] || [];
      if (selection.length !== total) {
        return `Pour « ${nom} », veuillez sélectionner exactement ${total} unité(s) physique(s). Actuellement : ${selection.length} sélectionnée(s).`;
      }
    }
  }
  return null;
}

export function construirePayloadTraitement({ statut, commande, commentaire, validations, magasinSource, unitesSelectionnees, getArticle, specifications = {} }) {
  const payload = { statut, commentaire_agent: commentaire.trim() };
  // Spécifications corrigées par le chef hiérarchique (pré-validation uniquement).
  const corrigees = (commande.details || [])
    .filter((d) => statut === "EN_COURS" && d.id in specifications && specifications[d.id].trim() !== d.specification)
    .map((d) => ({ detail_id: d.id, specification: specifications[d.id].trim() }));
  if (corrigees.length) payload.specifications = corrigees;
  if (statut !== "REJETEE" && Object.keys(validations).length > 0) {
    payload.validations = Object.entries(validations).map(([id, d]) => ({
      attribution_id: Number(id),
      statut: d.statut,
      quantite_validee: d.statut === "VALIDEE" ? Number(d.quantite_validee) || null : null,
      motif_refus: d.statut === "REFUSEE" ? d.motif_refus || "" : null,
      ...(d.statut === "VALIDEE" && statut === "VALIDEE" ? { reste: d.reste || "EN_ATTENTE", motif_reste: d.motif_reste || "" } : {}),
    }));
  }
  if (statut === "VALIDEE" && magasinSource && aDesLivraisons(validations)) {
    payload.magasin_source = Number(magasinSource);
    payload.details = (commande.details || []).filter((detail) => detail.article).map((detail) => ({
      detail_id: detail.id,
      unites_a_attribuer: estSuiviParSerie(getArticle(detail.article)) ? unitesSelectionnees[detail.id] || [] : [],
    }));
  }
  return payload;
}
