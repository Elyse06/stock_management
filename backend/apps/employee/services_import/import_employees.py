# apps/employee/services_import/import_employees.py
import logging

from apps.employee.models import Direction, Employer, Service, Site
from django.db import transaction

logger = logging.getLogger("employee.import")

COLONNES_ATTENDUES = [
    "Matricule", "Nom", "Fonction", "Contact",
    "Service", "Direction", "Site",
]

VALEURS_NON_APPLICABLE = {"non applicable", "n/a", "na", "", "none", "nan"}


def est_non_applicable(valeur) -> bool:
    if valeur is None:
        return True
    try:
        import pandas as pd  # type: ignore
        if pd.isna(valeur):
            return True
    except (TypeError, ValueError):
        pass
    return str(valeur).strip().lower() in VALEURS_NON_APPLICABLE


def _get_or_create_site(nom_site: str) -> Site:
    nom = "" if est_non_applicable(nom_site) else str(nom_site).strip()
    if not nom:
        nom = "INCONNU"
    site_type = "SIEGE" if nom.upper() == "SIEGE" else "AGENCE"
    site, _ = Site.objects.get_or_create(
        site_nom=nom,
        site_type=site_type,
        defaults={"localite": ""},
    )
    return site


def _get_or_create_direction(libelle: str, site: Site) -> Direction:
    libelle = "" if est_non_applicable(libelle) else str(libelle).strip()
    if not libelle:
        libelle = "DIRECTION GÉNÉRALE"
    direction, _ = Direction.objects.get_or_create(
        dir_libelle__iexact=libelle,
        defaults={
            "dir_libelle": libelle[:50],
            "dir_description": f"Créée automatiquement à l'import ({libelle})",
            "site": site,
        },
    )
    return direction


def _get_or_create_service(libelle: str, direction: Direction) -> Service:
    libelle = "" if est_non_applicable(libelle) else str(libelle).strip()
    if not libelle:
        libelle = "SERVICE PAR DÉFAUT"
    service, _ = Service.objects.get_or_create(
        serv_libelle__iexact=libelle,
        defaults={
            "serv_libelle": libelle[:50],
            "serv_info": f"Créé automatiquement à l'import ({libelle})",
            "serv_dir_id": direction,
        },
    )
    return service


def _resoudre_ou_creer_employe(row: dict) -> tuple:
    matricule = "" if est_non_applicable(row.get("Matricule")) else str(row.get("Matricule")).strip().removesuffix(".0")
    nom = "" if est_non_applicable(row.get("Nom")) else str(row.get("Nom")).strip()
    fonction = "" if est_non_applicable(row.get("Fonction")) else str(row.get("Fonction")).strip() or "Agent"
    contact = "" if est_non_applicable(row.get("Contact")) else str(row.get("Contact")).strip()
    service_libelle = row.get("Service", "")
    direction_libelle = row.get("Direction", "")
    site_nom = row.get("Site", "")

    avertissement = None

    if not matricule:
        matricule = Employer.generer_emp_id_unique(nom or "INCONNU")
        avertissement = "Matricule manquant, généré automatiquement"

    employe = Employer.objects.filter(emp_matricule=matricule).first()
    if employe:
        return employe, False, avertissement

    site = _get_or_create_site(site_nom)
    direction = _get_or_create_direction(direction_libelle, site)
    service = _get_or_create_service(service_libelle, direction)

    nom_final = nom or f"Employé matricule {matricule} (nom à compléter)"
    employe = Employer.objects.create(
        emp_id=Employer.generer_emp_id_unique(matricule),
        emp_nom=nom_final[:255],
        emp_matricule=matricule,
        emp_fonction=fonction[:50],
        emp_contact=contact[:50],
        emp_serv_id=service,
    )
    return employe, True, avertissement


def importer_employes(df, overwrite: bool = True, dry_run: bool = True) -> dict:
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]

    colonnes_manquantes = [c for c in ["Matricule", "Nom"] if c not in df.columns]
    if colonnes_manquantes:
        return {
            "dry_run": dry_run,
            "colonnes_manquantes": colonnes_manquantes,
            "lignes_ok": 0,
            "lignes_erreur": len(df),
            "details": [{"ligne": i + 2, "statut": "ERREUR", "message": f"Colonnes manquantes : {colonnes_manquantes}"} for i in range(len(df))],
        }

    rapport = {
        "dry_run": dry_run,
        "colonnes_manquantes": [],
        "lignes_ok": 0,
        "lignes_erreur": 0,
        "lignes_maj": 0,
        "lignes_creees": 0,
        "details": [],
    }

    try:
        with transaction.atomic():
            for idx, row in df.iterrows():
                ligne_no = idx + 2
                try:
                    employe, cree, avertissement = _resoudre_ou_creer_employe(row.to_dict())

                    if cree:
                        rapport["lignes_creees"] += 1
                        statut_detail = "CRÉÉ"
                    else:
                        rapport["lignes_maj"] += 1
                        statut_detail = "MIS À JOUR"

                    rapport["lignes_ok"] += 1
                    detail = {
                        "ligne": ligne_no,
                        "statut": statut_detail,
                        "matricule": employe.emp_matricule,
                        "nom": employe.emp_nom,
                        "service": employe.emp_serv_id.serv_libelle if employe.emp_serv_id else "",
                        "direction": employe.emp_serv_id.serv_dir_id.dir_libelle if employe.emp_serv_id and employe.emp_serv_id.serv_dir_id else "",
                    }
                    if avertissement:
                        detail["avertissement"] = avertissement
                    rapport["details"].append(detail)

                except Exception as exc:  # noqa: BLE001
                    rapport["lignes_erreur"] += 1
                    rapport["details"].append({
                        "ligne": ligne_no,
                        "statut": "ERREUR",
                        "message": str(exc),
                    })

            if dry_run:
                from django.db.utils import TransactionManagementError
                raise TransactionManagementError("Dry run - rollback")

    except Exception:  # noqa: S110
        pass

    rapport["count_total"] = rapport["lignes_creees"] + rapport["lignes_maj"]
    return rapport