from apps.catalogue.models import Article
from apps.common.stock import annoter_stock

from .client import completer, extraire_json
from .prompts import get_ai_search_prompt

MAX_RESULTATS = 200
TEXTE = {"exact", "iexact", "icontains", "istartswith"}
NOMBRE = {"exact", "gt", "gte", "lt", "lte"}

CHAMPS_AUTORISES = {
    "code_article": (TEXTE, str),
    "code_barre": (TEXTE, str),
    "designation": (TEXTE, str),
    "description": (TEXTE, str),
    "modele": (TEXTE, str),
    "unite": (TEXTE, str),
    "categorie__cat_libelle": (TEXTE, str),
    "categorie": ({"exact"}, int),
    "seuil": (NOMBRE, int),
    "stock_calcule": (NOMBRE, int),
    "mode_suivi": ({"exact"}, str),
    "is_immobilisation": ({"exact"}, bool),
}


def _valeur(valeur, type_attendu):
    if type_attendu is bool:
        if isinstance(valeur, bool):
            return valeur
        raise ValueError
    if type_attendu is int:
        if isinstance(valeur, bool):
            raise ValueError
        return int(valeur)
    if not isinstance(valeur, str | int | float) or len(str(valeur)) > 100:
        raise ValueError
    return str(valeur)


def _decomposer(cle):
    champ, sep, operateur = str(cle).rpartition("__")
    if sep and operateur in TEXTE | NOMBRE:
        return champ, operateur
    return str(cle), "exact"


def nettoyer_filtres(filtres: dict):
    valides, ignores = {}, []
    for cle, valeur in filtres.items():
        champ, operateur = _decomposer(cle)
        regle = CHAMPS_AUTORISES.get(champ)
        try:
            if regle is None or operateur not in regle[0]:
                raise ValueError
            valeur = _valeur(valeur, regle[1])
            if champ == "mode_suivi" and valeur not in Article.ModeSuivi.values:
                raise ValueError
        except (TypeError, ValueError):
            ignores.append(cle)
            continue
        valides[f"{champ}__{operateur}"] = valeur
    return valides, ignores


def recherche_articles(user_query: str, magasin_id=None) -> dict:
    message = completer(get_ai_search_prompt(user_query), timeout=10, temperature=0.1)
    filtres, ignores = nettoyer_filtres(extraire_json(message.get("content")))

    queryset = Article.objects.select_related("categorie").order_by("code_article")
    avec_stock = any(cle.startswith("stock_calcule") for cle in filtres)
    if avec_stock:
        queryset = annoter_stock(queryset, magasin_id=magasin_id)
    queryset = queryset.filter(**filtres)

    champs = [
        "code_article", "code_barre", "designation", "modele", "unite", "seuil",
        "mode_suivi", "is_immobilisation", "categorie", "categorie__cat_libelle",
    ]
    if avec_stock:
        champs.append("stock_calcule")
    total = queryset.count()
    articles = list(queryset.values(*champs)[:MAX_RESULTATS])
    for article in articles:
        article["categorie_nom"] = article.pop("categorie__cat_libelle", "")
        article.setdefault("stock_calcule", None)

    return {
        "success": True,
        "filters_applied": filtres,
        "filters_ignored": ignores,
        "count": total,
        "results": articles,
        "ai_message": f"J'ai trouvé {total} article(s) correspondant à : '{user_query}'",
    }
