from apps.utilisateur.models import Autoriser
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    user = request.user
    actions = list(
        Autoriser.objects
        .filter(autoriser_utilisateur_id=user.utilisateur_id)
        .values_list("autoriser_action_id_id", flat=True)
    )
    
    return Response({
        "utilisateur_id": user.utilisateur_id,
        "utilisateur_mail": user.utilisateur_mail,
        "actions": actions,
    })