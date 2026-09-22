from rest_framework import serializers

from apps.catalogue.models import Article
from apps.stock.models import UniteArticle


def _attribuer_unite(unite_id, article, detail_mvt, beneficiaire):
    try:
        unite = UniteArticle.objects.filter(
            unite_id=unite_id,
            article=article,
            statut=UniteArticle.Statut.EN_STOCK,
        ).exclude(
                etat__in=[
                    UniteArticle.Etat.PERDU,
                    UniteArticle.Etat.HORS_USAGE,
                ]
        ).get()
    except UniteArticle.DoesNotExist:
        raise serializers.ValidationError(
            f"L'unité #{unite_id} pour l'article '{article.designation}' "
            f"n'existe pas ou n'est plus en stock."
        )

    if article.mode_suivi == Article.ModeSuivi.NUMERO_SERIE:  # noqa: SIM102
        if not unite.numero_de_serie:
            raise serializers.ValidationError(
                f"L'unité #{unite_id} pour l'article '{article.designation}' "
                f"n'a pas de numéro de série (obligatoire pour ce mode de suivi)."
            )

    unite.attribuer(beneficiaire=beneficiaire, mouvement_sortie=detail_mvt)
    return unite
