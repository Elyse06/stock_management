"""Envoi des e-mails de notification : texte brut, court et personnalisé.

    Bonjour RAKOTO Jean,
    La commande n°12 de RABE Marie attend votre pré-validation.

Chaque destinataire reçoit son propre e-mail (salutation à son nom, et sans
voir les adresses des autres, qui figuraient auparavant toutes dans « À »).
Le message étant en texte brut, aucune valeur saisie ne peut être interprétée
comme du HTML.
"""
import logging
from typing import NamedTuple

from django.conf import settings
from django.core.mail import EmailMessage, get_connection

logger = logging.getLogger("apps.notifications")


class Destinataire(NamedTuple):
    email: str
    nom: str = ""  # nom de l'employé rattaché au compte ; vide si aucun


def _une_ligne(texte):
    """Retire les retours à la ligne : le message tient sur une ligne, et un sujet n'en accepte aucun."""
    return " ".join(str(texte).split())


def corps_message(nom, message):
    salutation = f"Bonjour {_une_ligne(nom)}," if nom and nom.strip() else "Bonjour,"
    return f"{salutation}\n{_une_ligne(message)}"


def envoyer_notification(destinataires, sujet, message):
    """Envoie à chaque destinataire « Bonjour <nom>, » suivi de ``message`` (une phrase)."""
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
    # Une seule connexion SMTP pour tous les envois.
    envoyes = get_connection(fail_silently=False).send_messages(messages)
    logger.info("Notification « %s » envoyée à %d destinataire(s).", sujet, envoyes)
    return envoyes
