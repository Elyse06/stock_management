import random

from apps.employee.models import Direction, Employer, Service, Site
from apps.stock.models import Magasin
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Initialise la base avec sites, directions, services, et employés"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Supprime toutes les données existantes avant le seed",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write(self.style.WARNING("⚠️ Suppression des données existantes..."))
            Employer.objects.all().delete()
            Service.objects.all().delete()
            Direction.objects.all().delete()
            Site.objects.all().delete() 
            self.stdout.write(self.style.SUCCESS("✅ Données supprimées"))

        self._seed_site()
        self._seed_directions()
        self._seed_services()
        self._seed_employes()
        self._seed_magasin()
        self.stdout.write(self.style.SUCCESS("\n🎉 Seed terminé avec succès !"))

    # =========================================================================
    # 1) SITES
    # =========================================================================
    def _seed_site(self):
        sites_data = [
            (10, "SIEGE", "SIEGE", "Tananarive"),
            (11, "67HA", "AGENCE", "Tananarive"),
            (12, "AGENCE", "AGENCE", "Tananarive"),
            (13, "ANDOHARANOFOTSY", "AGENCE", "Tananarive"),
            (14, "ANTANINARENA", "AGENCE", "Tanarive"),
            (15, "ANTSIRABE", "AGENCE", "Antsirabe"),
            (16, "ANTSIRANANA", "AGENCE", "Antsiranana"),
            (17, "FIANARANTSOA", "AGENCE", "Fianarantsoa"),
            (18, "MAHAJANGA", "AGENCE", "Mahajanga"),
            (19, "SABOTSY NAMEHANA", "AGENCE", "Tananarive"),
            (20, "TAMATAVE", "AGENCE", "Tamatave"),
            (23, "ANTANINARENINA", "AGENCE", "Tananarive"),
        ]
        for site_id, site_nom, site_type, localite in sites_data:
            Site.objects.get_or_create(
                site_id=site_id,
                defaults={
                    "site_nom": site_nom,
                    "site_type": site_type,
                    "localite": localite,
                }
            )
        self.stdout.write(self.style.SUCCESS("✅ Sites initialisés"))

    # =========================================================================
    # 2) DIRECTIONS
    # =========================================================================
    def _seed_directions(self):
        directions_data = [
            ("1", "DO", "Direction des Opérations", 10),
            ("2", "DSI", "D informatique", 10),
            ("3", "DAF", "D Finance", 10),
            ("4", "RMG", "Moyen Genereau", 10),
            ("5", "DRH", "D Ressource Humaine", 10),
            ("6", "DCOM", "D Communication", 10),
        ]
        for dir_id, dir_libelle, dir_description, site_id in directions_data:
            site = Site.objects.filter(site_id=site_id).first()
            Direction.objects.get_or_create(
                dir_id=dir_id,
                defaults={
                    "dir_libelle": dir_libelle,
                    "dir_description": dir_description,
                    "site": site,
                }
            )
        self.stdout.write(self.style.SUCCESS("✅ Directions initialisées"))

    # =========================================================================
    # 3) SERVICES
    # =========================================================================
    def _seed_services(self):
        services_data = [
            ("1", "Informatique", "bdsbicbisdb", "2"),
            ("2", "finance", "cdjopcfv", "3"),
            ("3", "operation", "dcibid", "1"),
            ("4", "ressource humaine", "dsofb", "5"),
            ("5", "immo", "dsbcids", "4"),
            ("6", "communication", "xsqxxsq", "6"),
        ]
        for serv_id, serv_libelle, serv_info, serv_dir_id in services_data:
            direction = Direction.objects.filter(dir_id=serv_dir_id).first()
            Service.objects.get_or_create(
                serv_id=serv_id,
                defaults={
                    "serv_libelle": serv_libelle,
                    "serv_info": serv_info,
                    "serv_dir_id": direction,
                }
            )
        self.stdout.write(self.style.SUCCESS("✅ Services initialisés"))

    # =========================================================================
    # 4) EMPLOYÉS
    # =========================================================================
    def _seed_employes(self):
        # Récupération des services pour répartir les employés
        services = list(Service.objects.all())
        siege_site = Site.objects.filter(site_id=10).first()

        # 1. Les 3 premiers (attachés au site Siège ou sans service direct)
        top_employes = [
            {"emp_id": "EM5642", "emp_nom": "DG", "emp_matricule": "1", "emp_contact": "02151561", "emp_fonction": "Directeur Général"},
            {"emp_id": "EM6826", "emp_nom": "SG", "emp_matricule": "M-6826", "emp_contact": "020211651", "emp_fonction": "Secrétaire Général"},
            {"emp_id": "EM7185", "emp_nom": "DGA", "emp_matricule": "M-7185", "emp_contact": "02161165", "emp_fonction": "Directeur Général Adjoint"},
        ]

        for emp in top_employes:
            Employer.objects.get_or_create(
                emp_id=emp["emp_id"],
                defaults={
                    "emp_nom": emp["emp_nom"],
                    "emp_matricule": emp["emp_matricule"],
                    "emp_contact": emp["emp_contact"],
                    "emp_fonction": emp["emp_fonction"],
                    "emp_serv_id": None,
                }
            )

        # 2. Liste de vos autres employés
        noms_autres_employes = [
            "ANDRIAMADY Hantanirina",
            "ANDRIAMAROFARA ANDRIAMASINORO Ony",
            "RAMANANTSOHARANA RALISON Setra Niaina Serge",
            "RAKOTO ANDRIANAVALONA Manoa",
            "RAKOTONINDRAINA Harivony Annick",
            "RANDRIANARITOANDRO Hery Vonjy",
            "RAKOTOMALALA Andry Mihevitsoa",
            "RAKOTOMALALA ANDRIAMIORA Haja",
            "RAKOTOARIMANANA Andrianina",
            "RAMIAKAMANANA Mamonjinirina",
            "RAMELINA Nandrianina Iarivola",
            "RAFARAMALALA Eliane",
            "RAKOTOARISON Sitraka Claudia",
            "RAHARINANTENAINA Holimalala",
            "RAKOTOHARIMANANA Felaniaina Doriana",
            "RASANDISON Zolihasitiana Eloise",
            "RASON Tovo",
            "RAMANANTENASOA Hobiniaina Manitra Tantely",
            "RAKOTONDRAZAFY Anjaratiana Gabrielle",
            "RAMIANDRISOA Mampionona Valisoa Roméo",
            "RALALAHARISON Santatriniana",
            "RABEMANANTSOA Haja Judicael",
            "RAJERISON RABARY Karine",
            "RANAIVOTIANA Tolotriniana Tahina",
            "RAKOTOZAFY Alin Michaël",
            "RAFENOMANANTSOA Rina Hasina",
            "RAHARINAIVO Lantosoa Mandimby Yolande",
            "RATSIVOHONY Tojonirina Thierry Elysé",
            "RALISON Riantsoa",
            "RANDRIAMAMPIANINA Ny Ony Kanto Nandrasana",
            "RAMANANTSOA Toto Angelot",
            "RAVOANA Thirs Francia",
            "Misaina ANDRIAMAMPIONONA",
            "Tahiry Lalaina RAMANARIVO",
            "Hariliva Hery Fitahiana MIARIZO",
            "ANDRIANARISON Tokiniaina Julio",
            "ANDRIAMIHAJA Ortega",
            "Richard RANDRIANARISOA",
            "Clara Mampionona IANTRARIVELO",
            "KARIMDJY Bria",
        ]

        # Insertion et répartition automatique dans les services/directions
        for index, nom in enumerate(noms_autres_employes):
            # Génération d'un ID et d'un matricule unique basé sur l'index
            emp_id = f"EM{2000 + index}"
            matricule = f"M-{3000 + index}"
            service_attribue = services[index % len(services)] if services else None

            Employer.objects.get_or_create(
                emp_id=emp_id,
                defaults={
                    "emp_nom": nom,
                    "emp_matricule": matricule,
                    "emp_contact": f"03400{index:03d}",
                    "emp_fonction": "Agent / Collaborateur",
                    "emp_serv_id": service_attribue,
                }
            )
        self.stdout.write(self.style.SUCCESS("✅ Employés initialisés et répartis"))

    # =========================================================================
    # 5) MAGASINS
    # =========================================================================
    def _seed_magasin(self):
        magasins_data = [
            (30, "SIEGE", 10),
        ]
        for magasin_id, magasin_nom, localite_id in magasins_data:
            Magasin.objects.get_or_create(
                magasin_id=magasin_id,
                defaults={
                    "magasin_nom": magasin_nom,
                    "localite_id": localite_id,
                }
            )
        self.stdout.write(self.style.SUCCESS("✅ Magasins initialisés"))