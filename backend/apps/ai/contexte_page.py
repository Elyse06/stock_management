"""Description de la page affichée, transmise au modèle (« combien en reste-t-il ? » sur une fiche article).

L'interface n'envoie que le chemin ; la description est construite ici, et seulement pour une
page à laquelle l'utilisateur a accès.
"""
import re
from urllib.parse import unquote

from apps.catalogue.models import Article

from .carte import PAGES, chemin_accessible

TITRES = {p["chemin"]: p["titre"] for p in PAGES}


def decrire_page(chemin, contexte):
    if not isinstance(chemin, str) or not chemin.startswith("/") or len(chemin) > 300:
        return None
    base, _, requete = chemin.split("#")[0].partition("?")
    base = base.rstrip("/") or "/"
    if not chemin_accessible(base, contexte.actions):
        return None
    fiche = re.fullmatch(r"/catalogue/articles/([^/]+)", base)
    if fiche:
        article = Article.objects.filter(code_article=unquote(fiche.group(1))).first()
        if article:
            return f"la fiche de l'article « {article.designation} » (code {article.code_article})"
    titre = TITRES.get(base) or TITRES.get(base.rsplit("/", 1)[0])
    if not titre:
        return None
    if base == "/inventaire/unites" and "onglet=demandes" in requete:
        return "l'onglet « Demandes » de la page « Unités attribuées » (demandes de retour et de transfert)"
    return f"la page « {titre} »"
