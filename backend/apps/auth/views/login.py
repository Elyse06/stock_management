from apps.utilisateur.models import Utilisateur
from django.contrib.auth.hashers import check_password
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .generer_tokens import generate_tokens


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    email = request.data.get("utilisateur_mail")
    password = request.data.get("password")
    
    if not email or not password:
        return Response(
            {"detail": "Email et mot de passe requis."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    try:
        user = Utilisateur.objects.get(utilisateur_mail=email)
    except Utilisateur.DoesNotExist:
        return Response(
            {"detail": "Identifiants invalides."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    
    if not check_password(password, user.utilisateur_mdp):
        return Response(
            {"detail": "Identifiants invalides."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    
    access, refresh = generate_tokens(user)
    
    return Response({
        "access": access,
        "refresh": refresh,
    })
