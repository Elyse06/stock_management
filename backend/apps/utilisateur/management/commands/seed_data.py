import os
import secrets

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.common import actions as a
from apps.utilisateur.models import Action, Autoriser, Utilisateur

ACTIONS = [
    (a.CAT_LIRE, "Lire catalogue", "Consulter les articles, catégories, marques et fournisseurs"),
    (a.CAT_GERE, "Gérer catalogue",
     "Créer, modifier et supprimer les articles, catégories, marques et fournisseurs"),
    (a.MOV_LIRE, "Lire mouvements", "Consulter l'historique des mouvements de stock"),
    (a.INV_LIRE, "Lire inventaire", "Consulter les sessions d'inventaire"),
    (a.INV_GERE, "Gérer inventaire", "Gérer les magasins, mouvements et sessions d'inventaire"),
    (a.INV_VAL, "Valider inventaire", "Valider ou rejeter une session d'inventaire"),
    (a.COM_DEM, "Demander commande", "Créer et consulter ses propres commandes de matériel"),
    (a.COM_VAL, "Valider commande", "Valider ou rejeter une commande de matériel"),
    (a.USR_GERE, "Gérer les utilisateurs", "Créer des comptes, gérer les profils et leurs permissions"),
]


class Command(BaseCommand):
    help = "Initialise les actions et le compte administrateur."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true",
                            help="Supprime actions, utilisateurs et autorisations avant le seed")
        parser.add_argument("--admin-email", default=os.getenv("SEED_ADMIN_EMAIL", "admin@paositra.mg"))
        parser.add_argument(
            "--admin-password", default=os.getenv("SEED_ADMIN_PASSWORD"),
            help="Mot de passe de l'admin (sinon : variable SEED_ADMIN_PASSWORD, sinon généré)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write(self.style.WARNING("Suppression des données existantes..."))
            Autoriser.objects.all().delete()
            Utilisateur.objects.all().delete()
            Action.objects.all().delete()

        self._seed_actions()
        self._seed_admin(options["admin_email"], options["admin_password"])
        self.stdout.write(self.style.SUCCESS("Seed terminé avec succès."))

    def _seed_actions(self):
        crees = 0
        for action_id, libelle, description in ACTIONS:
            _, cree = Action.objects.update_or_create(
                action_id=action_id,
                defaults={"action_libelle": libelle, "action_description": description},
            )
            crees += cree
        self.stdout.write(f"  {crees} action(s) créée(s), {len(ACTIONS) - crees} mise(s) à jour.")

    def _seed_admin(self, email, password):
        user = Utilisateur.objects.filter(utilisateur_mail=email).first()
        if user is None:
            genere = not password
            password = password or secrets.token_urlsafe(12)
            user = Utilisateur.objects.create(
                utilisateur_mail=email, utilisateur_mdp=make_password(password)
            )
            self.stdout.write(self.style.SUCCESS(f"  Administrateur créé : {email}"))
            if genere:
                self.stdout.write(self.style.WARNING(
                    f"  Mot de passe généré (affiché une seule fois) : {password}"
                ))
        else:
            self.stdout.write(f"  Administrateur existant : {email}")

        existantes = set(
            Autoriser.objects.filter(autoriser_utilisateur_id=user)
            .values_list("autoriser_action_id_id", flat=True)
        )
        Autoriser.objects.bulk_create([
            Autoriser(autoriser_utilisateur_id=user, autoriser_action_id_id=action_id)
            for action_id in a.TOUTES
            if action_id not in existantes
        ])
