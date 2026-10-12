from functools import partial

from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.commande.models import Commande
from apps.notifications.tasks import notifier_changement_statut_commande


@receiver(pre_save, sender=Commande)
def memoriser_ancien_statut_commande(sender, instance, **kwargs):
    instance._ancien_statut = (
        Commande.objects.filter(pk=instance.pk).values_list("statut", flat=True).first()
        if instance.pk else None
    )


@receiver(post_save, sender=Commande)
def gerer_notification_commande(sender, instance, created, **kwargs):
    ancien = None if created else getattr(instance, "_ancien_statut", None)
    if not created and (ancien is None or ancien == instance.statut):
        return
    transaction.on_commit(partial(
        notifier_changement_statut_commande.delay, instance.commande_id, ancien, instance.statut
    ))
