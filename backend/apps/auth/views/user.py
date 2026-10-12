from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.common.permissions import get_user_actions


@api_view(["GET"])
def me_view(request):
    user = request.user
    return Response({
        "utilisateur_id": user.utilisateur_id,
        "utilisateur_mail": user.utilisateur_mail,
        "actions": sorted(get_user_actions(user)),
    })
