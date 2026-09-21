from apps.stock.models import DetailMouvement


def _get_historique_recents(article):
    historique = list(
        DetailMouvement.objects.filter(article=article)
        .select_related(
            "mouvement",
            "mouvement__magasin_source",
            "mouvement__magasin_destination",
            "employe_beneficiaire",
        )
        .order_by("-mouvement__date")[:10]
        .values(
            "mouvement__mouvement_id",
            "mouvement__date",
            "mouvement__type_mouvement",
            "quantite",
            "mouvement__magasin_source__magasin_nom",
            "mouvement__magasin_destination__magasin_nom",
            "employe_beneficiaire__emp_nom",
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
            "beneficiaire": h["employe_beneficiaire__emp_nom"],
            "origine": h["mouvement__origine"],
            "motif": h["mouvement__motif"],
        }
        for h in historique
    ]
