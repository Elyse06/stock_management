from django.db.models import Q
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.common import actions
from apps.common.employees import get_request_employee
from apps.common.permissions import user_has_all_actions, user_has_any_action

from .models import Commande


def est_gestionnaire(user) -> bool:
    return user_has_all_actions(user, actions.COM_VAL, actions.CAT_GERE)


def est_validateur(user) -> bool:
    return user_has_any_action(user, actions.COM_VAL)


def filtrer_commandes_visibles(queryset, request, chemin=""):
    user = request.user
    if est_gestionnaire(user):
        return queryset
    employee = get_request_employee(request)
    if employee is None:
        return queryset.none()

    demandeur = f"{chemin}employe_demandeur"
    filtre = Q(**{demandeur: employee})
    if est_validateur(user) and employee.emp_dir_id:
        filtre |= Q(**{f"{demandeur}__emp_dir_id": employee.emp_dir_id})
    return queryset.filter(filtre)


def verifier_commande_modifiable(commande: Commande, request):
    if not est_gestionnaire(request.user):
        employee = get_request_employee(request)
        if employee is None or commande.employe_demandeur_id != employee.pk:
            raise PermissionDenied("Seul le demandeur peut modifier cette commande.")
    if commande.statut != Commande.Statut.EN_ATTENTE:
        raise ValidationError("Une commande déjà traitée ne peut plus être modifiée ni supprimée.")
