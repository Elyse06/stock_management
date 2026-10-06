from celery import shared_task
from django.conf import settings
from django.contrib.auth import (
    get_user_model,  # <--- Ajout pour récupérer les utilisateurs
)
from django.core.mail import send_mail
from django.db.models import Q, Sum

from apps.catalogue.models import Article
from apps.stock.models import DetailMouvement, Mouvement
from apps.utilisateur.models import Utilisateur


def calculer_stock_article_magasin(code_article, magasin_id):
    """
    Calcule le stock d'un article dans un magasin spécifique.
    Basé sur la logique de stock_filters.py.
    """
    # Entrées : le magasin est la destination
    entrees = DetailMouvement.objects.filter(
        article__code_article=code_article,
        mouvement__type_mouvement__in=[Mouvement.Type.ENTREE, Mouvement.Type.RETOUR],
        mouvement__magasin_destination_id=magasin_id,
    ).aggregate(total=Sum('quantite'))['total'] or 0

    # Sorties : le magasin est la source
    sorties = DetailMouvement.objects.filter(
        article__code_article=code_article,
        mouvement__type_mouvement__in=[Mouvement.Type.SORTIE, Mouvement.Type.TRANSFERT],
        mouvement__magasin_source_id=magasin_id,
    ).aggregate(total=Sum('quantite'))['total'] or 0

    # Ajustement + : le magasin est la destination (pas de source)
    ajustement_plus = DetailMouvement.objects.filter(
        article__code_article=code_article,
        mouvement__type_mouvement=Mouvement.Type.AJUSTEMENT,
        mouvement__magasin_destination_id=magasin_id,
        mouvement__magasin_source__isnull=True,
    ).aggregate(total=Sum('quantite'))['total'] or 0

    # Ajustement - : le magasin est la source (pas de destination)
    ajustement_moins = DetailMouvement.objects.filter(
        article__code_article=code_article,
        mouvement__type_mouvement=Mouvement.Type.AJUSTEMENT,
        mouvement__magasin_source_id=magasin_id,
        mouvement__magasin_destination__isnull=True,
    ).aggregate(total=Sum('quantite'))['total'] or 0

    return entrees - sorties + ajustement_plus - ajustement_moins


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def notifier_stock_bas(self, code_article, magasin_id, magasin_nom):
    try:
        article = Article.objects.get(code_article=code_article)
        stock_actuel = calculer_stock_article_magasin(code_article, magasin_id)
        
        print(f" Stock de {article.designation} dans {magasin_nom} : {stock_actuel} (Seuil: {article.seuil})")

        if stock_actuel > article.seuil:
            print(f"✅ Stock OK dans {magasin_nom}. Pas d'alerte.")
            return "Stock OK"
        
        # On récupère les emails de tous les utilisateurs actifs qui ont une adresse email
        # (Vous pourrez affiner plus tard pour n'envoyer qu'aux "Gestionnaires" par exemple)
        destinataires = list(
            Utilisateur.objects.exclude(utilisateur_mail__isnull=True)
            .exclude(utilisateur_mail='')
            .values_list('utilisateur_mail', flat=True)
        )
        
        # Sécurité : si aucun utilisateur n'a d'email, on ne fait rien
        if not destinataires:
            print("⚠️ Aucun destinataire avec un email valide trouvé en base de données.")
            return "Aucun destinataire"

        print(f"📧 Envoi de l'alerte à {len(destinataires)} utilisateur(s) : {destinataires}")

        # 2. Template HTML (votre beau design jaune/blanc)
        html_content = f"""
        <html>
        <body style="font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif; background-color: #FFFFFF; color: #333333; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; border: 1px solid #F9A825; border-radius: 8px; padding: 20px; background-color: #FFFFFF;">
                <h2 style="color: #F9A825; margin-top: 0; border-bottom: 2px solid #F9A825; padding-bottom: 10px;">
                    ⚠️ Alerte Stock Bas
                </h2>
                <p>L'article <strong style="color: #333333;">{article.designation}</strong> 
                (Code: {article.code_article}) a atteint un niveau de stock critique dans le magasin 
                <strong>{magasin_nom}</strong>.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #FAFAFA;">
                    <tr>
                        <td style="padding: 12px; border: 1px solid #E0E0E0; font-weight: bold;">Magasin</td>
                        <td style="padding: 12px; border: 1px solid #E0E0E0;">{magasin_nom}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #E0E0E0; font-weight: bold;">Stock Actuel</td>
                        <td style="padding: 12px; border: 1px solid #E0E0E0; color: #D32F2F; font-weight: bold; font-size: 1.1em;">
                            {stock_actuel}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #E0E0E0; font-weight: bold;">Seuil d'alerte</td>
                        <td style="padding: 12px; border: 1px solid #E0E0E0;">{article.seuil}</td>
                    </tr>
                </table>

                <p style="background-color: #FFF8E1; padding: 15px; border-left: 4px solid #F9A825; border-radius: 4px;">
                    Merci de vérifier vos approvisionnements pour le magasin <strong>{magasin_nom}</strong>.
                </p>
                
                <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 20px 0;">
                <p style="color: #757575; font-size: 12px; text-align: center;">
                    Notification automatique générée par le Système de Gestion de Stock Paositra.
                </p>
            </div>
        </body>
        </html>
        """

        # 3. Envoi de l'email à la liste dynamique
        send_mail(
            subject=f"⚠️ Alerte Stock : {article.designation} ({magasin_nom})",
            message=f"Stock bas pour {article.designation} ({code_article}) dans {magasin_nom}. Stock: {stock_actuel}, Seuil: {article.seuil}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=destinataires, # <--- On utilise la liste dynamique ici
            html_message=html_content,
            fail_silently=False,
        )
        
        print(f"✅ Alerte email envoyée avec succès pour {article.designation} dans {magasin_nom}")
        return "Succès"

    except Exception as exc:
        print(f"❌ Erreur: {exc}")
        raise self.retry(exc=exc)
    