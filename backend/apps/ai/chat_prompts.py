from django.utils import timezone

MAX_HISTORIQUE = 10
MAX_LONGUEUR_MESSAGE = 2000

SEARCH_ARTICLES_TOOL = {
    "type": "function",
    "function": {
        "name": "search_articles",
        "description": (
            "Rechercher des articles dans le catalogue en langage naturel. Utilise CET OUTIL dès que "
            "l'utilisateur demande des informations sur les articles, le stock, les catégories, etc."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": (
                        "La requête en langage naturel. Ex : 'articles avec stock supérieur à 10', "
                        "'ordinateurs Dell', 'immobilisations en numéro de série'"
                    ),
                },
            },
            "required": ["query"],
        },
    },
}


def get_chat_system_prompt() -> str:
    return f"""Tu es un assistant IA expert pour l'application de gestion de stock "Paositra".
Nous sommes le {timezone.localdate():%d/%m/%Y}.

Tu aides les utilisateurs à rechercher des articles, analyser le stock, comprendre les
mouvements et répondre aux questions sur le système.

RÈGLES IMPORTANTES :
1. Réponds TOUJOURS en français.
2. Pour toute recherche d'articles, utilise OBLIGATOIREMENT l'outil `search_articles`.
3. N'invente JAMAIS de données et ne suggère pas de requêtes SQL.
4. Sois concis (3-4 phrases max).
5. Si tu ne peux pas répondre, dis-le honnêtement.
"""


def nettoyer_historique(historique) -> list:
    """Garde les derniers messages user/assistant valides, tronqués."""
    if not isinstance(historique, list):
        return []
    propres = []
    for message in historique[-MAX_HISTORIQUE:]:
        if not isinstance(message, dict):
            continue
        role, contenu = message.get("role"), message.get("content")
        if role in ("user", "assistant") and isinstance(contenu, str) and contenu.strip():
            propres.append({"role": role, "content": contenu[:MAX_LONGUEUR_MESSAGE]})
    return propres


def build_chat_messages(user_message: str, conversation_history=None) -> list:
    return [
        {"role": "system", "content": get_chat_system_prompt()},
        *nettoyer_historique(conversation_history),
        {"role": "user", "content": user_message},
    ]
