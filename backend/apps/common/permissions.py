from rest_framework.permissions import BasePermission


class HasProfil(BasePermission):
    """
    Permission generique basee sur le nom du Profil de l'utilisateur connecte.
    Usage: permission_classes = [HasProfil.for_profils("Administrateur", "Agent")]
    """
    profils_autorises = ()

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not self.profils_autorises:
            return True
        return (
            request.user.profil_id is not None
            and request.user.profil.nom in self.profils_autorises
        )

    @classmethod
    def for_profils(cls, *noms):
        return type(
            f"HasProfil_{'_'.join(noms)}",
            (cls,),
            {"profils_autorises": noms},
        )


class IsOwnerOrProfil(BasePermission):
    """
    Autorise si l'utilisateur est le proprietaire de l'objet (via `owner_field`)
    ou s'il a l'un des profils autorises. A utiliser au niveau objet.
    """
    owner_field = "utilisateur_demandeur"
    profils_autorises = ("Administrateur", "Gestionnaire", "Magasinier", "Demandeur")

    def has_object_permission(self, request, view, obj):
        owner = getattr(obj, self.owner_field, None)
        if owner is not None and owner.id == request.user.id:
            return True
        return (
            request.user.profil_id is not None
            and request.user.profil.nom in self.profils_autorises
        )
