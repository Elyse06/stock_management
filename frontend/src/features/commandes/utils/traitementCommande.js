/** Règles du traitement d'une commande (pré-validation et validation finale). */

export const estSuiviParSerie = (article) => Boolean(article?.is_immobilisation && article?.mode_suivi === "NUMERO_SERIE");

/** Décision initiale : chaque attribution en attente est proposée « validée » pour la quantité demandée. */
export function validationsInitiales(commande) {
  const initial = {};
  commande?.details?.forEach((detail) =>
    detail.attributions?.forEach((attr) => {
      initial[attr.id] = {
        statut: attr.statut === "EN_ATTENTE" ? "VALIDEE" : attr.statut,
        quantite_validee: attr.quantite_demandee ?? attr.quantite,
        motif_refus: attr.motif_refus ?? "",
      };
    }),
  );
  return initial;
}

export function quantiteValidee(detail, validations) {
  return (detail.attributions || []).reduce((total, attr) => {
    const decision = validations[attr.id];
    return decision?.statut === "VALIDEE"
      ? total + Number(decision.quantite_validee || attr.quantite_demandee || attr.quantite)
      : total;
  }, 0);
}

/** Message d'erreur bloquant, ou ``null``. */
export function verifierTraitement({ statut, commande, validations, magasinSource, unitesSelectionnees, getArticle, isAgentPrincipal }) {
  if (statut === "VALIDEE" && isAgentPrincipal && !magasinSource) {
    return "Veuillez sélectionner un magasin source pour la sortie de stock.";
  }
  if (statut === "REJETEE") return null;

  for (const detail of commande.details || []) {
    const article = getArticle(detail.article);
    const nom = article?.designation ?? detail.article_designation;
    const toutesDecidees = (detail.attributions || []).every((attr) =>
      ["VALIDEE", "REFUSEE"].includes(validations[attr.id]?.statut),
    );
    if (!toutesDecidees) return `Veuillez statuer (Valider ou Refuser) sur toutes les attributions pour « ${nom} ».`;

    if (statut === "VALIDEE" && estSuiviParSerie(article)) {
      const total = quantiteValidee(detail, validations);
      if (!Number.isInteger(total)) return `La quantité validée pour « ${nom} » doit être entière.`;
      const selection = unitesSelectionnees[detail.id] || [];
      if (selection.length !== total) {
        return `Pour « ${nom} », veuillez sélectionner exactement ${total} unité(s) physique(s). Actuellement : ${selection.length} sélectionnée(s).`;
      }
    }
  }
  return null;
}

export function construirePayloadTraitement({ statut, commande, commentaire, validations, magasinSource, unitesSelectionnees, getArticle }) {
  const payload = { statut, commentaire_agent: commentaire.trim() };
  if (statut !== "REJETEE" && Object.keys(validations).length > 0) {
    payload.validations = Object.entries(validations).map(([id, d]) => ({
      attribution_id: Number(id),
      statut: d.statut,
      quantite_validee: d.statut === "VALIDEE" ? Number(d.quantite_validee) || null : null,
      motif_refus: d.statut === "REFUSEE" ? d.motif_refus || "" : null,
    }));
  }
  if (statut === "VALIDEE" && magasinSource) {
    payload.magasin_source = Number(magasinSource);
    payload.details = (commande.details || []).map((detail) => ({
      detail_id: detail.id,
      unites_a_attribuer: estSuiviParSerie(getArticle(detail.article)) ? unitesSelectionnees[detail.id] || [] : [],
    }));
  }
  return payload;
}
