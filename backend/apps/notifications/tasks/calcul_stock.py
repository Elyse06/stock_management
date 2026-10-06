from django.db.models import Sum

from apps.stock.models import DetailMouvement, Mouvement


def calculer_stock_article_magasin(code_article, magasin_id):
    """
    Calcule le stock d'un article dans un magasin spécifique.
    Basé sur la logique de stock_filters.py.
    """
    # Entrées : le magasin est la destination
    entrees = DetailMouvement.objects.filter(
        article__code_article=code_article,
        mouvement__type_mouvement__in=[Mouvement.Type.ENTREE, Mouvement.Type.RETOUR],
        mouvement__magasin_destination_id=magasin_id,
    ).aggregate(total=Sum('quantite'))['total'] or 0

    # Sorties : le magasin est la source
    sorties = DetailMouvement.objects.filter(
        article__code_article=code_article,
        mouvement__type_mouvement__in=[Mouvement.Type.SORTIE, Mouvement.Type.TRANSFERT],
        mouvement__magasin_source_id=magasin_id,
    ).aggregate(total=Sum('quantite'))['total'] or 0

    # Ajustement + : le magasin est la destination (pas de source)
    ajustement_plus = DetailMouvement.objects.filter(
        article__code_article=code_article,
        mouvement__type_mouvement=Mouvement.Type.AJUSTEMENT,
        mouvement__magasin_destination_id=magasin_id,
        mouvement__magasin_source__isnull=True,
    ).aggregate(total=Sum('quantite'))['total'] or 0

    # Ajustement - : le magasin est la source (pas de destination)
    ajustement_moins = DetailMouvement.objects.filter(
        article__code_article=code_article,
        mouvement__type_mouvement=Mouvement.Type.AJUSTEMENT,
        mouvement__magasin_source_id=magasin_id,
        mouvement__magasin_destination__isnull=True,
    ).aggregate(total=Sum('quantite'))['total'] or 0

    return entrees - sorties + ajustement_plus - ajustement_moins
