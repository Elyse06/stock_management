import json


def format_employee_data(employee):
    if not employee:
        return None

    service_name = None
    if hasattr(employee, "emp_serv_id") and employee.emp_serv_id:
        service_name = getattr(employee.emp_serv_id, "serv_libelle", None)

    return {
        "emp_id": employee.emp_id,
        "nom": getattr(employee, "emp_nom", ""),
        "matricule": getattr(employee, "emp_matricule", ""),
        "contact": getattr(employee, "emp_contact", ""),
        "fonction": getattr(employee, "emp_fonction", ""),
        "service": service_name,
    }


def generate_attribution_qr_payload(attribution) -> str:
    if hasattr(attribution, "get_qr_payload"):
        return json.dumps(attribution.get_qr_payload(), default=str)

    return json.dumps({
        "code_unique": str(attribution.code_unique),
        "quantite": float(attribution.quantite),
        "beneficiaire_id": attribution.employe_beneficiaire_id,
    })