from django.db.models import Sum
from django.db.models.functions import Coalesce

from apps.stock.models import DetailMouvement

from .stock_filters import build_stock_filters


def _calculer_stock_magasin(article, magasin):
    stock_filters = build_stock_filters(magasin_id=magasin.pk)

    entrees = DetailMouvement.objects.filter(
        stock_filters["entree"],
        article=article,
    ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
    
    sorties = DetailMouvement.objects.filter(
        stock_filters["sortie"],
        article=article,
    ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
    
    ajustements_plus = DetailMouvement.objects.filter(
        stock_filters["ajustement_plus"],
        article=article,
    ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
    
    ajustements_moins = DetailMouvement.objects.filter(
        stock_filters["ajustement_moins"],
        article=article,
    ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
    
    return entrees - sorties + ajustements_plus - ajustements_moins
