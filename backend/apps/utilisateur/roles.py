"""Profils prédéfinis : un ensemble d'actions correspond à un rôle affiché."""
from apps.common import actions as a

PRESETS = {
    "GESTIONNAIRE": {a.CAT_LIRE, a.CAT_GERE, a.MOV_LIRE, a.INV_LIRE, a.INV_GERE, a.COM_DEM, a.COM_VAL},
    "VALIDATEUR_INV": {a.CAT_LIRE, a.MOV_LIRE, a.INV_LIRE, a.COM_DEM, a.COM_VAL, a.INV_VAL},
    # Chef hiérarchique et employé standard : catalogue, commandes, équipements et historique de
    # localisation de leur direction ; ni mouvements, ni inventaires, ni tableau de bord (pas de MOV_LIRE).
    "VALIDATEUR_CMD": {a.CAT_LIRE, a.COM_DEM, a.COM_VAL},
    "STANDARD": {a.CAT_LIRE, a.COM_DEM},
}


def determiner_role(actions_utilisateur, toutes_actions):
    """Retourne ``(role_id, role_nom)`` pour un ensemble d'actions."""
    actions_utilisateur = set(actions_utilisateur)
    if toutes_actions and actions_utilisateur == set(toutes_actions):
        return "ADMIN", "Administrateur Système"
    for role_id, role_actions in PRESETS.items():
        if actions_utilisateur == role_actions:
            return role_id, role_id.replace("_", " ").title()
    return "CUSTOM", "Profil Personnalisé"
