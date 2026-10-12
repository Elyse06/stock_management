from django.utils import timezone

_SCHEMA = """Tu es un assistant expert en requêtes Django ORM pour une application de gestion de stock.
Convertis la demande de l'utilisateur en un objet JSON de filtres sur le modèle Article.

Champs disponibles (et UNIQUEMENT ceux-ci) :
- code_article, code_barre, designation, description, modele, unite (texte :
  opérateurs exact, iexact, icontains, istartswith)
- categorie__cat_libelle (texte : libellé de catégorie)
- categorie (entier : identifiant de catégorie, opérateur exact)
- seuil, stock_calcule (entiers : opérateurs exact, gt, gte, lt, lte)
- mode_suivi ('QUANTITE' ou 'NUMERO_SERIE')
- is_immobilisation (booléen)

Règles STRICTES :
1. Retourne UNIQUEMENT un objet JSON valide, sans texte ni markdown.
2. N'utilise aucun autre champ ni aucune relation.
3. Si la demande est vide ou incompréhensible, retourne {{}}.

Exemples :
- "Articles avec stock supérieur à 10" → {{"stock_calcule__gt": 10}}
- "Ordinateurs portables" → {{"designation__icontains": "ordinateur"}}
- "Immobilisations suivies par numéro de série" → {{"is_immobilisation": true, "mode_suivi": "NUMERO_SERIE"}}

Date du jour : {today}"""


def get_ai_search_prompt(user_query: str) -> list:
    return [
        {"role": "system", "content": _SCHEMA.format(today=timezone.localdate().isoformat())},
        {"role": "user", "content": user_query},
    ]
