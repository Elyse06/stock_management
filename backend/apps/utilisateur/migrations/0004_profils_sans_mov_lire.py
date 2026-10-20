"""Profils Standard et Chef hiérarchique (validateur de commandes) : retrait du droit MOV_LIRE.

Seuls les comptes dont les droits correspondent EXACTEMENT à l'un de ces deux profils sont modifiés ;
un profil personnalisé n'est pas touché.
"""
from django.db import migrations

ANCIEN_STANDARD = {"CAT_LIRE", "MOV_LIRE", "COM_DEM"}
ANCIEN_CHEF = {"CAT_LIRE", "MOV_LIRE", "COM_DEM", "COM_VAL"}


def retirer_mov_lire(apps, schema_editor):
    Autoriser = apps.get_model("utilisateur", "Autoriser")
    droits = {}
    for utilisateur_id, action_id in Autoriser.objects.values_list("autoriser_utilisateur_id_id", "autoriser_action_id_id"):
        droits.setdefault(utilisateur_id, set()).add(action_id)
    concernes = [uid for uid, actions in droits.items() if actions in (ANCIEN_STANDARD, ANCIEN_CHEF)]
    Autoriser.objects.filter(autoriser_utilisateur_id_id__in=concernes, autoriser_action_id_id="MOV_LIRE").delete()


def remettre_mov_lire(apps, schema_editor):
    Autoriser = apps.get_model("utilisateur", "Autoriser")
    Action = apps.get_model("utilisateur", "Action")
    mov_lire = Action.objects.filter(pk="MOV_LIRE").first()
    if mov_lire is None:
        return
    droits = {}
    for utilisateur_id, action_id in Autoriser.objects.values_list("autoriser_utilisateur_id_id", "autoriser_action_id_id"):
        droits.setdefault(utilisateur_id, set()).add(action_id)
    for uid, actions in droits.items():
        if actions in (ANCIEN_STANDARD - {"MOV_LIRE"}, ANCIEN_CHEF - {"MOV_LIRE"}):
            Autoriser.objects.create(autoriser_utilisateur_id_id=uid, autoriser_action_id=mov_lire)


class Migration(migrations.Migration):
    dependencies = [("utilisateur", "0003_utilisateur_acces_envoye_le")]
    operations = [migrations.RunPython(retirer_mov_lire, remettre_mov_lire)]
