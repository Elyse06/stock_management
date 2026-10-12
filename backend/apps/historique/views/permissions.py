from apps.common import actions
from apps.common.permissions import HasAction

HistoriquePermission = HasAction.for_actions(actions.MOV_LIRE)
