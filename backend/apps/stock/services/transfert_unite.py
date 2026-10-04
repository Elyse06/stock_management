from django.db import transaction
from rest_framework import serializers

from apps.employee.models import Direction, Employer, Site
from apps.stock.models import (
    Affectation,
    DetailMouvement,
    Mouvement,
    Salle,
    UniteArticle,
)


@transaction.atomic
def transferer_unite(unite_id, nouveau_beneficiaire, magasin_source, motif=""):
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
    
    if unite.etat in [UniteArticle.Etat.HORS_USAGE, UniteArticle.Etat.PERDU]:
        raise serializers.ValidationError(
            f"Impossible de transférer une unité dans l'état '{unite.get_etat_display()}'."
        )
    
    ancien_beneficiaire = unite.affectation.cible if unite.affectation_id else None
    if ancien_beneficiaire == nouveau_beneficiaire:
        raise serializers.ValidationError(
            "Le nouveau bénéficiaire doit être différent du bénéficiaire actuel."
        )
    
    if not isinstance(nouveau_beneficiaire, (Employer, Direction, Salle, Site)):
        raise serializers.ValidationError(
            "Le bénéficiaire doit être un employé, une direction, une salle ou un site."
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
    
    DetailMouvement.objects.create(
        mouvement=mouvement_retour,
        article=unite.article,
        quantite=1,
        affectation=unite.affectation if unite.affectation_id else None,
    )
    
    unite.statut = UniteArticle.Statut.EN_STOCK
    unite.affectation = None
    unite.mouvement_sortie = None
    unite.save()
    
    mouvement_sortie = Mouvement.objects.create(
        type_mouvement=Mouvement.Type.SORTIE,
        magasin_source=magasin_source,
        origine=f"Transfert unité #{unite.unite_id} (étape 2/2)",
        motif=motif or "Transfert - nouvelle attribution",
    )
    
    detail_sortie = DetailMouvement.objects.create(
        mouvement=mouvement_sortie,
        article=unite.article,
        quantite=1,
        affectation=Affectation.resoudre(nouveau_beneficiaire),
    )
    unite.attribuer(beneficiaire=nouveau_beneficiaire, mouvement_sortie=detail_sortie)
    
    return {
        "retour": mouvement_retour,
        "sortie": mouvement_sortie,
    }