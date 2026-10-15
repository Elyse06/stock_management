import logging

from celery import shared_task

from apps.catalogue.models import Article
from apps.common.emails import envoyer_notification
from apps.common.stock import stock_article_magasin
from apps.notifications.destinataires import gestion_catalogue
from apps.stock.models import Magasin

logger = logging.getLogger("apps.notifications")


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def notifier_stock_bas(self, code_article, magasin_id, magasin_nom=None):
    article = Article.objects.filter(code_article=code_article).first()
    magasin = Magasin.objects.filter(pk=magasin_id).first()
    if article is None or magasin is None:
        return "Article ou magasin introuvable"

    stock = stock_article_magasin(article, magasin.pk)
    if stock > article.seuil:
        return "Stock OK"

    try:
        envoyer_notification(
            gestion_catalogue(),
            sujet=f"Stock bas : {article.designation} ({magasin.magasin_nom})",
            message=(
                f"Le stock de « {article.designation} » au {magasin.magasin_nom} "
                f"est de {stock}, sous le seuil de {article.seuil} : pensez à le réapprovisionner."
            ),
        )
    except Exception as exc:
        logger.warning("Échec de l'alerte stock %s / %s : %s", code_article, magasin_id, exc)
        raise self.retry(exc=exc) from exc
    return "Succès"
