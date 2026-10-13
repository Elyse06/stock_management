"""Calcul des destinataires des notifications (adresse e-mail + nom de l'employé rattaché)."""
from apps.common import actions
from apps.common.emails import Destinataire
from apps.employee.models import Employer
from apps.utilisateur.models import Autoriser, Utilisateur


def _utilisateurs_avec(action):
    return set(
        Autoriser.objects.filter(autoriser_action_id_id=action)
        .values_list("autoriser_utilisateur_id_id", flat=True)
    )


def _destinataires(utilisateur_ids):
    """Destinataires des comptes donnés ; le nom est celui de l'employé lié au compte."""
    noms = dict(
        Employer.objects.filter(emp_utilisateur_id__in=utilisateur_ids).values_list("emp_utilisateur_id_id", "emp_nom")
    )
    comptes = (
        Utilisateur.objects.filter(utilisateur_id__in=utilisateur_ids)
        .exclude(utilisateur_mail="")
        .values_list("utilisateur_id", "utilisateur_mail")
        .order_by("utilisateur_mail")
    )
    return [Destinataire(email, noms.get(uid, "")) for uid, email in comptes]


def ids_gestionnaires():
    """Gestionnaires = COM_VAL ET CAT_GERE."""
    return _utilisateurs_avec(actions.COM_VAL) & _utilisateurs_avec(actions.CAT_GERE)


def gestionnaires():
    return _destinataires(ids_gestionnaires())


def chefs_direction(direction_id):
    """COM_VAL de la direction, gestionnaires exclus."""
    if direction_id is None:
        return []
    utilisateurs_direction = set(
        Employer.objects.filter(emp_dir_id=direction_id, emp_utilisateur_id__isnull=False)
        .values_list("emp_utilisateur_id_id", flat=True)
    )
    return _destinataires((utilisateurs_direction & _utilisateurs_avec(actions.COM_VAL)) - ids_gestionnaires())


def gestion_catalogue():
    return _destinataires(_utilisateurs_avec(actions.CAT_GERE))


def employe(employe_):
    """Un employé, s'il a un compte avec une adresse e-mail."""
    compte = employe_.emp_utilisateur_id if employe_ else None
    if compte is None or not compte.utilisateur_mail:
        return []
    return [Destinataire(compte.utilisateur_mail, employe_.emp_nom)]
