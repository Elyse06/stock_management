from django.db.models import Q

from apps.stock.models import Mouvement


def build_stock_filters(relation_prefix="", magasin_id=None):
    mouvement_path = f"{relation_prefix}mouvement__"
    stock_filters = {
        "entree": Q(
            **{
                f"{mouvement_path}type_mouvement__in": [
                    Mouvement.Type.ENTREE,
                    Mouvement.Type.TRANSFERT,
                    Mouvement.Type.RETOUR,
                ],
            }
        ),
        "sortie": Q(
            **{
                f"{mouvement_path}type_mouvement__in": [
                    Mouvement.Type.SORTIE,
                    Mouvement.Type.TRANSFERT,
                ],
            }
        ),
        "ajustement_plus": Q(
            **{
                f"{mouvement_path}type_mouvement": Mouvement.Type.AJUSTEMENT,
                f"{mouvement_path}magasin_source__isnull": True,
            }
        ),
        "ajustement_moins": Q(
            **{
                f"{mouvement_path}type_mouvement": Mouvement.Type.AJUSTEMENT,
                f"{mouvement_path}magasin_destination__isnull": True,
            }
        ),
    }

    if magasin_id:
        stock_filters["entree"] &= Q(
            **{f"{mouvement_path}magasin_destination_id": magasin_id}
        )
        stock_filters["sortie"] &= Q(
            **{f"{mouvement_path}magasin_source_id": magasin_id}
        )
        stock_filters["ajustement_plus"] &= Q(
            **{f"{mouvement_path}magasin_destination_id": magasin_id}
        )
        stock_filters["ajustement_moins"] &= Q(
            **{f"{mouvement_path}magasin_source_id": magasin_id}
        )
    else:
        stock_filters["ajustement_plus"] &= Q(
            **{f"{mouvement_path}magasin_destination__isnull": False}
        )
        stock_filters["ajustement_moins"] &= Q(
            **{f"{mouvement_path}magasin_source__isnull": False}
        )

    return stock_filters