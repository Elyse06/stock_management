from apps.common import actions as a
from apps.common.permissions import lecture_ecriture

CommandePermission = lecture_ecriture(lecture=(a.COM_DEM, a.COM_VAL), ecriture=(a.COM_DEM,))
