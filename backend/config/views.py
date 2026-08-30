from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.utilisateur.models import Autoriser


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user_me(request):
    user = request.user  
    
    # Récupération des autorisations avec les détails de l'action
    autorisations = Autoriser.objects.filter(
        autoriser_utilisateur_id=user.utilisateur_id
    ).select_related('autoriser_action')
    
    actions_data = [
        {
            "action_id": auth.autoriser_action.action_id,
            "action_libelle": auth.autoriser_action.action_libelle,
            "action_description": auth.autoriser_action.action_description,
        }
        for auth in autorisations
    ]
    
    return Response({
        "utilisateur_id": user.utilisateur_id,
        "utilisateur_mail": user.utilisateur_mail,
        "actions": actions_data
    })