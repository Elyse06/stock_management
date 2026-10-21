"""Aide à la navigation : pages et guides pas à pas accessibles à l'utilisateur."""
from ..carte import guides_accessibles, pages_accessibles
from .base import Outil, Resultat, lien, texte


def _normaliser(texte_):
    return " ".join((texte_ or "").lower().split())


def _aide(contexte, sujet=None):
    pages = pages_accessibles(contexte.actions)
    guides = guides_accessibles(contexte.actions)
    if sujet:
        mots = [m for m in _normaliser(sujet).split() if len(m) > 3]

        def pertinent(element):
            contenu = _normaliser(" ".join(str(v) for v in element.values()))
            return any(m[:6] in contenu for m in mots)

        guides = [g for g in guides if pertinent(g)] or guides
    liens = []
    for guide in guides[:3]:
        liens += lien(contexte, guide["tache"], guide["chemin"])
    return Resultat(
        pour_ia={
            "pages_accessibles": [{"titre": p["titre"], "chemin": p["chemin"], "description": p["description"]} for p in pages],
            "guides": [{"tache": g["tache"], "etapes": g["etapes"]} for g in guides[:3]],
            "rappel": "Ne citer que ces pages : les autres ne sont pas accessibles à cet utilisateur.",
        },
        liens=liens,
    )


OUTILS = [
    Outil("aide_navigation",
          "Pages de l'application accessibles à l'utilisateur et guides pas à pas (comment faire une commande, "
          "un inventaire, une entrée de stock, un import...). À utiliser pour toute question « où » ou « comment ».",
          {"sujet": texte("Tâche ou page recherchée, ex. « faire une commande ».")}, _aide),
]
