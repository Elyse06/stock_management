/** Type d'article (filtre ``is_immobilisation`` du backend) : immobilisation ou fourniture. */
export const TYPE_ARTICLE_OPTIONS = [
  { value: "", label: "Tous les types" },
  { value: "true", label: "Immobilisations" },
  { value: "false", label: "Fournitures" },
];

/** Garde les articles du type choisi (``type`` : "", "true" ou "false"), pour les listes déjà chargées. */
export const filtrerParType = (articles, type) =>
  type === "" ? articles : articles.filter((a) => Boolean(a.is_immobilisation) === (type === "true"));

/**
 * Libellé d'une catégorie : « MB — Meuble du bureau ». Les catégories importées ont pour libellé une
 * abréviation et pour description la famille complète.
 */
export function libelleCategorie(libelle, description) {
  const code = (libelle || "").trim();
  const nom = (description || "").trim();
  if (!nom || nom.toLowerCase() === code.toLowerCase()) return code;
  return code ? `${code} — ${nom}` : nom;
}

/** Groupe d'un article dans les listes de choix : immobilisations d'abord, puis fournitures. */
export const groupeTypeArticle = (a) => (a?.is_immobilisation ? "Immobilisations" : "Fournitures");

/** Articles triés par type (pour ``groupBy`` des listes de choix MUI, qui exige des groupes contigus). */
export const trierParType = (articles) =>
  [...articles].sort((a, b) => Number(Boolean(b.is_immobilisation)) - Number(Boolean(a.is_immobilisation)));
