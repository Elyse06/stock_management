import logging

from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common import actions
from apps.common.params import parse_int
from apps.common.permissions import HasAction
from apps.common.throttling import AIThrottle

from .assistant import repondre
from .chat_prompts import MAX_LONGUEUR_MESSAGE
from .client import ErreurIA, ia_configuree
from .search import recherche_articles

logger = logging.getLogger("apps.ai")
MAX_LONGUEUR_REQUETE = 500
LecteurCatalogue = HasAction.for_actions(actions.CAT_LIRE)


def _texte(request, champ, longueur_max):
    valeur = request.data.get(champ, "")
    return valeur.strip()[:longueur_max] if isinstance(valeur, str) else ""


def _non_configuree():
    return Response({"error": "Le service d'IA n'est pas configuré."}, status=503)


@api_view(["POST"])
@permission_classes([LecteurCatalogue])
@throttle_classes([AIThrottle])
def ai_search_articles(request):
    user_query = _texte(request, "query", MAX_LONGUEUR_REQUETE)
    if not user_query:
        return Response({"error": "La requête est vide"}, status=400)
    if not ia_configuree():
        return _non_configuree()
    try:
        return Response(recherche_articles(user_query, parse_int(request.data.get("magasin_id"), minimum=1)))
    except ErreurIA as exc:
        return Response({"error": str(exc)}, status=502)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([AIThrottle])
def ai_chat(request):
    """Assistant de l'application, ouvert à tout utilisateur connecté.

    Les données accessibles dépendent des droits : seuls les outils autorisés
    sont proposés au modèle, et chacun applique les mêmes règles que l'API.
    """
    message = _texte(request, "message", MAX_LONGUEUR_MESSAGE)
    if not message:
        return Response({"error": "Le message est vide"}, status=400)
    if not ia_configuree():
        return _non_configuree()
    try:
        page = request.data.get("page") if isinstance(request.data.get("page"), str) else None
        return Response({"success": True, **repondre(request, message, request.data.get("history"), page=page)})
    except ErreurIA as exc:
        return Response({"error": str(exc)}, status=502)
