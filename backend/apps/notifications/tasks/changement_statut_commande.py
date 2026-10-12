import logging

from celery import shared_task
from django.utils.html import format_html

from apps.commande.models import Commande
from apps.common.emails import envoyer_notification
from apps.notifications.destinataires import (
    emails_chefs_direction,
    emails_gestionnaires,
)

logger = logging.getLogger("apps.notifications")
S = Commande.Statut


def _messages(commande, ancien, nouveau):
    demandeur = commande.employe_demandeur
    email_demandeur = [demandeur.emp_utilisateur_id.utilisateur_mail]
    numero = commande.commande_id

    if ancien is None and nouveau == S.EN_ATTENTE:
        return [(
            emails_chefs_direction(demandeur.emp_dir_id),
            "Nouvelle demande à pré-valider",
            format_html(
                "Une nouvelle commande <strong>#{}</strong> a été créée par <strong>{}</strong> "
                "et attend votre pré-validation.", numero, demandeur.emp_nom,
            ),
        )]
    if ancien == S.EN_ATTENTE and nouveau == S.EN_COURS:
        return [
            (email_demandeur, "Demande en cours de traitement", format_html(
                "Votre commande <strong>#{}</strong> a été pré-validée et est en cours de traitement "
                "par le gestionnaire de stock.", numero,
            )),
            (emails_gestionnaires(), "Nouvelle demande à valider", format_html(
                "La commande <strong>#{}</strong> de {} a été pré-validée et attend votre validation finale.",
                numero, demandeur.emp_nom,
            )),
        ]
    if ancien == S.EN_ATTENTE and nouveau == S.REJETEE:
        return [(email_demandeur, "Demande refusée", format_html(
            "Votre commande <strong>#{}</strong> a été refusée lors de la pré-validation.", numero,
        ))]
    if ancien == S.EN_COURS and nouveau == S.VALIDEE:
        return [(email_demandeur, "Demande validée", format_html(
            "Bonne nouvelle ! Votre commande <strong>#{}</strong> a été validée et le stock a été débité.",
            numero,
        ))]
    if ancien == S.EN_COURS and nouveau == S.REJETEE:
        return [(email_demandeur, "Demande refusée", format_html(
            "Votre commande <strong>#{}</strong> a été refusée lors de la validation finale.", numero,
        ))]
    return []


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def notifier_changement_statut_commande(self, commande_id, ancien_statut, nouveau_statut):
    commande = (
        Commande.objects.select_related("employe_demandeur__emp_utilisateur_id")
        .filter(commande_id=commande_id)
        .first()
    )
    if commande is None:
        return "Commande introuvable"
    demandeur = commande.employe_demandeur
    if not demandeur or not demandeur.emp_utilisateur_id:
        return "Demandeur sans utilisateur lié"

    try:
        for destinataires, titre, message in _messages(commande, ancien_statut, nouveau_statut):
            envoyer_notification(
                destinataires,
                sujet=f"Gestion de Stock : {titre} (Commande #{commande.commande_id})",
                titre=titre,
                message_html=message,
                lignes=[("Objet", commande.objet or "-"), ("Statut actuel", commande.get_statut_display())],
            )
    except Exception as exc:
        logger.warning("Échec de notification pour la commande #%s : %s", commande_id, exc)
        raise self.retry(exc=exc) from exc
    return "Succès"
