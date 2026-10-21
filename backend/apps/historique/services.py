from django.db.models import Q

from apps.common.dates import parse_date_param
from apps.common.params import parse_int
from apps.stock.models import DetailMouvement, Mouvement


def lire_filtres(params):
    return {
        "site_id": parse_int(params.get("site_id"), minimum=1),
        "date_debut": parse_date_param(params.get("date_debut"), "date_debut"),
        "date_fin": parse_date_param(params.get("date_fin"), "date_fin"),
    }


def _impact(mouvement, quantite, site_id):
    source, destination = mouvement.magasin_source, mouvement.magasin_destination

    def concerne(magasin):
        return magasin is not None and (not site_id or magasin.localite_id == site_id)

    type_ = mouvement.type_mouvement
    if type_ in (Mouvement.Type.ENTREE, Mouvement.Type.RETOUR):
        return quantite if (not site_id or concerne(destination)) else 0
    if type_ == Mouvement.Type.SORTIE:
        return -quantite if (not site_id or concerne(source)) else 0
    if type_ == Mouvement.Type.TRANSFERT:
        entre, sort = concerne(destination), concerne(source)
        if entre and not sort:
            return quantite
        if sort and not entre:
            return -quantite
        return 0 if (entre and sort) else None
    if type_ == Mouvement.Type.AJUSTEMENT:
        if destination is not None and source is None and concerne(destination):
            return quantite
        if source is not None and destination is None and concerne(source):
            return -quantite
        return None
    return 0


def construire_historique(article, site_id=None, date_debut=None, date_fin=None, avec_beneficiaire=True):
    details = (
        DetailMouvement.objects.filter(article=article)
        .select_related(
            "mouvement__magasin_source", "mouvement__magasin_destination",
            "affectation__employe", "affectation__direction",
            "affectation__salle", "affectation__site",
        )
        .order_by("mouvement__date", "pk")
    )
    if site_id:
        details = details.filter(
            Q(mouvement__magasin_source__localite_id=site_id)
            | Q(mouvement__magasin_destination__localite_id=site_id)
        )
    if date_debut:
        details = details.filter(mouvement__date__date__gte=date_debut)
    if date_fin:
        details = details.filter(mouvement__date__date__lte=date_fin)

    lignes, stock = [], 0
    for detail in details:
        mouvement = detail.mouvement
        impact = _impact(mouvement, detail.quantite, site_id)
        if impact is None:
            continue
        stock += impact
        ligne = {
            "date": mouvement.date,
            "type_mouvement": mouvement.type_mouvement,
            "magasin_source": mouvement.magasin_source.magasin_nom if mouvement.magasin_source else None,
            "magasin_destination": (
                mouvement.magasin_destination.magasin_nom if mouvement.magasin_destination else None
            ),
            "quantite": detail.quantite,
            "impact": impact,
            "stock_cumule": stock,
            "origine": mouvement.origine,
            "motif": mouvement.motif,
        }
        if avec_beneficiaire:
            ligne["beneficiaire_type"] = detail.beneficiaire_type
            ligne["beneficiaire_nom"] = detail.affectation.nom if detail.affectation_id else None
        lignes.append(ligne)
    return lignes, stock
