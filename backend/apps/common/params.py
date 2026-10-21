"""Lecture robuste des paramètres de requête et de formulaire.

Ces fonctions évitent les erreurs 500 provoquées par des conversions
``int(...)`` directes sur des valeurs fournies par le client.
"""
import json

from rest_framework.exceptions import ValidationError

VRAI = {"1", "true", "t", "yes", "y", "oui", "on"}
FAUX = {"0", "false", "f", "no", "n", "non", "off"}


def parse_bool(value, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    texte = str(value).strip().lower()
    if texte in VRAI:
        return True
    if texte in FAUX:
        return False
    return default


def parse_int(value, default=None, minimum=None, maximum=None):
    """Entier ou ``default`` si la valeur est absente ou invalide."""
    if value in (None, ""):
        return default
    try:
        nombre = int(str(value).strip())
    except (TypeError, ValueError):
        return default
    if minimum is not None and nombre < minimum:
        return default
    if maximum is not None and nombre > maximum:
        return maximum
    return nombre


def require_int(value, nom):
    """Entier obligatoire : lève une ValidationError (400) sinon."""
    nombre = parse_int(value)
    if nombre is None:
        raise ValidationError({nom: "Doit être un entier."})
    return nombre


def parse_json_int_set(value, nom):
    """Ensemble d'entiers transmis en JSON (ex. ``"[2, 5, 7]"``)."""
    if value in (None, ""):
        return set()
    try:
        donnees = json.loads(value) if isinstance(value, str) else value
        return {int(item) for item in donnees}
    except (TypeError, ValueError, json.JSONDecodeError) as exc:
        raise ValidationError({nom: "Doit être une liste JSON d'entiers."}) from exc


def parse_sheet(value, default=0):
    """Nom ou index de feuille Excel : ``"0"`` devient l'index 0."""
    if value in (None, ""):
        return default
    texte = str(value).strip()
    return int(texte) if texte.isdigit() else texte


def un_seul_renseigne(**valeurs):
    """Retourne ``(nom, valeur)`` si exactement un paramètre est renseigné, sinon ``None``."""
    renseignes = [(nom, valeur) for nom, valeur in valeurs.items() if valeur not in (None, "")]
    return renseignes[0] if len(renseignes) == 1 else None


def filtre_type_article(params, champ="is_immobilisation"):
    """Filtre « type d'article » lu dans ``params['is_immobilisation']`` : ``true`` = immobilisations,
    ``false`` = fournitures, absent ou autre = tous. ``champ`` : chemin vers ``Article.is_immobilisation``
    (ex. ``"article__is_immobilisation"``). Renvoie les arguments à passer à ``filter()``."""
    valeur = params.get("is_immobilisation")
    if valeur in (None, ""):
        return {}
    texte = str(valeur).strip().lower()
    if texte in VRAI or texte == "immobilisation":
        return {champ: True}
    if texte in FAUX or texte == "fourniture":
        return {champ: False}
    return {}
