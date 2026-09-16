// src/constants/api.js
export const API_ENDPOINTS = {
  // Auth
  LOGIN: "/api/auth/login/",
  ME: "/api/auth/me/",
  REFRESH: "/api/auth/refresh/",

  // Catalogue
  ARTICLES: "/api/catalogue/articles/",
  CATEGORIES: "/api/catalogue/categories/",
  MARQUES: "/api/catalogue/marque/",
  FOURNISSEURS: "/api/catalogue/fournisseurs/",

  // Stock
  MAGASINS: "/api/stock/magasins/",
  MOUVEMENTS: "/api/stock/mouvements/",
  INVENTAIRES: "/api/stock/inventaires/",

  // Commandes
  COMMANDES: "/api/commandes/commandes/",

  // Employee
  DIRECTIONS: "/api/employee/direction/",
  EMPLOYEES: "/api/employee/employee/",
  SITES: "/api/employee/sites/",
};

export const ERROR_MESSAGES = {
  LOAD_FAILED: "Impossible de charger les données.",
  SAVE_FAILED: "Erreur lors de l'enregistrement.",
  DELETE_FAILED: "Suppression impossible.",
  NETWORK_ERROR: "Impossible de contacter le serveur.",
  UNAUTHORIZED: "Session expirée. Veuillez vous reconnecter.",
  FORBIDDEN: "Vous n'avez pas les permissions nécessaires.",
};