from apps.employee.models import Direction, Employer
from apps.stock.models import (
    DetailMouvement,
    Mouvement,
    UniteArticle,
)
from rest_framework import serializers


def transferer_unite(unite_id, nouveau_beneficiaire, magasin_source, motif=""):
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
    
    if unite.etat in [UniteArticle.Etat.HORS_USAGE, UniteArticle.Etat.PERDU]:
        raise serializers.ValidationError(
            f"Impossible de transférer une unité dans l'état '{unite.get_etat_display()}'."
        )
    
    ancien_beneficiaire = unite.employe_beneficiaire or unite.direction_beneficiaire
    if ancien_beneficiaire == nouveau_beneficiaire:
        raise serializers.ValidationError(
            "Le nouveau bénéficiaire doit être différent du bénéficiaire actuel."
        )
    
    if not isinstance(nouveau_beneficiaire, (Employer, Direction)):
        raise serializers.ValidationError(
            "Le bénéficiaire doit être un Employer ou une Direction."
        )
    
    if not unite.article.is_immobilisation and isinstance(nouveau_beneficiaire, Employer):
        raise serializers.ValidationError(
            "Une fourniture ne peut être transférée qu'à une direction."
        )
    
    mouvement_retour = Mouvement.objects.create(
        type_mouvement=Mouvement.Type.RETOUR,
        origine=f"Transfert unité #{unite.unite_id} de {ancien_beneficiaire}",
        motif=motif or "Transfert - retour temporaire",
        magasin_source=None,
        magasin_destination=magasin_source,
    )
    
    detail_retour_payload = {
        "mouvement": mouvement_retour,
        "article": unite.article,
        "quantite": 1,
    }
    if unite.employe_beneficiaire:
        detail_retour_payload["employe_beneficiaire"] = unite.employe_beneficiaire
    elif unite.direction_beneficiaire:
        detail_retour_payload["direction_beneficiaire"] = unite.direction_beneficiaire
    
    DetailMouvement.objects.create(**detail_retour_payload)
    
    unite.statut = UniteArticle.Statut.EN_STOCK
    unite.employe_beneficiaire = None
    unite.direction_beneficiaire = None
    unite.mouvement_sortie = None
    
    mouvement_sortie = Mouvement.objects.create(
        type_mouvement=Mouvement.Type.SORTIE,
        magasin_source=magasin_source,
        origine=f"Transfert unité #{unite.unite_id} (étape 2/2)",
        motif=motif or "Transfert - nouvelle attribution",
    )
    
    detail_sortie_payload = {
        "mouvement": mouvement_sortie,
        "article": unite.article,
        "quantite": 1,
    }
    if isinstance(nouveau_beneficiaire, Employer):
        detail_sortie_payload["employe_beneficiaire"] = nouveau_beneficiaire
    else:
        detail_sortie_payload["direction_beneficiaire"] = nouveau_beneficiaire
    
    DetailMouvement.objects.create(**detail_sortie_payload)
    
    unite.attribuer(beneficiaire=nouveau_beneficiaire, mouvement_sortie=detail_sortie_payload)
    
    return {
        "retour": mouvement_retour,
        "sortie": mouvement_sortie,
    }
