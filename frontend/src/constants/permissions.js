/** Codes des actions (droits) définis par le backend (table t_action). */
export const ACTIONS = Object.freeze({
  CAT_LIRE: "CAT_LIRE",
  CAT_GERE: "CAT_GERE",
  MOV_LIRE: "MOV_LIRE",
  INV_LIRE: "INV_LIRE",
  INV_GERE: "INV_GERE",
  INV_VAL: "INV_VAL",
  COM_DEM: "COM_DEM",
  COM_VAL: "COM_VAL",
  USR_GERE: "USR_GERE",
});

/** Règles minimales du backend pour un mot de passe (AUTH_PASSWORD_VALIDATORS). */
export const PASSWORD_MIN_LENGTH = 8;
