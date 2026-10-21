/** Règles de saisie d'un inventaire (réalisation). */

export const SAISIE_VIDE = { quantite_physique: "", commentaire: "", propositions_series: {}, showChangementEtat: false };

export const nbPropositions = (saisie) =>
  ["ajouts", "retraits", "changements_etat"].reduce(
    (total, cle) => total + (saisie?.propositions_series?.[cle]?.length || 0),
    0,
  );

/** Une ligne compte si une quantité est saisie ou si des propositions existent. */
export const estSaisie = (saisie) => saisie.quantite_physique !== "" || nbPropositions(saisie) > 0;

const quantiteInvalide = (valeur) => {
  if (valeur === "") return false;
  const n = Number(valeur);
  return !Number.isFinite(n) || n < 0 || !Number.isInteger(n);
};

export const formatEcart = (ecart) => (ecart > 0 ? `+${ecart}` : String(ecart));

/**
 * Vérifie les saisies avant envoi. Retourne ``{code, message}`` pour la première
 * erreur trouvée, ou ``null`` si tout est correct.
 */
export function verifierSaisies(saisies, articlesParCode, stockTheorique) {
  const invalide = Object.entries(saisies).find(([, s]) => quantiteInvalide(s.quantite_physique));
  if (invalide) {
    return { code: invalide[0], message: `Article ${invalide[0]} : veuillez saisir une quantité entière positive ou nulle.` };
  }
  for (const [code, s] of Object.entries(saisies)) {
    const article = articlesParCode[code];
    if (!article?.is_immobilisation || article.mode_suivi !== "NUMERO_SERIE" || s.quantite_physique === "") continue;
    const ecart = Number(s.quantite_physique) - stockTheorique(code);
    if ((ecart !== 0 || s.showChangementEtat) && nbPropositions(s) === 0) {
      return { code, message: `Article ${code} : veuillez renseigner les propositions (ajouts, retraits ou changements d'état).` };
    }
  }
  return null;
}

/** Lignes envoyées au backend pour la création de la session. */
export function construireLignes(saisies, articlesParCode) {
  return Object.entries(saisies)
    .filter(([, s]) => estSaisie(s))
    .map(([code, s]) => {
      const ligne = {
        article: code,
        quantite_physique: Number(s.quantite_physique) || 0,
        commentaire: s.commentaire?.trim() || null,
      };
      if (articlesParCode[code]?.is_immobilisation && Object.keys(s.propositions_series || {}).length > 0) {
        ligne.propositions_series = s.propositions_series;
      }
      return ligne;
    });
}
