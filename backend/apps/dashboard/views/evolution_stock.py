from datetime import timedelta

from apps.catalogue.models import Article
from apps.catalogue.services.stock_filters import build_stock_filters
from django.db.models import Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class EvolutionStockView(APIView):
    permission_classes = [IsAuthenticated]  # noqa: RUF012

    def get(self, request):
        aujourd_hui = timezone.now()
        resultats = []

        for i in range(11, -1, -1):
            mois_cible = aujourd_hui - timedelta(days=30 * i)
            fin_mois = mois_cible.replace(day=1) + timedelta(days=32)
            fin_mois = fin_mois.replace(day=1) - timedelta(days=1)
            fin_mois = fin_mois.replace(hour=23, minute=59, second=59)

            stock_filters = build_stock_filters(relation_prefix="details_mouvement__")
            for filter_name in stock_filters:
                stock_filters[filter_name] &= Q(
                    **{"details_mouvement__mouvement__date__lte": fin_mois}
                )

            total_stock = (
                Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["entree"]), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["sortie"]), 0)
                + Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["ajustement_plus"]), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["ajustement_moins"]), 0)
            )

            stock_mois = Article.objects.aggregate(stock_total=total_stock)["stock_total"]

            resultats.append({
                "mois": fin_mois.strftime("%Y-%m"),
                "stock_total": stock_mois,
            })

        return Response(resultats)
