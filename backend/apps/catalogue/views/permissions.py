from apps.common import actions
from apps.common.permissions import lecture_ecriture

CataloguePermission = lecture_ecriture(lecture=(actions.CAT_LIRE,), ecriture=(actions.CAT_GERE,))
