"""Jeu de données fixe de l'évaluation de l'assistant (dates relatives au jour de l'évaluation)."""
from datetime import datetime, time, timedelta

from django.contrib.auth.hashers import make_password
from django.utils import timezone

from apps.catalogue.models import Article, Categorie
from apps.commande.models import Commande, DetailCommande
from apps.common import actions as a
from apps.employee.models import Direction, Employer, Service, Site
from apps.stock.models import (
    Affectation,
    DemandeUnite,
    DetailMouvement,
    InventaireSession,
    LigneInventaire,
    Magasin,
    Mouvement,
    UniteArticle,
)
from apps.utilisateur.models import Action, Autoriser, Utilisateur

PROFILS = {
    "gestionnaire": [a.CAT_LIRE, a.CAT_GERE, a.MOV_LIRE, a.INV_LIRE, a.INV_GERE, a.INV_VAL, a.COM_DEM, a.COM_VAL, a.USR_GERE],
    "demandeur": [a.CAT_LIRE, a.COM_DEM],
    "chef": [a.CAT_LIRE, a.COM_DEM, a.COM_VAL],
    "autre_direction": [a.CAT_LIRE, a.COM_DEM],
}


def _quand(jours_avant, heure=10):
    return timezone.make_aware(datetime.combine(timezone.localdate() - timedelta(days=jours_avant), time(heure)))


def _mouvement(type_, lignes, quand, source=None, destination=None, beneficiaire=None):
    """lignes : [(article, quantité)] ou [(article, quantité, prix d'achat)]."""
    mvt = Mouvement.objects.create(type_mouvement=type_, magasin_source=source, magasin_destination=destination)
    Mouvement.objects.filter(pk=mvt.pk).update(date=quand)
    affectation = Affectation.resoudre(beneficiaire) if beneficiaire is not None else None
    return [DetailMouvement.objects.create(mouvement=mvt, article=ligne[0], quantite=ligne[1],
                                           prix_achat=ligne[2] if len(ligne) > 2 else None, affectation=affectation)
            for ligne in lignes]


