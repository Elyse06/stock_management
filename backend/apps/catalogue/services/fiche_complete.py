from apps.catalogue.models import Article

from .attributions_actives import get_attributions_actives
from .commandes_recentes import get_commandes_recentes
from .historique_recents import get_historique_recents
from .stocks_par_magasin import get_stocks_par_magasin


def get_fiche_article_complete(code_article):
    article = Article.objects.select_related("categorie").filter(code_article=code_article).first()
    if article is None:
        return None

    return {
        "article": {
            "code_article": article.code_article,
            "designation": article.designation,
            "categorie": article.categorie.cat_libelle if article.categorie else None,
            "unite": article.unite,
            "seuil": article.seuil,
            "mode_suivi": article.mode_suivi,
            "description": article.description,
            "code_barre": article.code_barre,
        },
        "stocks_par_magasin": get_stocks_par_magasin(article),
        "historique_recents": get_historique_recents(article),
        "attributions_actives": get_attributions_actives(article),
        "commandes_recentes": get_commandes_recentes(article),
    }
