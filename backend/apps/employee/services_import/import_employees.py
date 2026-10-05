# apps/employee/services_import/import_employees.py
import logging

from apps.employee.models import Direction, Employer, Service, Site
from django.db import transaction  # type: ignore

logger = logging.getLogger("employee.import")

COLONNES_ATTENDUES = [
    "Mle", "Nom et prénoms", "Direction", "Fonction",
    "Lieu de Travail", "Affectation",
]

VALEURS_NON_APPLICABLE = {"non applicable", "n/a", "na", "", "none", "nan"}


class RollbackDryRun(Exception):
    pass


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


def _get_or_create_site(nom_affectation, lieu_travail) -> Site:
    nom = "" if est_non_applicable(nom_affectation) else str(nom_affectation).strip()
    if not nom:
        nom = "INCONNU"
    
    site_type = "SIEGE" if nom.upper() in {"SIEGE", "SIÈGE"} else "AGENCE"
    
    localite = "" if est_non_applicable(lieu_travail) else str(lieu_travail).strip()
    
    site, _ = Site.objects.get_or_create(
        site_nom__iexact=nom,
        defaults={
            "site_nom": nom[:50],
            "site_type": site_type,
            "localite": localite[:50],
        },
    )
    return site


def _get_or_create_direction(direction_str) -> Direction:
    """La direction prend la description complète et le libellé en initiales (ex: DG)."""
    desc = "" if est_non_applicable(direction_str) else str(direction_str).strip()
    if not desc:
        desc = "Direction Générale"
    
    # Génération automatique du libellé en initiales (ex: "Direction des Systèmes d'Information" -> "DSI")
    mots = [m for m in desc.split() if m.lower() not in {"de", "des", "du", "la", "le", "les", "et"}]
    if len(mots) > 1:
        libelle = "".join(m[0].upper() for m in mots)
    elif mots:
        libelle = mots[0][:5].upper()
    else:
        libelle = "DG"

    # Recherche unique basée sur la description ou le libellé pour éviter les doublons
    direction, _ = Direction.objects.get_or_create(
        dir_description__iexact=desc,
        defaults={
            "dir_libelle": libelle[:50],
            "dir_description": desc[:255],
        },
    )
    return direction


def _get_or_create_service(direction: Direction, service_str=None) -> Service:
    """Le service utilise la même information (description / initiales) que la direction."""
    desc = "" if est_non_applicable(service_str) else str(service_str).strip()
    if not desc:
        desc = direction.dir_description
        libelle = direction.dir_libelle
    else:
        mots = [m for m in desc.split() if m.lower() not in {"de", "des", "du", "la", "le", "les", "et"}]
        if len(mots) > 1:
            libelle = "".join(m[0].upper() for m in mots)
        elif mots:
            libelle = mots[0][:5].upper()
        else:
            libelle = "SRV"

    service, _ = Service.objects.get_or_create(
        serv_dir_id=direction,
        serv_info__iexact=desc,
        defaults={
            "serv_libelle": libelle[:50],
            "serv_info": desc[:255],
        },
    )
    return service


def _resoudre_ou_creer_employe(row: dict, overwrite: bool) -> tuple:
    matricule = "" if est_non_applicable(row.get("Mle")) else str(row.get("Mle")).strip().removesuffix(".0")
    nom = "" if est_non_applicable(row.get("Nom et prénoms")) else str(row.get("Nom et prénoms")).strip()
    fonction = "" if est_non_applicable(row.get("Fonction")) else str(row.get("Fonction")).strip() or "Agent"
    direction_libelle = row.get("Direction", "")
    affectation = row.get("Affectation", "")
    lieu_travail = row.get("Lieu de Travail", "")

    avertissement = None

    if not matricule:
        matricule = Employer.generer_emp_id_unique(nom or "INCONNU")
        avertissement = "Matricule manquant, généré automatiquement"

    site = _get_or_create_site(affectation, lieu_travail)
    direction = _get_or_create_direction(direction_libelle)
    service = _get_or_create_service(direction, direction_libelle)

    employe = Employer.objects.filter(emp_matricule=matricule).first()

    if employe:
        if not overwrite:
            return employe, "IGNORE", (avertissement or "Déjà existant : non modifié (mise à jour désactivée)")
        if nom:
            employe.emp_nom = nom[:255]
        employe.emp_fonction = fonction[:50]
        employe.emp_serv_id = service
        employe.save()
        statut_action = "MAJ"
    else:
        nom_final = nom or f"Employé matricule {matricule} (nom à compléter)"
        employe = Employer.objects.create(
            emp_id=Employer.generer_emp_id_unique(matricule),
            emp_nom=nom_final[:255],
            emp_matricule=matricule,
            emp_fonction=fonction[:50],
            emp_contact="",
            emp_serv_id=service,
        )
        statut_action = "CREE"

    Employer.objects.filter(pk=employe.pk).update(emp_site_id=site.pk)
    employe.emp_site_id = site

    return employe, statut_action, avertissement


def importer_employes(df, overwrite: bool = True, dry_run: bool = True) -> dict:
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]

    colonnes_obligatoires = ["Mle", "Nom et prénoms"]
    colonnes_manquantes = [c for c in colonnes_obligatoires if c not in df.columns]
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
        "colonnes_manquantes": [c for c in COLONNES_ATTENDUES if c not in df.columns],
        "lignes_ok": 0,
        "lignes_erreur": 0,
        "lignes_maj": 0,
        "lignes_creees": 0,
        "lignes_ignorees": 0,
        "details": [],
    }

    try:
        with transaction.atomic():
            for idx, row in df.iterrows():
                ligne_no = idx + 2
                try:
                    employe, statut_action, avertissement = _resoudre_ou_creer_employe(
                        row.to_dict(), overwrite
                    )

                    if statut_action == "CREE":
                        rapport["lignes_creees"] += 1
                        statut_detail = "CRÉÉ"
                    elif statut_action == "MAJ":
                        rapport["lignes_maj"] += 1
                        statut_detail = "MIS À JOUR"
                    else:
                        rapport["lignes_ignorees"] += 1
                        statut_detail = "IGNORÉ"

                    rapport["lignes_ok"] += 1
                    detail = {
                        "ligne": ligne_no,
                        "statut": statut_detail,
                        "matricule": employe.emp_matricule,
                        "nom": employe.emp_nom,
                        "fonction": employe.emp_fonction,
                        "service": employe.emp_serv_id.serv_libelle if employe.emp_serv_id_id else "",
                        "direction": (
                            employe.emp_serv_id.serv_dir_id.dir_libelle
                            if employe.emp_serv_id_id and employe.emp_serv_id.serv_dir_id_id else ""
                        ),
                        "site": employe.emp_site_id.site_nom if employe.emp_site_id_id else "",
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
                raise RollbackDryRun()
    except RollbackDryRun:
        pass

    rapport["count_total"] = rapport["lignes_creees"] + rapport["lignes_maj"]
    return rapport