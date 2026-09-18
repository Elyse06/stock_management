from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.catalogue.models import Article
from apps.commande.models import AttributionDetailCommande
from apps.employee.models import Direction, Employer
from apps.stock.models import DetailMouvement, Magasin, Mouvement, UniteArticle


def _creer_detail_mouvement(mouvement, article, quantite, beneficiaire=None, code_tracabilite=None):
    payload = {
        "mouvement": mouvement,
        "article": article,
        "quantite": quantite,
    }
    if beneficiaire is not None:
        if isinstance(beneficiaire, Employer):
            payload["employe_beneficiaire"] = beneficiaire
        elif isinstance(beneficiaire, Direction):
            payload["direction_beneficiaire"] = beneficiaire
    if code_tracabilite:
        payload["code_tracabilite"] = code_tracabilite
    return DetailMouvement.objects.create(**payload)


def _attribuer_unite(unite_id, article, detail_mvt, beneficiaire):
    try:
        unite = UniteArticle.objects.get(
            unite_id=unite_id,
            article=article,
            statut=UniteArticle.Statut.EN_STOCK,
        )
    except UniteArticle.DoesNotExist:
        raise serializers.ValidationError(
            f"L'unité #{unite_id} pour l'article '{article.designation}' "
            f"n'existe pas ou n'est plus en stock."
        )

    if article.mode_suivi == Article.ModeSuivi.NUMERO_SERIE:
        if not unite.numero_de_serie:
            raise serializers.ValidationError(
                f"L'unité #{unite_id} pour l'article '{article.designation}' "
                f"n'a pas de numéro de série (obligatoire pour ce mode de suivi)."
            )
        
    unite.attribuer(beneficiaire=beneficiaire, mouvement_sortie=detail_mvt)
    return unite


def generer_sortie_stock_pour_commande(commande, magasin_source=None, details_data=None):
    # Sélection du magasin source
    magasin_selectionne = magasin_source or Magasin.objects.order_by("magasin_id").first()
    if magasin_selectionne is None:
        raise serializers.ValidationError("Aucun magasin disponible pour la sortie de stock.")
 
    # Éviter les doublons
    origine = f"Commande #{commande.pk} - {getattr(commande.employe_demandeur, 'emp_nom', '')}"
    motif = commande.objet or "Sortie pour attribution employés"
    if Mouvement.objects.filter(origine=origine, motif=motif).exists():
        return None
 
    # Création du mouvement de sortie
    mouvement = Mouvement.objects.create(
        type_mouvement=Mouvement.Type.SORTIE,
        magasin_source=magasin_selectionne,
        origine=origine,
        motif=motif,
    )
 
    # Index des unités par detail_id pour accès rapide
    unites_par_detail = {}
    if details_data:
        for d in details_data:
            detail_id = d.get("detail_id")
            unites_ids = d.get("unites_a_attribuer", [])
            if detail_id and unites_ids:
                unites_par_detail[detail_id] = list(unites_ids)
 
    # Traitement de chaque détail de commande
    details_qs = commande.details.select_related("article").prefetch_related(
        "attributions__employe_beneficiaire", "attributions__direction_beneficiaire"
    )
 
    for detail in details_qs:
        article = detail.article
        est_immobilisation = article.is_immobilisation
        
        # Ne traiter QUE les attributions VALIDEE
        attributions_validees = detail.attributions.filter(statut='VALIDEE')
        
        if not attributions_validees.exists():
            continue
        
        unites_a_distribuer = unites_par_detail.get(detail.id, []) if est_immobilisation else []
        
        for attr in attributions_validees:
            quantite_attribution = int(attr.quantite_validee)
            beneficiaire = attr.beneficiaire
            code_tracabilite = attr.code_unique if est_immobilisation else None
            
            if est_immobilisation:
                unites_pour_cette_attribution = unites_a_distribuer[:quantite_attribution]
                unites_a_distribuer = unites_a_distribuer[quantite_attribution:]
                
                detail_mvt = _creer_detail_mouvement(
                    mouvement=mouvement,
                    article=article,
                    quantite=quantite_attribution,
                    beneficiaire=beneficiaire,
                    code_tracabilite=code_tracabilite,
                )
                
                for unite_id in unites_pour_cette_attribution:
                    _attribuer_unite(
                        unite_id=unite_id,
                        article=article,
                        detail_mvt=detail_mvt,
                        beneficiaire=beneficiaire,
                    )
            else:
                _creer_detail_mouvement(
                    mouvement=mouvement,
                    article=article,
                    quantite=quantite_attribution,
                    beneficiaire=beneficiaire,
                    code_tracabilite=None,
                )
    
    return mouvement
