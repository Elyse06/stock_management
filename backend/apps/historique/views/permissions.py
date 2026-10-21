from apps.common import actions
from apps.common.permissions import HasAction

HistoriquePermission = HasAction.for_actions(actions.MOV_LIRE)
# Localisation : aussi les employés (droit COM_DEM), limités à leur propre direction (voir la vue).
LocalisationPermission = HasAction.for_actions(actions.MOV_LIRE, actions.COM_DEM)
