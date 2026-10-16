/** Chemins de l'API backend (préfixés par API_BASE_URL dans le client HTTP). */
export const API_ENDPOINTS = Object.freeze({
  // Authentification
  LOGIN: "/api/auth/login/",
  ME: "/api/auth/me/",
  CHANGER_MOT_DE_PASSE: "/api/auth/changer-mot-de-passe/",
  ACTIVATION_VERIFIER: "/api/auth/activation/verifier/",
  ACTIVATION: "/api/auth/activation/",
  REFRESH: "/api/auth/refresh/",

  // Catalogue
  ARTICLES: "/api/catalogue/articles/",
  CATEGORIES: "/api/catalogue/categories/",
  FOURNISSEURS: "/api/catalogue/fournisseurs/",

  // Stock
  MAGASINS: "/api/stock/magasins/",
  SALLES: "/api/stock/salles/",
  MOUVEMENTS: "/api/stock/mouvements/",
  DETAILS_MOUVEMENT: "/api/stock/details-mouvement/",
  INVENTAIRES: "/api/stock/inventaires/",
  LIGNES_INVENTAIRE: "/api/stock/lignes-inventaire/",
  UNITES_ARTICLE: "/api/stock/unites-article/",
  RESUME_STOCK_UNITES: "/api/stock/unites-article/resume-stock/",
  UNITES_PAR_BENEFICIAIRE: "/api/stock/unites-article/par-beneficiaire/",
  DEMANDES_UNITES: "/api/stock/demandes-unites/",
  MES_UNITES: "/api/stock/demandes-unites/mes-unites/",
  IMPORT_IMMOBILISATIONS: "/api/stock/import-immobilisations/",
  IMPORT_FOURNITURES: "/api/stock/import-fournitures/",

  // Historique
  HISTORIQUE_GLOBALE: "/api/historique/globale/",
  HISTORIQUE_ARTICLE: "/api/historique/article/",
  HISTORIQUE_LOCALISATION: "/api/historique/localisation/",

  // Commandes
  COMMANDES: "/api/commandes/commandes/",
  DETAILS_COMMANDE: "/api/commandes/details-commande/",
  ATTRIBUTIONS: "/api/commandes/attribution-detail-commande/",

  // Organisation
  DIRECTIONS: "/api/employee/direction/",
  EMPLOYEES: "/api/employee/employee/",
  EMPLOYEES_IMPORT: "/api/employee/employee/import/",
  EMPLOYEES_IMPORT_EMAILS: "/api/employee/employee/import-emails/",
  SERVICES: "/api/employee/service/",
  SITES: "/api/employee/sites/",

  // Utilisateurs & droits
  UTILISATEURS: "/api/utilisateur/utilisateurs/",
  ACTIONS: "/api/utilisateur/action/",
  AUTORISATIONS: "/api/utilisateur/autorisations/",

  // Tableau de bord
  DASHBOARD: "/api/dashboard/",

  // Assistant IA
  AI_SEARCH: "/api/ai/search/",
  AI_CHAT: "/api/ai/chat/",
});
