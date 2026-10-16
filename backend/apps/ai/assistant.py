"""Assistant de l'application : dialogue avec le modèle et exécution des outils.

Le modèle choisit les outils (plusieurs tours possibles) ; chaque appel est
exécuté AVEC LES DROITS DE L'UTILISATEUR. Les tableaux et liens produits par
les outils sont renvoyés tels quels au frontend, à côté de la réponse rédigée.
"""
import json
import logging

from .chat_prompts import construire_messages
from .client import completer
from .outils import Contexte, ErreurOutil, outils_autorises

logger = logging.getLogger("apps.ai")

MAX_TOURS = 4          # tours d'appels d'outils avant la réponse finale
MAX_APPELS_PAR_TOUR = 4
TAILLE_MAX_RESULTAT = 12000
TABLEAUX_MAX = 3
OPTIONS = {"temperature": 0.2, "max_tokens": 1000}


def _executer(appel, outils, contexte):
    """Exécute un appel d'outil ; renvoie ``(contenu_pour_le_modele, Resultat | None)``."""
    fonction = appel.get("function") or {}
    outil = outils.get(fonction.get("name"))
    if outil is None:
        return {"erreur": "Outil inconnu ou non autorisé pour cet utilisateur."}, None
    try:
        arguments = json.loads(fonction.get("arguments") or "{}")
        resultat = outil.appeler(contexte, arguments)
    except json.JSONDecodeError:
        return {"erreur": "Arguments illisibles."}, None
    except ErreurOutil as exc:
        return {"erreur": str(exc)}, None
    except Exception:
        logger.exception("Erreur dans l'outil %s", outil.nom)
        return {"erreur": "Erreur interne lors de la lecture des données."}, None
    return resultat.pour_ia, resultat


def _message_assistant(message):
    """Ne renvoie au modèle que les champs standard (certains modèles ajoutent un raisonnement)."""
    propre = {"role": "assistant", "content": message.get("content") or ""}
    if message.get("tool_calls"):
        propre["tool_calls"] = message["tool_calls"]
    return propre


def repondre(request, message, historique=None, page=None, trace=None):
    """``page`` : chemin affiché dans l'interface ; ``trace`` (liste) reçoit les outils appelés (évaluation)."""
    contexte = Contexte(request)
    outils = {outil.nom: outil for outil in outils_autorises(contexte)}
    schemas = [outil.schema() for outil in outils.values()]
    messages = construire_messages(contexte, message, historique, page)
    tableaux, liens, choix = [], {}, []
    trace = trace if trace is not None else []

    for _ in range(MAX_TOURS):
        reponse = completer(messages, tools=schemas, tool_choice="auto", timeout=30, **OPTIONS)
        appels = (reponse.get("tool_calls") or [])[:MAX_APPELS_PAR_TOUR]
        if not appels:
            return _resultat(reponse.get("content"), tableaux, liens, choix, trace)
        messages.append(_message_assistant({**reponse, "tool_calls": appels}))
        for appel in appels:
            contenu, resultat = _executer(appel, outils, contexte)
            # Trace des outils appelés : évaluation et mémoire des questions de suivi.
            fonction = appel.get("function") or {}
            trace.append({"outil": fonction.get("name"), "arguments": fonction.get("arguments"),
                              "erreur": contenu.get("erreur") if isinstance(contenu, dict) else None})
            if resultat is not None:
                if resultat.choix:
                    choix = resultat.choix  # les choix du dernier outil qui en propose
                if resultat.tableau and resultat.tableau["lignes"]:
                    tableaux.append(resultat.tableau)
                liens.update({item["chemin"]: item for item in resultat.liens})
            messages.append({
                "role": "tool",
                "tool_call_id": appel.get("id"),
                "name": (appel.get("function") or {}).get("name"),
                "content": json.dumps(contenu, ensure_ascii=False, default=str)[:TAILLE_MAX_RESULTAT],
            })

    # Trop de tours : on demande une réponse finale sans nouvel appel d'outil.
    reponse = completer(messages, tools=schemas, tool_choice="none", timeout=30, **OPTIONS)
    return _resultat(reponse.get("content"), tableaux, liens, choix, trace)


def _outils_utilises(trace):
    """Outils appelés avec succès et leurs paramètres : renvoyés par l'interface avec l'historique, ils
    permettent de comprendre une question de suite (« et le mois dernier ? »)."""
    utilises = []
    for appel in trace:
        if appel.get("erreur"):
            continue
        try:
            arguments = json.loads(appel.get("arguments") or "{}")
        except (TypeError, ValueError):
            arguments = {}
        utilises.append({"outil": appel.get("outil"), "arguments": arguments if isinstance(arguments, dict) else {}})
    return utilises[-4:]


def _resultat(texte, tableaux, liens, choix=(), trace=()):
    return {
        "reply": (texte or "").strip() or "Je n'ai pas pu formuler de réponse. Pouvez-vous reformuler ?",
        "tableaux": tableaux[-TABLEAUX_MAX:],
        "liens": list(liens.values())[:5],
        "choix": list(choix)[:6],
        "outils_utilises": _outils_utilises(trace),
    }
