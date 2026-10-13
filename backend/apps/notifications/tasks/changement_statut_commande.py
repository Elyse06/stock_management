import logging

from celery import shared_task

from apps.commande.models import Commande
from apps.common.emails import envoyer_notification
from apps.notifications import destinataires

logger = logging.getLogger("apps.notifications")
S = Commande.Statut


def _motif(commande):
    return f" Motif : {commande.commentaire_agent}." if commande.commentaire_agent.strip() else ""


def _messages(commande, ancien, nouveau):
    """Liste de ``(destinataires, sujet, message)`` pour une transition de statut."""
    demandeur = commande.employe_demandeur
    au_demandeur = destinataires.employe(demandeur)
    numero = f"n°{commande.commande_id}"

    if ancien is None and nouveau == S.EN_ATTENTE:
        return [(destinataires.chefs_direction(demandeur.emp_dir_id), "Commande à pré-valider",
                 f"La commande {numero} de {demandeur.emp_nom} attend votre pré-validation.")]
    if ancien == S.EN_ATTENTE and nouveau == S.EN_COURS:
        return [
            (au_demandeur, "Commande pré-validée",
             f"Votre commande {numero} a été pré-validée et est en cours de traitement."),
            (destinataires.gestionnaires(), "Commande à valider",
             f"La commande {numero} de {demandeur.emp_nom} a été pré-validée et attend votre validation finale."),
        ]
    if ancien == S.EN_ATTENTE and nouveau == S.REJETEE:
        return [(au_demandeur, "Commande refusée",
                 f"Votre commande {numero} a été refusée lors de la pré-validation.{_motif(commande)}")]
    if ancien == S.EN_COURS and nouveau == S.VALIDEE:
        return [(au_demandeur, "Commande validée",
                 f"Votre commande {numero} a été validée et les articles sont sortis du stock.")]
    if ancien == S.EN_COURS and nouveau == S.REJETEE:
        return [(au_demandeur, "Commande refusée",
                 f"Votre commande {numero} a été refusée lors de la validation finale.{_motif(commande)}")]
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
    if not commande.employe_demandeur:
        return "Commande sans demandeur"

    try:
        for a_qui, sujet, message in _messages(commande, ancien_statut, nouveau_statut):
            envoyer_notification(a_qui, sujet=f"{sujet} (n°{commande.commande_id})", message=message)
    except Exception as exc:
        # Erreur d'envoi (SMTP indisponible...) : nouvelle tentative plus tard.
        logger.warning("Échec de notification pour la commande #%s : %s", commande_id, exc)
        raise self.retry(exc=exc) from exc
    return "Succès"