def creer():
    """Crée le jeu de données et renvoie les utilisateurs par profil."""
    for code in sorted({c for actions in PROFILS.values() for c in actions}):
        Action.objects.get_or_create(action_id=code, defaults={"action_libelle": code, "action_description": ""})
    siege = Site.objects.create(site_nom="Siège Antaninarenina", site_type="SIEGE", localite="Antananarivo")
    Site.objects.create(site_nom="Agence Toamasina", site_type="AGENCE", localite="Toamasina")
    dsi = Direction.objects.create(dir_libelle="DSI", dir_description="Direction des Systèmes d'Information")
    daf = Direction.objects.create(dir_libelle="DAF", dir_description="Direction Administrative et Financière")
    serv_dev = Service.objects.create(serv_libelle="Développement", serv_info="", serv_dir_id=dsi)
    serv_compta = Service.objects.create(serv_libelle="Comptabilité", serv_info="", serv_dir_id=daf)

    def employe(nom, matricule, fonction, direction, service):
        return Employer.objects.create(emp_nom=nom, emp_matricule=matricule, emp_fonction=fonction, emp_contact="",
                                       emp_dir_id=direction, emp_serv_id=service, emp_site_id=siege)

    employes = {
        "gestionnaire": employe("RAKOTO Jean", "M-1001", "Gestionnaire du stock", dsi, serv_dev),
        "demandeur": employe("RABE Marie", "M-1002", "Développeuse", dsi, serv_dev),
        "chef": employe("RAZAFY Hery", "M-1003", "Chef de service", dsi, serv_dev),
        "autre_direction": employe("ANDRIA Paul", "M-2001", "Comptable", daf, serv_compta),
    }
    utilisateurs = {}
    for profil, actions in PROFILS.items():
        user = Utilisateur.objects.create(utilisateur_mail=f"{profil}@evaluation.mg", utilisateur_mdp=make_password(None))
        Autoriser.objects.bulk_create([Autoriser(autoriser_utilisateur_id=user, autoriser_action_id_id=c) for c in actions])
        employes[profil].emp_utilisateur_id = user
        employes[profil].save(update_fields=["emp_utilisateur_id"])
        utilisateurs[profil] = user

    central = Magasin.objects.create(magasin_nom="Magasin central", localite=siege)
    Magasin.objects.create(magasin_nom="Magasin Toamasina", localite=None)
    inf = Categorie.objects.create(cat_libelle="INF", cat_description="Informatique")
    cons = Categorie.objects.create(cat_libelle="CONS", cat_description="Consommables")
    mb = Categorie.objects.create(cat_libelle="MB", cat_description="Meuble du bureau")

    def article(code, designation, categorie, seuil, immobilisation=False):
        return Article.objects.create(code_article=code, designation=designation, categorie=categorie, seuil=seuil,
                                      is_immobilisation=immobilisation, mode_suivi="NUMERO_SERIE" if immobilisation else "QUANTITE")

    dell = article("LAPDELL", "Ordinateur portable Dell Latitude", inf, 2, immobilisation=True)
    article("LAPHP", "Ordinateur portable HP ProBook", inf, 2, immobilisation=True)
    papier = article("PAPA4", "Ramette papier A4", cons, 20)
    cart_hp = article("CART-HP", "Cartouche d'encre HP 305", cons, 10)
    cart_canon = article("CART-CANON", "Cartouche d'encre Canon 545", cons, 5)
    chaise = article("CHAISE", "Chaise de bureau", mb, 4)

    # Stock (avec prix d'achat) : entrées il y a 85 et 40 jours ; sorties il y a 60 jours (compensées par l'entrée
    # de J-85 : le stock final n'en dépend pas), la semaine dernière et cette semaine.
    lundi = timezone.localdate() - timedelta(days=timezone.localdate().weekday())
    jours_semaine_derniere = (timezone.localdate() - lundi).days + 3
    _mouvement(Mouvement.Type.ENTREE, [(papier, 40, 11000), (cart_hp, 14, 90000)], _quand(85), destination=central)
    _mouvement(Mouvement.Type.SORTIE, [(papier, 40)], _quand(60), source=central, beneficiaire=daf)
    _mouvement(Mouvement.Type.SORTIE, [(cart_hp, 14)], _quand(60), source=central, beneficiaire=dsi)
    _mouvement(Mouvement.Type.ENTREE, [(papier, 100, 12000), (cart_hp, 11, 85000), (cart_canon, 12, 60000), (chaise, 10, 150000)],
               _quand(40), destination=central)
    entree_dell = _mouvement(Mouvement.Type.ENTREE, [(dell, 4, 3500000)], _quand(40), destination=central)[0]
    _mouvement(Mouvement.Type.SORTIE, [(papier, 30), (cart_hp, 8)], _quand(jours_semaine_derniere), source=central, beneficiaire=dsi)
    _mouvement(Mouvement.Type.SORTIE, [(papier, 5)], _quand(0, heure=8), source=central, beneficiaire=dsi)

    # Unités : deux ordinateurs attribués (à RABE Marie et à la DSI), deux en stock.
    unites = [UniteArticle.objects.create(article=dell, numero_de_serie=f"SN-DELL-00{i}", mouvement_entree=entree_dell) for i in range(1, 5)]
    for unite, beneficiaire in ((unites[0], employes["demandeur"]), (unites[1], dsi)):
        sortie = _mouvement(Mouvement.Type.SORTIE, [(dell, 1)], _quand(20), source=central)[0]
        unite.attribuer(beneficiaire, sortie)
        unite.save()

    # Commandes (n°1 à 4) : RABE Marie (en attente ; validée en 2 jours), ANDRIA Paul (pré-validée ; rejetée en 4 jours).
    for demandeur, statut, objet, article_, quantite, jours, delai in (
        (employes["demandeur"], Commande.Statut.EN_ATTENTE, "Fournitures du service", papier, 5, 1, None),
        (employes["demandeur"], Commande.Statut.VALIDEE, "Remplacement de chaise", chaise, 1, 35, 2),
        (employes["autre_direction"], Commande.Statut.EN_COURS, "Cartouches comptabilité", cart_canon, 2, 2, None),
        (employes["autre_direction"], Commande.Statut.REJETEE, "Chaise ergonomique", chaise, 1, 10, 4),
    ):
        commande = Commande.objects.create(employe_demandeur=demandeur, objet=objet, statut=statut)
        Commande.objects.filter(pk=commande.pk).update(
            date_commande=_quand(jours), date_traitement=_quand(jours - delai) if delai else None,
            employe_traitant=employes["gestionnaire"] if delai else None)
        DetailCommande.objects.create(commande=commande, article=article_, quantite=quantite)

    # Inventaires : un validé (écart de -5 ramettes), un en attente.
    valide = InventaireSession.objects.create(code_reference="INV-EVAL-000", magasin=central, statut=InventaireSession.Statut.VALIDE)
    InventaireSession.objects.filter(pk=valide.pk).update(date_creation=_quand(15))
    LigneInventaire.objects.create(session=valide, article=papier, quantite_theorique=70, quantite_physique=65, commentaire="Ramettes abîmées")
    LigneInventaire.objects.create(session=valide, article=chaise, quantite_theorique=10, quantite_physique=10)
    InventaireSession.objects.create(code_reference="INV-EVAL-001", magasin=central, statut=InventaireSession.Statut.EN_ATTENTE)

    # Demande de retour de RABE Marie sur son ordinateur.
    DemandeUnite.objects.create(type_demande=DemandeUnite.Type.RETOUR, unite=unites[0], demandeur=employes["demandeur"],
                                affectation_origine=unites[0].affectation, motif="Écran cassé")
    return utilisateurs
