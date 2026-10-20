/**
 * Déclaration unique des pages : menu, routes et droits requis.
 *
 * ``actions`` : l'utilisateur doit posséder AU MOINS UNE de ces actions
 * (liste vide = tout utilisateur connecté). Ces règles reflètent les
 * permissions du backend ; elles ne servent qu'à l'affichage, l'API
 * revérifie chaque appel.
 */
import {
  AccountTree as AccountTreeIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Article as ArticleIcon,
  Assignment as AssignmentIcon,
  Badge as BadgeIcon,
  Business as BusinessIcon,
  Category as CategoryIcon,
  Dashboard as DashboardIcon,
  History as HistoryIcon,
  Inventory as InventoryIcon,
  ListAlt as ListAltIcon,
  LocationOn as LocationOnIcon,
  MeetingRoom as MeetingRoomIcon,
  People as PeopleIcon,
  Public as PublicIcon,
  ShoppingCart as ShoppingCartIcon,
  Store as StoreIcon,
  SwapHoriz as SwapHorizIcon,
  UploadFile as UploadFileIcon,
  Devices as DevicesIcon,
} from "@mui/icons-material";

import { ACTIONS as A } from "@/constants/permissions";

export const MENU = [
  { path: "/", label: "Tableau de bord", Icon: DashboardIcon, actions: [A.MOV_LIRE, A.CAT_GERE] },
  { path: "/utilisateurs", label: "Utilisateurs & Rôles", Icon: AdminPanelSettingsIcon, actions: [A.USR_GERE] },
  {
    key: "employes",
    label: "Employés",
    Icon: BadgeIcon,
    children: [
      { path: "/employes", label: "Employé", Icon: BadgeIcon, actions: [A.USR_GERE] },
      { path: "/employes/services", label: "Service", Icon: AccountTreeIcon, actions: [A.USR_GERE] },
      { path: "/employes/directions", label: "Direction", Icon: BusinessIcon, actions: [A.USR_GERE] },
      { path: "/employes/sites", label: "Site", Icon: LocationOnIcon, actions: [A.USR_GERE] },
    ],
  },
  {
    key: "catalogue",
    label: "Catalogue",
    Icon: InventoryIcon,
    children: [
      { path: "/catalogue/articles", label: "Articles", Icon: ListAltIcon, actions: [A.CAT_LIRE] },
      { path: "/catalogue/categories", label: "Catégories", Icon: CategoryIcon, actions: [A.CAT_GERE] },
      { path: "/catalogue/fournisseurs", label: "Fournisseurs", Icon: PeopleIcon, actions: [A.CAT_GERE] },
    ],
  },
  {
    key: "inventaire",
    label: "Inventaire",
    Icon: AssignmentIcon,
    children: [
      { path: "/inventaire/mouvements", label: "Mouvements", Icon: SwapHorizIcon, actions: [A.MOV_LIRE] },
      { path: "/inventaire/sessions", label: "Inventaires", Icon: AssignmentIcon, actions: [A.INV_LIRE] },
      { path: "/inventaire/unites", label: "Unités Attribués", Icon: ListAltIcon, actions: [A.INV_LIRE] },
      { path: "/magasins", label: "Magasins", Icon: StoreIcon, actions: [A.INV_GERE] },
      { path: "/salles", label: "Salles", Icon: MeetingRoomIcon, actions: [A.INV_GERE] },
      { path: "/import/immobilisations", label: "Import immobilisations", Icon: UploadFileIcon, actions: [A.CAT_GERE] },
      { path: "/import/fournitures", label: "Import fournitures", Icon: UploadFileIcon, actions: [A.CAT_GERE] },
    ],
  },
  { path: "/mes-equipements", label: "Mes équipements", Icon: DevicesIcon, actions: [A.COM_DEM] },
  { path: "/commandes", label: "Commandes", Icon: ShoppingCartIcon, actions: [A.COM_DEM, A.COM_VAL] },
  {
    key: "historique",
    label: "Historique",
    Icon: HistoryIcon,
    children: [
      { path: "/historique/globale", label: "Globale", Icon: PublicIcon, actions: [A.MOV_LIRE] },
      { path: "/historique/localisation", label: "Localisation", Icon: LocationOnIcon, actions: [A.MOV_LIRE, A.COM_DEM] },
      { path: "/historique/article", label: "Article", Icon: ArticleIcon, actions: [A.MOV_LIRE] },
    ],
  },
];

/** Droits des pages hors menu (détail, réalisation...). */
export const EXTRA_ROUTE_ACTIONS = {
  // Accueil ouvert à tous : il redirige vers « Mes équipements » qui n'a pas le tableau de bord.
  "/": [],
  // Fiche d'article : suivi du stock seulement (pas les profils Standard ni Chef hiérarchique).
  "/catalogue/articles/:code_article": [A.MOV_LIRE, A.CAT_GERE],
  "/inventaire/sessions/realisation": [A.INV_GERE],
};

const flatten = (items) => items.flatMap((item) => (item.children ? flatten(item.children) : [item]));

/** ``{chemin: actions}`` pour toutes les pages déclarées. */
export const ROUTE_ACTIONS = {
  ...Object.fromEntries(flatten(MENU).map((item) => [item.path, item.actions])),
  ...EXTRA_ROUTE_ACTIONS,
};
