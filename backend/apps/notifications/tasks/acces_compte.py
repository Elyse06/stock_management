import logging

from celery import shared_task
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.utils import timezone

from apps.common.emails import Destinataire, envoyer_notification
from apps.employee.models import Employer
from apps.utilisateur.acces import generer_mot_de_passe
from apps.utilisateur.models import Utilisateur

logger = logging.getLogger("apps.notifications")


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def envoyer_acces_compte(self, utilisateur_id):
    """Génère un mot de passe temporaire, l'enregistre (haché) et l'envoie par e-mail.

    Chaque tentative génère un nouveau mot de passe : seul celui du dernier e-mail envoyé est valable.
    Sans effet si l'utilisateur a déjà choisi son mot de passe.
    """
    compte = Utilisateur.objects.filter(pk=utilisateur_id).first()
    if compte is None:
        return "Compte introuvable"
    if not compte.mdp_a_changer:
        return "Compte déjà activé"

    employe = Employer.objects.filter(emp_utilisateur_id=compte).only("emp_nom").first()
    mot_de_passe = generer_mot_de_passe()
    compte.utilisateur_mdp = make_password(mot_de_passe)
    compte.save(update_fields=["utilisateur_mdp"])
    try:
        envoyer_notification(
            [Destinataire(compte.utilisateur_mail, employe.emp_nom if employe else "")],
            sujet="Votre accès à Tahiry",
            message=(
                f"Un compte Tahiry a été créé pour vous. Connectez-vous sur {settings.APP_URL}/login avec l'adresse "
                f"{compte.utilisateur_mail} et le mot de passe temporaire {mot_de_passe} ; "
                "vous devrez le remplacer par un mot de passe personnel à la première connexion."
            ),
        )
    except Exception as exc:
        logger.warning("Échec de l'envoi de l'accès au compte %s : %s", utilisateur_id, exc)
        raise self.retry(exc=exc) from exc
    compte.acces_envoye_le = timezone.now()
    compte.save(update_fields=["acces_envoye_le"])
    return "Accès envoyé"
