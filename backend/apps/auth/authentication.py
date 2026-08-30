import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from apps.utilisateur.models import Utilisateur


class JWTAuthentication(BaseAuthentication):
    """Authentification JWT personnalisée utilisant utilisateur_mail"""
    
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ")[1]
        
        try:
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=["HS256"]
            )
            if payload.get("type") != "access":
                raise AuthenticationFailed("Token invalide")
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Token expiré")
        except jwt.InvalidTokenError:
            raise AuthenticationFailed("Token invalide")
        
        try:
            user = Utilisateur.objects.get(utilisateur_id=payload["user_id"])
        except Utilisateur.DoesNotExist:
            raise AuthenticationFailed("Utilisateur inexistant")
        
        return (user, token)