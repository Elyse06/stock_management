from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.catalogue.models import Article
from apps.commande.models import AttributionDetailCommande
from apps.stock.models import DetailMouvement, Magasin, Mouvement, UniteArticle


def _creer_detail_mouvement(mouvement, article, quantite, beneficiaire=None, code_tracabilite=None):
    payload = {
        "mouvement": mouvement,
        "article": article,
        "quantite": quantite,
    }
    if hasattr(DetailMouvement, "employe_beneficiaire") and beneficiaire:
        payload["employe_beneficiaire"] = beneficiaire
    if hasattr(DetailMouvement, "code_tracabilite") and code_tracabilite:
        payload["code_tracabilite"] = code_tracabilite
    return DetailMouvement.objects.create(**payload)


def _attribuer_unite(unite_id, article, detail_mvt, employe):
    try:
        unite = UniteArticle.objects.get(
            unite_id=unite_id,
            article=article,
            statut=UniteArticle.Statut.EN_STOCK,
        )
        unite.statut = UniteArticle.Statut.ATTRIBUE
        unite.mouvement_sortie = detail_mvt
        unite.employe_attribue = employe
        unite.save()
        return unite
    except UniteArticle.DoesNotExist:
        raise serializers.ValidationError(
            f"L'unité #{unite_id} pour l'article '{article.designation}' "
            f"n'existe pas ou n'est plus en stock."
        )


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
        "attributions__employe_beneficiaire"
    )

    for detail in details_qs:
        article = detail.article
        attributions = detail.attributions.all()
        est_mode_numero_serie = article.mode_suivi == Article.ModeSuivi.NUMERO_SERIE

        # Récupérer les unités à attribuer pour ce détail (si mode NUMERO_SERIE)
        unites_a_distribuer = unites_par_detail.get(detail.id, []) if est_mode_numero_serie else []

        if attributions.exists():
            for attr in attributions:
                quantite_attribution = int(attr.quantite)
                employe = attr.employe_beneficiaire
                code_tracabilite = getattr(attr, "code_unique", None)

                if est_mode_numero_serie:
                    # ✅ Mode NUMERO_SERIE : on distribue les unités physiques une par une
                    unites_pour_cette_attribution = unites_a_distribuer[:quantite_attribution]
                    unites_a_distribuer = unites_a_distribuer[quantite_attribution:]

                    # Créer un DetailMouvement par bénéficiaire
                    detail_mvt = _creer_detail_mouvement(
                        mouvement=mouvement,
                        article=article,
                        quantite=quantite_attribution,
                        beneficiaire=employe,
                        code_tracabilite=code_tracabilite,
                    )

                    # Attribuer chaque unité physique
                    for unite_id in unites_pour_cette_attribution:
                        _attribuer_unite(
                            unite_id=unite_id,
                            article=article,
                            detail_mvt=detail_mvt,
                            employe=employe,
                        )
                else:
                    # ✅ Mode QUANTITE : comportement classique
                    _creer_detail_mouvement(
                        mouvement=mouvement,
                        article=article,
                        quantite=quantite_attribution,
                        beneficiaire=employe,
                        code_tracabilite=code_tracabilite,
                    )
        else:
            # Pas d'attribution explicite → attribution implicite au demandeur
            quantite = int(detail.quantite)
            employe_demandeur = commande.employe_demandeur

            if est_mode_numero_serie:
                # Mode NUMERO_SERIE sans attributions explicites
                unites_pour_demandeur = unites_a_distribuer[:quantite]
                unites_a_distribuer = unites_a_distribuer[quantite:]

                # Créer une attribution implicite
                attribution_implicite = AttributionDetailCommande.objects.create(
                    detail_commande=detail,
                    employe_beneficiaire=employe_demandeur,
                    quantite=quantite,
                )

                detail_mvt = _creer_detail_mouvement(
                    mouvement=mouvement,
                    article=article,
                    quantite=quantite,
                    beneficiaire=employe_demandeur,
                    code_tracabilite=attribution_implicite.code_unique,
                )

                for unite_id in unites_pour_demandeur:
                    _attribuer_unite(
                        unite_id=unite_id,
                        article=article,
                        detail_mvt=detail_mvt,
                        employe=employe_demandeur,
                    )
            else:
                # Mode QUANTITE classique
                attribution_implicite = AttributionDetailCommande.objects.create(
                    detail_commande=detail,
                    employe_beneficiaire=employe_demandeur,
                    quantite=quantite,
                )
                _creer_detail_mouvement(
                    mouvement=mouvement,
                    article=article,
                    quantite=quantite,
                    beneficiaire=employe_demandeur,
                    code_tracabilite=attribution_implicite.code_unique,
                )

    return mouvement