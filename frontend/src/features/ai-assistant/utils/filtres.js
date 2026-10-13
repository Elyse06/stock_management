/**
 * Traduit les filtres appliqués par l'assistant (liste blanche du backend) en
 * paramètres de la page Articles. Seuls les filtres que la page sait exprimer
 * sont repris ; les autres (seuils de stock...) sont signalés comme ignorés.
 */
const CHAMPS_TEXTE = ["designation", "code_article", "modele", "description", "code_barre", "categorie__cat_libelle"];

export function versParametresArticles(filtres = {}) {
  const params = new URLSearchParams();
  const ignores = [];
  for (const [cle, valeur] of Object.entries(filtres)) {
    const champ = cle.split("__").slice(0, cle.startsWith("categorie__") ? 2 : 1).join("__");
    if (CHAMPS_TEXTE.includes(champ) && !params.has("search")) params.set("search", String(valeur));
    else if (cle === "categorie" || cle === "categorie__exact") params.set("categorie", String(valeur));
    else if (champ === "is_immobilisation") params.set("type", String(valeur));
    else ignores.push(cle);
  }
  return { params, ignores };
}
