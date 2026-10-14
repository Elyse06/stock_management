import logging

from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.auth.tokens import generer_tokens
from apps.common.throttling import LoginThrottle

logger = logging.getLogger("apps.auth")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([LoginThrottle])  # limite les essais sur l'ancien mot de passe
def changer_mot_de_passe_view(request):
    """Changement de son propre mot de passe (obligatoire après un mot de passe temporaire).

    Le nouveau mot de passe suit les règles de robustesse de l'application. Les anciens jetons
    deviennent invalides (ils portent l'empreinte de l'ancien mot de passe) : de nouveaux jetons
    sont renvoyés pour que l'utilisateur continue sans se reconnecter.
    """
    user = request.user
    ancien = request.data.get("ancien")
    nouveau = request.data.get("nouveau")
    if not isinstance(ancien, str) or not isinstance(nouveau, str) or not ancien or not nouveau:
        return Response({"detail": "L'ancien et le nouveau mot de passe sont requis."}, status=status.HTTP_400_BAD_REQUEST)
    if not check_password(ancien, user.utilisateur_mdp):
        logger.warning("Changement de mot de passe refusé (ancien mot de passe incorrect) pour l'utilisateur %s.", user.pk)
        return Response({"ancien": ["Mot de passe actuel incorrect."]}, status=status.HTTP_400_BAD_REQUEST)
    if nouveau == ancien:
        return Response({"nouveau": ["Le nouveau mot de passe doit être différent de l'actuel."]}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_password(nouveau)
    except ValidationError as exc:
        return Response({"nouveau": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

    user.utilisateur_mdp = make_password(nouveau)
    user.mdp_a_changer = False
    user.save(update_fields=["utilisateur_mdp", "mdp_a_changer"])
    logger.info("Mot de passe changé par l'utilisateur %s.", user.pk)
    access, refresh = generer_tokens(user)
    return Response({"access": access, "refresh": refresh})
