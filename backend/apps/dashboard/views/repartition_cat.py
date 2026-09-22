from apps.catalogue.models import Article
from apps.catalogue.services.stock_filters import build_stock_filters
from django.db.models import Sum
from django.db.models.functions import Coalesce
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class RepartitionCategorieView(APIView):
    permission_classes = [IsAuthenticated]  # noqa: RUF012

    def get(self, request):
        stock_filters = build_stock_filters(relation_prefix="details_mouvement__")

        categories = (
            Article.objects.values("categorie__cat_libelle")
            .annotate(
                stock_total=(
                    Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["entree"]), 0)
                    - Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["sortie"]), 0)
                    + Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["ajustement_plus"]), 0)
                    - Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["ajustement_moins"]), 0)
                )
            )
            .filter(stock_total__gt=0)
            .order_by("-stock_total")
        )

        resultats = [
            {
                "categorie": item["categorie__cat_libelle"] or "Sans catégorie",
                "stock": item["stock_total"],
            }
            for item in categories
        ]

        return Response(resultats)
