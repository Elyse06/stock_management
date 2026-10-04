from apps.stock.models import DetailMouvement


def _get_historique_recents(article):
    historique = list(
        DetailMouvement.objects.filter(article=article)
        .select_related(
            "mouvement",
            "mouvement__magasin_source",
            "mouvement__magasin_destination",
            "affectation",
            "affectation__employe",
            "affectation__direction",
            "affectation__salle",
            "affectation__site",
        )
        .order_by("-mouvement__date")[:10]
        .values(
            "mouvement__mouvement_id",
            "mouvement__date",
            "mouvement__type_mouvement",
            "quantite",
            "mouvement__magasin_source__magasin_nom",
            "mouvement__magasin_destination__magasin_nom",
            "affectation__employe__emp_nom",
            "affectation__direction__dir_libelle",
            "affectation__salle__nom",
            "affectation__site__site_nom",
            "mouvement__origine",
            "mouvement__motif",
        )
    )
    
    return [
        {
            "mouvement_id": h["mouvement__mouvement_id"],
            "date": h["mouvement__date"],
            "type_mouvement": h["mouvement__type_mouvement"],
            "quantite": h["quantite"],
            "magasin_source": h["mouvement__magasin_source__magasin_nom"],
            "magasin_destination": h["mouvement__magasin_destination__magasin_nom"],
            # Avant : seul le nom de l'employé était affiché, un
            # bénéficiaire direction/site restait vide. Généralisé aux 4 types.
            "beneficiaire": (
                h["affectation__employe__emp_nom"]
                or h["affectation__direction__dir_libelle"]
                or h["affectation__salle__nom"]
                or h["affectation__site__site_nom"]
            ),
            "origine": h["mouvement__origine"],
            "motif": h["mouvement__motif"],
        }
        for h in historique
    ]