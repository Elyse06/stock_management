from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.catalogue.models import Article
from apps.commande.models import AttributionDetailCommande
from apps.employee.models import Direction, Employer
from apps.stock.models import (
    DetailMouvement,
    InventaireSession,
    LigneInventaire,
    Mouvement,
    UniteArticle,
)


@transaction.atomic
def valider_session_inventaire(session: InventaireSession):
    if session.statut == InventaireSession.Statut.VALIDE:
        raise serializers.ValidationError("Cet inventaire a déjà été validé.")
    
    if session.statut != InventaireSession.Statut.EN_ATTENTE:
        raise serializers.ValidationError(
            "Seules les sessions EN_ATTENTE peuvent être validées."
        )
    
    mouvement_gain = None
    mouvement_perte = None
    
    lignes_ecart_positif = session.lignes.filter(ecart__gt=0)
    lignes_ecart_negatif = session.lignes.filter(ecart__lt=0)
    
    if lignes_ecart_positif.exists():
        mouvement_gain = Mouvement.objects.create(
            type_mouvement=Mouvement.Type.AJUSTEMENT,
            origine=f"Inventaire #{session.code_reference}",
            motif="Régularisation d'écart positif",
            magasin_source=None,
            magasin_destination=session.magasin,
        )
    
    if lignes_ecart_negatif.exists():
        mouvement_perte = Mouvement.objects.create(
            type_mouvement=Mouvement.Type.AJUSTEMENT,
            origine=f"Inventaire #{session.code_reference}",
            motif="Régularisation d'écart négatif",
            magasin_source=session.magasin,
            magasin_destination=None,
        )
    
    lignes_a_mettre_a_jour = []
    
    for ligne in session.lignes.select_related('article').all():
        article = ligne.article
        ecart = int(ligne.ecart)
        
        if article.mode_suivi == Article.ModeSuivi.NUMERO_SERIE:
            _materieliser_propositions_serie(
                ligne=ligne,
                session=session,
                article=article,
                mouvement_gain=mouvement_gain,
                mouvement_perte=mouvement_perte,
            )
        else:
            if ecart != 0:
                mouvement_ref = mouvement_gain if ecart > 0 else mouvement_perte
                DetailMouvement.objects.create(
                    mouvement=mouvement_ref,
                    article=article,
                    quantite=abs(ecart),
                )
        
        if ecart != 0:
            ligne.quantite_theorique = ligne.quantite_physique
            ligne.ecart = 0
            lignes_a_mettre_a_jour.append(ligne)
    
    if lignes_a_mettre_a_jour:
        LigneInventaire.objects.bulk_update(
            lignes_a_mettre_a_jour,
            ['quantite_theorique', 'ecart']
        )
    
    session.statut = InventaireSession.Statut.VALIDE
    session.date_validation = timezone.now()
    session.save()
    
    return session

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

def retourner_unite_au_stock(unite_id, magasin_destination, motif=""):
    try:
        unite = UniteArticle.objects.select_related(
            'article', 'employe_beneficiaire', 'direction_beneficiaire'
        ).get(unite_id=unite_id)
    except UniteArticle.DoesNotExist:
        raise serializers.ValidationError(f"Unité #{unite_id} introuvable.")
    
    # Validation : l'unité doit être attribuée
    if unite.statut != UniteArticle.Statut.ATTRIBUE:
        raise serializers.ValidationError(
            f"L'unité #{unite_id} n'est pas attribuée (statut : {unite.statut})."
        )
    
    # Validation : l'unité ne doit pas être PERDU
    if unite.etat == UniteArticle.Etat.PERDU:
        raise serializers.ValidationError(
            "Une unité marquée 'Perdu' ne peut pas être retournée au stock."
        )
    
    # Détermination du bénéficiaire source (pour traçabilité)
    beneficiaire_source = unite.employe_beneficiaire or unite.direction_beneficiaire
    
    # Création du mouvement de retour
    mouvement = Mouvement.objects.create(
        type_mouvement=Mouvement.Type.RETOUR,
        origine=f"Retour unité #{unite.unite_id} de {beneficiaire_source}",
        motif=motif or "Retour au stock",
        magasin_source=None,
        magasin_destination=magasin_destination,
    )
    
    # Création du détail de mouvement
    detail_payload = {
        "mouvement": mouvement,
        "article": unite.article,
        "quantite": 1,
    }
    # On trace qui rend l'unité (bénéficiaire "inverse")
    if unite.employe_beneficiaire:
        detail_payload["employe_beneficiaire"] = unite.employe_beneficiaire
    elif unite.direction_beneficiaire:
        detail_payload["direction_beneficiaire"] = unite.direction_beneficiaire
    
    DetailMouvement.objects.create(**detail_payload)
    
    # Mise à jour de l'unité
    unite.retourner_stock()
    unite.mouvement_sortie = None
    
    return mouvement

def transferer_unite(unite_id, nouveau_beneficiaire, magasin_source, motif=""):
    try:
        unite = UniteArticle.objects.select_related(
            'article', 'employe_beneficiaire', 'direction_beneficiaire'
        ).get(unite_id=unite_id)
    except UniteArticle.DoesNotExist:
        raise serializers.ValidationError(f"Unité #{unite_id} introuvable.")
    
    # Validation : l'unité doit être attribuée
    if unite.statut != UniteArticle.Statut.ATTRIBUE:
        raise serializers.ValidationError(
            f"L'unité #{unite_id} n'est pas attribuée (statut : {unite.statut})."
        )
    
    # Validation : état de l'unité
    if unite.etat in [UniteArticle.Etat.HORS_USAGE, UniteArticle.Etat.PERDU]:
        raise serializers.ValidationError(
            f"Impossible de transférer une unité dans l'état '{unite.get_etat_display()}'."
        )
    
    # Validation : le nouveau bénéficiaire doit être différent de l'ancien
    ancien_beneficiaire = unite.employe_beneficiaire or unite.direction_beneficiaire
    if ancien_beneficiaire == nouveau_beneficiaire:
        raise serializers.ValidationError(
            "Le nouveau bénéficiaire doit être différent du bénéficiaire actuel."
        )
    
    # Validation : le nouveau bénéficiaire doit être du bon type
    if not isinstance(nouveau_beneficiaire, (Employer, Direction)):
        raise serializers.ValidationError(
            "Le bénéficiaire doit être un Employer ou une Direction."
        )
    
    # Règle métier : une fourniture (non-immobilisation) ne peut être transférée
    if not unite.article.is_immobilisation and isinstance(nouveau_beneficiaire, Employer):
        raise serializers.ValidationError(
            "Une fourniture ne peut être transférée qu'à une direction."
        )
    
    # Retour au stock =====
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
    
    # Mise à jour intermédiaire : l'unité est en stock
    unite.statut = UniteArticle.Statut.EN_STOCK
    unite.employe_beneficiaire = None
    unite.direction_beneficiaire = None
    unite.mouvement_sortie = None
    
    # Nouvelle sortie vers le nouveau bénéficiaire =====
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
    
    # Attribution finale
    unite.attribuer(beneficiaire=nouveau_beneficiaire, mouvement_sortie=detail_sortie_payload)
    
    return {
        "retour": mouvement_retour,
        "sortie": mouvement_sortie,
    }