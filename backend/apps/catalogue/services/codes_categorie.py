"""Codes courts de catégorie dérivés d'un libellé de famille.

    « Meuble du bureau »                 -> MB
    « Matériel informatique et réseau »  -> MIR
    « Informatique »                     -> INF   (un seul mot : 3 premières lettres)
    « INFO »                             -> INFO  (mot court : déjà un code)
"""
import re
import unicodedata

LONGUEUR_MAX = 20  # Categorie.cat_libelle

# Petits mots ignorés dans les initiales (« d' » et « l' » sont séparés par l'apostrophe).
MOTS_VIDES = frozenset({
    "a", "au", "aux", "d", "de", "des", "du", "en", "et", "l", "la", "le", "les", "ou",
    "par", "pour", "sur", "un", "une",
})


def _sans_accents(texte: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", texte) if not unicodedata.combining(c))


def abreger_famille(famille: str) -> str:
    """Abréviation en majuscules, sans accents, d'au plus 20 caractères."""
    mots = re.findall(r"[a-z0-9]+", _sans_accents(famille or "").lower())
    significatifs = [m for m in mots if m not in MOTS_VIDES] or mots
    if not significatifs:
        return "DIV"
    if len(significatifs) == 1:
        mot = significatifs[0]
        return (mot if len(mot) <= 4 else mot[:3]).upper()
    return "".join(m[0] for m in significatifs).upper()[:LONGUEUR_MAX]


def code_categorie_disponible(famille: str, modele=None) -> str:
    """Abréviation de la famille, suffixée (MB2, MB3...) si une autre catégorie porte déjà ce code.

    ``modele`` permet de passer le modèle historique depuis une migration.
    """
    if modele is None:
        from apps.catalogue.models import Categorie as modele

    base = abreger_famille(famille)
    code, numero = base, 2
    while modele.objects.filter(cat_libelle__iexact=code).exists():
        suffixe = str(numero)
        code = base[: LONGUEUR_MAX - len(suffixe)] + suffixe
        numero += 1
    return code
