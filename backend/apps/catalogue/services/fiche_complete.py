from apps.catalogue.models import Article

from .attributions_actives import _get_attributions_actives
from .commandes_recentes import _get_commandes_recentes
from .historique_recents import _get_historique_recents
from .stocks_par_magasin import _get_stocks_par_magasin


def get_fiche_article_complete(code_article):
    try:
        article = Article.objects.select_related(
            "categorie", "marque"
        ).prefetch_related(
            "fournisseurs_liaison__fournisseur"
        ).get(code_article=code_article)
    except Article.DoesNotExist:
        return None

    article_data = {
        "code_article": article.code_article,
        "designation": article.designation,
        "categorie": article.categorie.cat_libelle if article.categorie else None,
        "marque": article.marque.mq_libelle if article.marque else None,
        "unite": article.unite,
        "seuil": article.seuil,
        "mode_suivi": article.mode_suivi,
        "description": article.description,
        "code_barre": article.code_barre,
    }

    stocks_par_magasin = _get_stocks_par_magasin(article)

    fournisseurs = [
        {
            "fournisseur_id": liaison.fournisseur.fournisseur_id,
            "fournisseur_nom": liaison.fournisseur.nom,
            "prix_achat": liaison.prix_achat,
        }
        for liaison in article.fournisseurs_liaison.all()
    ]

    historique_recents = _get_historique_recents(article)
    attributions_actives = _get_attributions_actives(article)
    commandes_recentes = _get_commandes_recentes(article)

    return {
        "article": article_data,
        "stocks_par_magasin": stocks_par_magasin,
        "fournisseurs": fournisseurs,
        "historique_recents": historique_recents,
        "attributions_actives": attributions_actives,
        "commandes_recentes": commandes_recentes,
    }
