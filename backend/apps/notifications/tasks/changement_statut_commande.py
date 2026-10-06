from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

from apps.commande.models import Commande
from apps.employee.models import Employer
from apps.utilisateur.models import Autoriser, Utilisateur


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def notifier_changement_statut_commande(self, commande_id, ancien_statut, nouveau_statut):
    """
    Tâche pour notifier les acteurs selon le changement de statut d'une commande.
    """
    try:
        commande = Commande.objects.select_related('employe_demandeur__emp_utilisateur_id').get(commande_id=commande_id)
        
        # 1. Identifier les acteurs
        demandeur_emp = commande.employe_demandeur
        if not demandeur_emp or not demandeur_emp.emp_utilisateur_id:
            return "Demandeur sans utilisateur lié"
            
        email_demandeur = demandeur_emp.emp_utilisateur_id.utilisateur_mail
        direction_id = demandeur_emp.emp_dir_id

        # Récupération des IDs utilisateurs par action
        users_com_val = set(Autoriser.objects.filter(autoriser_action_id__action_id='COM_VAL').values_list('autoriser_utilisateur_id_id', flat=True))
        users_cat_gere = set(Autoriser.objects.filter(autoriser_action_id__action_id='CAT_GERE').values_list('autoriser_utilisateur_id_id', flat=True))
        
        # Gestionnaires = COM_VAL ET CAT_GERE
        gestionnaire_ids = users_com_val.intersection(users_cat_gere)
        
        # Chefs Hiérarchiques = COM_VAL dans la même direction, mais PAS Gestionnaires
        emp_ids_direction = set(Employer.objects.filter(emp_dir_id=direction_id).exclude(emp_utilisateur_id__isnull=True).values_list('emp_utilisateur_id_id', flat=True))
        chef_ids = emp_ids_direction.intersection(users_com_val) - gestionnaire_ids

        # Récupérer les emails
        emails_chefs = list(Utilisateur.objects.filter(utilisateur_id__in=chef_ids).exclude(utilisateur_mail='').values_list('utilisateur_mail', flat=True))
        emails_gestionnaires = list(Utilisateur.objects.filter(utilisateur_id__in=gestionnaire_ids).exclude(utilisateur_mail='').values_list('utilisateur_mail', flat=True))

        # 2. Déterminer le message et les destinataires selon la transition
        destinataires = []
        sujet = ""
        message_html = ""
        titre_action = ""

        # Cas 1 : Création (Nouvelle commande)
        if ancien_statut is None and nouveau_statut == Commande.Statut.EN_ATTENTE:
            destinataires = emails_chefs
            titre_action = "Nouvelle demande à pré-valider"
            message_html = f"Une nouvelle commande <strong>#{commande.commande_id}</strong> a été créée par <strong>{demandeur_emp.emp_nom}</strong> et attend votre pré-validation."

        # Cas 2 : Pré-validation (EN_ATTENTE -> EN_COURS)
        elif ancien_statut == Commande.Statut.EN_ATTENTE and nouveau_statut == Commande.Statut.EN_COURS:
            # Notifier le demandeur
            destinataires.append(email_demandeur)
            titre_action = "Demande en cours de traitement"
            message_html = f"Votre commande <strong>#{commande.commande_id}</strong> a été pré-validée et est en cours de traitement par le gestionnaire de stock."
            
            # Notifier les gestionnaires (on envoie un deuxième email ou on les ajoute à la liste ? 
            # Pour un template unique, on va faire deux envois distincts si les messages diffèrent, 
            # mais ici le message pour le gestionnaire est différent.
            # Astuce : On lance une sous-tâche ou on gère les deux dans la même tâche avec deux send_mail.
            
            # Envoi au demandeur
            if destinataires:
                _send_notification_email(destinataires, sujet, titre_action, message_html, commande)
            
            # Préparation pour les gestionnaires
            destinataires = emails_gestionnaires
            titre_action = "Nouvelle demande à valider"
            message_html = f"La commande <strong>#{commande.commande_id}</strong> de {demandeur_emp.emp_nom} a été pré-validée et attend votre validation finale."

        # Cas 3 : Refus par le Chef (EN_ATTENTE -> REJETEE)
        elif ancien_statut == Commande.Statut.EN_ATTENTE and nouveau_statut == Commande.Statut.REJETEE:
            destinataires = [email_demandeur]
            titre_action = "Demande refusée"
            message_html = f"Votre commande <strong>#{commande.commande_id}</strong> a été refusée lors de la pré-validation."

        # Cas 4 : Validation/Refus final (EN_COURS -> VALIDEE/REJETEE)
        elif ancien_statut == Commande.Statut.EN_COURS and nouveau_statut in [Commande.Statut.VALIDEE, Commande.Statut.REJETEE]:
            destinataires = [email_demandeur]
            if nouveau_statut == Commande.Statut.VALIDEE:
                titre_action = "Demande validée"
                message_html = f"Bonne nouvelle ! Votre commande <strong>#{commande.commande_id}</strong> a été validée et le stock a été débité."
            else:
                titre_action = "Demande refusée"
                message_html = f"Votre commande <strong>#{commande.commande_id}</strong> a été refusée lors de la validation finale."

        # 3. Envoi de l'email
        if destinataires and titre_action:
            _send_notification_email(destinataires, sujet, titre_action, message_html, commande)
            print(f"✅ Notifications envoyées pour la commande #{commande_id} ({nouveau_statut})")
        
        return "Succès"

    except Exception as exc:
        print(f"❌ Erreur notification commande: {exc}")
        raise self.retry(exc=exc)


def _send_notification_email(destinataires, sujet, titre_action, message_html, commande):
    """Fonction helper pour envoyer l'email avec le template unique"""
    from django.core.mail import send_mail
    from django.conf import settings

    if not sujet:
        sujet = f"📦 Gestion de Stock : {titre_action} (Commande #{commande.commande_id})"

    html_content = f"""
    <html>
    <body style="font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif; background-color: #FFFFFF; color: #333333; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #F9A825; border-radius: 8px; padding: 20px; background-color: #FFFFFF;">
            <h2 style="color: #F9A825; margin-top: 0; border-bottom: 2px solid #F9A825; padding-bottom: 10px;">
                {titre_action}
            </h2>
            <p>{message_html}</p>
            
            <div style="background-color: #FAFAFA; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Objet :</strong> {commande.objet}</p>
                <p style="margin: 5px 0;"><strong>Statut actuel :</strong> {commande.get_statut_display()}</p>
            </div>

            <p style="background-color: #FFF8E1; padding: 15px; border-left: 4px solid #F9A825; border-radius: 4px;">
                Vous pouvez consulter les détails de cette commande directement dans l'application.
            </p>
            
            <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 20px 0;">
            <p style="color: #757575; font-size: 12px; text-align: center;">
                Notification automatique générée par le Système de Gestion de Stock Paositra.
            </p>
        </div>
    </body>
    </html>
    """

    send_mail(
        subject=sujet,
        message=f"{titre_action} - Commande #{commande.commande_id}", # Version texte simple
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=destinataires,
        html_message=html_content,
        fail_silently=False,
    )