from rest_framework.permissions import BasePermission

from apps.employee.models import Employer
from apps.utilisateur.models import Autoriser, Utilisateur


def get_request_employee(request):
    utilisateur_id = getattr(request.user, "pk", None)
    if utilisateur_id is None:
        return None
    return Employer.objects.filter(
        emp_utilisateur_id_id=utilisateur_id
    ).first()


class HasProfil(BasePermission):
    """
    Permission generique basee sur le nom du Profil de l'utilisateur connecte.
    Usage: permission_classes = [HasProfil.for_profils("Administrateur", "Agent")]
    """
    profils_autorises = ()

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    @classmethod
    def for_profils(cls, *noms):
        return type(
            f"HasProfil_{'_'.join(noms)}",
            (cls,),
            {"profils_autorises": noms},
        )


class HasAction(BasePermission):
    actions_autorisees = ()

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        utilisateur_id = getattr(request.user, "pk", None)
        if not isinstance(request.user, Utilisateur) and utilisateur_id is not None:
            utilisateur_id = Utilisateur.objects.filter(pk=utilisateur_id).values_list(
                "pk", flat=True
            ).first()
        if utilisateur_id is None:
            return False
        return Autoriser.objects.filter(
            autoriser_utilisateur_id_id=utilisateur_id,
            autoriser_action_id_id__in=self.actions_autorisees,
        ).exists()

    @classmethod
    def for_actions(cls, *actions):
        return type(
            f"HasAction_{'_'.join(actions)}",
            (cls,),
            {"actions_autorisees": actions},
        )


class IsOwnerOrProfil(BasePermission):
    """
    Autorise si l'utilisateur est le proprietaire de l'objet (via `owner_field`)
    ou s'il a l'un des profils autorises. A utiliser au niveau objet.
    """
    owner_field = "employe_demandeur"
    profils_autorises = ("Administrateur", "Gestionnaire", "Magasinier", "Demandeur")

    def has_object_permission(self, request, view, obj):
        owner = getattr(obj, self.owner_field, None)
        employee = get_request_employee(request)
        return owner is not None and employee is not None and owner.pk == employee.pk
