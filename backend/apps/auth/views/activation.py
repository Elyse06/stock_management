"""Activation d'un compte par son lien : vérification du lien, puis choix du mot de passe."""
import logging

from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.auth.tokens import generer_tokens
from apps.common.throttling import LoginThrottle
from apps.employee.models import Employer
from apps.utilisateur.acces import LienInvalide, verifier_jeton_activation

logger = logging.getLogger("apps.auth")


def _compte_ou_erreur(request):
    jeton = request.data.get("jeton")
    if not isinstance(jeton, str) or not jeton:
        raise LienInvalide("Lien d'activation manquant.")
    return verifier_jeton_activation(jeton)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def verifier_activation_view(request):
    """Vérifie le lien (le jeton est envoyé dans le corps, jamais dans l'adresse)."""
    try:
        compte = _compte_ou_erreur(request)
    except LienInvalide as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    employe = Employer.objects.filter(emp_utilisateur_id=compte).only("emp_nom").first()
    return Response({"utilisateur_mail": compte.utilisateur_mail, "nom": employe.emp_nom if employe else ""})


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def activer_compte_view(request):
    """Choix du mot de passe : le compte est activé et l'utilisateur connecté."""
    try:
        compte = _compte_ou_erreur(request)
    except LienInvalide as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    nouveau = request.data.get("nouveau")
    if not isinstance(nouveau, str) or not nouveau:
        return Response({"nouveau": ["Le mot de passe est requis."]}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_password(nouveau)
    except ValidationError as exc:
        return Response({"nouveau": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

    compte.utilisateur_mdp = make_password(nouveau)  # change l'empreinte : le lien ne resservira pas
    compte.mdp_a_changer = False
    compte.save(update_fields=["utilisateur_mdp", "mdp_a_changer"])
    logger.info("Compte %s activé par son lien.", compte.pk)
    access, refresh = generer_tokens(compte)
    return Response({"access": access, "refresh": refresh})
