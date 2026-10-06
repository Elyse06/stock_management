# apps/notifications/signals.py
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.commande.models import Commande
from apps.notifications.tasks import notifier_changement_statut_commande

# Dictionnaire global pour stocker temporairement les anciens statuts
_old_statuts_commandes = {}

@receiver(pre_save, sender=Commande)
def memoriser_ancien_statut_commande(sender, instance, **kwargs):
    """Mémorise le statut avant la mise à jour en base."""
    if instance.pk: # Si ce n'est pas une création
        old_statut = Commande.objects.filter(pk=instance.pk).values_list('statut', flat=True).first()
        _old_statuts_commandes[instance.pk] = old_statut

@receiver(post_save, sender=Commande)
def gerer_notification_commande(sender, instance, created, **kwargs):
    """Déclenche la notification si le statut a changé."""
    if created:
        # Nouvelle commande créée (Statut initial : EN_ATTENTE)
        notifier_changement_statut_commande.delay(instance.commande_id, None, instance.statut)
    else:
        ancien_statut = _old_statuts_commandes.get(instance.pk)
        if ancien_statut and ancien_statut != instance.statut:
            notifier_changement_statut_commande.delay(instance.commande_id, ancien_statut, instance.statut)
        
        # Nettoyage du dictionnaire
        _old_statuts_commandes.pop(instance.pk, None)
