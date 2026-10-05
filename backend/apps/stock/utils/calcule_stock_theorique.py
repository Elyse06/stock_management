from django.db.models import Q, Sum

from apps.catalogue.services.stock_filters import build_stock_filters
from apps.stock.models import DetailMouvement, Mouvement


def calculer_stock_theorique(article, magasin=None, direction=None, site=None, salle=None):
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
            Q(affectation__direction_id=direction.pk)
            | Q(affectation__employe__emp_serv_id__serv_dir_id=direction.pk)
        )
        return _calculer_stock_beneficiaire(article, beneficiaire_direction)

    if site:
        beneficiaires_site = (
            Q(affectation__site_id=site.pk)
            | Q(affectation__direction__site_id=site.pk)
            | Q(affectation__employe__emp_serv_id__serv_dir_id__site_id=site.pk)
            | Q(affectation__salle__localite_id=site.pk)
        )
        return _calculer_stock_beneficiaire(article, beneficiaires_site)

    if salle:
        beneficiaire_salle = Q(affectation__salle_id=salle.pk)
        return _calculer_stock_beneficiaire(article, beneficiaire_salle)

    return 0


def _calculer_stock_beneficiaire(article, beneficiaire_filter):
    filtres = {"article": article}
    sorties = DetailMouvement.objects.filter(
        beneficiaire_filter, mouvement__type_mouvement=Mouvement.Type.SORTIE, **filtres
    ).aggregate(total=Sum("quantite"))["total"] or 0
    retours = DetailMouvement.objects.filter(
        beneficiaire_filter, mouvement__type_mouvement=Mouvement.Type.RETOUR, **filtres
    ).aggregate(total=Sum("quantite"))["total"] or 0
    ajustements_positifs = DetailMouvement.objects.filter(
        beneficiaire_filter,
        mouvement__type_mouvement=Mouvement.Type.AJUSTEMENT,
        mouvement__motif="Régularisation d'écart positif",
        **filtres,
    ).aggregate(total=Sum("quantite"))["total"] or 0
    ajustements_negatifs = DetailMouvement.objects.filter(
        beneficiaire_filter,
        mouvement__type_mouvement=Mouvement.Type.AJUSTEMENT,
        mouvement__motif="Régularisation d'écart négatif",
        **filtres,
    ).aggregate(total=Sum("quantite"))["total"] or 0
    return sorties - retours + ajustements_positifs - ajustements_negatifs