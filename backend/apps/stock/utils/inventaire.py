from django.utils import timezone

from apps.common.localisation import filtre_direction, filtre_salle, filtre_site
from apps.common.stock import stock_article_beneficiaire, stock_article_magasin


def calculer_stock_theorique(article, magasin=None, direction=None, site=None, salle=None):
    if magasin:
        return stock_article_magasin(article, magasin.pk)
    if direction:
        return stock_article_beneficiaire(article, filtre_direction(direction.pk))
    if site:
        return stock_article_beneficiaire(article, filtre_site(site.pk))
    if salle:
        return stock_article_beneficiaire(article, filtre_salle(salle.pk))
    return 0


def generer_code_reference():
    from apps.stock.models import InventaireSession

    prefix = f"INV-{timezone.localdate():%Y%m%d}-"
    numeros = [
        int(code.removeprefix(prefix))
        for code in InventaireSession.objects.filter(code_reference__startswith=prefix)
        .values_list("code_reference", flat=True)
        if code.removeprefix(prefix).isdigit()
    ]
    return f"{prefix}{max(numeros, default=0) + 1:03d}"
