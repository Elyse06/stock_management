"""Accès des comptes créés sans mot de passe choisi (import, ou création sans mot de passe).

Le compte est d'abord créé SANS mot de passe utilisable : personne ne peut s'y connecter.
Une fois la création enregistrée, la tâche ``envoyer_acces_compte`` génère un mot de passe
aléatoire, l'enregistre (haché) et l'envoie à l'adresse du compte avec le lien de
l'application. Le mot de passe en clair ne transite donc ni par l'interface, ni par la file
de tâches, ni par les journaux. À sa première connexion, l'utilisateur doit le changer.
"""
import secrets
import string

from django.contrib.auth.hashers import make_password
from django.db import transaction

ALPHABET = "".join(c for c in string.ascii_letters + string.digits if c not in "0OoIl1")


def generer_mot_de_passe(longueur=12):
    """Mot de passe aléatoire (générateur cryptographique), avec majuscule, minuscule et chiffre."""
    while True:
        mdp = "".join(secrets.choice(ALPHABET) for _ in range(longueur))
        if any(c.isupper() for c in mdp) and any(c.islower() for c in mdp) and any(c.isdigit() for c in mdp):
            return mdp


def preparer_sans_mot_de_passe(compte):
    """Rend le mot de passe inutilisable et impose son changement (à appeler avant l'enregistrement)."""
    compte.utilisateur_mdp = make_password(None)  # mot de passe inutilisable
    compte.mdp_a_changer = True
    compte.acces_envoye_le = None


def demander_envoi_acces(compte):
    """Programme l'envoi de l'accès une fois la transaction validée (rien en cas d'annulation)."""
    from apps.notifications.tasks import envoyer_acces_compte

    pk = compte.pk
    transaction.on_commit(lambda: envoyer_acces_compte.delay(pk))
