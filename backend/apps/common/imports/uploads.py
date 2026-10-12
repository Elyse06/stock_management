import os

TAILLE_MAX_DEFAUT = 10 * 1024 * 1024  

_SIGNATURE_ZIP = b"PK\x03\x04"                     
_SIGNATURE_OLE = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"  


class FichierInvalide(ValueError):
    """Fichier refusé (le message est destiné à l'utilisateur)."""


def _entete(fichier, taille=8):
    position = fichier.tell() if hasattr(fichier, "tell") else 0
    fichier.seek(0)
    debut = fichier.read(2048)
    fichier.seek(position)
    return debut[:taille], debut


def _contenu_conforme(extension, fichier):
    signature, debut = _entete(fichier)
    if extension == ".xlsx":
        return signature.startswith(_SIGNATURE_ZIP)
    if extension == ".xls":
        return signature.startswith(_SIGNATURE_OLE)
    if extension == ".csv":
        return b"\x00" not in debut
    return False


def valider_fichier(fichier, extensions, taille_max=TAILLE_MAX_DEFAUT):
    if fichier is None:
        raise FichierInvalide("Aucun fichier reçu (champ attendu : 'fichier').")

    extension = os.path.splitext(fichier.name or "")[1].lower()
    if extension not in extensions:
        raise FichierInvalide(
            f"Format non supporté. Formats acceptés : {', '.join(sorted(extensions))}."
        )
    if fichier.size > taille_max:
        raise FichierInvalide(f"Fichier trop volumineux (max {taille_max // (1024 * 1024)} Mo).")
    if fichier.size == 0:
        raise FichierInvalide("Le fichier est vide.")
    if not _contenu_conforme(extension, fichier):
        raise FichierInvalide("Le contenu du fichier ne correspond pas à son extension.")
    return extension
