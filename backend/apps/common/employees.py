from apps.employee.models import Employer

_CACHE_ATTR = "_employee_cache"
_ABSENT = object()


def get_request_employee(request):
    user = getattr(request, "user", None)
    user_id = getattr(user, "pk", None)
    if user_id is None:
        return None
    cached = getattr(user, _CACHE_ATTR, _ABSENT)
    if cached is not _ABSENT:
        return cached
    employee = (
        Employer.objects.select_related("emp_dir_id", "emp_serv_id", "emp_site_id")
        .filter(emp_utilisateur_id_id=user_id)
        .first()
    )
    setattr(user, _CACHE_ATTR, employee)
    return employee


def format_employee_data(employee):
    if not employee:
        return None

    service = employee.emp_serv_id
    direction = service.serv_dir_id if service else None
    site = employee.emp_site_id

    return {
        "emp_id": employee.emp_id,
        "nom": employee.emp_nom or "",
        "matricule": employee.emp_matricule or "",
        "contact": employee.emp_contact or "",
        "fonction": employee.emp_fonction or "",
        "service": service.serv_libelle if service else None,
        "direction": direction.dir_libelle if direction else None,
        "agence": {
            "site_type": site.get_site_type_display(),
            "site_nom": site.site_nom,
        } if site else None,
    }
