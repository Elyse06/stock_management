import {
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";

/** Détail des indicateurs : chemin (sous /api/dashboard/), colonnes et action par ligne. */
export const KPI_CONFIG = {
  total_articles: {
    title: "Liste des articles",
    Icon: InventoryIcon,
    path: "kpis/articles/",
    searchable: true,
    columns: [
      { field: "code_article", label: "Code", width: 120, kind: "code" },
      { field: "designation", label: "Désignation" },
      { field: "categorie_nom", label: "Catégorie", width: 150 },
      { field: "stock_calcule", label: "Stock", width: 100, align: "center", kind: "nombre" },
    ],
    action: "view_article",
  },
  produits_en_rupture: {
    title: "Produits en rupture de stock",
    Icon: WarningIcon,
    path: "kpis/ruptures/",
    badge: { color: "error.main", label: "CRITIQUE" },
    columns: [
      { field: "code_article", label: "Code", width: 120, kind: "code" },
      { field: "designation", label: "Désignation" },
      { field: "categorie_nom", label: "Catégorie", width: 150 },
      { field: "dernier_mouvement", label: "Dernier mouvement", width: 150, kind: "date" },
    ],
    action: "create_entree",
  },
  produits_sous_seuil: {
    title: "Produits sous le seuil",
    Icon: WarningIcon,
    path: "kpis/sous-seuil/",
    badge: { color: "warning.main", label: "ATTENTION" },
    columns: [
      { field: "code_article", label: "Code", width: 120, kind: "code" },
      { field: "designation", label: "Désignation" },
      { field: "stock_calcule", label: "Stock", width: 80, align: "center", kind: "nombre" },
      { field: "seuil", label: "Seuil", width: 80, align: "center" },
      { field: "quantite_suggeree", label: "Qté suggérée", width: 120, align: "center", kind: "nombre" },
      { field: "niveau_urgence", label: "Urgence", width: 120, kind: "urgence" },
    ],
    action: "create_entree",
  },
  entrees_du_mois: {
    title: "Entrées et retours du mois",
    Icon: ArrowDownwardIcon,
    path: "kpis/entrees-mois/",
    parMois: true,
    showTotal: true,
    columns: [
      { field: "date", label: "Date", width: 150, kind: "date" },
      { field: "article_code", label: "Article", width: 120, kind: "code" },
      { field: "article_designation", label: "Désignation" },
      { field: "quantite", label: "Quantité", width: 100, align: "center", kind: "nombre" },
      { field: "magasin_destination", label: "Magasin", width: 150 },
    ],
  },
  sorties_du_mois: {
    title: "Sorties du mois",
    Icon: ArrowUpwardIcon,
    path: "kpis/sorties-mois/",
    parMois: true,
    showTotal: true,
    columns: [
      { field: "date", label: "Date", width: 150, kind: "date" },
      { field: "article_code", label: "Article", width: 120, kind: "code" },
      { field: "article_designation", label: "Désignation" },
      { field: "quantite", label: "Quantité", width: 100, align: "center", kind: "nombre" },
      { field: "beneficiaire", label: "Bénéficiaire", width: 150 },
    ],
  },
};

export const URGENCES = {
  critique: { label: "Critique", color: "error" },
  urgent: { label: "Urgent", color: "warning" },
  attention: { label: "Attention", color: "info" },
};

const moisISO = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
export const moisCourant = () => moisISO(new Date());

/** Les 12 derniers mois, du plus récent au plus ancien. */
export function optionsMois() {
  return Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - i);
    const label = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return { value: moisISO(date), label: label.charAt(0).toUpperCase() + label.slice(1) };
  });
}
