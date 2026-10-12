"""Petites fabriques de données pour les tests."""
from django.contrib.auth.hashers import make_password

from apps.catalogue.models import Article, Categorie
from apps.employee.models import Direction, Employer, Service, Site
from apps.stock.models import DetailMouvement, Magasin, Mouvement
from apps.utilisateur.models import Action, Autoriser, Utilisateur

MOT_DE_PASSE = "Mot-de-passe-Solide-42"


def utilisateur(email, actions=(), employe=None):
    user = Utilisateur.objects.create(utilisateur_mail=email, utilisateur_mdp=make_password(MOT_DE_PASSE))
    for code in actions:
        action, _ = Action.objects.get_or_create(
            action_id=code, defaults={"action_libelle": code, "action_description": ""}
        )
        Autoriser.objects.create(autoriser_utilisateur_id=user, autoriser_action_id=action)
    if employe is not None:
        employe.emp_utilisateur_id = user
        employe.save(update_fields=["emp_utilisateur_id"])
    return user


def direction(libelle="DSI"):
    return Direction.objects.create(dir_libelle=libelle, dir_description=libelle)


def employe(matricule, dir_=None):
    service = Service.objects.create(serv_libelle="S", serv_info="", serv_dir_id=dir_) if dir_ else None
    return Employer.objects.create(
        emp_nom=f"Employé {matricule}", emp_matricule=matricule, emp_fonction="Agent",
        emp_contact="", emp_serv_id=service,
    )


def article(code="ART001", seuil=0, immobilisation=False):
    categorie, _ = Categorie.objects.get_or_create(cat_libelle="Matériel")
    return Article.objects.create(
        code_article=code, designation=f"Article {code}", categorie=categorie,
        seuil=seuil, is_immobilisation=immobilisation,
    )


def magasin(nom="Central", site=None):
    return Magasin.objects.create(magasin_nom=nom, localite=site)


def siege():
    return Site.objects.create(site_nom="Siège", site_type="SIEGE", localite="Centre")


def mouvement(type_, article_, quantite, source=None, destination=None, affectation=None, **kwargs):
    mvt = Mouvement.objects.create(
        type_mouvement=type_, magasin_source=source, magasin_destination=destination, **kwargs
    )
    DetailMouvement.objects.create(mouvement=mvt, article=article_, quantite=quantite, affectation=affectation)
    return mvt
