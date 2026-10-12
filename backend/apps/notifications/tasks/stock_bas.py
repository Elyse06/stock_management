import logging

from celery import shared_task
from django.utils.html import format_html

from apps.catalogue.models import Article
from apps.common.emails import envoyer_notification
from apps.common.stock import stock_article_magasin
from apps.notifications.destinataires import emails_gestion_catalogue
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
            emails_gestion_catalogue(),
            sujet=f"Alerte Stock : {article.designation} ({magasin.magasin_nom})",
            titre="Alerte Stock Bas",
            message_html=format_html(
                "L'article <strong>{}</strong> (Code : {}) a atteint un niveau de stock critique "
                "dans le magasin <strong>{}</strong>.",
                article.designation, article.code_article, magasin.magasin_nom,
            ),
            lignes=[("Magasin", magasin.magasin_nom), ("Stock actuel", stock), ("Seuil d'alerte", article.seuil)],
            note=f"Merci de vérifier vos approvisionnements pour le magasin {magasin.magasin_nom}.",
        )
    except Exception as exc:
        logger.warning("Échec de l'alerte stock %s / %s : %s", code_article, magasin_id, exc)
        raise self.retry(exc=exc) from exc
    return "Succès"
