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


def _annotate_stock(queryset, magasin_id=None):
    """Annote le stock calculé sur un queryset d'articles."""
    stock_filters = build_stock_filters(
        relation_prefix="details_mouvement__",
        magasin_id=magasin_id,
    )
    return queryset.annotate(
        stock_calcule=(
            Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["entree"]), 0)
            - Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["sortie"]), 0)
            + Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["ajustement_plus"]), 0)
            - Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["ajustement_moins"]), 0)
        )
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_search_articles(request):
    user_query = request.data.get('query', '')
    magasin_id = request.data.get('magasin_id')  # Optionnel : filtre par magasin

    if not user_query:
        return Response({"error": "La requête est vide"}, status=400)

    groq_api_key = os.getenv('GROQ_API_KEY')
    if not groq_api_key:
        return Response({"error": "Clé API Groq non configurée"}, status=500)

    messages = get_ai_search_prompt(user_query)

    try:
        # 1. Appel à Groq
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "openai/gpt-oss-20b",
                "messages": messages,
                "temperature": 0.1
            },
            timeout=10
        )

        if response.status_code != 200:
            return Response({
                "error": f"Erreur API Groq ({response.status_code})",
                "details": response.text
            }, status=response.status_code)

        raw_content = response.json()["choices"][0]["message"]["content"]
        clean_content = raw_content.replace('```json', '').replace('```', '').strip()
        filters = json.loads(clean_content)

        # 2. Construire le queryset avec annotation du stock
        queryset = Article.objects.select_related("categorie").order_by("code_article")
        
        # On annote le stock SI l'IA a demandé un filtre dessus (optimisation)
        has_stock_filter = any(k.startswith("stock_calcule") for k in filters.keys())
        if has_stock_filter:
            queryset = _annotate_stock(queryset, magasin_id)

        # 3. Appliquer les filtres
        articles = list(queryset.filter(**filters).values(
            "code_article", "code_barre", "designation", "modele",
            "unite", "seuil", "mode_suivi", "is_immobilisation",
            "categorie", "categorie__cat_libelle"
        ))

        # 4. Ajouter le stock calculé si annoté
        if has_stock_filter:
            for article in articles:
                article["categorie_nom"] = article.pop("categorie__cat_libelle", "")

        return Response({
            "success": True,
            "filters_applied": filters,
            "count": len(articles),
            "results": articles,
            "ai_message": f"J'ai trouvé {len(articles)} article(s) correspondant à : '{user_query}'"
        })

    except json.JSONDecodeError as e:
        return Response({
            "error": "L'IA n'a pas retourné un JSON valide",
            "details": str(e),
            "raw_response": raw_content if 'raw_content' in locals() else None
        }, status=500)
    except Exception as e:
        return Response({"error": str(e)}, status=500)