from apps.common import actions as a
from apps.common.permissions import lecture_ecriture

MouvementPermission = lecture_ecriture(lecture=(a.MOV_LIRE,), ecriture=(a.INV_GERE,))
InventairePermission = lecture_ecriture(lecture=(a.INV_LIRE,), ecriture=(a.INV_GERE,))
LieuPermission = lecture_ecriture(lecture=(a.CAT_LIRE,), ecriture=(a.INV_GERE,))
UnitePermission = lecture_ecriture(lecture=(a.CAT_LIRE, a.INV_LIRE), ecriture=(a.INV_GERE,))
