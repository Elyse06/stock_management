from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from apps.utilisateur.models import Action, Utilisateur, Autoriser


class Command(BaseCommand):
    help = "Initialise la base avec les actions, utilisateurs et autorisations de base"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Supprime toutes les données existantes avant le seed",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write(self.style.WARNING("🗑️  Suppression des données existantes..."))
            Autoriser.objects.all().delete()
            Utilisateur.objects.all().delete()
            Action.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("✅ Données supprimées"))

        self._seed_actions()
        self._seed_utilisateurs()
        self._seed_autorisations()

        self.stdout.write(self.style.SUCCESS("\n🎉 Seed terminé avec succès !"))

    # =========================================================================
    # 1) SEED DES ACTIONS
    # =========================================================================
    def _seed_actions(self):
        self.stdout.write("\n📌 Création des actions...")

        actions = [
            # --- Catalogue ---
            ("CAT_LIRE", "Lire catalogue",
             "Consulter les articles, catégories, marques et fournisseurs"),
            ("CAT_GERE", "Gérer catalogue",
             "Créer, modifier et supprimer les articles, catégories, marques et fournisseurs"),
            # --- Mouvements ---
            ("MOV_LIRE", "Lire mouvements",
             "Consulter l'historique des mouvements de stock"),
            # --- Inventaire ---
            ("INV_LIRE", "Lire inventaire",
             "Consulter les sessions d'inventaire"),
            ("INV_GERE", "Gérer inventaire",
             "Gérer les magasins, mouvements et sessions d'inventaire"),
            ("INV_VAL",  "Valider inventaire",
             "Valider ou rejeter une session d'inventaire"),
            # --- Commandes ---
            ("COM_DEM",  "Demander commande",
             "Créer et consulter ses propres commandes de matériel"),
            ("COM_VAL",  "Valider commande",
             "Valider ou rejeter une commande de matériel"),
        ]

        created_count = 0
        for action_id, libelle, description in actions:
            action, created = Action.objects.get_or_create(
                action_id=action_id,
                defaults={
                    "action_libelle": libelle,
                    "action_description": description,
                },
            )
            if created:
                created_count += 1
                self.stdout.write(f"   ✅ Action créée : {action.action_id}")
            else:
                self.stdout.write(f"   ⏭️  Action existante : {action.action_id}")

        self.stdout.write(self.style.SUCCESS(f"   → {created_count} action(s) créée(s)"))

    # =========================================================================
    # 2) SEED DES UTILISATEURS
    # =========================================================================
    def _seed_utilisateurs(self):
        self.stdout.write("\n👤 Création des utilisateurs...")

        utilisateurs = [
            ("admin@paositra.mg",     "Admin@2026",     "Administrateur"),
            ("stock@paositra.mg",     "Stock@2026",     "Gestionnaire de stock"),
            ("catalogue@paositra.mg", "Catalogue@2026", "Agent catalogue"),
            ("commande@paositra.mg",  "Commande@2026",  "Agent commandes"),
            ("employe@paositra.mg",   "Employe@2026",   "Employé standard"),
        ]

        created_count = 0
        for mail, password, role in utilisateurs:
            user, created = Utilisateur.objects.get_or_create(
                utilisateur_mail=mail,
                defaults={
                    "utilisateur_mdp": make_password(password),
                },
            )
            if created:
                created_count += 1
                self.stdout.write(
                    f"   ✅ {mail} ({role}) — mot de passe : {password}"
                )
            else:
                self.stdout.write(f"   ⏭️  Utilisateur existant : {mail}")

        self.stdout.write(self.style.SUCCESS(f"   → {created_count} utilisateur(s) créé(s)"))

    # =========================================================================
    # 3) SEED DES AUTORISATIONS
    # =========================================================================
    def _seed_autorisations(self):
        self.stdout.write("\n🔐 Création des autorisations...")

        # Matrice des autorisations par utilisateur
        autorisations = {
            # Admin : TOUT
            "admin@paositra.mg": [
                "CAT_LIRE", "CAT_GERE",
                "MOV_LIRE",
                "INV_LIRE", "INV_GERE", "INV_VAL",
                "COM_DEM", "COM_VAL",
            ],
            # Gestionnaire de stock : tout sauf gestion catalogue
            "stock@paositra.mg": [
                "CAT_LIRE",
                "MOV_LIRE",
                "INV_LIRE", "INV_GERE", "INV_VAL",
                "COM_DEM", "COM_VAL",
            ],
            # Agent catalogue : catalogue complet + lectures
            "catalogue@paositra.mg": [
                "CAT_LIRE", "CAT_GERE",
                "MOV_LIRE",
                "INV_LIRE",
            ],
            # Agent commandes : commandes complètes + lecture catalogue
            "commande@paositra.mg": [
                "CAT_LIRE",
                "MOV_LIRE",
                "COM_DEM", "COM_VAL",
            ],
            # Employé standard : demande de commande + lecture catalogue
            "employe@paositra.mg": [
                "CAT_LIRE",
                "COM_DEM",
            ],
        }

        created_count = 0
        for mail, action_ids in autorisations.items():
            try:
                user = Utilisateur.objects.get(utilisateur_mail=mail)
            except Utilisateur.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"   ❌ Utilisateur introuvable : {mail}"))
                continue

            for action_id in action_ids:
                try:
                    action = Action.objects.get(action_id=action_id)
                except Action.DoesNotExist:
                    self.stdout.write(self.style.ERROR(f"   ❌ Action introuvable : {action_id}"))
                    continue

                _, created = Autoriser.objects.get_or_create(
                    # ⚠️ Les FK s'appellent "autoriser_utilisateur_id" et "autoriser_action_id"
                    # mais Django attend l'OBJET (pas l'ID brut) quand on les passe ainsi
                    autoriser_utilisateur_id=user,
                    autoriser_action_id=action,
                )
                if created:
                    created_count += 1
                    self.stdout.write(f"   ✅ {mail} → {action_id}")

        self.stdout.write(self.style.SUCCESS(f"   → {created_count} autorisation(s) créée(s)"))