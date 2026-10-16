import logging

from celery import shared_task
from django.conf import settings

from apps.common.emails import envoyer_notification
from apps.notifications import destinataires
from apps.stock.models import DemandeUnite

logger = logging.getLogger("apps.notifications")


def _objet(demande):
    unite = demande.unite
    action = ("le retour en stock" if demande.type_demande == DemandeUnite.Type.RETOUR
              else f"le transfert vers {demande.nouvelle_affectation.nom if demande.nouvelle_affectation else '—'}")
    numero = f" (n° {unite.numero_de_serie})" if unite.numero_de_serie else ""
    return action, f"« {unite.article.designation} »{numero}"


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def notifier_demande_unite(self, demande_id, evenement):
    demande = (
        DemandeUnite.objects.select_related("unite__article", "demandeur__emp_utilisateur_id", "nouvelle_affectation__employe",
                                            "nouvelle_affectation__direction", "nouvelle_affectation__salle", "nouvelle_affectation__site")
        .filter(pk=demande_id).first()
    )
    if demande is None:
        return "Demande introuvable"
    action, unite = _objet(demande)
    motif = f" Motif : {demande.motif}." if demande.motif else ""
    if evenement == "nouvelle":
        a_qui = destinataires.gestion_stock()
        sujet = f"Demande de {'retour' if demande.type_demande == DemandeUnite.Type.RETOUR else 'transfert'}"
        message = (f"\n{demande.demandeur.emp_nom if demande.demandeur else 'Un employé'} demande {action} de {unite}. \n\n"
                   f"{motif} \n\n"
                   f"À traiter dans Tahiry : \n\n"
                   f"{settings.APP_URL}/inventaire/unites?onglet=demandes\n\n\n"
                   "Bien cordialement")
    else:
        a_qui = destinataires.employe(demande.demandeur)
        fin = {
            "traitee": "a été traitée.",
            "refusee": f"a été refusée.{' Motif : ' + demande.commentaire_traitement + '.' if demande.commentaire_traitement else ''}",
            "annulee": f"a été clôturée : {demande.commentaire_traitement.rstrip('.').lower()}.",
        }[evenement]
        sujet = f"Votre demande : {demande.get_statut_display().lower()}"
        message = (f"\nVotre demande de {action} de {unite} {fin} \n\n"
                   f"Veuillez retourner le matérielle auprès du RMG \n\n\n"
                   "Bien cordialement")
    try:
        envoyer_notification(a_qui, sujet=sujet, message=message)
    except Exception as exc:
        logger.warning("Échec de la notification de la demande #%s : %s", demande_id, exc)
        raise self.retry(exc=exc) from exc
    return "Succès"
