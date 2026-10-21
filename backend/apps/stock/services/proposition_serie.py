from rest_framework import serializers

from apps.stock.models import DetailMouvement, UniteArticle


def _unite(article, unite_id):
    unite = UniteArticle.objects.select_for_update().filter(unite_id=unite_id, article=article).first()
    if unite is None:
        raise serializers.ValidationError(
            f"Unité #{unite_id} introuvable pour l'article '{article.designation}'."
        )
    return unite


def materialiser_propositions_serie(
    ligne, article, mouvement_gain=None, mouvement_perte=None, affectation_lieu=None,
):
    propositions = ligne.propositions_series or {}

    for ajout in propositions.get("ajouts", []):
        detail = None
        if mouvement_gain:
            detail = DetailMouvement.objects.create(
                mouvement=mouvement_gain, article=article, quantite=1, affectation=affectation_lieu,
            )
        UniteArticle.objects.create(
            article=article,
            numero_de_serie=ajout["numero_serie"],
            statut=UniteArticle.Statut.ATTRIBUE if affectation_lieu else UniteArticle.Statut.EN_STOCK,
            etat=ajout["etat"],
            mouvement_entree=detail,
            mouvement_sortie=detail if affectation_lieu else None,
            affectation=affectation_lieu,
        )

    for retrait in propositions.get("retraits", []):
        unite = _unite(article, retrait["unite_id"])
        unite.etat = retrait["etat"]
        if retrait["etat"] == UniteArticle.Etat.PERDU:
            unite.statut = UniteArticle.Statut.EN_STOCK
            unite.affectation = None
            unite.mouvement_sortie = None
            if mouvement_perte:
                unite.mouvement_sortie = DetailMouvement.objects.create(
                    mouvement=mouvement_perte, article=article, quantite=1,
                    affectation=affectation_lieu,
                )
        unite.save()

    for changement in propositions.get("changements_etat", []):
        unite = _unite(article, changement["unite_id"])
        unite.etat = changement["etat"]
        unite.save()

    ligne.propositions_series = {}
    ligne.save(update_fields=["propositions_series"])
