from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.common.employees import get_request_employee
from apps.common.permissions import get_user_actions


def _employe(employee):
    if employee is None:
        return None
    return {
        "emp_id": employee.emp_id,
        "emp_nom": employee.emp_nom,
        "emp_matricule": employee.emp_matricule,
        "emp_dir_id": employee.emp_dir_id_id,
        "direction_libelle": employee.emp_dir_id.dir_libelle if employee.emp_dir_id_id else None,
    }


@api_view(["GET"])
def me_view(request):
    user = request.user
    return Response({
        "utilisateur_id": user.utilisateur_id,
        "utilisateur_mail": user.utilisateur_mail,
        "actions": sorted(get_user_actions(user)),
        "employe": _employe(get_request_employee(request)),
    })
