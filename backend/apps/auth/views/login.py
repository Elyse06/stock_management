import logging
from functools import cache

from django.contrib.auth.hashers import check_password, make_password
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.auth.tokens import generer_tokens
from apps.common.throttling import LoginThrottle
from apps.utilisateur.models import Utilisateur

logger = logging.getLogger("apps.auth")

@cache
def _hash_factice():
    return make_password("mot-de-passe-factice-pour-temps-constant")


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def login_view(request):
    email = str(request.data.get("utilisateur_mail") or "").strip()
    password = request.data.get("password")

    if not email or not password or not isinstance(password, str):
        return Response(
            {"detail": "Email et mot de passe requis."}, status=status.HTTP_400_BAD_REQUEST
        )

    user = Utilisateur.objects.filter(utilisateur_mail=email).first()
    if user is None:
        check_password(password, _hash_factice())
        logger.warning("Échec de connexion (compte inconnu).")
        return Response({"detail": "Identifiants invalides."}, status=status.HTTP_401_UNAUTHORIZED)

    def _mettre_a_jour_hash(mot_de_passe):
        user.utilisateur_mdp = make_password(mot_de_passe)
        user.save(update_fields=["utilisateur_mdp"])

    if not check_password(password, user.utilisateur_mdp, setter=_mettre_a_jour_hash):
        logger.warning("Échec de connexion pour l'utilisateur %s.", user.pk)
        return Response({"detail": "Identifiants invalides."}, status=status.HTTP_401_UNAUTHORIZED)

    access, refresh = generer_tokens(user)
    return Response({"access": access, "refresh": refresh})
