from apps.common import actions
from apps.common.permissions import HasAction

# Gestionnaire et validateur d'inventaire ; pas les profils Standard ni Chef hiérarchique.
DashboardPermission = HasAction.for_actions(actions.MOV_LIRE, actions.CAT_GERE)
