from apps.stock.models import Magasin

from .stock_magasin import _calculer_stock_magasin


def _get_stocks_par_magasin(article):
    magasins = Magasin.objects.all()
    stocks = {}
    
    for magasin in magasins:
        stock = _calculer_stock_magasin(article, magasin)
        if stock > 0:
            stocks[magasin.magasin_nom] = stock
    
    return stocks
