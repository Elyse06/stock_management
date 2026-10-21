"""Client minimal de l'API Groq (format compatible OpenAI)."""
import json
import logging
import re

import requests
from django.conf import settings

logger = logging.getLogger("apps.ai")


class ErreurIA(Exception):
    """Erreur de communication avec le service d'IA (message sûr pour l'utilisateur)."""


class ErreurQuota(ErreurIA):
    """Limite de débit du service d'IA atteinte (HTTP 429). ``attente`` : secondes conseillées avant de réessayer."""

    def __init__(self, message, attente=None):
        super().__init__(message)
        self.attente = attente


MESSAGE_QUOTA = ("L'assistant est très sollicité en ce moment (limite de débit du service d'IA atteinte). "
                 "Réessayez dans une minute.")
_DUREE = re.compile(r"(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m(?!s))?(?:(\d+(?:\.\d+)?)s)?(?:(\d+(?:\.\d+)?)ms)?$")


def _secondes(valeur):
    """« 12 », « 7.66s », « 1m2.5s », « 450ms » -> secondes (``None`` si illisible)."""
    valeur = (valeur or "").strip()
    try:
        return float(valeur)
    except ValueError:
        pass
    correspondance = _DUREE.match(valeur)
    if not valeur or not correspondance:
        return None
    heures, minutes, secondes, millisecondes = (float(x) if x else 0.0 for x in correspondance.groups())
    return heures * 3600 + minutes * 60 + secondes + millisecondes / 1000


def attente_conseillee(reponse):
    """Délai avant nouvel essai donné par le service (en-tête retry-after, sinon remise à zéro du quota)."""
    for entete in ("retry-after", "x-ratelimit-reset-tokens", "x-ratelimit-reset-requests"):
        attente = _secondes(reponse.headers.get(entete))
        if attente is not None:
            return attente
    return None


def ia_configuree() -> bool:
    return bool(settings.GROQ_API_KEY)


def _envoyer(messages, timeout, stream=False, **options):
    if not ia_configuree():
        raise ErreurIA("Le service d'IA n'est pas configuré.")
    corps = {"model": settings.GROQ_MODEL, "messages": messages, **options}
    if stream:
        corps["stream"] = True
    try:
        reponse = requests.post(
            settings.GROQ_API_URL,
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
            json=corps,
            timeout=timeout,
            stream=stream,
        )
    except requests.RequestException as exc:
        logger.warning("Service d'IA injoignable : %s", exc)
        raise ErreurIA("Le service d'IA est momentanément injoignable.") from exc

    if reponse.status_code == 429:
        attente = attente_conseillee(reponse)
        logger.warning("Limite de débit du service d'IA atteinte (nouvel essai conseillé dans %s s) : %s",
                       attente, reponse.text[:300])
        reponse.close()
        raise ErreurQuota(MESSAGE_QUOTA, attente)
    if reponse.status_code != 200:
        # Le corps de la réponse n'est pas renvoyé au client (fuite d'informations).
        logger.warning("Erreur API Groq %s : %s", reponse.status_code, reponse.text[:500])
        reponse.close()
        raise ErreurIA(f"Erreur du service d'IA ({reponse.status_code}).")
    return reponse


def completer(messages, timeout=15, **options) -> dict:
    """Envoie une requête de complétion et retourne le message de l'assistant."""
    reponse = _envoyer(messages, timeout, **options)
    try:
        return reponse.json()["choices"][0]["message"]
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise ErreurIA("Réponse inattendue du service d'IA.") from exc


def completer_flux(messages, timeout=15, **options):
    """Complétion en flux : génère ``("texte", morceau)`` au fil de l'eau, puis ``("message", message)``.

    Le message final a la même forme que celui de :func:`completer` (``content`` et ``tool_calls``
    reconstitués à partir des morceaux), si bien que la suite du traitement est identique.
    """
    reponse = _envoyer(messages, timeout, stream=True, **options)
    texte, appels = [], {}
    try:
        # Lignes lues en OCTETS puis décodées en UTF-8 : le flux est annoncé « text/event-stream » sans
        # jeu de caractères, et requests le décoderait alors en Latin-1 (« rÃ©approvisionnement »).
        for octets in reponse.iter_lines():
            ligne = octets.decode("utf-8", errors="replace") if isinstance(octets, bytes) else octets
            if not ligne or not ligne.startswith("data:"):
                continue
            donnees = ligne[5:].strip()
            if donnees == "[DONE]":
                break
            try:
                delta = json.loads(donnees)["choices"][0].get("delta") or {}
            except (ValueError, KeyError, IndexError, TypeError):
                continue
            if delta.get("content"):
                texte.append(delta["content"])
                yield "texte", delta["content"]
            for morceau in delta.get("tool_calls") or []:
                appel = appels.setdefault(morceau.get("index", len(appels)), {
                    "id": None, "type": "function", "function": {"name": "", "arguments": ""},
                })
                appel["id"] = morceau.get("id") or appel["id"]
                fonction = morceau.get("function") or {}
                appel["function"]["name"] += fonction.get("name") or ""
                appel["function"]["arguments"] += fonction.get("arguments") or ""
    except requests.RequestException as exc:
        logger.warning("Flux du service d'IA interrompu : %s", exc)
        raise ErreurIA("La réponse du service d'IA a été interrompue.") from exc
    finally:
        reponse.close()
    message = {"role": "assistant", "content": "".join(texte)}
    if appels:
        message["tool_calls"] = [appels[i] for i in sorted(appels)]
    yield "message", message


def extraire_json(texte) -> dict:
    nettoye = (texte or "").replace("```json", "").replace("```", "").strip()
    try:
        donnees = json.loads(nettoye or "{}")
    except json.JSONDecodeError as exc:
        raise ErreurIA("L'IA a renvoyé une réponse illisible. Reformulez votre demande.") from exc
    if not isinstance(donnees, dict):
        raise ErreurIA("L'IA a renvoyé une réponse illisible. Reformulez votre demande.")
    return donnees
