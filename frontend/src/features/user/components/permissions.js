import { THEME, CATEGORY_COLORS } from "./theme";

export const PROTECTED_USER_ID = 1;

export const ACTION_CATEGORIES = [
  { key: "CAT", label: "Catalogue & Articles", prefix: "CAT_" },
  { key: "MOV", label: "Mouvements de Stock", prefix: "MOV_" },
  { key: "INV", label: "Magasins & Inventaires", prefix: "INV_" },
  { key: "COM", label: "Commandes Internes", prefix: "COM_" },
  { key: "USR", label: "Administration & Rôles", prefix: "USR_" },
];

export const PRESET_ROLES = [
  {
    id: "ADMIN",
    label: "Administrateur Système",
    description: "Accès total à tous les modules",
    badgeColor: THEME.primaryDark,
    actions: "ALL",
  },
  {
    id: "GESTIONNAIRE",
    label: "Gestionnaire du stock",
    description: "Gestion du stock, des mouvements et du catalogue",
    badgeColor: THEME.primary,
    actions: ["CAT_LIRE", "CAT_GERE", "MOV_LIRE", "INV_LIRE", "INV_GERE", "COM_DEM", "COM_VAL"],
  },
  {
    id: "VALIDATEUR_INV",
    label: "Validateur de l'inventaire",
    description: "Contrôle et validation des inventaires",
    badgeColor: THEME.primaryAmber,
    actions: ["CAT_LIRE", "MOV_LIRE", "INV_LIRE", "COM_DEM", "COM_VAL", "INV_VAL"],
  },
  {
    id: "VALIDATEUR_CMD",
    label: "Validateur de Commandes",
    description: "Approbation des commandes de matériel",
    badgeColor: "#FFB300",
    actions: ["CAT_LIRE", "MOV_LIRE", "COM_DEM", "COM_VAL"],
  },
  {
    id: "STANDARD",
    label: "Demandeur Standard",
    description: "Consultation du catalogue et demandes d'articles",
    badgeColor: "#FFCA28",
    actions: ["CAT_LIRE", "MOV_LIRE", "COM_DEM"],
  },
  {
    id: "CUSTOM",
    label: "Profil Personnalisé",
    description: "Permissions choisies une à une",
    badgeColor: "#FFD54F",
    actions: [],
  },
];

export const resolveRoles = (allActionIds) =>
  PRESET_ROLES.map((role) => ({
    ...role,
    actions:
      role.actions === "ALL"
        ? allActionIds
        : role.actions.filter((id) => allActionIds.includes(id)),
  }));

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

export const detectRoleId = (selectedActions, resolvedRoles) => {
  if (selectedActions.length === 0) return "CUSTOM";
  const match = resolvedRoles.find(
    (r) => r.id !== "CUSTOM" && sameSet(r.actions, selectedActions),
  );
  return match ? match.id : "CUSTOM";
};

export const buildPermissionGroups = (apiActions) => {
  const groups = {};
  ACTION_CATEGORIES.forEach((cat) => {
    groups[cat.key] = { key: cat.key, category: cat.label, ...CATEGORY_COLORS[cat.key], items: [] };
  });
  groups.AUTRE = { key: "AUTRE", category: "Autres actions", ...CATEGORY_COLORS.AUTRE, items: [] };

  apiActions.forEach((action) => {
    const group = groups[action.action_id.split("_")[0]] || groups.AUTRE;
    group.items.push({
      id: action.action_id,
      label: action.action_libelle,
      description: action.action_description,
    });
  });

  return [...ACTION_CATEGORIES.map((c) => groups[c.key]), groups.AUTRE].filter(
    (g) => g.items.length > 0,
  );
};