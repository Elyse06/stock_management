from rest_framework import serializers

from apps.stock.models import (
    DetailMouvement,
    Mouvement,
    UniteArticle,
)


def retourner_unite_au_stock(unite_id, magasin_destination, motif=""):
    try:
        unite = UniteArticle.objects.select_related(
            'article', 'affectation', 'affectation__employe',
            'affectation__direction', 'affectation__salle', 'affectation__site',
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
    
    beneficiaire_source = unite.affectation.cible if unite.affectation_id else None
    
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
    if unite.affectation_id:
        # Le détail de retour garde une trace de QUI détenait l'unité, à
        # titre d'historique (l'unité elle-même perd son affectation juste
        # après, via retourner_stock()).
        detail_payload["affectation"] = unite.affectation
    
    DetailMouvement.objects.create(**detail_payload)
    
    # retourner_stock() s'occupe déjà de remettre statut=EN_STOCK,
    # affectation=None et mouvement_sortie=None, puis sauvegarde. (L'ancien
    # code refaisait un `unite.mouvement_sortie = None` juste après, sans
    # second .save() : c'était un no-op mort, retiré ici.)
    unite.retourner_stock()
    
    return mouvement