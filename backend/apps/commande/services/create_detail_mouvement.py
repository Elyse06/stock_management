from apps.stock.models import Affectation, DetailMouvement


def _creer_detail_mouvement(mouvement, article, quantite, beneficiaire=None, code_tracabilite=None):
    payload = {
        "mouvement": mouvement,
        "article": article,
        "quantite": quantite,
    }
    if beneficiaire is not None:
        payload["affectation"] = Affectation.resoudre(beneficiaire)
    if code_tracabilite:
        payload["code_tracabilite"] = code_tracabilite
    return DetailMouvement.objects.create(**payload)