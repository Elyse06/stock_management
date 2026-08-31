from apps.employee.models import Direction, Employer, Service
from apps.utilisateur.models import Action, Autoriser, Utilisateur
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Initialise la base avec actions, utilisateurs, autorisations, directions, services et employés"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Supprime toutes les données existantes avant le seed",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write(self.style.WARNING("🗑️  Suppression des données existantes..."))
            # Ordre important : dépendances d'abord
            Autoriser.objects.all().delete()
            Employer.objects.all().delete()
            Service.objects.all().delete()
            Direction.objects.all().delete()
            Utilisateur.objects.all().delete()
            Action.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("✅ Données supprimées"))

        self._seed_actions()
        self._seed_utilisateurs()
        self._seed_autorisations()
        self._seed_directions()
        self._seed_services()
        self._seed_employes()

        self.stdout.write(self.style.SUCCESS("\n🎉 Seed terminé avec succès !"))

    # =========================================================================
    # 1) ACTIONS
    # =========================================================================
    def _seed_actions(self):
        self.stdout.write("\n📌 Création des actions...")

        actions = [
            ("CAT_LIRE", "Lire catalogue",
             "Consulter les articles, catégories, marques et fournisseurs"),
            ("CAT_GERE", "Gérer catalogue",
             "Créer, modifier et supprimer les articles, catégories, marques et fournisseurs"),
            ("MOV_LIRE", "Lire mouvements",
             "Consulter l'historique des mouvements de stock"),
            ("INV_LIRE", "Lire inventaire",
             "Consulter les sessions d'inventaire"),
            ("INV_GERE", "Gérer inventaire",
             "Gérer les magasins, mouvements et sessions d'inventaire"),
            ("INV_VAL",  "Valider inventaire",
             "Valider ou rejeter une session d'inventaire"),
            ("COM_DEM",  "Demander commande",
             "Créer et consulter ses propres commandes de matériel"),
            ("COM_VAL",  "Valider commande",
             "Valider ou rejeter une commande de matériel"),
        ]

        created_count = 0
        for action_id, libelle, description in actions:
            _, created = Action.objects.get_or_create(
                action_id=action_id,
                defaults={"action_libelle": libelle, "action_description": description},
            )
            if created:
                created_count += 1
                self.stdout.write(f"   ✅ Action : {action_id}")
            else:
                self.stdout.write(f"   ⏭️  Action existante : {action_id}")

        self.stdout.write(self.style.SUCCESS(f"   → {created_count} action(s) créée(s)"))

    # =========================================================================
    # 2) UTILISATEURS
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
            _, created = Utilisateur.objects.get_or_create(
                utilisateur_mail=mail,
                defaults={"utilisateur_mdp": make_password(password)},
            )
            if created:
                created_count += 1
                self.stdout.write(f"   ✅ {mail} ({role}) — mdp : {password}")
            else:
                self.stdout.write(f"   ⏭️  Utilisateur existant : {mail}")

        self.stdout.write(self.style.SUCCESS(f"   → {created_count} utilisateur(s) créé(s)"))

    # =========================================================================
    # 3) AUTORISATIONS
    # =========================================================================
    def _seed_autorisations(self):
        self.stdout.write("\n🔐 Création des autorisations...")

        autorisations = {
            "admin@paositra.mg": [
                "CAT_LIRE", "CAT_GERE",
                "MOV_LIRE",
                "INV_LIRE", "INV_GERE", "INV_VAL",
                "COM_DEM", "COM_VAL",
            ],
            "stock@paositra.mg": [
                "CAT_LIRE", "MOV_LIRE",
                "INV_LIRE", "INV_GERE", "INV_VAL",
                "COM_DEM", "COM_VAL",
            ],
            "catalogue@paositra.mg": [
                "CAT_LIRE", "CAT_GERE", "MOV_LIRE", "INV_LIRE",
            ],
            "commande@paositra.mg": [
                "CAT_LIRE", "MOV_LIRE", "COM_DEM", "COM_VAL",
            ],
            "employe@paositra.mg": [
                "CAT_LIRE", "COM_DEM",
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
                    autoriser_utilisateur_id=user,
                    autoriser_action_id=action,
                )
                if created:
                    created_count += 1
                    self.stdout.write(f"   ✅ {mail} → {action_id}")

        self.stdout.write(self.style.SUCCESS(f"   → {created_count} autorisation(s) créée(s)"))

    # =========================================================================
    # 4) DIRECTIONS
    # =========================================================================
    def _seed_directions(self):
        self.stdout.write("\n🏢 Création des directions...")

        directions = [
            ("DIR_GEN",  "Direction Générale",
             "Direction générale de Paositra Malagasy"),
            ("DIR_LOG",  "Direction Logistique",
             "Gestion des flux logistiques et du stock"),
            ("DIR_OPE",  "Direction Opérations",
             "Opérations postales et services aux clients"),
            ("DIR_FIN",  "Direction Financière",
             "Gestion financière et comptable"),
        ]

        created_count = 0
        for dir_id, libelle, description in directions:
            _, created = Direction.objects.get_or_create(
                dir_id=dir_id,
                defaults={"dir_libelle": libelle, "dir_description": description},
            )
            if created:
                created_count += 1
                self.stdout.write(f"   ✅ Direction : {dir_id} — {libelle}")
            else:
                self.stdout.write(f"   ⏭️  Direction existante : {dir_id}")

        self.stdout.write(self.style.SUCCESS(f"   → {created_count} direction(s) créée(s)"))

    # =========================================================================
    # 5) SERVICES
    # =========================================================================
    def _seed_services(self):
        self.stdout.write("\n🏬 Création des services...")

        services = [
            ("SERV_RH",  "Ressources Humaines",
            "Gestion du personnel et de la paie",
            "DIR_GEN"),
            ("SERV_IT",  "Informatique",
            "Support technique et développement",
            "DIR_GEN"),
            ("SERV_STK", "Magasin central",
            "Gestion du stock et des approvisionnements",
            "DIR_LOG"),
            ("SERV_DST", "Distribution",                  
            "Distribution du courrier et colis",
            "DIR_OPE"),
            ("SERV_CLI", "Service client",
            "Accueil et traitement des réclamations",
            "DIR_OPE"),
            ("SERV_CPT", "Comptabilité",
            "Comptabilité générale et fournisseurs",
            "DIR_FIN"),
        ]

        created_count = 0
        for serv_id, libelle, info, dir_id in services:
            try:
                direction = Direction.objects.get(dir_id=dir_id)
            except Direction.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"   ❌ Direction introuvable : {dir_id}"))
                continue

            _, created = Service.objects.get_or_create(
                serv_id=serv_id,
                defaults={
                    "serv_libelle": libelle,
                    "serv_info": info,
                    "serv_dir_id": direction,
                },
            )
            if created:
                created_count += 1
                self.stdout.write(f"   ✅ Service : {serv_id} — {libelle}")
            else:
                self.stdout.write(f"   ⏭️  Service existant : {serv_id}")

        self.stdout.write(self.style.SUCCESS(f"   → {created_count} service(s) créé(s)"))

    # =========================================================================
    # 6) EMPLOYÉS
    # =========================================================================
    def _seed_employes(self):
        self.stdout.write("\n👷 Création des employés...")

        # Employés liés aux utilisateurs
        employes_lies = [
            ("EMP001", "Rakoto Admin",       "MAT-ADM-001", "+261 34 00 001 01", "Administrateur système",   "SERV_IT",  "admin@paositra.mg"),
            ("EMP002", "Rasoa Stock",        "MAT-LOG-002", "+261 34 00 002 02", "Gestionnaire de stock",    "SERV_STK", "stock@paositra.mg"),
            ("EMP003", "Rabe Catalogue",     "MAT-LOG-003", "+261 34 00 003 03", "Agent catalogue",          "SERV_STK", "catalogue@paositra.mg"),
            ("EMP004", "Ravao Commande",     "MAT-OPE-004", "+261 34 00 004 04", "Agent commandes",          "SERV_DST", "commande@paositra.mg"),  # ✅
            ("EMP005", "Andry Employe",      "MAT-OPE-005", "+261 34 00 005 05", "Employé standard",         "SERV_CLI", "employe@paositra.mg"),
        ]

        # Employés supplémentaires
        employes_supplementaires = [
            ("EMP006", "Hery Rakotomalala",   "MAT-RH-006",  "+261 34 00 006 06", "Responsable RH",          "SERV_RH"),
            ("EMP007", "Noro Randrianary",    "MAT-RH-007",  "+261 34 00 007 07", "Assistant RH",            "SERV_RH"),
            ("EMP008", "Faly Ratsimbazafy",   "MAT-IT-008",  "+261 34 00 008 08", "Développeur",             "SERV_IT"),
            ("EMP009", "Tiana Ravelomanana",  "MAT-IT-009",  "+261 34 00 009 09", "Technicien support",      "SERV_IT"),
            ("EMP010", "Lova Andriantsoa",    "MAT-LOG-010", "+261 34 00 010 10", "Magasinier",              "SERV_STK"),
            ("EMP011", "Koto Rakotondrabe",   "MAT-LOG-011", "+261 34 00 011 11", "Magasinier adjoint",      "SERV_STK"),
            ("EMP012", "Soa Rasoamanana",     "MAT-OPE-012", "+261 34 00 012 12", "Agent de distribution",   "SERV_DST"),  # ✅
            ("EMP013", "Mamy Ratsimbazarafy", "MAT-OPE-013", "+261 34 00 013 13", "Agent de distribution",   "SERV_DST"),  # ✅
            ("EMP014", "Vola Razafindrakoto", "MAT-OPE-014", "+261 34 00 014 14", "Agent de distribution",   "SERV_DST"),  # ✅
            ("EMP015", "Tahina Razakaboana",  "MAT-CLI-015", "+261 34 00 015 15", "Agent d'accueil",         "SERV_CLI"),
            ("EMP016", "Naina Ralambondrain", "MAT-CLI-016", "+261 34 00 016 16", "Chargé clientèle",        "SERV_CLI"),
            ("EMP017", "Bema Rarivoson",      "MAT-FIN-017", "+261 34 00 017 17", "Comptable",               "SERV_CPT"),
            ("EMP018", "Dina Rasoanandrasana","MAT-FIN-018", "+261 34 00 018 18", "Assistant comptable",     "SERV_CPT"),
            ("EMP019", "Tiana Rabe",          "MAT-OPE-019", "+261 34 00 019 19", "Chef de bureau",          "SERV_DST"),  # ✅
            ("EMP020", "Fanja Ravao",         "MAT-OPE-020", "+261 34 00 020 20", "Agent de distribution",   "SERV_DST"),  # ✅
        ]

        created_count = 0

        # --- Employés liés aux utilisateurs ---
        self.stdout.write("   🔗 Employés liés aux utilisateurs :")
        for emp_id, nom, matricule, contact, fonction, serv_id, mail in employes_lies:
            try:
                service = Service.objects.get(serv_id=serv_id)
                utilisateur = Utilisateur.objects.get(utilisateur_mail=mail)
            except Service.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"      ❌ Service introuvable : {serv_id}"))
                continue
            except Utilisateur.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"      ❌ Utilisateur introuvable : {mail}"))
                continue

            _, created = Employer.objects.get_or_create(
                emp_id=emp_id,
                defaults={
                    "emp_nom": nom,
                    "emp_matricule": matricule,
                    "emp_contact": contact,
                    "emp_fonction": fonction,
                    "emp_serv_id": service,
                    "emp_utilisateur_id": utilisateur,
                },
            )
            if created:
                created_count += 1
                self.stdout.write(f"      ✅ {emp_id} — {nom} (→ {mail})")
            else:
                self.stdout.write(f"      ⏭️  Employé existant : {emp_id}")

        # --- Employés supplémentaires ---
        self.stdout.write("   👥 Employés supplémentaires :")
        for emp_id, nom, matricule, contact, fonction, serv_id in employes_supplementaires:
            try:
                service = Service.objects.get(serv_id=serv_id)
            except Service.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"      ❌ Service introuvable : {serv_id}"))
                continue

            _, created = Employer.objects.get_or_create(
                emp_id=emp_id,
                defaults={
                    "emp_nom": nom,
                    "emp_matricule": matricule,
                    "emp_contact": contact,
                    "emp_fonction": fonction,
                    "emp_serv_id": service,
                    "emp_utilisateur_id": None,  # pas lié à un utilisateur
                },
            )
            if created:
                created_count += 1
                self.stdout.write(f"      ✅ {emp_id} — {nom} ({fonction})")
            else:
                self.stdout.write(f"      ⏭️  Employé existant : {emp_id}")

        self.stdout.write(self.style.SUCCESS(f"   → {created_count} employé(s) créé(s)"))