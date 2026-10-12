import json
import logging

from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response

from apps.common import actions
from apps.common.params import parse_int
from apps.common.permissions import HasAction
from apps.common.throttling import AIThrottle

from .chat_prompts import (
    MAX_LONGUEUR_MESSAGE,
    SEARCH_ARTICLES_TOOL,
    build_chat_messages,
)
from .client import ErreurIA, completer, ia_configuree
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
@permission_classes([LecteurCatalogue])
@throttle_classes([AIThrottle])
def ai_chat(request):
    """Chat IA avec appel d'outil pour la recherche d'articles."""
    user_message = _texte(request, "message", MAX_LONGUEUR_MESSAGE)
    if not user_message:
        return Response({"error": "Le message est vide"}, status=400)
    if not ia_configuree():
        return _non_configuree()

    messages = build_chat_messages(user_message, request.data.get("history"))
    options = {"temperature": 0.7, "max_tokens": 800}
    try:
        ai_message = completer(messages, tools=[SEARCH_ARTICLES_TOOL], tool_choice="auto", **options)
        tool_call = next(
            (c for c in ai_message.get("tool_calls") or []
             if c.get("function", {}).get("name") == "search_articles"),
            None,
        )
        if tool_call is None:
            return Response({"success": True, "reply": ai_message.get("content") or "Désolé, je n'ai pas compris."})

        try:
            arguments = json.loads(tool_call["function"].get("arguments") or "{}")
        except json.JSONDecodeError:
            arguments = {}
        search_query = str(arguments.get("query", ""))[:MAX_LONGUEUR_REQUETE]
        resultat = recherche_articles(search_query)
        resume = {
            "query": search_query,
            "count": resultat["count"],
            "filters_applied": resultat["filters_applied"],
        }
        messages += [
            ai_message,
            {
                "role": "tool",
                "tool_call_id": tool_call.get("id"),
                "name": "search_articles",
                "content": json.dumps({**resume, "articles": resultat["results"][:20]}, ensure_ascii=False, default=str),
            },
        ]
        reponse_finale = completer(messages, **options)
    except ErreurIA as exc:
        return Response({"error": str(exc)}, status=502)

    return Response({
        "success": True,
        "reply": reponse_finale.get("content") or "",
        "search_results": {**resume, "articles": resultat["results"]},
    })
