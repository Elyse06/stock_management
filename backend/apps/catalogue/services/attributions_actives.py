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
            "affectation",
            "affectation__employe",
            "affectation__employe__emp_serv_id",
            "affectation__employe__emp_serv_id__serv_dir_id",
            "affectation__employe__emp_site_id",
            "affectation__direction",
            "affectation__salle",
            "affectation__salle__localite",
            "affectation__site",
        )
        .order_by("-date_acquisition")
    )

    resultats = []
    for attribution in attributions:
        affectation = attribution.affectation
        employe = affectation.employe
        direction = affectation.direction
        salle = affectation.salle

        # Avant : seuls Employé et Direction étaient gérés ici (Site était
        # silencieusement ignoré, bien que le modèle l'autorise déjà).
        # Généralisé aux 4 types via l'affectation partagée.
        if employe:
            site = employe.site
        elif direction:
            site = None
        elif salle:
            site = salle.localite
        else:
            site = affectation.site

        resultats.append({
            "beneficiaire_id": affectation.cible.pk if affectation.cible else None,
            "beneficiaire_nom": affectation.nom,
            "beneficiaire_type": affectation.beneficiaire_type,
            "matricule": employe.emp_matricule if employe else None,
            "fonction": employe.emp_fonction if employe else None,
            "site": site.site_nom if site else None,
            "quantite_sortie": attribution.quantite_validee,
            "code_unique_qr": str(attribution.code_unique),
        })

    return resultats