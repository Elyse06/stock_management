import logging

from celery import shared_task
from django.conf import settings
from django.utils import timezone

from apps.common.emails import Destinataire, envoyer_notification
from apps.employee.models import Employer
from apps.utilisateur.acces import creer_lien_activation
from apps.utilisateur.models import Utilisateur

logger = logging.getLogger("apps.notifications")


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def envoyer_acces_compte(self, utilisateur_id):
    """Envoie le lien d'activation du compte (sans effet si le compte est déjà activé)."""
    compte = Utilisateur.objects.filter(pk=utilisateur_id).first()
    if compte is None:
        return "Compte introuvable"
    if not compte.mdp_a_changer:
        return "Compte déjà activé"

    employe = Employer.objects.filter(emp_utilisateur_id=compte).only("emp_nom").first()
    try:
        envoyer_notification(
            [Destinataire(compte.utilisateur_mail, employe.emp_nom if employe else "")],
            sujet="Activation de votre compte Tahiry",
            message = (
                f"\nUn compte Tahiry a été créé pour vous (identifiant : {compte.utilisateur_mail}).\n\n"
                f"Pour l'activer cliquer sur le lien suivant dans les prochaines {settings.ACTIVATION_DUREE_HEURES} heures :\n\n"
                f"{creer_lien_activation(compte)}\n\n\n"
                f"Bien cordialement"
            ),
        )
    except Exception as exc:
        logger.warning("Échec de l'envoi du lien d'activation au compte %s : %s", utilisateur_id, exc)
        raise self.retry(exc=exc) from exc
    compte.acces_envoye_le = timezone.now()
    compte.save(update_fields=["acces_envoye_le"])
    return "Accès envoyé"
