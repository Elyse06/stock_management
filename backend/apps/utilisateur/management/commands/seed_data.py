from apps.employee.models import Direction, Employer, Service, Site
from apps.utilisateur.models import Action, Autoriser, Utilisateur
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Initialise la base avec actions, sites, directions, services, utilisateurs, autorisations et employés"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Supprime toutes les données existantes avant le seed",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write(self.style.WARNING("️  Suppression des données existantes..."))
            Autoriser.objects.all().delete()
            Employer.objects.all().delete()
            Service.objects.all().delete()
            Direction.objects.all().delete()
            Site.objects.all().delete()  # ✅ Nouveau
            Utilisateur.objects.all().delete()
            Action.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("✅ Données supprimées"))

        self._seed_actions()
        self._seed_site()  # ✅ Nouveau
        self._seed_directions()
        self._seed_services()
        self._seed_utilisateurs()
        self._seed_autorisations()
        self._seed_employes()
        self.stdout.write(self.style.SUCCESS("\n🎉 Seed terminé avec succès !"))

    # =========================================================================
    # 1) ACTIONS
    # =========================================================================
    def _seed_actions(self):
        self.stdout.write("\n Création des actions...")
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
            ("INV_VAL", "Valider inventaire",
             "Valider ou rejeter une session d'inventaire"),
            ("COM_DEM", "Demander commande",
             "Créer et consulter ses propres commandes de matériel"),
            ("COM_VAL", "Valider commande",
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
    # 2) SITE (NOUVEAU)
    # =========================================================================
    def _seed_site(self):
        self.stdout.write("\n️  Création du site...")
        site, created = Site.objects.get_or_create(
            site_type="SIEGE",
            site_nom="Siège Central",
            defaults={"localite": "Antananarivo"},
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"   ✅ Site créé : {site}"))
        else:
            self.stdout.write(f"   ⏭️  Site existant : {site}")

    # =========================================================================
    # 3) DIRECTIONS
    # =========================================================================
    def _seed_directions(self):
        self.stdout.write("\n🏢 Création des directions...")
        try:
            site = Site.objects.get(site_type="SIEGE", site_nom="Siège Central")
        except Site.DoesNotExist:
            self.stdout.write(self.style.ERROR("   ❌ Site SIEGE introuvable. Lancez d'abord _seed_site()."))
            return

        directions = [
            ("DSI",  "Direction des Systèmes d'Information",
             "Gestion de l'infrastructure IT et du développement"),
            ("DRH",  "Direction des Ressources Humaines",
             "Gestion du personnel, recrutement et paie"),
            ("DCOM", "Direction Commerciale",
             "Ventes, marketing et relation client"),
            ("RMG",  "Région Malagasy",
             "Opérations et logistique régionales"),
            ("DGO",  "Direction Générale Opérationnelle",
             "Planification stratégique et qualité"),
            ("DFI",  "Direction Financière",
             "Comptabilité, trésorerie et contrôle de gestion"),
        ]
        created_count = 0
        for dir_id, libelle, description in directions:
            _, created = Direction.objects.get_or_create(
                dir_id=dir_id,
                defaults={
                    "dir_libelle": libelle,
                    "dir_description": description,
                    "site": site,  # ✅ Lien vers le Site
                },
            )
            if created:
                created_count += 1
                self.stdout.write(f"   ✅ Direction : {dir_id} — {libelle}")
            else:
                self.stdout.write(f"   ⏭️  Direction existante : {dir_id}")
        self.stdout.write(self.style.SUCCESS(f"   → {created_count} direction(s) créée(s)"))

    # =========================================================================
    # 4) SERVICES (2 par direction)
    # =========================================================================
    def _seed_services(self):
        self.stdout.write("\n🏬 Création des services...")
        services = [
            # DSI
            ("INFRA", "Service Infrastructure",  "Serveurs, réseaux et sécurité",   "DSI"),
            ("DEV",   "Service Développement",   "Applications et intégrations",    "DSI"),
            # DRH
            ("RECR",  "Service Recrutement",     "Recrutement et intégration",      "DRH"),
            ("PAIE",  "Service Paie",            "Paie et administration du personnel", "DRH"),
            # DCOM
            ("VENT",  "Service Ventes",          "Ventes et négociation",           "DCOM"),
            ("MKTG",  "Service Marketing",       "Communication et promotion",      "DCOM"),
            # RMG
            ("OPER",  "Service Opérations",      "Opérations régionales",           "RMG"),
            ("LOG",   "Service Logistique",      "Logistique et distribution",      "RMG"),
            # DGO
            ("PLAN",  "Service Planification",   "Planification stratégique",       "DGO"),
            ("QUAL",  "Service Qualité",         "Contrôle qualité et audits",      "DGO"),
            # DFI
            ("COMPT", "Service Comptabilité",    "Comptabilité générale",           "DFI"),
            ("TRES",  "Service Trésorerie",      "Gestion de la trésorerie",        "DFI"),
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
    # 5) UTILISATEURS
    # =========================================================================
    def _seed_utilisateurs(self):
        self.stdout.write("\n👤 Création des utilisateurs...")
        # Pattern : {direction}_user{1,2}@paositra.mg
        # RMG a des profils spéciaux (gestion stock)
        utilisateurs = [
            # DSI
            ("dsi_user1@paositra.mg",     "Dsi1@2026",     "DSI - Agent standard"),
            ("dsi_user2@paositra.mg",     "Dsi2@2026",     "DSI - Agent validateur"),
            # DRH
            ("drh_user1@paositra.mg",     "Drh1@2026",     "DRH - Agent standard"),
            ("drh_user2@paositra.mg",     "Drh2@2026",     "DRH - Agent validateur"),
            # DCOM
            ("dcom_user1@paositra.mg",    "Dcom1@2026",    "DCOM - Agent standard"),
            ("dcom_user2@paositra.mg",    "Dcom2@2026",    "DCOM - Agent validateur"),
            # RMG (profils spéciaux)
            ("rmg_user1@paositra.mg",     "Rmg1@2026",     "RMG - Gestionnaire catalogue"),
            ("rmg_user2@paositra.mg",     "Rmg2@2026",     "RMG - Valideur inventaire"),
            # DGO
            ("dgo_user1@paositra.mg",     "Dgo1@2026",     "DGO - Agent standard"),
            ("dgo_user2@paositra.mg",     "Dgo2@2026",     "DGO - Agent validateur"),
            # DFI
            ("dfi_user1@paositra.mg",     "Dfi1@2026",     "DFI - Agent standard"),
            ("dfi_user2@paositra.mg",     "Dfi2@2026",     "DFI - Agent validateur"),
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
    # 6) AUTORISATIONS
    # =========================================================================
    def _seed_autorisations(self):
        self.stdout.write("\n🔐 Création des autorisations...")
        # Profils standard (toutes directions sauf RMG)
        profil_standard = ["CAT_LIRE", "MOV_LIRE", "COM_DEM"]
        profil_validateur = ["CAT_LIRE", "MOV_LIRE", "COM_DEM", "COM_VAL"]

        # Profils spéciaux RMG
        profil_rmg_gestionnaire = ["CAT_LIRE", "CAT_GERE", "MOV_LIRE", "INV_LIRE", "INV_GERE", "COM_DEM", "COM_VAL"]
        profil_rmg_validateur = ["CAT_LIRE", "MOV_LIRE", "INV_LIRE", "COM_DEM", "COM_VAL", "INV_VAL"]

        autorisations = {
            # DSI
            "dsi_user1@paositra.mg":  profil_standard,
            "dsi_user2@paositra.mg":  profil_validateur,
            # DRH
            "drh_user1@paositra.mg":  profil_standard,
            "drh_user2@paositra.mg":  profil_validateur,
            # DCOM
            "dcom_user1@paositra.mg": profil_standard,
            "dcom_user2@paositra.mg": profil_validateur,
            # RMG (profils spéciaux)
            "rmg_user1@paositra.mg":  profil_rmg_gestionnaire,
            "rmg_user2@paositra.mg":  profil_rmg_validateur,
            # DGO
            "dgo_user1@paositra.mg":  profil_standard,
            "dgo_user2@paositra.mg":  profil_validateur,
            # DFI
            "dfi_user1@paositra.mg":  profil_standard,
            "dfi_user2@paositra.mg":  profil_validateur,
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
    # 7) EMPLOYÉS (5 par direction = 30 total)
    #    - 2 liés aux users de la direction
    #    - 3 sans user
    # =========================================================================
    def _seed_employes(self):
        self.stdout.write("\n👷 Création des employés...")

        # Structure : (emp_id, nom, matricule, contact, fonction, serv_id, mail_user_ou_None)
        employes = [
            # ===== DSI =====
            ("EMP001", "Rakoto Jean",      "MAT-DSI-001", "+261 34 01 001 01", "Responsable IT",       "INFRA", "dsi_user1@paositra.mg"),
            ("EMP002", "Rasoa Marie",      "MAT-DSI-002", "+261 34 01 002 02", "Chef de projet IT",    "DEV",   "dsi_user2@paositra.mg"),
            ("EMP003", "Rabe Paul",        "MAT-DSI-003", "+261 34 01 003 03", "Administrateur réseau","INFRA", None),
            ("EMP004", "Ravao Sophie",     "MAT-DSI-004", "+261 34 01 004 04", "Développeur senior",   "DEV",   None),
            ("EMP005", "Andry Luc",        "MAT-DSI-005", "+261 34 01 005 05", "Technicien support",   "INFRA", None),

            # ===== DRH =====
            ("EMP006", "Hery Rakotomalala",   "MAT-DRH-006", "+261 34 02 006 06", "Responsable RH",       "RECR", "drh_user1@paositra.mg"),
            ("EMP007", "Noro Randrianary",    "MAT-DRH-007", "+261 34 02 007 07", "Gestionnaire paie",    "PAIE", "drh_user2@paositra.mg"),
            ("EMP008", "Faly Ratsimbazafy",   "MAT-DRH-008", "+261 34 02 008 08", "Chargé de recrutement","RECR", None),
            ("EMP009", "Tiana Ravelomanana",  "MAT-DRH-009", "+261 34 02 009 09", "Assistant RH",         "PAIE", None),
            ("EMP010", "Lova Andriantsoa",    "MAT-DRH-010", "+261 34 02 010 10", "Juriste social",       "RECR", None),

            # ===== DCOM =====
            ("EMP011", "Koto Rakotondrabe",   "MAT-DCOM-011", "+261 34 03 011 11", "Directeur commercial",  "VENT", "dcom_user1@paositra.mg"),
            ("EMP012", "Soa Rasoamanana",     "MAT-DCOM-012", "+261 34 03 012 12", "Responsable marketing", "MKTG", "dcom_user2@paositra.mg"),
            ("EMP013", "Mamy Ratsimbazarafy", "MAT-DCOM-013", "+261 34 03 013 13", "Commercial terrain",    "VENT", None),
            ("EMP014", "Vola Razafindrakoto", "MAT-DCOM-014", "+261 34 03 014 14", "Chargée de communication","MKTG", None),
            ("EMP015", "Tahina Razakaboana",  "MAT-DCOM-015", "+261 34 03 015 15", "Assistant commercial",  "VENT", None),

            # ===== RMG =====
            ("EMP016", "Naina Ralambondrainy","MAT-RMG-016", "+261 34 04 016 16", "Directeur régional",    "OPER", "rmg_user1@paositra.mg"),
            ("EMP017", "Bema Rarivoson",      "MAT-RMG-017", "+261 34 04 017 17", "Responsable logistique","LOG",  "rmg_user2@paositra.mg"),
            ("EMP018", "Dina Rasoanandrasana","MAT-RMG-018", "+261 34 04 018 18", "Chef d'agence régionale","OPER", None),
            ("EMP019", "Tiana Rabe",          "MAT-RMG-019", "+261 34 04 019 19", "Agent logistique",      "LOG",  None),
            ("EMP020", "Fanja Ravao",         "MAT-RMG-020", "+261 34 04 020 20", "Coordinateur régional", "OPER", None),

            # ===== DGO =====
            ("EMP021", "Rija Rakotobe",       "MAT-DGO-021", "+261 34 05 021 21", "Directeur général ops", "PLAN", "dgo_user1@paositra.mg"),
            ("EMP022", "Sitraka Andria",      "MAT-DGO-022", "+261 34 05 022 22", "Responsable qualité",   "QUAL", "dgo_user2@paositra.mg"),
            ("EMP023", "Voahangy Rabe",       "MAT-DGO-023", "+261 34 05 023 23", "Planificateur",         "PLAN", None),
            ("EMP024", "Fenitra Rasolofonirina","MAT-DGO-024","+261 34 05 024 24", "Auditeur qualité",      "QUAL", None),
            ("EMP025", "Hasina Rakotoarisoa", "MAT-DGO-025", "+261 34 05 025 25", "Analyste performance",  "PLAN", None),

            # ===== DFI =====
            ("EMP026", "Miora Andriamihaja",  "MAT-DFI-026", "+261 34 06 026 26", "Directrice financière", "COMPT","dfi_user1@paositra.mg"),
            ("EMP027", "Tolotra Razafy",      "MAT-DFI-027", "+261 34 06 027 27", "Trésorier",             "TRES", "dfi_user2@paositra.mg"),
            ("EMP028", "Aina Ratsimba",       "MAT-DFI-028", "+261 34 06 028 28", "Comptable senior",      "COMPT",None),
            ("EMP029", "Fetra Andriamahenina", "MAT-DFI-029","+261 34 06 029 29", "Contrôleur de gestion", "TRES", None),
            ("EMP030", "Lalao Rakotomalala",  "MAT-DFI-030", "+261 34 06 030 30", "Assistant comptable",   "COMPT",None),
        ]

        created_count = 0
        for emp_id, nom, matricule, contact, fonction, serv_id, mail in employes:
            try:
                service = Service.objects.get(serv_id=serv_id)
            except Service.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"   ❌ Service introuvable : {serv_id}"))
                continue

            utilisateur = None
            if mail:
                try:
                    utilisateur = Utilisateur.objects.get(utilisateur_mail=mail)
                except Utilisateur.DoesNotExist:
                    self.stdout.write(self.style.ERROR(f"   ❌ Utilisateur introuvable : {mail}"))
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
                user_info = f" (→ {mail})" if mail else ""
                self.stdout.write(f"   ✅ {emp_id} — {nom}{user_info}")
            else:
                self.stdout.write(f"   ⏭️  Employé existant : {emp_id}")

        self.stdout.write(self.style.SUCCESS(f"   → {created_count} employé(s) créé(s)"))