import hashlib

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core import signing
from django.db import transaction

SEL = "tahiry.activation-compte"


class LienInvalide(Exception):
    """Lien d'activation expiré, déjà utilisé, remplacé ou altéré."""


def _empreinte(compte):
    return hashlib.sha256(compte.utilisateur_mdp.encode()).hexdigest()[:24]


def creer_lien_activation(compte):
    jeton = signing.dumps({"u": compte.pk, "e": _empreinte(compte)}, salt=SEL, compress=True)
    return f"{settings.APP_URL}/activation#{jeton}"


def verifier_jeton_activation(jeton):
    """Compte correspondant au jeton, ou LienInvalide."""
    from .models import Utilisateur

    try:
        donnees = signing.loads(str(jeton), salt=SEL, max_age=settings.ACTIVATION_DUREE_HEURES * 3600)
    except signing.SignatureExpired as exc:
        raise LienInvalide("Ce lien d'activation a expiré.") from exc
    except signing.BadSignature as exc:
        raise LienInvalide("Ce lien d'activation n'est pas valide.") from exc
    compte = Utilisateur.objects.filter(pk=donnees.get("u")).first()
    if compte is None or not compte.mdp_a_changer or donnees.get("e") != _empreinte(compte):
        raise LienInvalide("Ce lien d'activation a déjà été utilisé ou a été remplacé par un plus récent.")
    return compte


def preparer_sans_mot_de_passe(compte):
    """Mot de passe inutilisable (et nouveau : les liens précédents deviennent invalides)."""
    compte.utilisateur_mdp = make_password(None)
    compte.mdp_a_changer = True
    compte.acces_envoye_le = None


def demander_envoi_acces(compte):
    """Programme l'envoi du lien une fois la transaction validée (rien en cas d'annulation)."""
    from apps.notifications.tasks import envoyer_acces_compte

    pk = compte.pk
    transaction.on_commit(lambda: envoyer_acces_compte.delay(pk))
