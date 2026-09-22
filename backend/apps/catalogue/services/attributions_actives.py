from apps.commande.models import AttributionDetailCommande


def _get_attributions_actives(article):
    attributions = (
        AttributionDetailCommande.objects.filter(
            detail_commande__article=article,
            statut="VALIDEE",
            quantite_validee__isnull=False,
            quantite_validee__gt=0,
        )
        .select_related(
            "employe_beneficiaire",
            "employe_beneficiaire__emp_serv_id",
            "employe_beneficiaire__emp_serv_id__serv_dir_id",
            "employe_beneficiaire__emp_serv_id__serv_dir_id__site",
            "direction_beneficiaire",
            "direction_beneficiaire__site",
        )
        .order_by("-date_acquisition")
    )

    resultats = []
    for attribution in attributions:
        employe = attribution.employe_beneficiaire
        direction = attribution.direction_beneficiaire
        beneficiaire = employe or direction
        site = employe.site if employe else direction.site if direction else None

        resultats.append({
            "beneficiaire_id": beneficiaire.pk if beneficiaire else None,
            "beneficiaire_nom": beneficiaire.emp_nom if employe else direction.dir_libelle if direction else "—",
            "beneficiaire_type": "EMPLOYE" if employe else "DIRECTION",
            "matricule": employe.emp_matricule if employe else None,
            "fonction": employe.emp_fonction if employe else None,
            "site": site.site_nom if site else None,
            "quantite_sortie": attribution.quantite_validee,
            "code_unique_qr": str(attribution.code_unique),
        })

    return resultats
