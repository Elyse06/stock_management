from rest_framework import serializers

from apps.stock.models import (
    DetailMouvement,
    Mouvement,
    UniteArticle,
)


def retourner_unite_au_stock(unite_id, magasin_destination, motif=""):
    try:
        unite = UniteArticle.objects.select_related(
            'article', 'employe_beneficiaire', 'direction_beneficiaire'
        ).get(unite_id=unite_id)
    except UniteArticle.DoesNotExist:
        raise serializers.ValidationError(f"Unité #{unite_id} introuvable.")
    
    if unite.statut != UniteArticle.Statut.ATTRIBUE:
        raise serializers.ValidationError(
            f"L'unité #{unite_id} n'est pas attribuée (statut : {unite.statut})."
        )
    
    if unite.etat == UniteArticle.Etat.PERDU:
        raise serializers.ValidationError(
            "Une unité marquée 'Perdu' ne peut pas être retournée au stock."
        )
    
    beneficiaire_source = unite.employe_beneficiaire or unite.direction_beneficiaire
    
    mouvement = Mouvement.objects.create(
        type_mouvement=Mouvement.Type.RETOUR,
        origine=f"Retour unité #{unite.unite_id} de {beneficiaire_source}",
        motif=motif or "Retour au stock",
        magasin_source=None,
        magasin_destination=magasin_destination,
    )
    
    detail_payload = {
        "mouvement": mouvement,
        "article": unite.article,
        "quantite": 1,
    }
    if unite.employe_beneficiaire:
        detail_payload["employe_beneficiaire"] = unite.employe_beneficiaire
    elif unite.direction_beneficiaire:
        detail_payload["direction_beneficiaire"] = unite.direction_beneficiaire
    
    DetailMouvement.objects.create(**detail_payload)
    
    unite.retourner_stock()
    unite.mouvement_sortie = None
    
    return mouvement
