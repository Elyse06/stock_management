from apps.common import actions
from apps.employee.models import Employer
from apps.utilisateur.models import Autoriser, Utilisateur


def _utilisateurs_avec(action):
    return set(
        Autoriser.objects.filter(autoriser_action_id_id=action)
        .values_list("autoriser_utilisateur_id_id", flat=True)
    )


def _emails(utilisateur_ids):
    return list(
        Utilisateur.objects.filter(utilisateur_id__in=utilisateur_ids)
        .exclude(utilisateur_mail="")
        .values_list("utilisateur_mail", flat=True)
    )


def ids_gestionnaires():
    return _utilisateurs_avec(actions.COM_VAL) & _utilisateurs_avec(actions.CAT_GERE)


def emails_gestionnaires():
    return _emails(ids_gestionnaires())


def emails_chefs_direction(direction_id):
    if direction_id is None:
        return []
    utilisateurs_direction = set(
        Employer.objects.filter(emp_dir_id=direction_id, emp_utilisateur_id__isnull=False)
        .values_list("emp_utilisateur_id_id", flat=True)
    )
    return _emails((utilisateurs_direction & _utilisateurs_avec(actions.COM_VAL)) - ids_gestionnaires())


def emails_gestion_catalogue():
    return _emails(_utilisateurs_avec(actions.CAT_GERE))
