from apps.common import actions
from apps.common.permissions import HasAction

DashboardPermission = HasAction.for_actions(actions.CAT_LIRE, actions.MOV_LIRE)
