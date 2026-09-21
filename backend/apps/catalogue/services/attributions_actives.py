from django.db.models import Sum

from apps.commande.models import AttributionDetailCommande


def _get_attributions_actives(article):
    attributions = list(
        AttributionDetailCommande.objects.filter(
            detail_commande__article=article
        )
        .select_related(
            "employe_beneficiaire",
            "employe_beneficiaire__emp_serv_id",
        )
        .values(
            "employe_beneficiaire__emp_id",
            "employe_beneficiaire__emp_nom",
            "employe_beneficiaire__emp_matricule",
            "employe_beneficiaire__emp_fonction",
            "employe_beneficiaire__emp_serv_id__serv_libelle",
            "code_unique",
        )
        .annotate(total_attribue=Sum("quantite"))
        .order_by("-total_attribue")
    )
    
    return [
        {
            "employe_id": a["employe_beneficiaire__emp_id"],
            "employe_nom": a["employe_beneficiaire__emp_nom"],
            "matricule": a["employe_beneficiaire__emp_matricule"],
            "fonction": a["employe_beneficiaire__emp_fonction"],
            "service": a["employe_beneficiaire__emp_serv_id__serv_libelle"],
            "quantite_attribuee": a["total_attribue"],
            "code_unique_qr": a["code_unique"],
        }
        for a in attributions
    ]
