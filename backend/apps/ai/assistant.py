import json
import logging
import math
import time

from .chat_prompts import construire_messages
from .client import ErreurIA, ErreurQuota, completer, completer_flux
from .outils import Contexte, ErreurOutil, outils_autorises

logger = logging.getLogger("apps.ai")

MAX_TOURS = 4
MAX_APPELS_PAR_TOUR = 4
TAILLE_MAX_RESULTAT = 8000
TABLEAUX_MAX = 3
OPTIONS = {"temperature": 0.2, "max_tokens": 1000}
ESSAIS_QUOTA = 3
ATTENTE_QUOTA_MAX = 20
attendre = time.sleep


def _executer(appel, outils, contexte):
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
    propre = {"role": "assistant", "content": message.get("content") or ""}
    if message.get("tool_calls"):
        propre["tool_calls"] = message["tool_calls"]
    return propre


ETAPES = {
    "aide_navigation": "Recherche de la page et du guide",
    "rechercher_articles": "Recherche dans le catalogue",
    "stock_article": "Lecture du stock de l'article",
    "indicateurs_stock": "Calcul des chiffres clés du stock",
    "mouvements_recents": "Lecture des mouvements de stock",
    "unites_attribuees": "Recherche des unités attribuées",
    "inventaires": "Lecture des inventaires",
    "consommation": "Calcul de la consommation",
    "comparer_periodes": "Comparaison des deux périodes",
    "reapprovisionnement": "Calcul des besoins de réapprovisionnement",
    "valeur_stock": "Calcul de la valeur du stock",
    "ecarts_inventaire": "Lecture des écarts d'inventaire",
    "delais_commandes": "Calcul des délais de traitement",
    "stock_lieu": "Lecture du stock du lieu",
    "detail_commande": "Lecture de la commande",
    "demandes_unites": "Lecture des demandes de retour et de transfert",
    "mes_equipements": "Lecture de vos équipements",
    "commandes": "Lecture des commandes",
    "rechercher_employes": "Recherche des employés",
}
_PRECISIONS = ("article", "texte", "recherche", "lieu", "numero", "beneficiaire", "reference", "categorie", "direction")


def etape(appel):
    fonction = appel.get("function") or {}
    nom = fonction.get("name") or ""
    try:
        arguments = json.loads(fonction.get("arguments") or "{}")
    except (TypeError, ValueError):
        arguments = {}
    precision = next((str(arguments[cle]) for cle in _PRECISIONS
                      if isinstance(arguments, dict) and arguments.get(cle) not in (None, "", True, False)), "")
    return {"outil": nom, "libelle": ETAPES.get(nom, "Consultation des données"), "precision": precision[:60]}


def repondre(request, message, historique=None, page=None, trace=None):
    for evenement, valeur in derouler(request, message, historique, page, trace):
        if evenement == "fin":
            return valeur
    raise ErreurIA("Je n'ai pas pu formuler de réponse.")


def derouler(request, message, historique=None, page=None, trace=None, flux=False):
    contexte = Contexte(request)
    outils = {outil.nom: outil for outil in outils_autorises(contexte)}
    schemas = [outil.schema() for outil in outils.values()]
    messages = construire_messages(contexte, message, historique, page)
    tableaux, liens, choix = [], {}, []
    trace = trace if trace is not None else []

    for tour in range(MAX_TOURS + 1):
        dernier = tour == MAX_TOURS
        reponse, a_ecrit = yield from _appeler_modele(messages, schemas, "none" if dernier else "auto", flux)
        appels = [] if dernier else (reponse.get("tool_calls") or [])[:MAX_APPELS_PAR_TOUR]
        if not appels:
            yield "fin", _resultat(reponse.get("content"), tableaux, liens, choix, trace)
            return
        if a_ecrit:
            yield "efface", None
        messages.append(_message_assistant({**reponse, "tool_calls": appels}))
        for appel in appels:
            yield "etape", etape(appel)
            contenu, resultat = _executer(appel, outils, contexte)
            fonction = appel.get("function") or {}
            trace.append({"outil": fonction.get("name"), "arguments": fonction.get("arguments"),
                          "erreur": contenu.get("erreur") if isinstance(contenu, dict) else None})
            if resultat is not None:
                if resultat.choix:
                    choix = resultat.choix
                if resultat.tableau and resultat.tableau["lignes"]:
                    tableaux.append(resultat.tableau)
                liens.update({item["chemin"]: item for item in resultat.liens})
            messages.append({
                "role": "tool",
                "tool_call_id": appel.get("id"),
                "name": fonction.get("name"),
                "content": json.dumps(contenu, ensure_ascii=False, default=str)[:TAILLE_MAX_RESULTAT],
            })


def _appeler_modele(messages, schemas, tool_choice, flux):
    for essai in range(1, ESSAIS_QUOTA + 1):
        try:
            return (yield from _un_appel(messages, schemas, tool_choice, flux))
        except ErreurQuota as exc:
            attente = exc.attente if exc.attente is not None else 2.0 * essai
            if essai == ESSAIS_QUOTA or attente > ATTENTE_QUOTA_MAX:
                raise
            yield "etape", {"outil": "", "libelle": "Service d'IA très sollicité : nouvel essai dans",
                            "precision": f"{math.ceil(attente)} s"}
            attendre(attente + 0.25)
    raise ErreurIA("Je n'ai pas pu joindre le service d'IA.")  # pragma: no cover


def _un_appel(messages, schemas, tool_choice, flux):
    if not flux:
        return completer(messages, tools=schemas, tool_choice=tool_choice, timeout=30, **OPTIONS), False
    message, a_ecrit = {}, False
    for evenement, valeur in completer_flux(messages, tools=schemas, tool_choice=tool_choice, timeout=30, **OPTIONS):
        if evenement == "texte":
            a_ecrit = True
            yield "texte", valeur
        else:
            message = valeur
    return message, a_ecrit


def _outils_utilises(trace):
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
