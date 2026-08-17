from django.core.management.base import BaseCommand
from django.db import transaction

from apps.utilisateurs.models import Profil, Employe, Utilisateur
from apps.catalogue.models import Categorie


class Command(BaseCommand):
    help = "Seed la base de données avec les profils, employés et utilisateurs de démonstration."

    @transaction.atomic
    def handle(self, *args, **options):
        # Données de définition des profils et utilisateurs associés
        data_seed = [
            {
                "profil": {"nom": "Administrateur", "description": "Accès complet"},
                "employe": {
                    "nom": "Claude",
                    "fonction": "Responsable IT",
                    "telephone": "0333030301",
                    "adresse": "67h",
                },
                "user": {
                    "nom_user": "admin",
                    "email": "admin@example.com",
                    "is_superuser": True,
                },
            },
            {
                "profil": {"nom": "Gestionnaire", "description": "Gestion du stock"},
                "employe": {
                    "nom": "Jean",
                    "fonction": "Gestionnaire de Stock",
                    "telephone": "0333030302",
                    "adresse": "Ankorondrano",
                },
                "user": {
                    "nom_user": "gestionnaire",
                    "email": "gestionnaire@example.com",
                    "is_superuser": False,
                },
            },
            {
                "profil": {
                    "nom": "Magasinier",
                    "description": "Entrée et Sortie du stock",
                },
                "employe": {
                    "nom": "Marc",
                    "fonction": "Magasinier Senior",
                    "telephone": "0333030303",
                    "adresse": "Isoraka",
                },
                "user": {
                    "nom_user": "magasinier",
                    "email": "magasinier@example.com",
                    "is_superuser": False,
                },
            },
            {
                "profil": {
                    "nom": "Demandeur",
                    "description": "Traitement des demandes",
                },
                "employe": {
                    "nom": "Sophie",
                    "fonction": "Assistante RH",
                    "telephone": "0333030304",
                    "adresse": "Analakely",
                },
                "user": {
                    "nom_user": "demandeur",
                    "email": "demandeur@example.com",
                    "is_superuser": False,
                },
            },
            {
                "profil": {
                    "nom": "Auditeur",
                    "description": "Applique des analyses et des vérifications",
                },
                "employe": {
                    "nom": "Claire",
                    "fonction": "Auditeur Interne",
                    "telephone": "0333030305",
                    "adresse": "Ivandry",
                },
                "user": {
                    "nom_user": "auditeur",
                    "email": "auditeur@example.com",
                    "is_superuser": False,
                },
            },
        ]

        data_seed_categories = [
            {"nom": "Informatique", "description": "Appareils et accessoires informatiques"},
            {"nom": "Mobilier", "description": "Meubles et accessoires pour la maison"},
            {"nom": "Consommation", "description": "Produits de consommation courante"},
            {"nom": "Fourniture", "description": "Articles de bureau et fournitures diverses"},
        ]

        password_defaut = "1234"

        # Création des catégories
        for category_data in data_seed_categories:
            Categorie.objects.get_or_create(
                nom=category_data["nom"],
                defaults={"description": category_data["description"]},
            )

        for entry in data_seed:
            # 1. Création du Profil
            profil, _ = Profil.objects.get_or_create(
                nom=entry["profil"]["nom"],
                defaults={"description": entry["profil"]["description"]},
            )

            # 2. Création de l'Employé
            employe_data = entry["employe"]
            employe, _ = Employe.objects.get_or_create(
                nom=employe_data["nom"],
                defaults={
                    "fonction": employe_data["fonction"],
                    "telephone": employe_data["telephone"],
                    "adresse": employe_data["adresse"],
                },
            )

            # 3. Création de l'Utilisateur
            user_data = entry["user"]
            username = user_data["nom_user"]

            if not Utilisateur.objects.filter(nom_user=username).exists():
                if user_data["is_superuser"]:
                    Utilisateur.objects.create_superuser(
                        nom_user=username,
                        email=user_data["email"],
                        employe=employe,
                        profil=profil,
                        password=password_defaut,
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Superutilisateur '{username}' créé (mdp: {password_defaut})"
                        )
                    )
                else:
                    Utilisateur.objects.create_user(
                        nom_user=username,
                        email=user_data["email"],
                        employe=employe,
                        profil=profil,
                        password=password_defaut,
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Utilisateur '{username}' créé (mdp: {password_defaut})"
                        )
                    )

        self.stdout.write(
            self.style.SUCCESS("Données de démonstration installées avec succès.")
        )
