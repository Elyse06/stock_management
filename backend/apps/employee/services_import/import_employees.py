from django.db import transaction

from apps.common.imports import acronyme, executer_avec_dry_run, texte_ou_vide
from apps.employee.models import Direction, Employer, Service, Site

COLONNES_ATTENDUES = ["Mle", "Nom et prénoms", "Direction", "Fonction", "Lieu de Travail", "Affectation"]
COLONNES_OBLIGATOIRES = ["Mle", "Nom et prénoms"]


class _Referentiels:
    def __init__(self):
        self.vider()

    def vider(self):
        self.sites, self.directions, self.services = {}, {}, {}

    def site(self, nom_affectation, lieu_travail) -> Site:
        nom = texte_ou_vide(nom_affectation) or "INCONNU"
        cle = nom.lower()
        if cle not in self.sites:
            self.sites[cle], _ = Site.objects.get_or_create(
                site_nom__iexact=nom,
                defaults={
                    "site_nom": nom[:50],
                    "site_type": "SIEGE" if nom.upper() in {"SIEGE", "SIÈGE"} else "AGENCE",
                    "localite": texte_ou_vide(lieu_travail)[:50],
                },
            )
        return self.sites[cle]

    def direction(self, direction_str) -> Direction:
        description = texte_ou_vide(direction_str) or "Direction Générale"
        cle = description.lower()
        if cle not in self.directions:
            self.directions[cle], _ = Direction.objects.get_or_create(
                dir_description__iexact=description,
                defaults={
                    "dir_libelle": acronyme(description, "DG")[:50],
                    "dir_description": description[:255],
                },
            )
        return self.directions[cle]

    def service(self, direction: Direction, service_str=None) -> Service:
        description = texte_ou_vide(service_str)
        if description:
            libelle = acronyme(description, "SRV")
        else:
            description, libelle = direction.dir_description, direction.dir_libelle
        cle = (direction.pk, description.lower())
        if cle not in self.services:
            self.services[cle], _ = Service.objects.get_or_create(
                serv_dir_id=direction,
                serv_info__iexact=description,
                defaults={"serv_libelle": libelle[:50], "serv_info": description[:255]},
            )
        return self.services[cle]


def _traiter_ligne(row: dict, overwrite: bool, referentiels: _Referentiels):
    matricule = texte_ou_vide(row.get("Mle")).removesuffix(".0")
    nom = texte_ou_vide(row.get("Nom et prénoms"))
    fonction = texte_ou_vide(row.get("Fonction"))
    avertissement = None

    if not matricule:
        matricule = Employer.generer_emp_id_unique(nom or "INCONNU")
        avertissement = "Matricule manquant, généré automatiquement"

    site = referentiels.site(row.get("Affectation", ""), row.get("Lieu de Travail", ""))
    direction = referentiels.direction(row.get("Direction", ""))
    service = referentiels.service(direction, row.get("Direction", ""))

    employe = Employer.objects.filter(emp_matricule=matricule).first()
    if employe:
        if not overwrite:
            return employe, "IGNORE", (
                avertissement or "Déjà existant : non modifié (mise à jour désactivée)"
            ), employe.emp_site_id
        if nom:
            employe.emp_nom = nom[:255]
        employe.emp_fonction = fonction[:50]
        employe.emp_serv_id = service
        employe.save()
        statut = "MAJ"
    else:
        employe = Employer.objects.create(
            emp_id=Employer.generer_emp_id_unique(matricule),
            emp_nom=(nom or f"Employé matricule {matricule} (nom à compléter)")[:255],
            emp_matricule=matricule,
            emp_fonction=fonction[:50],
            emp_contact="",
            emp_serv_id=service,
        )
        statut = "CREE"

    Employer.objects.filter(pk=employe.pk).update(emp_site_id=site.pk)
    return employe, statut, avertissement, site


_LIBELLES = {"CREE": ("lignes_creees", "CRÉÉ"), "MAJ": ("lignes_maj", "MIS À JOUR"),
             "IGNORE": ("lignes_ignorees", "IGNORÉ")}


def importer_employes(df, overwrite: bool = True, dry_run: bool = True) -> dict:
    df = df.copy()
    df.columns = [str(colonne).strip() for colonne in df.columns]

    manquantes = [c for c in COLONNES_OBLIGATOIRES if c not in df.columns]
    if manquantes:
        return {
            "dry_run": dry_run,
            "colonnes_manquantes": manquantes,
            "lignes_ok": 0,
            "lignes_erreur": len(df),
            "details": [
                {"ligne": i + 2, "statut": "ERREUR", "message": f"Colonnes manquantes : {manquantes}"}
                for i in range(len(df))
            ],
        }

    rapport = {
        "dry_run": dry_run,
        "colonnes_manquantes": [c for c in COLONNES_ATTENDUES if c not in df.columns],
        "lignes_ok": 0, "lignes_erreur": 0, "lignes_maj": 0,
        "lignes_creees": 0, "lignes_ignorees": 0,
        "details": [],
    }
    referentiels = _Referentiels()

    with executer_avec_dry_run(dry_run):
        for idx, row in df.iterrows():
            ligne_no = idx + 2
            try:
                with transaction.atomic():
                    employe, statut, avertissement, site = _traiter_ligne(
                        row.to_dict(), overwrite, referentiels
                    )
            except Exception as exc:  # noqa: BLE001 - erreur rapportée ligne par ligne
                referentiels.vider()
                rapport["lignes_erreur"] += 1
                rapport["details"].append({"ligne": ligne_no, "statut": "ERREUR", "message": str(exc)})
                continue

            compteur, libelle = _LIBELLES[statut]
            rapport[compteur] += 1
            rapport["lignes_ok"] += 1
            service = employe.emp_serv_id
            detail = {
                "ligne": ligne_no,
                "statut": libelle,
                "matricule": employe.emp_matricule,
                "nom": employe.emp_nom,
                "fonction": employe.emp_fonction,
                "service": service.serv_libelle if service else "",
                "direction": service.serv_dir_id.dir_libelle if service and service.serv_dir_id_id else "",
                "site": site.site_nom if site else "",
            }
            if avertissement:
                detail["avertissement"] = avertissement
            rapport["details"].append(detail)

    rapport["count_total"] = rapport["lignes_creees"] + rapport["lignes_maj"]
    return rapport
