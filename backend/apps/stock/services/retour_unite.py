from django.db import transaction
from rest_framework import serializers

from apps.stock.models import DetailMouvement, Mouvement, UniteArticle


@transaction.atomic
def retourner_unite_au_stock(unite_id, magasin_destination, motif=""):
    unite = (
        UniteArticle.objects.select_for_update()
        .select_related(
            "article", "affectation__employe", "affectation__direction",
            "affectation__salle", "affectation__site",
        )
        .filter(unite_id=unite_id)
        .first()
    )
    if unite is None:
        raise serializers.ValidationError(f"Unité #{unite_id} introuvable.")
    if unite.statut != UniteArticle.Statut.ATTRIBUE:
        raise serializers.ValidationError(
            f"L'unité #{unite_id} n'est pas attribuée (statut : {unite.statut})."
        )
    if unite.etat == UniteArticle.Etat.PERDU:
        raise serializers.ValidationError("Une unité marquée 'Perdu' ne peut pas être retournée au stock.")

    ancien = unite.affectation.cible if unite.affectation_id else None
    mouvement = Mouvement.objects.create(
        type_mouvement=Mouvement.Type.RETOUR,
        origine=f"Retour unité #{unite.unite_id} de {ancien}"[:100],
        motif=motif or "Retour au stock",
        magasin_destination=magasin_destination,
    )
    DetailMouvement.objects.create(
        mouvement=mouvement, article=unite.article, quantite=1, affectation=unite.affectation,
    )
    unite.retourner_stock()
    return mouvement
