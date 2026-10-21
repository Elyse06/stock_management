import json
import logging

from django.http import StreamingHttpResponse
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from apps.commande.access import est_gestionnaire
from apps.common.params import parse_int
from apps.common.throttling import AIThrottle

from .assistant import derouler, repondre
from .chat_prompts import MAX_LONGUEUR_MESSAGE
from .client import ErreurIA, ia_configuree
from .search import recherche_articles

logger = logging.getLogger("apps.ai")
MAX_LONGUEUR_REQUETE = 500


class Gestionnaire(BasePermission):
    """L'assistant est réservé aux gestionnaires du stock (COM_VAL et CAT_GERE)."""

    message = "L'assistant IA est réservé aux gestionnaires du stock."

    def has_permission(self, request, view):
        return est_gestionnaire(request.user)


def _texte(request, champ, longueur_max):
    valeur = request.data.get(champ, "")
    return valeur.strip()[:longueur_max] if isinstance(valeur, str) else ""


def _non_configuree():
    return Response({"error": "Le service d'IA n'est pas configuré."}, status=503)


@api_view(["POST"])
@permission_classes([Gestionnaire])
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


def _question(request):
    """Message, historique et page de la requête, ou réponse d'erreur à renvoyer telle quelle."""
    message = _texte(request, "message", MAX_LONGUEUR_MESSAGE)
    if not message:
        return None, Response({"error": "Le message est vide"}, status=400)
    if not ia_configuree():
        return None, _non_configuree()
    page = request.data.get("page") if isinstance(request.data.get("page"), str) else None
    return (message, request.data.get("history"), page), None


@api_view(["POST"])
@permission_classes([Gestionnaire])
@throttle_classes([AIThrottle])
def ai_chat(request):
    """Assistant de l'application, réservé aux gestionnaires du stock.

    Les outils proposés au modèle restent filtrés selon les droits, et chacun
    applique les mêmes règles que l'API.
    """
    question, erreur = _question(request)
    if erreur:
        return erreur
    message, historique, page = question
    try:
        return Response({"success": True, **repondre(request, message, historique, page=page)})
    except ErreurIA as exc:
        return Response({"error": str(exc)}, status=502)


def _ligne(type_evenement, **donnees):
    return json.dumps({"type": type_evenement, **donnees}, ensure_ascii=False, default=str) + "\n"


def _evenements(request, message, historique, page):
    """Réponse en flux (une ligne JSON par événement) : étapes, texte au fil de l'eau, puis résultat."""
    resultat, erreur = None, ""
    yield _ligne("debut")
    try:
        for evenement, valeur in derouler(request, message, historique, page, flux=True):
            if evenement == "fin":
                resultat = valeur
            elif evenement == "texte":
                yield _ligne("texte", texte=valeur)
            elif evenement == "etape":
                yield _ligne("etape", **valeur)
            else:
                yield _ligne(evenement)
    except ErreurIA as exc:
        erreur = str(exc)
    except Exception:
        logger.exception("Erreur de l'assistant")
        erreur = "Erreur interne de l'assistant."
    if resultat is None:
        yield _ligne("erreur", message=erreur or "Je n'ai pas pu formuler de réponse.")
    else:
        yield _ligne("fin", **resultat)


@api_view(["POST"])
@permission_classes([Gestionnaire])
@throttle_classes([AIThrottle])
def ai_chat_flux(request):
    """Même assistant que :func:`ai_chat`, mais la réponse arrive progressivement (NDJSON)."""
    question, erreur = _question(request)
    if erreur:
        return erreur
    reponse = StreamingHttpResponse(_evenements(request, *question), content_type="application/x-ndjson; charset=utf-8")
    reponse["Cache-Control"] = "no-cache"
    reponse["X-Accel-Buffering"] = "no"  # nginx : transmettre chaque ligne sans attendre la fin
    return reponse
