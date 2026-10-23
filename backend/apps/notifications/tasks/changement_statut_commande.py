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
                 f"\nLa commande de {demandeur.emp_nom} attend votre pré-validation.\n\n"
                 f"Bien cordialement")]
    if ancien == S.EN_ATTENTE and nouveau == S.EN_COURS:
        return [
            (destinataires.gestionnaires(), "Commande à valider",
             f"\nLa commande de {demandeur.emp_nom} a été pré-validée et attend votre validation finale.\n\n"
             f"Bien cordialement"),
        ]
    if ancien == S.EN_ATTENTE and nouveau == S.REJETEE:
        return [(au_demandeur, "Commande refusée",
                 f"\nVotre commande a été refusée lors de la pré-validation.\n\n"
                 f"{_motif(commande)} \n\n\n"
                 "Bien cordialement")]
    if ancien == S.EN_COURS and nouveau == S.VALIDEE:
        return [(au_demandeur, "Commande validée",
                 "\nVotre commande a été validée.\n\n"
                 "Vous pouvez récupérer les articles auprès du RMG.\n\n\n"
                 "Bien cordialement")]
    if ancien == S.EN_COURS and nouveau == S.REJETEE:
        return [(au_demandeur, "Commande refusée",
                 f"\nVotre commande a été refusée par les RMG.\n\n"
                 f"{_motif(commande)} \n\n\n"
                 "Bien cordialement")]
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
        logger.warning("Échec de notification pour la commande #%s : %s", commande_id, exc)
        raise self.retry(exc=exc) from exc
    return "Succès"


def _articles_livres(sortie, demandeur_id):
    morceaux = []
    for detail in sortie.details.select_related("article", "affectation__employe", "affectation__direction",
                                                 "affectation__salle", "affectation__site").order_by("pk"):
        quantite = int(detail.quantite) if detail.quantite == int(detail.quantite) else detail.quantite
        pour = ""
        if detail.affectation_id and detail.affectation.employe_id != demandeur_id:
            pour = f" (pour {detail.affectation.nom})"
        morceaux.append(f"{quantite} × {detail.article.designation}{pour}")
    return ", ".join(morceaux)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def notifier_livraison_partielle(self, commande_id, mouvement_id):
    from apps.stock.models import Mouvement

    commande = Commande.objects.select_related("employe_demandeur__emp_utilisateur_id").filter(pk=commande_id).first()
    sortie = Mouvement.objects.filter(pk=mouvement_id).first()
    if commande is None or sortie is None or not commande.employe_demandeur:
        return "Commande ou livraison introuvable"
    message = (f"Une partie de votre commande est disponible : \n\n"
               f"{_articles_livres(sortie, commande.employe_demandeur_id)}.\n\n"
               "Vous pouvez récupérer les articles auprès du RMG.\n\n"
               "Le reste est en attente d'achat. \n\n\n"
               "Bien cordialement")
    try:
        envoyer_notification(destinataires.employe(commande.employe_demandeur),
                             sujet="Commande livrée en partie", message=message)
    except Exception as exc:
        logger.warning("Échec de notification de la livraison partielle de la commande #%s : %s", commande_id, exc)
        raise self.retry(exc=exc) from exc
    return "Succès"


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def notifier_suppression_commande(self, commande_id, demandeur_id, supprime_par_id=None):
    from apps.employee.models import Employer

    demandeur = Employer.objects.select_related("emp_dir_id").filter(pk=demandeur_id).first()
    if demandeur is None:
        return "Demandeur introuvable"
    if supprime_par_id and supprime_par_id != demandeur_id:
        getattr(Employer.objects.filter(pk=supprime_par_id).first(), "emp_nom", None) or "un gestionnaire"
    a_qui = destinataires.chefs_direction(demandeur.emp_dir_id, sauf=demandeur)
    message = (f"La commande de {demandeur.emp_nom} a été annulé : \n\n"
               "elle n'est plus à traiter. \n\n\n"
               "Bien cordialement")
    try:
        envoyer_notification(a_qui, sujet="Commande supprimée", message=message)
    except Exception as exc:
        logger.warning("Échec de notification de la suppression de la commande #%s : %s", commande_id, exc)
        raise self.retry(exc=exc) from exc
    return "Succès"

