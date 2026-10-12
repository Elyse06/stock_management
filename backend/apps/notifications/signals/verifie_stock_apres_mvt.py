from django.db import connection, transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.notifications.tasks import notifier_stock_bas
from apps.stock.models import DetailMouvement, Mouvement


def _planifier(code_article, magasin_id):
    cle = (code_article, magasin_id)
    if any(getattr(entree[1], "cle_stock", None) == cle for entree in connection.run_on_commit):
        return

    def envoyer():
        notifier_stock_bas.delay(code_article=code_article, magasin_id=magasin_id)

    envoyer.cle_stock = cle
    transaction.on_commit(envoyer)


@receiver(post_save, sender=DetailMouvement)
def verifier_stock_apres_mouvement(sender, instance, created, **kwargs):
    if not created:
        return
    mouvement = instance.mouvement
    if mouvement.type_mouvement in (Mouvement.Type.SORTIE, Mouvement.Type.TRANSFERT) and mouvement.magasin_source_id:
        _planifier(instance.article_id, mouvement.magasin_source_id)
