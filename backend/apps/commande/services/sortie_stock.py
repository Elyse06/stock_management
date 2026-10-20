from django.db import transaction
from rest_framework import serializers

from apps.catalogue.models import Article
from apps.common.stock import stock_article_magasin
from apps.stock.models import (
    Affectation,
    DetailMouvement,
    Magasin,
    Mouvement,
    UniteArticle,
)

ETATS_INUTILISABLES = (UniteArticle.Etat.PERDU, UniteArticle.Etat.HORS_USAGE)


def _unites_disponibles(article):
    return (
        UniteArticle.objects.select_for_update()
        .filter(article=article, statut=UniteArticle.Statut.EN_STOCK)
        .exclude(etat__in=ETATS_INUTILISABLES)
    )


def _attribuer_unites_choisies(article, unite_ids, detail, beneficiaire):
    unites = {u.unite_id: u for u in _unites_disponibles(article).filter(unite_id__in=unite_ids)}
    for unite_id in unite_ids:
        unite = unites.get(unite_id)
        if unite is None:
            raise serializers.ValidationError(
                f"L'unité #{unite_id} pour l'article '{article.designation}' "
                "n'existe pas ou n'est plus en stock."
            )
        if not unite.numero_de_serie:
            raise serializers.ValidationError(
                f"L'unité #{unite_id} pour l'article '{article.designation}' "
                "n'a pas de numéro de série (obligatoire pour ce mode de suivi)."
            )
        unite.attribuer(beneficiaire=beneficiaire, mouvement_sortie=detail)


def _attribuer_premieres_unites(article, quantite, detail, beneficiaire):
    unites = list(_unites_disponibles(article).order_by("unite_id")[:quantite])
    if len(unites) < quantite:
        raise serializers.ValidationError(
            f"Stock insuffisant pour '{article.designation}'. "
            f"Disponible: {len(unites)}, Requis: {quantite}."
        )
    for unite in unites:
        unite.attribuer(beneficiaire=beneficiaire, mouvement_sortie=detail)


def _verifier_stock_fournitures(attributions, magasin):
    """Les fournitures sorties ne peuvent pas dépasser le stock du magasin (un article qui vient d'être
    créé pour une demande de nouvel article a un stock nul tant que l'entrée n'est pas faite)."""
    besoins = {}
    for detail, attribution in attributions:
        if not detail.article.is_immobilisation:
            besoins.setdefault(detail.article, 0)
            besoins[detail.article] += int(attribution.quantite_validee)
    for article, quantite in besoins.items():
        disponible = stock_article_magasin(article, magasin.pk)
        if disponible < quantite:
            raise serializers.ValidationError(
                f"Stock insuffisant pour '{article.designation}' au magasin « {magasin.magasin_nom} ». "
                f"Disponible: {nombre_entier(disponible)}, Requis: {quantite}."
            )


def nombre_entier(valeur):
    return int(valeur) if valeur == int(valeur) else valeur


@transaction.atomic
def generer_sortie_stock_pour_commande(commande, magasin_source=None, details_data=None):
    """Crée le mouvement de SORTIE correspondant aux attributions validées."""
    magasin = magasin_source or Magasin.objects.order_by("magasin_id").first()
    if magasin is None:
        raise serializers.ValidationError("Aucun magasin disponible pour la sortie de stock.")

    origine = f"Commande #{commande.pk} - {getattr(commande.employe_demandeur, 'emp_nom', '')}"[:100]
    motif = (commande.objet or "Sortie pour attribution employés")[:255]
    if Mouvement.objects.filter(origine=origine, motif=motif).exists():
        return None

    unites_restantes = {
        d["detail_id"]: list(d.get("unites_a_attribuer") or [])
        for d in details_data or []
        if d.get("detail_id") and d.get("unites_a_attribuer")
    }

    details = commande.details.select_related("article").prefetch_related(
        "attributions__affectation__employe",
        "attributions__affectation__direction",
        "attributions__affectation__salle",
        "attributions__affectation__site",
    )
    attributions = [
        (detail, attribution)
        for detail in details
        for attribution in detail.attributions.all()
        if attribution.statut == "VALIDEE" and detail.article_id is not None
    ]
    if not attributions:
        return None
    _verifier_stock_fournitures(attributions, magasin)

    mouvement = Mouvement.objects.create(
        type_mouvement=Mouvement.Type.SORTIE, magasin_source=magasin, origine=origine, motif=motif,
    )

    for detail, attribution in attributions:
        article = detail.article
        quantite = int(attribution.quantite_validee)
        beneficiaire = attribution.beneficiaire
        detail_mvt = DetailMouvement.objects.create(
            mouvement=mouvement,
            article=article,
            quantite=quantite,
            affectation=Affectation.resoudre(beneficiaire),
            code_tracabilite=attribution.code_unique if article.is_immobilisation else None,
        )
        if not article.is_immobilisation:
            continue
        if article.mode_suivi == Article.ModeSuivi.NUMERO_SERIE:
            restantes = unites_restantes.get(detail.id, [])
            unites_restantes[detail.id] = restantes[quantite:]
            _attribuer_unites_choisies(article, restantes[:quantite], detail_mvt, beneficiaire)
        else:
            _attribuer_premieres_unites(article, quantite, detail_mvt, beneficiaire)

    return mouvement
