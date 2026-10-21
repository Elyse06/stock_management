from apps.common import actions as a
from apps.common.permissions import lecture_ecriture

MouvementPermission = lecture_ecriture(lecture=(a.MOV_LIRE,), ecriture=(a.INV_GERE,))
InventairePermission = lecture_ecriture(lecture=(a.INV_LIRE,), ecriture=(a.INV_GERE,))
LieuPermission = lecture_ecriture(lecture=(a.CAT_LIRE,), ecriture=(a.INV_GERE,))
# Unités : lecture pour le suivi du stock (les employés voient les leurs dans « Mes équipements »).
UnitePermission = lecture_ecriture(lecture=(a.INV_LIRE, a.MOV_LIRE, a.CAT_GERE), ecriture=(a.INV_GERE,))
