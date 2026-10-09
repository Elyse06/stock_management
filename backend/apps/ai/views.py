# apps/ai/views.py
import os
import json
import requests
from django.db.models import Sum
from django.db.models.functions import Coalesce
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.catalogue.models import Article
from apps.catalogue.services.stock_filters import build_stock_filters
from .prompts import get_ai_search_prompt
from .chat_prompts import build_chat_messages, SEARCH_ARTICLES_TOOL


# ============================================================
# FONCTION MÉTIER RÉUTILISABLE (partagée entre les 2 vues)
# ============================================================
def perform_ai_search(user_query: str, magasin_id=None):
    """
    Exécute une recherche IA sur les articles.
    Retourne un dict avec les résultats ou une erreur.
    """
    messages = get_ai_search_prompt(user_query)
    groq_api_key = os.getenv('GROQ_API_KEY')

    # 1. Appel à Groq pour obtenir les filtres
    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {groq_api_key}",
            "Content-Type": "application/json"
        },
        json={
            "model": "openai/gpt-oss-20b",
            "messages": messages,
            "temperature": 0.1,
        },
        timeout=10
    )

    if response.status_code != 200:
        return {"error": f"Erreur API Groq ({response.status_code})", "details": response.text}

    raw_content = response.json()["choices"][0]["message"]["content"]
    clean_content = raw_content.replace('```json', '').replace('```', '').strip()
    filters = json.loads(clean_content)

    # 2. Construire le queryset avec annotation du stock si nécessaire
    queryset = Article.objects.select_related("categorie").order_by("code_article")
    has_stock_filter = any(k.startswith("stock_calcule") for k in filters.keys())

    if has_stock_filter:
        stock_filters = build_stock_filters(
            relation_prefix="details_mouvement__",
            magasin_id=magasin_id,
        )
        queryset = queryset.annotate(
            stock_calcule=(
                Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["entree"]), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["sortie"]), 0)
                + Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["ajustement_plus"]), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["ajustement_moins"]), 0)
            )
        )

    # 3. Appliquer les filtres
    articles = list(queryset.filter(**filters).values(
        "code_article", "code_barre", "designation", "modele",
        "unite", "seuil", "mode_suivi", "is_immobilisation",
        "categorie", "categorie__cat_libelle",
    ))

    # 4. Ajouter stock_calcule et categorie_nom si annoté
    if has_stock_filter:
        for article in articles:
            article["categorie_nom"] = article.pop("categorie__cat_libelle", "")
    else:
        # Sans annotation, on récupère juste le nom de la catégorie
        for article in articles:
            article["categorie_nom"] = article.pop("categorie__cat_libelle", "")
            article["stock_calcule"] = None

    return {
        "success": True,
        "filters_applied": filters,
        "count": len(articles),
        "results": articles,
        "ai_message": f"J'ai trouvé {len(articles)} article(s) correspondant à : '{user_query}'"
    }


# ============================================================
# VUE 1 : Recherche IA directe (endpoint existant)
# ============================================================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_search_articles(request):
    user_query = request.data.get('query', '').strip()
    magasin_id = request.data.get('magasin_id')

    if not user_query:
        return Response({"error": "La requête est vide"}, status=400)

    if not os.getenv('GROQ_API_KEY'):
        return Response({"error": "Clé API Groq non configurée"}, status=500)

    try:
        result = perform_ai_search(user_query, magasin_id)
        if "error" in result:
            return Response(result, status=500)
        return Response(result)
    except json.JSONDecodeError as e:
        return Response({"error": "JSON invalide de l'IA", "details": str(e)}, status=500)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ============================================================
# VUE 2 : Chat IA avec Function Calling
# ============================================================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_chat(request):
    """Endpoint de chat IA avec Function Calling pour la recherche d'articles."""
    user_message = request.data.get('message', '').strip()
    conversation_history = request.data.get('history', [])

    if not user_message:
        return Response({"error": "Le message est vide"}, status=400)

    groq_api_key = os.getenv('GROQ_API_KEY')
    if not groq_api_key:
        return Response({"error": "Clé API Groq non configurée"}, status=500)

    messages = build_chat_messages(user_message, conversation_history)

    try:
        # 1er appel à l'IA avec les tools disponibles
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "openai/gpt-oss-20b",
                "messages": messages,
                "tools": [SEARCH_ARTICLES_TOOL],
                "tool_choice": "auto",
                "temperature": 0.7,
                "max_tokens": 800,
            },
            timeout=15
        )

        if response.status_code != 200:
            return Response({
                "error": f"Erreur API Groq ({response.status_code})",
                "details": response.text
            }, status=response.status_code)

        ai_message = response.json()["choices"][0]["message"]

        # Cas 1 : L'IA veut appeler la fonction search_articles
        if ai_message.get("tool_calls"):
            tool_call = ai_message["tool_calls"][0]
            function_name = tool_call["function"]["name"]

            if function_name == "search_articles":
                function_args = json.loads(tool_call["function"]["arguments"])
                search_query = function_args.get("query", "")

                # ✅ APPEL DIRECT à la fonction métier (plus de RequestFactory !)
                search_result = perform_ai_search(search_query)

                if "error" in search_result:
                    return Response({
                        "error": "Erreur lors de la recherche d'articles",
                        "details": search_result["error"]
                    }, status=500)

                # Construire le message tool pour l'IA
                tool_message = {
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "name": "search_articles",
                    "content": json.dumps({
                        "query": search_query,
                        "count": search_result.get("count", 0),
                        "filters_applied": search_result.get("filters_applied", {}),
                        "articles": search_result.get("results", [])[:20],
                    }, ensure_ascii=False)
                }

                # 2ème appel à l'IA avec le résultat
                messages.append(ai_message)
                messages.append(tool_message)

                final_response = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {groq_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "openai/gpt-oss-20b",
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 800,
                    },
                    timeout=15
                )

                if final_response.status_code != 200:
                    return Response({
                        "error": f"Erreur API Groq ({final_response.status_code})"
                    }, status=500)

                final_reply = final_response.json()["choices"][0]["message"]["content"]

                return Response({
                    "success": True,
                    "reply": final_reply,
                    "search_results": {
                        "query": search_query,
                        "count": search_result.get("count", 0),
                        "filters_applied": search_result.get("filters_applied", {}),
                        "articles": search_result.get("results", []),
                    }
                })

        # Cas 2 : L'IA répond directement sans utiliser d'outil
        return Response({
            "success": True,
            "reply": ai_message.get("content", "Désolé, je n'ai pas compris."),
        })

    except requests.exceptions.RequestException as e:
        return Response({"error": f"Erreur de communication: {str(e)}"}, status=500)
    except Exception as e:
        return Response({"error": str(e)}, status=500)