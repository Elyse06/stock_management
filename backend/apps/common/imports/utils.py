import random
import re
import unicodedata
from contextlib import contextmanager

import pandas as pd
from django.db import transaction

VALEURS_NON_APPLICABLE = {"non applicable", "n/a", "na", "", "none", "nan"}
MOTS_VIDES = {"de", "des", "du", "la", "le", "les", "et", "d", "l"}


class RollbackDryRun(Exception):  # noqa: N818
    """Levée en fin d'import « à blanc » pour annuler la transaction."""


@contextmanager
def executer_avec_dry_run(dry_run):
    """Transaction englobant tout l'import, annulée à la fin si ``dry_run``.

    >>> with executer_avec_dry_run(dry_run):
    ...     traiter_les_lignes()
    """
    try:
        with transaction.atomic():
            yield
            if dry_run:
                raise RollbackDryRun
    except RollbackDryRun:
        pass


def est_non_applicable(valeur) -> bool:
    if valeur is None:
        return True
    try:
        if pd.isna(valeur):
            return True
    except (TypeError, ValueError):
        pass
    return str(valeur).strip().lower() in VALEURS_NON_APPLICABLE


def texte_ou_vide(valeur) -> str:
    return "" if est_non_applicable(valeur) else str(valeur).strip()


def normaliser_texte(texte) -> str:
    if not texte:
        return ""
    decompose = unicodedata.normalize("NFKD", str(texte))
    sans_accent = "".join(c for c in decompose if not unicodedata.combining(c))
    nettoye = re.sub(r"[^a-zA-Z0-9\s]", " ", sans_accent)
    return " ".join(nettoye.split()).upper()


def acronyme(texte, defaut, longueur_mot_unique=5) -> str:
    mots = [mot for mot in str(texte).split() if mot.lower() not in MOTS_VIDES]
    if len(mots) > 1:
        return "".join(mot[0].upper() for mot in mots)
    if mots:
        return mots[0][:longueur_mot_unique].upper()
    return defaut


def detecter_index_entete(source, colonnes_attendues, feuille=0, max_lignes=10, score_min=3):
    if hasattr(source, "seek"):
        source.seek(0)
    brut = pd.read_excel(source, sheet_name=feuille, header=None, nrows=max_lignes)
    if hasattr(source, "seek"):
        source.seek(0)

    attendues = {colonne.strip().upper() for colonne in colonnes_attendues}
    meilleur_index, meilleur_score = 0, 0
    for index, ligne in brut.iterrows():
        valeurs = {str(v).strip().upper() for v in ligne.tolist() if not pd.isna(v)}
        score = len(valeurs & attendues)
        if score > meilleur_score:
            meilleur_index, meilleur_score = index, score
    return meilleur_index if meilleur_score >= score_min else 0


def generer_code_article_unique(categorie=None) -> str:
    from apps.catalogue.models import Article

    prefix = "ART"
    if categorie is not None and getattr(categorie, "cat_libelle", None):
        lettres = re.sub(r"[^A-Z]", "", str(categorie.cat_libelle).upper())
        prefix = lettres[:3] or "ART"

    for chiffres in (4, 4, 4, 4, 4, 6, 6, 6, 8):
        code = f"{prefix}-{random.randint(10 ** (chiffres - 1), 10 ** chiffres - 1)}"  # noqa: S311
        if not Article.objects.filter(code_article=code).exists():
            return code
    raise RuntimeError("Impossible de générer un code article unique.")


def trouver_magasin_siege():
    from apps.stock.models import Magasin

    magasins = list(Magasin.objects.filter(localite__site_type="SIEGE"))
    if not magasins:
        raise ValueError("Aucun magasin trouvé au Siège. Créez-en un avant de lancer l'import.")
    if len(magasins) > 1:
        noms = ", ".join(m.magasin_nom for m in magasins)
        raise ValueError(
            "Plusieurs magasins existent au Siège, impossible de choisir "
            f"automatiquement celui à utiliser pour l'entrée : {noms}. "
            "Il ne doit en rester qu'un seul à cette localité pour que "
            "l'import puisse déterminer la destination des entrées."
        )
    return magasins[0]
