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
    nombre = parse_int(value)
    if nombre is None:
        raise ValidationError({nom: "Doit être un entier."})
    return nombre


def parse_json_int_set(value, nom):
    if value in (None, ""):
        return set()
    try:
        donnees = json.loads(value) if isinstance(value, str) else value
        return {int(item) for item in donnees}
    except (TypeError, ValueError, json.JSONDecodeError) as exc:
        raise ValidationError({nom: "Doit être une liste JSON d'entiers."}) from exc


def parse_sheet(value, default=0):
    if value in (None, ""):
        return default
    texte = str(value).strip()
    return int(texte) if texte.isdigit() else texte


def un_seul_renseigne(**valeurs):
    renseignes = [(nom, valeur) for nom, valeur in valeurs.items() if valeur not in (None, "")]
    return renseignes[0] if len(renseignes) == 1 else None
