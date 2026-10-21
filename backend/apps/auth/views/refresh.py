from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.auth.tokens import (
    REFRESH,
    TokenInvalide,
    charger_utilisateur,
    decoder,
    generer_access,
)
from apps.common.throttling import RefreshThrottle


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([RefreshThrottle])
def refresh_view(request):
    refresh_token = request.data.get("refresh")
    if not refresh_token or not isinstance(refresh_token, str):
        return Response({"detail": "Token refresh requis."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = charger_utilisateur(decoder(refresh_token, REFRESH))
    except TokenInvalide:
        return Response(
            {"detail": "Token invalide ou expiré."}, status=status.HTTP_401_UNAUTHORIZED
        )
    return Response({"access": generer_access(user)})
