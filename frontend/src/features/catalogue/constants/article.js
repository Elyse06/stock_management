export const UNITES = [
  { value: "UNITE", label: "Unité" },
  { value: "BOITE", label: "Boite" },
  { value: "Carton", label: "Carton" },
  { value: "Litre", label: "Litre" },
  { value: "Paquet", label: "Paquet" },
];

export { TYPE_ARTICLE_OPTIONS } from "@/constants/articles";

/** Code article proposé à partir de la catégorie (le backend vérifie l'unicité). */
export function genererCodeArticle(categorie) {
  const prefixe = categorie?.cat_libelle?.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "") || "ART";
  return `${prefixe}-${Math.floor(1000 + Math.random() * 9000)}`;
}
