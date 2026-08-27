from rest_framework import serializers

from apps.stock.models import DetailMouvement, Magasin, Mouvement


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


def generer_sortie_stock_pour_commande(commande, magasin_source=None):
    magasin_selectionne = magasin_source or Magasin.objects.order_by("magasin_id").first()
    if magasin_selectionne is None:
        raise serializers.ValidationError("Aucun magasin disponible pour la sortie de stock.")

    origine = f"Commande #{commande.pk} - {getattr(commande.employe_demandeur, 'emp_nom', '')}"
    motif = commande.objet or "Sortie pour attribution employés"

    # Pour eviter les doublons
    if Mouvement.objects.filter(origine=origine, motif=motif).exists():
        return None

    mouvement = Mouvement.objects.create(
        type_mouvement=Mouvement.Type.SORTIE,
        magasin_source=magasin_selectionne,
        origine=origine,
        motif=motif,
    )

    details_qs = commande.details.select_related("article").prefetch_related(
        "attributions__employe_beneficiaire"
    )

    for detail in details_qs:
        attributions = detail.attributions.all()

        if attributions.exists():
            for attr in attributions:
                _creer_detail_mouvement(
                    mouvement=mouvement,
                    article=detail.article,
                    quantite=attr.quantite,
                    beneficiaire=attr.employe_beneficiaire,
                    code_tracabilite=getattr(attr, "code_unique", None),
                )
        else:
            _creer_detail_mouvement(
                mouvement=mouvement,
                article=detail.article,
                quantite=detail.quantite,
                beneficiaire=commande.employe_demandeur,
            )

    return mouvement