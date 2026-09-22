from django.db.models import Q, Sum

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
        beneficiaire_direction = (
            Q(direction_beneficiaire_id=direction.pk)
            | Q(employe_beneficiaire__emp_serv_id__serv_dir_id=direction.pk)
        )
        sorties = DetailMouvement.objects.filter(
            beneficiaire_direction,
            mouvement__type_mouvement=Mouvement.Type.SORTIE,
            article=article,
        ).aggregate(total=Sum("quantite"))["total"] or 0
        retours = DetailMouvement.objects.filter(
            beneficiaire_direction,
            mouvement__type_mouvement=Mouvement.Type.RETOUR,
            article=article,
        ).aggregate(total=Sum("quantite"))["total"] or 0
        return sorties - retours

    return 0