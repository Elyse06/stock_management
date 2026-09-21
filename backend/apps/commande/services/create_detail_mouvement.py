from apps.employee.models import Direction, Employer
from apps.stock.models import DetailMouvement


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
