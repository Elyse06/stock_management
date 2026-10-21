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
    """Transfert = retour au magasin puis nouvelle sortie vers le nouveau bénéficiaire."""
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
    if unite.etat in (UniteArticle.Etat.HORS_USAGE, UniteArticle.Etat.PERDU):
        raise serializers.ValidationError(
            f"Impossible de transférer une unité dans l'état '{unite.get_etat_display()}'."
        )
    if not isinstance(nouveau_beneficiaire, Employer | Direction | Salle | Site):
        raise serializers.ValidationError(
            "Le bénéficiaire doit être un employé, une direction, une salle ou un site."
        )
    ancien = unite.affectation.cible if unite.affectation_id else None
    if ancien == nouveau_beneficiaire:
        raise serializers.ValidationError(
            "Le nouveau bénéficiaire doit être différent du bénéficiaire actuel."
        )

    mouvement_retour = Mouvement.objects.create(
        type_mouvement=Mouvement.Type.RETOUR,
        origine=f"Transfert unité #{unite.unite_id} de {ancien}"[:100],
        motif=motif or "Transfert - retour temporaire",
        magasin_destination=magasin_source,
    )
    DetailMouvement.objects.create(
        mouvement=mouvement_retour, article=unite.article, quantite=1, affectation=unite.affectation, unite=unite,
    )
    unite.retourner_stock()

    mouvement_sortie = Mouvement.objects.create(
        type_mouvement=Mouvement.Type.SORTIE,
        magasin_source=magasin_source,
        origine=f"Transfert unité #{unite.unite_id} (étape 2/2)",
        motif=motif or "Transfert - nouvelle attribution",
    )
    detail_sortie = DetailMouvement.objects.create(
        mouvement=mouvement_sortie, article=unite.article, quantite=1,
        affectation=Affectation.resoudre(nouveau_beneficiaire), unite=unite,
    )
    # Le retour et la nouvelle sortie forment un seul transfert (accusé PDF en deux parties).
    mouvement_retour.mouvement_lie = mouvement_sortie
    mouvement_retour.save(update_fields=["mouvement_lie"])
    unite.attribuer(beneficiaire=nouveau_beneficiaire, mouvement_sortie=detail_sortie)
    return {"retour": mouvement_retour, "sortie": mouvement_sortie}
