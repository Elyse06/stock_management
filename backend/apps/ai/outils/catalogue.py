"""Outils du catalogue : recherche d'articles et stock détaillé (droit CAT_LIRE)."""
from urllib.parse import urlencode

from django.db.models import F

from apps.catalogue.models import Article
from apps.common import actions as a
from apps.common.stock import annoter_stock, stocks_par_magasin
from apps.stock.models import Magasin

from .base import ErreurOutil, Outil, Resultat, entier, lien, lien_unique, tableau, texte
from .texte import filtrer_tolerant

TYPES = {"immobilisation": True, "fourniture": False}
CHAMPS_ARTICLE = ("designation", "code_article", "modele", "categorie__cat_libelle", "categorie__cat_description")
CANDIDATS_AFFICHES = 6


def _rechercher(contexte, texte=None, categorie=None, type=None, stock_max=None, stock_min=None,
                sous_seuil=False, limite=20):
    articles = annoter_stock(Article.objects.select_related("categorie"))
    if texte:
        articles = filtrer_tolerant(articles, texte, CHAMPS_ARTICLE)
    if categorie:
        articles = filtrer_tolerant(articles, categorie, ("categorie__cat_libelle", "categorie__cat_description"))
    if type:
        articles = articles.filter(is_immobilisation=TYPES[type])
    if stock_max is not None:
        articles = articles.filter(stock_calcule__lte=stock_max)
    if stock_min is not None:
        articles = articles.filter(stock_calcule__gte=stock_min)
    if sous_seuil:
        articles = articles.filter(stock_calcule__lt=F("seuil"))

    total = articles.count()
    lignes = list(articles.order_by("stock_calcule" if (sous_seuil or stock_max is not None) else "designation")[:limite])
    params = urlencode({k: v for k, v in {"search": texte, "type": "true" if type == "immobilisation" else
                                          "false" if type == "fourniture" else None}.items() if v})
    chemin = "/catalogue/articles" + (f"?{params}" if params else "")
    return Resultat(
        pour_ia={"total": total, "articles": [
            {"code": x.code_article, "designation": x.designation, "categorie": x.categorie.cat_libelle if x.categorie else None,
             "famille": x.categorie.cat_description if x.categorie else None,
             "stock": x.stock_calcule, "seuil": x.seuil, "type": "immobilisation" if x.is_immobilisation else "fourniture"}
            for x in lignes
        ]},
        tableau=tableau(
            "Articles", ["Code", "Désignation", "Stock", "Seuil"],
            [[x.code_article, x.designation, x.stock_calcule, x.seuil] for x in lignes], total,
            lien_unique(contexte, "Voir dans le catalogue", chemin),
        ),
    )


def resoudre_article(designation_ou_code):
    """Un article, ou la liste des candidats si la désignation est ambiguë."""
    exact = Article.objects.filter(code_article__iexact=designation_ou_code).first()
    if exact:
        return exact, []
    candidats = list(filtrer_tolerant(Article.objects.all(), designation_ou_code, CHAMPS_ARTICLE).order_by("designation")[:20])
    if len(candidats) == 1:
        return candidats[0], []
    return None, candidats


def resultat_ambigu(recherche, candidats, question):
    """Plusieurs articles correspondent : le modèle doit demander lequel ; des boutons sont proposés."""
    affiches = candidats[:CANDIDATS_AFFICHES]
    return Resultat(
        pour_ia={"ambigu": True, "recherche": recherche, "nombre_candidats": len(candidats),
                 "consigne": "Plusieurs articles correspondent : demander à l'utilisateur lequel, sans choisir à sa place.",
                 "candidats": [{"code": x.code_article, "designation": x.designation} for x in affiches]},
        tableau=tableau("Articles correspondants", ["Code", "Désignation"], [[x.code_article, x.designation] for x in affiches], len(candidats)),
        choix=[{"libelle": f"{x.designation} ({x.code_article})", "message": question.format(code=x.code_article)} for x in affiches],
    )


def _stock_article(contexte, article):
    if not article:
        raise ErreurOutil("Précisez le code ou la désignation de l'article.")
    trouve, candidats = resoudre_article(article)
    if trouve is None and candidats:
        return resultat_ambigu(article, candidats, "Quel est le stock de l'article {code} ?")
    if trouve is None:
        raise ErreurOutil(f"Aucun article ne correspond à « {article} ».")
    par_magasin = stocks_par_magasin(trouve)
    noms = dict(Magasin.objects.filter(pk__in=par_magasin).values_list("pk", "magasin_nom"))
    repartition = sorted(((noms.get(pk, f"Magasin {pk}"), q) for pk, q in par_magasin.items() if q), key=lambda x: -x[1])
    total = sum(q for _, q in repartition)
    chemin = f"/catalogue/articles/{trouve.code_article}"
    return Resultat(
        pour_ia={"code": trouve.code_article, "designation": trouve.designation, "stock_total": total,
                 "seuil": trouve.seuil, "sous_le_seuil": total < trouve.seuil,
                 "par_magasin": [{"magasin": n, "stock": q} for n, q in repartition]},
        tableau=tableau(f"Stock de « {trouve.designation} »", ["Magasin", "Stock"], repartition),
        liens=lien(contexte, "Ouvrir la fiche de l'article", chemin),
    )


OUTILS = [
    Outil(
        "rechercher_articles",
        "Rechercher des articles du catalogue avec leur stock total. Tous les filtres sont facultatifs ; la recherche "
        "tolère les accents, les pluriels et l'ordre des mots.",
        {
            "texte": texte("Mots à chercher (désignation, code, modèle, catégorie), ex. « ordinateurs Dell »."),
            "categorie": texte("Catégorie (code ou nom de famille)."),
            "type": texte("Type d'article.", enum=list(TYPES)),
            "stock_max": entier("Stock total maximum (ex. 5 pour « stock inférieur ou égal à 5 »).", 0, 10**6),
            "stock_min": entier("Stock total minimum.", 0, 10**6),
            "sous_seuil": {"type": "boolean", "description": "Uniquement les articles sous leur seuil d'alerte."},
            "limite": entier("Nombre maximum d'articles renvoyés (20 par défaut)."),
        },
        _rechercher, (a.CAT_LIRE,),
    ),
    Outil(
        "stock_article",
        "Stock détaillé d'UN article, réparti par magasin, à partir de son code ou de sa désignation. Si plusieurs "
        "articles correspondent, renvoie les candidats (« ambigu ») : demander alors à l'utilisateur lequel.",
        {"article": texte("Code ou désignation de l'article.")},
        lambda contexte, article=None: _stock_article(contexte, article or ""),
        (a.CAT_LIRE,),
    ),
]
