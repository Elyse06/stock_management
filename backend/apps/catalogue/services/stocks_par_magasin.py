from apps.common.stock import stocks_par_magasin
from apps.stock.models import Magasin


def get_stocks_par_magasin(article):
    """``{nom_magasin: stock}`` des magasins où l'article est en stock (2 requêtes)."""
    stocks = {mid: stock for mid, stock in stocks_par_magasin(article).items() if stock > 0}
    if not stocks:
        return {}
    noms = dict(Magasin.objects.filter(pk__in=stocks).values_list("pk", "magasin_nom"))
    return {noms[mid]: stock for mid, stock in stocks.items() if mid in noms}
