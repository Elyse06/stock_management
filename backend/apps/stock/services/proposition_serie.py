from apps.stock.models import DetailMouvement, UniteArticle
from rest_framework import serializers


def _materieliser_propositions_serie(ligne, session, article, mouvement_gain=None, mouvement_perte=None):
    propositions = ligne.propositions_series or {}
    
    for ajout in propositions.get('ajouts', []):
        detail_mouvement = None
        if mouvement_gain:
            detail_mouvement = DetailMouvement.objects.create(
                mouvement=mouvement_gain,
                article=article,
                quantite=1,
            )

        unite = UniteArticle.objects.create(
            article=article,
            numero_de_serie=ajout['numero_serie'],
            statut=UniteArticle.Statut.EN_STOCK,
            etat=ajout['etat'],
            mouvement_entree=detail_mouvement,
        )
    
    for retrait in propositions.get('retraits', []):
        try:
            unite = UniteArticle.objects.get(
                unite_id=retrait['unite_id'],
                article=article,
            )
            unite.etat = retrait['etat']
            
            if retrait['etat'] == UniteArticle.Etat.PERDU:
                unite.statut = UniteArticle.Statut.EN_STOCK
                unite.employe_beneficiaire = None
                unite.direction_beneficiaire = None

                detail_mouvement = None
                if mouvement_perte:
                    detail_mouvement = DetailMouvement.objects.create(
                        mouvement=mouvement_perte,
                        article=article,
                        quantite=1,
                    )
                unite.mouvement_sortie = detail_mouvement
            
            unite.full_clean()
            unite.save()
        
        except UniteArticle.DoesNotExist:
            raise serializers.ValidationError(
                f"Unité #{retrait['unite_id']} introuvable pour l'article '{article.designation}'."
            )
    
    for changement in propositions.get('changements_etat', []):
        try:
            unite = UniteArticle.objects.get(
                unite_id=changement['unite_id'],
                article=article,
            )
            unite.etat = changement['etat']
            unite.full_clean()
            unite.save()
        except UniteArticle.DoesNotExist:
            raise serializers.ValidationError(
                f"Unité #{changement['unite_id']} introuvable pour l'article '{article.designation}'."
            )
    
    ligne.propositions_series = {}
    ligne.save(update_fields=['propositions_series'])
