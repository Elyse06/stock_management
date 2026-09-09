import json


def format_employee_data(employee):
    """Formate les données d'un employé avec sa localisation complète."""
    if not employee:
        return None

    service = getattr(employee, "emp_serv_id", None)
    direction = service.serv_dir_id if service else None
    site = direction.site if direction else None

    return {
        "emp_id": employee.emp_id,
        "nom": getattr(employee, "emp_nom", ""),
        "matricule": getattr(employee, "emp_matricule", ""),
        "contact": getattr(employee, "emp_contact", ""),
        "fonction": getattr(employee, "emp_fonction", ""),
        "service": service.serv_libelle if service else None,
        "direction": direction.dir_libelle if direction else None,
        "agence": {
            "site_type": site.get_site_type_display() if site else None,
            "site_nom": site.site_nom if site else None,
        } if site else None,
    }


def generate_attribution_qr_payload(attribution) -> str:
    if hasattr(attribution, "get_qr_payload"):
        return json.dumps(attribution.get_qr_payload(), default=str)
    
    # Fallback minimal si get_qr_payload n'existe pas
    return json.dumps({
        "code_unique": str(attribution.code_unique),
        "quantite": float(attribution.quantite),
        "beneficiaire_id": attribution.employe_beneficiaire_id,
    })