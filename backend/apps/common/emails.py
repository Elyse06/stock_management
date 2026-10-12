import logging

from django.conf import settings
from django.core.mail import send_mail
from django.utils.html import escape, format_html, format_html_join

logger = logging.getLogger("apps.notifications")

COULEUR = "#F9A825"

_GABARIT = """<html>
<body style="font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif; background-color: #FFFFFF; color: #333333; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; border: 1px solid {couleur}; border-radius: 8px; padding: 20px;">
    <h2 style="color: {couleur}; margin-top: 0; border-bottom: 2px solid {couleur}; padding-bottom: 10px;">{titre}</h2>
    <p>{message}</p>
    {tableau}
    <p style="background-color: #FFF8E1; padding: 15px; border-left: 4px solid {couleur}; border-radius: 4px;">{note}</p>
    <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 20px 0;">
    <p style="color: #757575; font-size: 12px; text-align: center;">
      Notification automatique générée par le Système de Gestion de Stock Paositra.
    </p>
  </div>
</body>
</html>"""


def _tableau(lignes):
    if not lignes:
        return ""
    contenu = format_html_join(
        "",
        '<tr><td style="padding: 12px; border: 1px solid #E0E0E0; font-weight: bold;">{}</td>'
        '<td style="padding: 12px; border: 1px solid #E0E0E0;">{}</td></tr>',
        ((libelle, valeur) for libelle, valeur in lignes),
    )
    return format_html(
        '<table style="width: 100%; border-collapse: collapse; margin: 20px 0; '
        'background-color: #FAFAFA;">{}</table>',
        contenu,
    )


def envoyer_notification(destinataires, sujet, titre, message_html, lignes=(), note=""):
    destinataires = sorted({adresse for adresse in destinataires if adresse})
    if not destinataires:
        logger.info("Notification « %s » ignorée : aucun destinataire.", sujet)
        return 0

    html = _GABARIT.format(
        couleur=COULEUR,
        titre=escape(titre),
        message=message_html,
        tableau=_tableau(lignes),
        note=escape(note or "Vous pouvez consulter le détail directement dans l'application."),
    )
    texte = f"{titre}\n\n" + "\n".join(f"{libelle} : {valeur}" for libelle, valeur in lignes)

    envoyes = send_mail(
        subject=sujet,
        message=texte,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=destinataires,
        html_message=html,
        fail_silently=False,
    )
    logger.info("Notification « %s » envoyée à %d destinataire(s).", sujet, len(destinataires))
    return envoyes
