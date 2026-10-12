import json
import logging

import requests
from django.conf import settings

logger = logging.getLogger("apps.ai")


class ErreurIA(Exception):
    """Erreur de communication avec le service d'IA (message sûr pour l'utilisateur)."""


def ia_configuree() -> bool:
    return bool(settings.GROQ_API_KEY)


def completer(messages, timeout=15, **options) -> dict:
    if not ia_configuree():
        raise ErreurIA("Le service d'IA n'est pas configuré.")
    try:
        reponse = requests.post(
            settings.GROQ_API_URL,
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
            json={"model": settings.GROQ_MODEL, "messages": messages, **options},
            timeout=timeout,
        )
    except requests.RequestException as exc:
        logger.warning("Service d'IA injoignable : %s", exc)
        raise ErreurIA("Le service d'IA est momentanément injoignable.") from exc

    if reponse.status_code != 200:
        logger.warning("Erreur API Groq %s : %s", reponse.status_code, reponse.text[:500])
        raise ErreurIA(f"Erreur du service d'IA ({reponse.status_code}).")
    try:
        return reponse.json()["choices"][0]["message"]
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise ErreurIA("Réponse inattendue du service d'IA.") from exc


def extraire_json(texte) -> dict:
    nettoye = (texte or "").replace("```json", "").replace("```", "").strip()
    try:
        donnees = json.loads(nettoye or "{}")
    except json.JSONDecodeError as exc:
        raise ErreurIA("L'IA a renvoyé une réponse illisible. Reformulez votre demande.") from exc
    if not isinstance(donnees, dict):
        raise ErreurIA("L'IA a renvoyé une réponse illisible. Reformulez votre demande.")
    return donnees
