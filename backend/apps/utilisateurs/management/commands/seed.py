from django.core.management.base import BaseCommand
from django.db import transaction

from apps.utilisateurs.models import Profil, Employe, Utilisateur
from apps.catalogue.models import Categorie
from apps.stock.models import Magasin


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
                    "matricule": "STG25",
                    "departement": "DSI",
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
                    "matricule": "STG20",
                    "departement": "RMG",
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
                    "matricule": "STG15",
                    "departement": "DAF",
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
                    "matricule": "STG22",
                    "departement": "DRH",
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
                    "matricule": "STG23",
                    "departement": "DRH",
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

        data_seed_employes = [
            {
                "nom": "James",
                "matricule": "D001",
                "departement": "DSI",
                "fonction": "Responsable IT",
                "telephone": "0333030301",
                "adresse": "67h",
            },
            {
                "nom": "Miora",
                "matricule": "D002",
                "departement": "RMG",
                "fonction": "Responsable de Stock",
                "telephone": "0333030302",
                "adresse": "Ankorondrano",
            },
            {
                "nom": "Melanie",
                "matricule": "D003",
                "departement": "DAF",
                "fonction": "Responsable Financier",
                "telephone": "0333030303",
                "adresse": "Isoraka",
            },
            {
                "nom": "Ardi",
                "matricule": "D004",
                "departement": "DRH",
                "fonction": "RH",
                "telephone": "0333030304",
                "adresse": "Analakely",
            },
            {
                "nom": "Grey",
                "matricule": "D005",
                "departement": "DRH",
                "fonction": "RH",
                "telephone": "0333030305",
                "adresse": "Ivandry",
            },
        ]

        data_seed_categories = [
            {"nom": "Informatique", "description": "Appareils et accessoires informatiques"},
            {"nom": "Mobilier", "description": "Meubles et accessoires pour la maison"},
            {"nom": "Consommation", "description": "Produits de consommation courante"},
            {"nom": "Fourniture", "description": "Articles de bureau et fournitures diverses"},
        ]

        data_seed_magasin = [
            {"nom": "Magasin Central", "localite": "Siège Ankorondrano"},
            {"nom": "Magasin Annexe F", "localite": "Agence Fianarantsoa"},
            {"nom": "Magasin Annexe T", "localite": "Agence Toamasina"},
            {"nom": "Magasin Annexe A", "localite": "Agence Antsiranana"},
        ]

        password_defaut = "1234"

        # Création des catégories
        for category_data in data_seed_categories:
            Categorie.objects.get_or_create(
                nom=category_data["nom"],
                defaults={"description": category_data["description"]},
            )

        # Création des magasins
        for magasin_data in data_seed_magasin: 
            Magasin.objects.get_or_create(
                nom=magasin_data["nom"],
                defaults={"localite": magasin_data["localite"]},
            )

        for entry in data_seed_employes:
            Employe.objects.get_or_create(
                matricule=entry["matricule"],
                defaults={
                    "nom": entry["nom"],
                    "departement": entry["departement"],
                    "fonction": entry["fonction"],
                    "telephone": entry["telephone"],
                    "adresse": entry["adresse"],
                },
            )

        for entry in data_seed:
            # 1. Création du Profil
            profil, _ = Profil.objects.get_or_create(
                nom=entry["profil"]["nom"],
                defaults={"description": entry["profil"]["description"]},
            )

            # 2. Création de l'Employé - CORRECTION ICI
            employe_data = entry["employe"]
            employe, created = Employe.objects.get_or_create(
                matricule=employe_data["matricule"], 
                defaults={
                    "nom": employe_data["nom"],
                    "fonction": employe_data["fonction"],
                    "telephone": employe_data["telephone"],
                    "adresse": employe_data["adresse"],
                    "departement": employe_data.get("departement", ""),  # Ajout du champ departement
                },
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Employé '{employe_data['nom']}' (matricule: {employe_data['matricule']}) créé"
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"Employé avec matricule {employe_data['matricule']} existe déjà, utilisation existant"
                    )
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
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"L'utilisateur '{username}' existe déjà, ignoré"
                    )
                )

        self.stdout.write(
            self.style.SUCCESS("Données de démonstration installées avec succès.")
        )