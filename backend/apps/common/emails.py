import logging
from typing import NamedTuple

from django.conf import settings
from django.core.mail import EmailMessage, get_connection

logger = logging.getLogger("apps.notifications")


class Destinataire(NamedTuple):
    email: str
    nom: str = ""


def _une_ligne(texte):
    return " ".join(str(texte).split())


def _nettoyer_corps(texte):
    lignes = str(texte).replace("\r\n", "\n").replace("\r", "\n").split("\n")
    return "\n".join(" ".join(ligne.split()) for ligne in lignes).strip("\n")


def corps_message(nom, message):
    salutation = f"Bonjour {_une_ligne(nom)}," if nom and nom.strip() else "Bonjour,"
    return f"{salutation}\n{_nettoyer_corps(message)}"


def envoyer_notification(destinataires, sujet, message):
    uniques = {}
    for destinataire in destinataires:
        if destinataire.email and destinataire.email.lower() not in uniques:
            uniques[destinataire.email.lower()] = destinataire
    if not uniques:
        logger.info("Notification « %s » ignorée : aucun destinataire.", sujet)
        return 0

    sujet = _une_ligne(sujet)
    messages = [
        EmailMessage(sujet, corps_message(d.nom, message), settings.DEFAULT_FROM_EMAIL, [d.email])
        for d in uniques.values()
    ]
    envoyes = get_connection(fail_silently=False).send_messages(messages)
    logger.info("Notification « %s » envoyée à %d destinataire(s).", sujet, envoyes)
    return envoyes
