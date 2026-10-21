"""Recherche tolérante : accents, majuscules, pluriels et mots dans n'importe quel ordre.

« ordinateurs dell » trouve « Ordinateur portable Dell Latitude » ; « cartouches d'encre »
trouve « Cartouche d'encre HP 305 ». La comparaison se fait en Python sur des textes
normalisés, car la base (SQL Server) distingue souvent les accents selon sa collation.
"""
import re
import unicodedata

MOTS_VIDES = frozenset({"a", "au", "aux", "avec", "chez", "d", "de", "des", "du", "en", "et", "l", "la", "le", "les", "pour", "sur", "un", "une"})
CANDIDATS_MAX = 20000  # au-delà, on se contente de la recherche de la base


def normaliser(texte):
    sans_accents = unicodedata.normalize("NFKD", str(texte or "")).encode("ascii", "ignore").decode()
    return " ".join(re.findall(r"[a-z0-9]+", sans_accents.lower()))


def _racine(mot):
    """Singulier approximatif : « ordinateurs » -> « ordinateur », « bureaux » -> « bureau »."""
    return mot[:-1] if len(mot) > 3 and mot[-1] in "sx" else mot


def mots_recherche(texte):
    return [_racine(m) for m in normaliser(texte).split() if m not in MOTS_VIDES]


def correspond(cible, mots):
    texte = normaliser(cible)
    return all(m in texte for m in mots)


def filtrer_tolerant(queryset, recherche, champs):
    """Restreint le queryset aux lignes dont les champs contiennent tous les mots de la recherche."""
    mots = mots_recherche(recherche)
    if not mots:
        return queryset
    pk = queryset.model._meta.pk.attname
    lignes = queryset.order_by().values_list(pk, *champs)[:CANDIDATS_MAX]
    ids = [ligne[0] for ligne in lignes if correspond(" ".join(str(v or "") for v in ligne[1:]), mots)]
    return queryset.filter(**{f"{pk}__in": ids})
