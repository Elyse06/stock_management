from rest_framework.permissions import BasePermission


class HasImportImmobilisationsPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        from apps.utilisateur.models import Autoriser
        
        return Autoriser.objects.filter(
            autoriser_utilisateur_id_id=request.user,
            autoriser_action_id_id="CAT_GERE"
        ).exists()