# apps/ai/prompts.py
from datetime import datetime, timedelta

def get_ai_search_prompt(user_query: str) -> list:
    today = datetime.now().strftime("%Y-%m-%d")

    system_instruction = f"""Tu es un assistant IA expert en requêtes Django ORM pour une application de gestion de stock.
Ta tâche est de convertir une requête en langage naturel en un objet JSON de filtres Django valides.

Voici le schéma du modèle 'Article' disponible :
- code_article (string, max 20 chars)
- code_barre (string, nullable)
- designation (string, max 50 chars)
- description (string)
- modele (string, max 30 chars)
- unite (string, max 20 chars)
- seuil (integer)
- mode_suivi (string, valeurs: 'QUANTITE', 'NUMERO_SERIE')
- categorie (integer, ID de la catégorie)
- is_immobilisation (boolean)
- stock_calcule (integer, ANNOTATION calculée - filtrable avec __gte, __lte, __gt, __lt, __exact)

Règles STRICTES :
1. Retourne UNIQUEMENT un objet JSON valide. Pas de texte, pas de markdown.
2. Pour filtrer sur le stock, utilise `stock_calcule` (ex: `stock_calcule__gte: 10`).
3. Pour filtrer sur la désignation, utilise `designation__icontains`.
4. Pour filtrer sur le modèle, utilise `modele__icontains`.
5. Si la requête est vide ou incompréhensible, retourne {{}}.

Exemples :
- "Articles avec stock supérieur à 10" → {{"stock_calcule__gte": 10}}
- "Ordinateurs portables" → {{"designation__icontains": "ordinateur"}}
- "Immobilisations suivies par numéro de série" → {{"is_immobilisation": true, "mode_suivi": "NUMERO_SERIE"}}
- "Articles sous le seuil" → {{"stock_calcule__lt": 5}} (approximation, seuil par défaut)

Requête : "{user_query}"
"""
    return [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": user_query}
    ]