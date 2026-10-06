from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.notifications.tasks import notifier_stock_bas
from apps.stock.models import DetailMouvement, Mouvement


@receiver(post_save, sender=DetailMouvement)
def verifier_stock_apres_mouvement(sender, instance, created, **kwargs):
    """
    Vérifie le stock après la création d'un DetailMouvement.
    Utilise on_commit pour garantir que la transaction DB est validée.
    """
    if not created:
        return  # On ne vérifie que lors de la création

    mouvement = instance.mouvement
    
    # On ne déclenche l'alerte que pour les mouvements qui réduisent le stock d'un magasin
    if mouvement.type_mouvement in [Mouvement.Type.SORTIE, Mouvement.Type.TRANSFERT]:
        magasin_source = mouvement.magasin_source
        
        if not magasin_source:
            return
        
        #  on_commit garantit que Celery ne sera déclenché que si la validation 
        # de la commande est un SUCCÈS total en base de données.
        transaction.on_commit(
            lambda: notifier_stock_bas.delay(
                code_article=instance.article.code_article,
                magasin_id=magasin_source.magasin_id,
                magasin_nom=magasin_source.magasin_nom,
            )
        )