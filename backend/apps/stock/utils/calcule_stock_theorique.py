from django.db.models import Sum

from apps.catalogue.services.stock_filters import build_stock_filters
from apps.stock.models import DetailMouvement, Mouvement


def calculer_stock_theorique(article, magasin=None, direction=None):
    if magasin:
        stock_filters = build_stock_filters(magasin_id=magasin.pk)
        entrees = DetailMouvement.objects.filter(
            stock_filters["entree"],
            article=article,
        ).aggregate(total=Sum("quantite"))["total"] or 0

        sorties = DetailMouvement.objects.filter(
            stock_filters["sortie"],
            article=article,
        ).aggregate(total=Sum("quantite"))["total"] or 0

        ajustements_plus = DetailMouvement.objects.filter(
            stock_filters["ajustement_plus"],
            article=article,
        ).aggregate(total=Sum("quantite"))["total"] or 0

        ajustements_moins = DetailMouvement.objects.filter(
            stock_filters["ajustement_moins"],
            article=article,
        ).aggregate(total=Sum("quantite"))["total"] or 0

        return entrees - sorties + ajustements_plus - ajustements_moins

    if direction:
        stock_direction = DetailMouvement.objects.filter(
            mouvement__type_mouvement=Mouvement.Type.SORTIE,
            employe_beneficiaire__emp_serv_id__serv_dir_id=direction,
            article=article,
        ).aggregate(total=Sum("quantite"))["total"] or 0
        return stock_direction

    return 0