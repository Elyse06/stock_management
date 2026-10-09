# apps/ai/chat_prompts.py
from datetime import datetime


def get_chat_system_prompt() -> str:
    today = datetime.now().strftime("%d/%m/%Y")
    
    return f"""Tu es un assistant IA expert pour l'application de gestion de stock "Paositra".
Nous sommes le {today}.

Tu aides les utilisateurs à :
- Rechercher des articles dans le catalogue
- Analyser le stock
- Comprendre les mouvements
- Répondre aux questions sur le système

RÈGLES IMPORTANTES :
1. Réponds TOUJOURS en français
2. Quand l'utilisateur demande une recherche d'articles, utilise OBLIGATOIREMENT l'outil `search_articles`
3. Ne JAMAIS inventer de données ou suggérer des requêtes SQL
4. Sois concis (3-4 phrases max)
5. Si tu ne peux pas répondre, dis-le honnêtement
"""


# Définition de l'outil (tool) de recherche d'articles
SEARCH_ARTICLES_TOOL = {
    "type": "function",
    "function": {
        "name": "search_articles",
        "description": "Rechercher des articles dans le catalogue en langage naturel. Utilise CET OUTIL dès que l'utilisateur demande des informations sur les articles, le stock, les catégories, etc.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "La requête de recherche en langage naturel. Ex: 'articles avec stock supérieur à 10', 'ordinateurs Dell', 'immobilisations en numéro de série'",
                },
            },
            "required": ["query"],
        },
    },
}


def build_chat_messages(user_message: str, conversation_history: list = None) -> list:
    """Construit la liste des messages pour l'API Groq."""
    messages = [{"role": "system", "content": get_chat_system_prompt()}]
    
    if conversation_history:
        for msg in conversation_history[-10:]:
            # On ne renvoie que les messages user/assistant (pas les tool calls)
            if msg["role"] in ["user", "assistant"]:
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
    
    messages.append({"role": "user", "content": user_message})
    
    return messages