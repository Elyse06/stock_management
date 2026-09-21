from apps.commande.models import Commande


def _get_commandes_recentes(article):
    commandes = list(
        Commande.objects.filter(details__article=article)
        .select_related("employe_demandeur", "employe_traitant")
        .distinct()
        .order_by("-date_commande")[:10]
        .values(
            "commande_id",
            "date_commande",
            "statut",
            "objet",
            "employe_demandeur__emp_nom",
            "employe_traitant__emp_nom",
        )
    )
    
    return [
        {
            "commande_id": c["commande_id"],
            "date_commande": c["date_commande"],
            "statut": c["statut"],
            "objet": c["objet"],
            "demandeur": c["employe_demandeur__emp_nom"],
            "traitant": c["employe_traitant__emp_nom"],
        }
        for c in commandes
    ]
