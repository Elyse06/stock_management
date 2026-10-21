"""Assistant de l'application : dialogue avec le modèle et exécution des outils.

Le modèle choisit les outils (plusieurs tours possibles) ; chaque appel est
exécuté AVEC LES DROITS DE L'UTILISATEUR. Les tableaux et liens produits par
les outils sont renvoyés tels quels au frontend, à côté de la réponse rédigée.
"""
import json
import logging
import math
import time

from .chat_prompts import construire_messages
from .client import ErreurIA, ErreurQuota, completer, completer_flux
from .outils import Contexte, ErreurOutil, outils_autorises

logger = logging.getLogger("apps.ai")

MAX_TOURS = 4          # tours d'appels d'outils avant la réponse finale
MAX_APPELS_PAR_TOUR = 4
TAILLE_MAX_RESULTAT = 8000  # caractères d'un résultat d'outil renvoyé au modèle (chaque jeton compte dans le quota)
TABLEAUX_MAX = 3
OPTIONS = {"temperature": 0.2, "max_tokens": 1000}
# Limite de débit du service d'IA (HTTP 429) : nouvel essai automatique si l'attente conseillée est courte.
ESSAIS_QUOTA = 3
ATTENTE_QUOTA_MAX = 20  # secondes
attendre = time.sleep  # remplacé dans les tests


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


# Libellé de l'étape affichée pendant que l'outil est consulté (réponse en flux).
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
# Paramètre rappelé à côté de l'étape (« Lecture du stock de l'article · CART-HP »).
_PRECISIONS = ("article", "texte", "recherche", "lieu", "numero", "beneficiaire", "reference", "categorie", "direction")


def etape(appel):
    """Étape lisible correspondant à un appel d'outil du modèle."""
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
    """Réponse complète en une fois. ``page`` : chemin affiché dans l'interface ;
    ``trace`` (liste) reçoit les outils appelés (évaluation)."""
    for evenement, valeur in derouler(request, message, historique, page, trace):
        if evenement == "fin":
            return valeur
    raise ErreurIA("Je n'ai pas pu formuler de réponse.")  # pragma: no cover (derouler finit toujours par « fin »)


def derouler(request, message, historique=None, page=None, trace=None, flux=False):
    """Déroule l'échange et génère ses événements, dans l'ordre :

    - ``("etape", {"outil", "libelle", "precision"})`` avant chaque consultation de données ;
    - ``("texte", morceau)`` au fil de la rédaction (seulement si ``flux``) ;
    - ``("efface", None)`` si un texte provisoire a été écrit avant un appel d'outil (flux) ;
    - ``("fin", resultat)`` : réponse complète (même forme que :func:`repondre`).
    """
    contexte = Contexte(request)
    outils = {outil.nom: outil for outil in outils_autorises(contexte)}
    schemas = [outil.schema() for outil in outils.values()]
    messages = construire_messages(contexte, message, historique, page)
    tableaux, liens, choix = [], {}, []
    trace = trace if trace is not None else []

    for tour in range(MAX_TOURS + 1):
        # Trop de tours : la dernière requête interdit tout nouvel appel d'outil.
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
                "name": fonction.get("name"),
                "content": json.dumps(contenu, ensure_ascii=False, default=str)[:TAILLE_MAX_RESULTAT],
            })


def _appeler_modele(messages, schemas, tool_choice, flux):
    """Un appel au modèle ; en flux, relaie le texte au fur et à mesure. Renvoie ``(message, texte_ecrit)``.

    Si la limite de débit du service est atteinte, on patiente le délai qu'il conseille (s'il est court)
    puis on réessaie ; en flux, l'attente est affichée comme une étape.
    """
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
