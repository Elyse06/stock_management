import jwt
from apps.utilisateur.models import Utilisateur
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .generer_tokens import generate_tokens

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"

@api_view(["POST"])
@permission_classes([AllowAny])
def refresh_view(request):
    refresh_token = request.data.get("refresh")
    
    if not refresh_token:
        return Response(
            {"detail": "Token refresh requis."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise ValueError("Token invalide")
        
        user = Utilisateur.objects.get(utilisateur_id=payload["user_id"])
        access, _ = generate_tokens(user)
        
        return Response({"access": access})
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, ValueError):
        return Response(
            {"detail": "Token invalide ou expiré."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
