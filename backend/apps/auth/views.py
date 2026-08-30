import jwt
import datetime
from django.conf import settings
from django.contrib.auth.hashers import check_password
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from apps.utilisateur.models import Utilisateur, Autoriser


SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"


def generate_tokens(user):
    """Génère les tokens access et refresh"""
    now = datetime.datetime.utcnow()
    
    access_payload = {
        "user_id": user.utilisateur_id,
        "email": user.utilisateur_mail,
        "exp": now + datetime.timedelta(minutes=30),
        "iat": now,
        "type": "access",
    }
    
    refresh_payload = {
        "user_id": user.utilisateur_id,
        "exp": now + datetime.timedelta(days=7),
        "iat": now,
        "type": "refresh",
    }
    
    access_token = jwt.encode(access_payload, SECRET_KEY, algorithm=ALGORITHM)
    refresh_token = jwt.encode(refresh_payload, SECRET_KEY, algorithm=ALGORITHM)
    
    return access_token, refresh_token


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """Connexion avec utilisateur_mail + password"""
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


@api_view(["POST"])
@permission_classes([AllowAny])
def refresh_view(request):
    """Rafraîchir le token access"""
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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Récupérer l'utilisateur courant + ses actions"""
    user = request.user
    
    # Récupérer toutes les actions de l'utilisateur
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