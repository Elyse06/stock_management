from django.core.management.base import BaseCommand
from django.db import transaction

from apps.utilisateurs.models import Profil, Employe, Utilisateur


class Command(BaseCommand):
    help = "Cree un jeu de donnees de demonstration (idempotent)."

    @transaction.atomic
    def handle(self, *args, **options):
        profil_admin, _ = Profil.objects.get_or_create(
            nom="Administrateur", defaults={"description": "Acces complet"}
        )
        profil_gestionnaire, _ = Profil.objects.get_or_create(
            nom="Gestionnaire", defaults={"description": "Gestion du stock"}
        )
        profil_magasinier, _ = Profil.objects.get_or_create(
            nom="Magasinier", defaults={"description": "Entrer et Sortie du stock"}
        )
        profil_demandeur, _ = Profil.objects.get_or_create(
            nom="Demandeur", defaults={"description": "Traitement des demandes"}
        )
        profil_auditeur, _ = Profil.objects.get_or_create(
            nom="Auditeur", defaults={"description": "Applique des analyses et des vérifications"}
        )

        employe, _ = Employe.objects.get_or_create(
            nom="Claude", 
            defaults={
                "fonction": "Responsable IT",
                "telephone": "0333030303",
                "adresse": "67h"
            }
        )

        if not Utilisateur.objects.filter(nom_user="admin").exists():
            Utilisateur.objects.create_superuser(
                nom_user="admin",
                email="admin@example.com",
                employe=employe,
                profil=profil_admin,
                password="1234",
            )
            self.stdout.write(self.style.SUCCESS("Superutilisateur 'admin' cree (mdp: 1234)"))

        self.stdout.write(self.style.SUCCESS("Donnees de demonstration installees."))
