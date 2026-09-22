from django.db import transaction
from rest_framework import serializers

from apps.catalogue.models import Article
from apps.stock.models import Magasin, Mouvement, UniteArticle

from .attribuer_unite import _attribuer_unite
from .create_detail_mouvement import _creer_detail_mouvement


@transaction.atomic
def generer_sortie_stock_pour_commande(commande, magasin_source=None, details_data=None):
    magasin_selectionne = magasin_source or Magasin.objects.order_by("magasin_id").first()
    if magasin_selectionne is None:
        raise serializers.ValidationError("Aucun magasin disponible pour la sortie de stock.")

    origine = f"Commande #{commande.pk} - {getattr(commande.employe_demandeur, 'emp_nom', '')}"
    motif = commande.objet or "Sortie pour attribution employés"
    if Mouvement.objects.filter(origine=origine, motif=motif).exists():
        return None

    unites_par_detail = {}
    if details_data:
        for d in details_data:
            detail_id = d.get("detail_id")
            unites_ids = d.get("unites_a_attribuer", [])
            if detail_id and unites_ids:
                unites_par_detail[detail_id] = list(unites_ids)

    details_qs = commande.details.select_related("article").prefetch_related(
        "attributions__employe_beneficiaire", "attributions__direction_beneficiaire"
    )
    attributions_validees = [
        (detail, attribution)
        for detail in details_qs
        for attribution in detail.attributions.all()
        if attribution.statut == "VALIDEE"
    ]
    if not attributions_validees:
        return None
    unites_restantes_par_detail = {
        detail_id: list(unites_ids)
        for detail_id, unites_ids in unites_par_detail.items()
    }

    mouvement = Mouvement.objects.create(
        type_mouvement=Mouvement.Type.SORTIE,
        magasin_source=magasin_selectionne,
        origine=origine,
        motif=motif,
    )

    for detail, attribution in attributions_validees:
        article = detail.article
        est_immobilisation = article.is_immobilisation

        quantite_attribution = int(attribution.quantite_validee)
        beneficiaire = attribution.beneficiaire
        code_tracabilite = attribution.code_unique if est_immobilisation else None

        if est_immobilisation:
            detail_mvt = _creer_detail_mouvement(
                mouvement=mouvement,
                article=article,
                quantite=quantite_attribution,
                beneficiaire=beneficiaire,
                code_tracabilite=code_tracabilite,
            )

            if article.mode_suivi == Article.ModeSuivi.NUMERO_SERIE:
                unites_a_distribuer_ids = unites_restantes_par_detail.get(detail.id, [])
                unites_pour_cette_attribution = unites_a_distribuer_ids[:quantite_attribution]
                unites_restantes_par_detail[detail.id] = unites_a_distribuer_ids[quantite_attribution:]

                for unite_id in unites_pour_cette_attribution:
                    _attribuer_unite(
                        unite_id=unite_id,
                        article=article,
                        detail_mvt=detail_mvt,
                        beneficiaire=beneficiaire,
                    )
            else:
                unites_a_prendre = UniteArticle.objects.filter(
                    article=article,
                    statut=UniteArticle.Statut.EN_STOCK,
                ).exclude(
                    etat__in=[
                        UniteArticle.Etat.PERDU,
                        UniteArticle.Etat.HORS_USAGE,
                    ]
                ).order_by('unite_id')[:quantite_attribution]

                if len(unites_a_prendre) < quantite_attribution:
                    raise serializers.ValidationError(
                        f"Stock insuffisant pour '{article.designation}'. "
                        f"Disponible: {len(unites_a_prendre)}, Requis: {quantite_attribution}."
                    )

                for unite in unites_a_prendre:
                    unite.attribuer(beneficiaire=beneficiaire, mouvement_sortie=detail_mvt)
        else:
            _creer_detail_mouvement(
                mouvement=mouvement,
                article=article,
                quantite=quantite_attribution,
                beneficiaire=beneficiaire,
                code_tracabilite=None,
            )

    return mouvement
